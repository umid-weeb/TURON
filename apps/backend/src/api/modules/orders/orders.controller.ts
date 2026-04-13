import { FastifyReply, FastifyRequest } from 'fastify';
import {
  NotificationTypeEnum,
  OrderStatusEnum,
  PaymentStatusEnum,
  UserRoleEnum,
} from '@turon/shared';
import { prisma } from '../../../lib/prisma.js';
import { AuditService } from '../../../services/audit.service.js';
import { CourierAssignmentService } from '../../../services/courier-assignment.service.js';
import { DeliveryQuoteService } from '../../../services/delivery-quote.service.js';
import { InAppNotificationsService } from '../../../services/in-app-notifications.service.js';
import { orderTrackingService } from '../../../services/order-tracking.service.js';
import { sendOrderNotificationToAdmin } from '../../../services/telegram-bot.service.js';
import { StatusService } from '../../../services/status.service.js';
import { SpecialEventsService } from '../../../services/special-events.service.js';
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  ORDER_INCLUDE,
  ORDER_LIST_INCLUDE,
  type OrderWithRelations,
  RESTAURANT_COORDS,
  hasOrderAccess,
  isOrderVisibleToRequester,
  serializeOrder,
} from './order-helpers.js';
import { evaluatePromoForSubtotal } from '../promos/promo-helpers.js';

async function addTracking(order: any) {
  return {
    ...serializeOrder(order),
    tracking: await orderTrackingService.getSnapshot(order.id),
  };
}

// Batch version: resolves all orders + tracking in 1 DB query instead of N
async function addTrackingBatch(orders: any[]) {
  if (!orders.length) return [];
  const serialized = orders.map(serializeOrder);
  // Collect all IDs not already in memory cache
  const uncachedIds = serialized
    .map((o) => o.id)
    .filter((id) => !orderTrackingService.getCachedSnapshot(id));
  // Prefetch all uncached snapshots in one query
  if (uncachedIds.length) {
    await orderTrackingService.prefetchSnapshots(uncachedIds);
  }
  return Promise.all(
    serialized.map(async (o) => ({
      ...o,
      tracking: await orderTrackingService.getSnapshot(o.id),
    })),
  );
}

async function getTrackableOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: ORDER_INCLUDE,
  });
}

async function getSerializedOrder(orderId: string) {
  const order = await getTrackableOrder(orderId);
  return order ? await addTracking(order) : null;
}

async function publishOrderSnapshot(orderId: string) {
  const serializedOrder = await getSerializedOrder(orderId);

  if (serializedOrder) {
    orderTrackingService.publishOrderUpdate(orderId, serializedOrder);
  }

  return serializedOrder;
}

function recordOrderCreatedAudit(params: {
  userId: string;
  actorRole: string;
  orderId: string;
  serializedOrder: Awaited<ReturnType<typeof getSerializedOrder>>;
}) {
  void AuditService.record({
    userId: params.userId,
    actorRole: params.actorRole,
    action: 'CREATE_ORDER',
    entity: 'Order',
    entityId: params.orderId,
    newValue: params.serializedOrder,
  });
}

async function continueAutoAssignmentAfterOrderCreation(orderId: string) {
  try {
    const autoAssignmentResult = await CourierAssignmentService.autoAssignOrder(orderId);

    if (autoAssignmentResult?.assignment) {
      await AuditService.record({
        action: 'AUTO_ASSIGN_COURIER',
        entity: 'Order',
        entityId: orderId,
        newValue: {
          assignmentId: autoAssignmentResult.assignment.assignmentId,
          courierId: autoAssignmentResult.assignment.courierId,
          courierName: autoAssignmentResult.assignment.courierName,
          etaMinutes: autoAssignmentResult.assignment.etaMinutes,
          distanceMeters: autoAssignmentResult.assignment.distanceMeters,
          rankingCandidate: autoAssignmentResult.selectedCandidate,
        },
        metadata: {
          mode: 'AUTO',
        },
      });

      await publishOrderSnapshot(orderId);
    }
  } catch (error) {
    console.error(`Auto courier assignment failed for order ${orderId}:`, error);
  }
}

async function listAccessibleOrders(requester: any) {
  if (requester.role === UserRoleEnum.ADMIN) {
    return prisma.order.findMany({
      include: ORDER_LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  if (requester.role === UserRoleEnum.COURIER) {
    return prisma.order.findMany({
      where: {
        courierAssignments: {
          some: {
            courierId: requester.id,
            status: {
              in: ACTIVE_ASSIGNMENT_STATUSES as any,
            },
          },
        },
      },
      include: ORDER_LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  return prisma.order.findMany({
    where: { userId: requester.id },
    include: ORDER_LIST_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

function roundCurrency(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

async function getOwnedDeliveryAddress(userId: string, deliveryAddressId: string) {
  const deliveryAddress = await prisma.deliveryAddress.findUnique({
    where: { id: deliveryAddressId },
  });

  if (!deliveryAddress || deliveryAddress.userId !== userId) {
    throw new Error('Tanlangan manzil sizga tegishli emas');
  }

  return deliveryAddress;
}

async function buildValidatedOrderItems(items: Array<{ menuItemId: string; quantity: number }>) {
  const requestedItemIds = [...new Set(items.map((item) => item.menuItemId))];
  const dbItems = await prisma.menuItem.findMany({
    where: {
      id: { in: requestedItemIds },
      isActive: true,
      availabilityStatus: 'AVAILABLE' as any,
      category: {
        isActive: true,
      },
    },
  });

  if (dbItems.length !== requestedItemIds.length) {
    throw new Error('Ba`zi taomlar mavjud emas yoki faol emas');
  }

  const itemMap = new Map(dbItems.map((item) => [item.id, item]));
  let subtotal = 0;
  const orderItemsData = items.map((item) => {
    const dbItem = itemMap.get(item.menuItemId);

    if (!dbItem) {
      throw new Error(`Menu item not found during order build: ${item.menuItemId}`);
    }

    const price = Number(dbItem.price);
    const totalPrice = roundCurrency(price * item.quantity);
    subtotal += totalPrice;

    return {
      menuItemId: dbItem.id,
      itemName: dbItem.nameUz,
      priceAtOrder: dbItem.price,
      quantity: item.quantity,
      totalPrice,
      imageUrl: dbItem.imageUrl || null,
    };
  });

  return {
    subtotal: roundCurrency(subtotal),
    orderItemsData,
  };
}

async function resolvePromo(promoCode: string | undefined, subtotal: number) {
  if (!promoCode?.trim()) {
    return {
      promo: null,
      discountAmount: 0,
    };
  }

  const promo = await prisma.promoCode.findFirst({
    where: { code: promoCode.trim().toUpperCase() },
  });

  const promoValidation = evaluatePromoForSubtotal(promo, subtotal);

  if (!promoValidation.isValid) {
    throw new Error(promoValidation.message);
  }

  return {
    promo,
    discountAmount: promoValidation.discountAmount,
  };
}

async function buildOrderPricing(input: {
  userId: string;
  items: Array<{ menuItemId: string; quantity: number }>;
  deliveryAddressId: string;
  promoCode?: string;
}) {
  const deliveryAddress = await getOwnedDeliveryAddress(input.userId, input.deliveryAddressId);
  const { subtotal, orderItemsData } = await buildValidatedOrderItems(input.items);
  const { promo, discountAmount: promoDiscount } = await resolvePromo(input.promoCode, subtotal);

  // Apply Special Event Benefits
  const specialBenefits = await SpecialEventsService.getActiveBenefits(input.userId);
  let specialDiscount = 0;
  
  for (const benefit of specialBenefits) {
    if (benefit.discountPercent > 0) {
      specialDiscount += subtotal * (benefit.discountPercent / 100);
    }
    specialDiscount += benefit.discountAmount;
  }

  const totalDiscount = roundCurrency(promoDiscount + specialDiscount);

  const quote = await DeliveryQuoteService.calculate({
    subtotal,
    discountAmount: totalDiscount,
    destination: {
      latitude: Number(deliveryAddress.latitude),
      longitude: Number(deliveryAddress.longitude),
    },
  });

  return {
    deliveryAddress,
    orderItemsData,
    promo,
    quote,
  };
}

function serializeOrderQuote(quote: Awaited<ReturnType<typeof buildOrderPricing>>['quote']) {
  return {
    subtotal: quote.subtotal,
    discount: quote.discountAmount,
    merchandiseTotal: quote.merchandiseTotal,
    deliveryFee: quote.deliveryFee,
    total: quote.totalAmount,
    deliveryDistanceMeters: quote.distanceMeters,
    deliveryEtaMinutes: quote.etaMinutes,
    deliveryFeeRuleCode: quote.feeRuleCode,
    deliveryFeeBaseAmount: quote.feeBaseAmount,
    deliveryFeeExtraAmount: quote.feeExtraAmount,
    routeSource: quote.routeSource,
  };
}

async function dispatchOrderStatusNotifications(params: {
  status: OrderStatusEnum;
  order: {
    id: string;
    userId: string;
    orderNumber: bigint;
    courierAssignments: Array<{
      courierId: string;
      status: string;
    }>;
  };
}) {
  const { status, order } = params;

  if (status === OrderStatusEnum.PREPARING) {
    await InAppNotificationsService.notifyUser({
      userId: order.userId,
      roleTarget: UserRoleEnum.CUSTOMER,
      type: NotificationTypeEnum.ORDER_STATUS_UPDATE,
      title: 'Buyurtma tasdiqlandi',
      message: `#${String(order.orderNumber)} buyurtma tayyorlanmoqda`,
      relatedOrderId: order.id,
    });
    return;
  }

  if (status === OrderStatusEnum.READY_FOR_PICKUP) {
    await InAppNotificationsService.notifyUser({
      userId: order.userId,
      roleTarget: UserRoleEnum.CUSTOMER,
      type: NotificationTypeEnum.ORDER_STATUS_UPDATE,
      title: "Buyurtma tayyor bo'ldi",
      message: `#${String(order.orderNumber)} buyurtma restoranda tayyor`,
      relatedOrderId: order.id,
    });
    return;
  }

  if (status === OrderStatusEnum.DELIVERING) {
    await InAppNotificationsService.notifyUser({
      userId: order.userId,
      roleTarget: UserRoleEnum.CUSTOMER,
      type: NotificationTypeEnum.ORDER_STATUS_UPDATE,
      title: "Buyurtma yo'lda",
      message: `#${String(order.orderNumber)} buyurtma siz tomonga olib chiqildi`,
      relatedOrderId: order.id,
    });
    return;
  }

  if (status === OrderStatusEnum.DELIVERED) {
    await InAppNotificationsService.notifyUser({
      userId: order.userId,
      roleTarget: UserRoleEnum.CUSTOMER,
      type: NotificationTypeEnum.SUCCESS,
      title: 'Buyurtma topshirildi',
      message: `#${String(order.orderNumber)} buyurtma muvaffaqiyatli yakunlandi`,
      relatedOrderId: order.id,
    });
    return;
  }

  if (status === OrderStatusEnum.CANCELLED) {
    await InAppNotificationsService.notifyUser({
      userId: order.userId,
      roleTarget: UserRoleEnum.CUSTOMER,
      type: NotificationTypeEnum.ERROR,
      title: 'Buyurtma bekor qilindi',
      message: `#${String(order.orderNumber)} buyurtma bekor qilindi`,
      relatedOrderId: order.id,
    });

    const activeCourierIds = order.courierAssignments
      .filter((assignment: any) => StatusService.isActiveAssignmentStatus(assignment.status))
      .map((assignment: any) => assignment.courierId);

    if (activeCourierIds.length > 0) {
      await InAppNotificationsService.createMany(
        activeCourierIds.map((courierId) => ({
          userId: courierId,
          roleTarget: UserRoleEnum.COURIER,
          type: NotificationTypeEnum.WARNING,
          title: 'Buyurtma bekor qilindi',
          message: `#${String(order.orderNumber)} buyurtma endi faol emas`,
          relatedOrderId: order.id,
        })),
      );
    }
  }
}

export async function handleQuoteOrder(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply,
) {
  const user = request.user as any;
  const { items, deliveryAddressId, promoCode } = request.body as any;

  try {
    const orderPricing = await buildOrderPricing({
      userId: user.id,
      items,
      deliveryAddressId,
      promoCode,
    });

    return reply.send(serializeOrderQuote(orderPricing.quote));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Yetkazish narxi hisoblanmadi';
    const statusCode =
      message === 'Tanlangan manzil sizga tegishli emas'
        ? 403
        : message === 'Ba`zi taomlar mavjud emas yoki faol emas'
          ? 400
          : 400;

    return reply.status(statusCode).send({ error: message });
  }
}

export async function handleCreateOrder(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply,
) {
  const user = request.user as any;
  const { items, deliveryAddressId, paymentMethod, promoCode, note, receiptImageBase64 } = request.body as any;
  let orderPricing: Awaited<ReturnType<typeof buildOrderPricing>>;

  try {
    orderPricing = await buildOrderPricing({
      userId: user.id,
      items,
      deliveryAddressId,
      promoCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Buyurtma yaratishda xatolik yuz berdi';
    const statusCode =
      message === 'Tanlangan manzil sizga tegishli emas'
        ? 403
        : message === 'Ba`zi taomlar mavjud emas yoki faol emas'
          ? 400
          : 400;

    return reply.status(statusCode).send({ error: message });
  }

  const { deliveryAddress, orderItemsData, promo, quote } = orderPricing;

  const createdOrder = await prisma.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        userId: user.id,
        deliveryAddressId,
        courierId: null,
        promoCodeId: promo?.id ?? null,
        status: OrderStatusEnum.PENDING as any,
        subtotal: quote.subtotal,
        discountAmount: quote.discountAmount,
        deliveryFee: quote.deliveryFee,
        deliveryDistanceMeters: quote.distanceMeters,
        deliveryEtaMinutes: quote.etaMinutes,
        deliveryFeeRuleCode: quote.feeRuleCode,
        deliveryFeeBaseAmount: quote.feeBaseAmount,
        deliveryFeeExtraAmount: quote.feeExtraAmount,
        totalAmount: quote.totalAmount,
        paymentMethod,
        paymentStatus: PaymentStatusEnum.PENDING as any,
        note: note?.trim() || null,
        destinationLat: deliveryAddress.latitude,
        destinationLng: deliveryAddress.longitude,
        items: {
          create: orderItemsData,
        },
        payment: {
          create: {
            method: paymentMethod,
            status: PaymentStatusEnum.PENDING as any,
            amount: quote.totalAmount,
            provider:
              paymentMethod === 'MANUAL_TRANSFER'
                ? 'Manual transfer'
                : paymentMethod === 'EXTERNAL_PAYMENT'
                  ? 'External payment'
                  : null,
          },
        },
      },
      select: { id: true },
    });
  });

  const serializedOrder = await getSerializedOrder(createdOrder.id);

  if (serializedOrder) {
    orderTrackingService.publishOrderUpdate(createdOrder.id, serializedOrder);
  }

  await InAppNotificationsService.notifyAdmins({
    type: NotificationTypeEnum.ORDER_STATUS_UPDATE,
    title: 'Yangi buyurtma tushdi',
    message: `#${serializedOrder?.orderNumber || ''} buyurtma tasdiq kutmoqda`,
    relatedOrderId: createdOrder.id,
  });

  recordOrderCreatedAudit({
    userId: user.id,
    actorRole: user.role,
    orderId: createdOrder.id,
    serializedOrder,
  });
  void continueAutoAssignmentAfterOrderCreation(createdOrder.id);

  // Fire-and-forget Telegram notification — never block order creation
  if (serializedOrder) {
    void sendOrderNotificationToAdmin({
      orderId: createdOrder.id,
      orderNumber: serializedOrder.orderNumber,
      customerName: serializedOrder.customerName ?? user.fullName ?? 'Mijoz',
      customerPhone: serializedOrder.customerPhone ?? user.phoneNumber ?? null,
      customerAddress: serializedOrder.customerAddress?.addressText ?? 'Manzil yo\'q',
      customerAddressNote: serializedOrder.customerAddress?.note ?? null,
      paymentMethod,
      items: (serializedOrder.items ?? []).map((item: any) => ({
        name: item.name ?? item.itemName ?? 'Taom',
        quantity: item.quantity,
        totalPrice: item.totalPrice ?? 0,
      })),
      subtotal: Number(serializedOrder.subtotal ?? 0),
      deliveryFee: Number(serializedOrder.deliveryFee ?? 0),
      total: Number(serializedOrder.total ?? 0),
      receiptImageBase64: receiptImageBase64 ?? undefined,
    });
  }

  return reply.status(201).send(serializedOrder);
}

export async function getMyOrders(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  const orders = await listAccessibleOrders(user);
  return reply.send(await addTrackingBatch(orders));
}

export async function getAllOrders(request: FastifyRequest, reply: FastifyReply) {
  const orders = await prisma.order.findMany({
    include: ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return reply.send(await addTrackingBatch(orders));
}

export async function getAvailableCouriers(request: FastifyRequest, reply: FastifyReply) {
  const couriers = await CourierAssignmentService.rankEligibleCouriers();

  return reply.send(
    couriers.map((courier) => ({
      id: courier.id,
      fullName: courier.fullName,
      phoneNumber: courier.phoneNumber,
      activeAssignments: courier.activeAssignments,
      isOnline: courier.isOnline,
      isAcceptingOrders: courier.isAcceptingOrders,
      rank: courier.rank,
      distanceMeters: courier.metrics.distanceMeters,
      etaMinutes: courier.metrics.etaMinutes,
      rankingSource: courier.metrics.source,
      hasLiveLocation: courier.metrics.hasLiveLocation,
      liveLocationUpdatedAt: courier.metrics.liveLocationUpdatedAt,
    })),
  );
}

export async function getOrderDetail(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;
  const order = await getTrackableOrder(request.params.id);

  if (!order) {
    return reply.status(404).send({ error: 'Buyurtma topilmadi' });
  }

  if (!hasOrderAccess(order, requester)) {
    return reply.status(403).send({ error: "Bu buyurtmaga kirish ruxsati yo'q" });
  }

  return reply.send(await addTracking(order));
}

export async function streamOrderTracking(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;
  const order = await getTrackableOrder(request.params.id);

  if (!order) {
    return reply.status(404).send({ error: 'Buyurtma topilmadi' });
  }

  if (!hasOrderAccess(order, requester)) {
    return reply.status(403).send({ error: "Bu buyurtmaga kirish ruxsati yo'q" });
  }

  reply.hijack();
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  reply.raw.flushHeaders?.();

  const sendEvent = (payload: unknown) => {
    reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  reply.raw.write('retry: 3000\n\n');
  sendEvent({
    type: 'snapshot',
    orderId: order.id,
    order: await addTracking(order),
    tracking: await orderTrackingService.getSnapshot(order.id),
  });

  const heartbeat = setInterval(() => {
    reply.raw.write(': keep-alive\n\n');
  }, 15_000);

  const unsubscribe = orderTrackingService.subscribe(order.id, (event) => {
    sendEvent(event);
  });

  request.raw.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    reply.raw.end();
  });
}

export async function streamOrders(request: FastifyRequest, reply: FastifyReply) {
  const requester = request.user as any;
  const rawOrders = await listAccessibleOrders(requester);
  const resolvedInitialOrders = await addTrackingBatch(rawOrders);
  const accessibleOrderIds = new Set(resolvedInitialOrders.map((order) => order.id));

  reply.hijack();
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  reply.raw.flushHeaders?.();

  const sendEvent = (payload: unknown) => {
    reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  reply.raw.write('retry: 3000\n\n');

  // tracking already included from addTrackingBatch — no extra DB call
  for (const order of resolvedInitialOrders) {
    sendEvent({
      type: 'snapshot',
      orderId: order.id,
      order,
      tracking: order.tracking,
    });
  }

  const heartbeat = setInterval(() => {
    reply.raw.write(': keep-alive\n\n');
  }, 15_000);

  const unsubscribe = orderTrackingService.subscribeAll((event) => {
    if (requester.role === UserRoleEnum.ADMIN) {
      sendEvent(event);
      accessibleOrderIds.add(event.orderId);
      return;
    }

    if (event.order) {
      const isVisible = isOrderVisibleToRequester(event.order, requester);

      if (isVisible) {
        accessibleOrderIds.add(event.orderId);
        sendEvent(event);
        return;
      }

      if (accessibleOrderIds.has(event.orderId)) {
        accessibleOrderIds.delete(event.orderId);
        sendEvent({
          type: 'order.removed',
          orderId: event.orderId,
        });
      }

      return;
    }

    if (accessibleOrderIds.has(event.orderId)) {
      sendEvent(event);
    }
  });

  request.raw.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    reply.raw.end();
  });
}

export async function handleUpdateStatus(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply,
) {
  const admin = request.user as any;
  const { status } = request.body as any;

  const order = await prisma.order.findUnique({
    where: { id: request.params.id },
    include: {
      courierAssignments: {
        orderBy: { assignedAt: 'desc' },
      },
    },
  });

  if (!order) {
    return reply.status(404).send({ error: 'Buyurtma topilmadi' });
  }

  if (!StatusService.validateOrderStatusTransition(order.status as OrderStatusEnum, status)) {
    return reply.status(400).send({
      error: `Statusni ozgartirib bolmaydi: ${order.status} -> ${status}`,
    });
  }

  const now = new Date();
  const activeAssignment = order.courierAssignments.find((assignment: any) =>
    StatusService.isActiveAssignmentStatus(assignment.status),
  );

  if (status === OrderStatusEnum.DELIVERING && !activeAssignment) {
    return reply.status(400).send({
      error: "Buyurtmani yolga chiqarishdan oldin kuryer biriktiring",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status },
    });

    if (status === OrderStatusEnum.DELIVERING && activeAssignment) {
      await tx.courierAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          status: 'DELIVERING' as any,
          acceptedAt: activeAssignment.acceptedAt || now,
          pickedUpAt: activeAssignment.pickedUpAt || now,
          deliveringAt: activeAssignment.deliveringAt || now,
        },
      });

      await tx.courierAssignmentEvent.create({
        data: {
          assignmentId: activeAssignment.id,
          orderId: order.id,
          courierId: activeAssignment.courierId,
          eventType: 'DELIVERING' as any,
          eventAt: now,
          actorUserId: admin.id,
        },
      });
    }

    if (status === OrderStatusEnum.DELIVERED && activeAssignment) {
      await tx.courierAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          status: 'DELIVERED' as any,
          acceptedAt: activeAssignment.acceptedAt || now,
          pickedUpAt: activeAssignment.pickedUpAt || now,
          deliveringAt: activeAssignment.deliveringAt || now,
          deliveredAt: activeAssignment.deliveredAt || now,
        },
      });

      await tx.courierAssignmentEvent.create({
        data: {
          assignmentId: activeAssignment.id,
          orderId: order.id,
          courierId: activeAssignment.courierId,
          eventType: 'DELIVERED' as any,
          eventAt: now,
          actorUserId: admin.id,
        },
      });
    }

    if (status === OrderStatusEnum.CANCELLED) {
      const activeAssignments = order.courierAssignments.filter((assignment: any) =>
        StatusService.isActiveAssignmentStatus(assignment.status),
      );

      await tx.courierAssignment.updateMany({
        where: {
          orderId: order.id,
          status: {
            in: ACTIVE_ASSIGNMENT_STATUSES as any,
          },
        },
        data: {
          status: 'CANCELLED' as any,
          cancelledAt: now,
        },
      });

      if (activeAssignments.length > 0) {
        await tx.courierAssignmentEvent.createMany({
          data: activeAssignments.map((assignment: any) => ({
            assignmentId: assignment.id,
            orderId: order.id,
            courierId: assignment.courierId,
            eventType: 'CANCELLED' as any,
            eventAt: now,
            actorUserId: admin.id,
          })),
        });
      }
    }
  });

  await AuditService.record({
    userId: admin.id,
    actorRole: admin.role,
    action: 'STATUS_CHANGE',
    entity: 'Order',
    entityId: order.id,
    oldValue: { status: order.status },
    newValue: { status },
  });

  await dispatchOrderStatusNotifications({
    status,
    order,
  });

  const serializedOrder = await publishOrderSnapshot(order.id);
  return reply.send(serializedOrder);
}

export async function handleAssignCourier(
  request: FastifyRequest<{ Params: { id: string }; Body: { courierId: string } }>,
  reply: FastifyReply,
) {
  const admin = request.user as any;
  const { courierId } = request.body;
  const order = await prisma.order.findUnique({
    where: { id: request.params.id },
    include: {
      courierAssignments: {
        include: {
          courier: true,
        },
        orderBy: { assignedAt: 'desc' },
      },
    },
  });

  if (!order) {
    return reply.status(404).send({ error: 'Buyurtma topilmadi' });
  }

  if (order.status === OrderStatusEnum.DELIVERED || order.status === OrderStatusEnum.CANCELLED) {
    return reply.status(400).send({ error: "Yakunlangan buyurtmaga kuryer biriktirib bolmaydi" });
  }

  const courier = await prisma.user.findFirst({
    where: {
      id: courierId,
      isActive: true,
      role: UserRoleEnum.COURIER as any,
    },
  });

  if (!courier) {
    return reply.status(404).send({ error: 'Tanlangan kuryer topilmadi' });
  }

  const rankedCouriers = await CourierAssignmentService.rankEligibleCouriers();
  const selectedCandidate = rankedCouriers.find((candidate) => candidate.id === courierId);

  if (!selectedCandidate) {
    return reply.status(400).send({
      error: "Tanlangan kuryer hozir buyurtma qabul qilishga tayyor emas",
    });
  }

  const activeAssignment = order.courierAssignments.find((assignment: any) =>
    StatusService.isActiveAssignmentStatus(assignment.status),
  );

  if (activeAssignment?.courierId === courierId) {
    return reply.send(await getSerializedOrder(order.id));
  }

  let assignment;
  try {
    assignment = await CourierAssignmentService.assignCourierToOrder(order.id, courierId, {
      assignedByUserId: admin.id,
      actorRole: admin.role,
      mode: 'MANUAL',
      metrics: selectedCandidate.metrics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kuryerni biriktirib bo`lmadi';
    const statusCode =
      message === 'Buyurtma topilmadi' ? 404 :
      message === "Yakunlangan buyurtmaga kuryer biriktirib bo'lmaydi" ? 400 :
      message === "Tanlangan kuryer hozir buyurtma qabul qilishga tayyor emas" ? 400 :
      400;

    return reply.status(statusCode).send({ error: message });
  }

  const serializedOrder = await getSerializedOrder(order.id);

  await AuditService.record({
    userId: admin.id,
    actorRole: admin.role,
    action: activeAssignment ? 'REASSIGN_COURIER' : 'ASSIGN_COURIER',
    entity: 'Order',
    entityId: order.id,
    oldValue: {
      courierId: activeAssignment?.courierId,
      courierName: activeAssignment?.courier?.fullName,
    },
    newValue: {
      assignmentId: assignment.assignmentId,
      courierId,
      courierName: assignment.courierName,
      etaMinutes: assignment.etaMinutes,
      distanceMeters: assignment.distanceMeters,
    },
  });

  if (serializedOrder) {
    orderTrackingService.publishOrderUpdate(order.id, serializedOrder);
  }

  await InAppNotificationsService.notifyUser({
    userId: order.userId,
    roleTarget: UserRoleEnum.CUSTOMER,
    type: NotificationTypeEnum.ORDER_STATUS_UPDATE,
    title: 'Kuryer biriktirildi',
    message: `#${String(order.orderNumber)} buyurtmangizga ${assignment.courierName} biriktirildi`,
    relatedOrderId: order.id,
  });
  return reply.send(serializedOrder);
}

export async function handleApprovePayment(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const admin = request.user as any;
  const order: OrderWithRelations | null = await prisma.order.findUnique({
    where: { id: request.params.id },
    include: ORDER_INCLUDE,
  });

  if (!order) {
    return reply.status(404).send({ error: 'Buyurtma topilmadi' });
  }

  if (!order.payment) {
    return reply.status(400).send({ error: "Buyurtmaga tegishli to'lov topilmadi" });
  }

  const payment = order.payment;

  if (order.paymentStatus === PaymentStatusEnum.COMPLETED) {
    return reply.send(await addTracking(order));
  }

  if (order.paymentStatus !== PaymentStatusEnum.PENDING) {
    return reply.status(400).send({ error: "Faqat kutilayotgan to'lov tasdiqlanadi" });
  }

  if (order.status === OrderStatusEnum.CANCELLED) {
    return reply.status(400).send({ error: "Bekor qilingan buyurtma to'lovini tasdiqlab bo'lmaydi" });
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        status: PaymentStatusEnum.COMPLETED as any,
        verifiedByAdminId: admin.id,
        verifiedAt: now,
        rejectionReason: null,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatusEnum.COMPLETED as any,
      },
    });
  });

  const serializedOrder = await publishOrderSnapshot(order.id);

  await AuditService.record({
    userId: admin.id,
    actorRole: admin.role,
    action: 'VERIFY_PAYMENT',
    entity: 'Payment',
    entityId: payment.id,
    oldValue: {
      paymentStatus: order.paymentStatus,
      verifiedAt: payment.verifiedAt?.toISOString(),
    },
    newValue: {
      paymentStatus: PaymentStatusEnum.COMPLETED,
      verifiedAt: now.toISOString(),
      verifiedByAdminId: admin.id,
    },
    metadata: {
      orderId: order.id,
    },
  });

  await InAppNotificationsService.notifyUser({
    userId: order.userId,
    roleTarget: UserRoleEnum.CUSTOMER,
    type: NotificationTypeEnum.SUCCESS,
    title: "To'lov tasdiqlandi",
    message: `#${String(order.orderNumber)} buyurtma uchun to'lov qabul qilindi`,
    relatedOrderId: order.id,
  });

  return reply.send(serializedOrder);
}

export async function handleRejectPayment(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
  reply: FastifyReply,
) {
  const admin = request.user as any;
  const { reason } = request.body ?? {};
  const rejectionReason = reason?.trim() || 'Admin tomonidan to\'lov rad etildi';

  const order: OrderWithRelations | null = await prisma.order.findUnique({
    where: { id: request.params.id },
    include: ORDER_INCLUDE,
  });

  if (!order) {
    return reply.status(404).send({ error: 'Buyurtma topilmadi' });
  }

  if (!order.payment) {
    return reply.status(400).send({ error: "Buyurtmaga tegishli to'lov topilmadi" });
  }

  const payment = order.payment;

  if (order.paymentStatus !== PaymentStatusEnum.PENDING) {
    return reply.status(400).send({ error: "Faqat kutilayotgan to'lov rad etiladi" });
  }

  if (order.status === OrderStatusEnum.DELIVERED) {
    return reply.status(400).send({ error: "Yetkazilgan buyurtma to'lovini rad etib bo'lmaydi" });
  }

  const now = new Date();
  const shouldCancelOrder = order.status !== OrderStatusEnum.CANCELLED;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        status: PaymentStatusEnum.FAILED as any,
        rejectionReason,
        verifiedByAdminId: null,
        verifiedAt: null,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatusEnum.FAILED as any,
        status: shouldCancelOrder ? (OrderStatusEnum.CANCELLED as any) : undefined,
      },
    });

    const activeAssignments = order.courierAssignments.filter((assignment: any) =>
      StatusService.isActiveAssignmentStatus(assignment.status),
    );

    await tx.courierAssignment.updateMany({
      where: {
        orderId: order.id,
        status: {
          in: ACTIVE_ASSIGNMENT_STATUSES as any,
        },
      },
      data: {
        status: 'CANCELLED' as any,
        cancelledAt: now,
      },
    });

    if (activeAssignments.length > 0) {
      await tx.courierAssignmentEvent.createMany({
        data: activeAssignments.map((assignment: any) => ({
          assignmentId: assignment.id,
          orderId: order.id,
          courierId: assignment.courierId,
          eventType: 'CANCELLED' as any,
          eventAt: now,
          actorUserId: admin.id,
          payload: {
            reason: rejectionReason,
          },
        })),
      });
    }
  });

  const serializedOrder = await publishOrderSnapshot(order.id);

  await AuditService.record({
    userId: admin.id,
    actorRole: admin.role,
    action: 'REJECT_PAYMENT',
    entity: 'Payment',
    entityId: payment.id,
    oldValue: {
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      rejectionReason: payment.rejectionReason,
    },
    newValue: {
      paymentStatus: PaymentStatusEnum.FAILED,
      orderStatus: shouldCancelOrder ? OrderStatusEnum.CANCELLED : order.status,
      rejectionReason,
    },
    metadata: {
      orderId: order.id,
    },
  });

  if (shouldCancelOrder) {
    await AuditService.recordStatusChange({
      userId: admin.id,
      entity: 'Order',
      entityId: order.id,
      from: order.status,
      to: OrderStatusEnum.CANCELLED,
    });
  }

  await InAppNotificationsService.notifyUser({
    userId: order.userId,
    roleTarget: UserRoleEnum.CUSTOMER,
    type: NotificationTypeEnum.ERROR,
    title: "To'lov rad etildi",
    message: `#${String(order.orderNumber)} buyurtma to'lovi rad etildi`,
    relatedOrderId: order.id,
  });

  return reply.send(serializedOrder);
}

/**
 * PATCH /orders/:id/rating
 * Customer rates a delivered order (1–5 stars + optional note).
 * Only the order owner can rate, only once, only after DELIVERED status.
 */
export async function rateOrder(
  request: FastifyRequest<{ Params: { id: string }; Body: { rating: number; note?: string } }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;
  const { id } = request.params;
  const { rating, note } = request.body;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return reply.status(400).send({ error: "Baho 1 dan 5 gacha bo'lishi kerak" });
  }

  const order = await prisma.order.findFirst({ where: { id, userId: requester.id } });
  if (!order) return reply.status(404).send({ error: 'Buyurtma topilmadi' });
  if (order.status !== 'DELIVERED') {
    return reply.status(400).send({ error: 'Faqat yetkazilgan buyurtmani baholash mumkin' });
  }
  if ((order as any).customerRating !== null) {
    return reply.status(409).send({ error: 'Bu buyurtma allaqachon baholangan' });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { customerRating: rating, customerRatingNote: note?.trim() || null },
    include: ORDER_INCLUDE as any,
  });

  return reply.send(updated);
}
