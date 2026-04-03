import { FastifyReply, FastifyRequest } from 'fastify';
import {
  OrderStatusEnum,
  PaymentStatusEnum,
  UserRoleEnum,
} from '@turon/shared';
import { prisma } from '../../../lib/prisma.js';
import { AuditService } from '../../../services/audit.service.js';
import { CourierAssignmentService } from '../../../services/courier-assignment.service.js';
import { DeliveryQuoteService } from '../../../services/delivery-quote.service.js';
import { orderTrackingService } from '../../../services/order-tracking.service.js';
import { StatusService } from '../../../services/status.service.js';
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  ORDER_INCLUDE,
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
      include: ORDER_INCLUDE,
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
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  return prisma.order.findMany({
    where: { userId: requester.id },
    include: ORDER_INCLUDE,
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
  const { promo, discountAmount } = await resolvePromo(input.promoCode, subtotal);

  const quote = await DeliveryQuoteService.calculate({
    subtotal,
    discountAmount,
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
  const { items, deliveryAddressId, paymentMethod, promoCode, note } = request.body as any;
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

  recordOrderCreatedAudit({
    userId: user.id,
    actorRole: user.role,
    orderId: createdOrder.id,
    serializedOrder,
  });
  void continueAutoAssignmentAfterOrderCreation(createdOrder.id);
  return reply.status(201).send(serializedOrder);
}

export async function getMyOrders(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  const orders = await listAccessibleOrders(user);
  return reply.send(await Promise.all(orders.map((order) => addTracking(order))));
}

export async function getAllOrders(request: FastifyRequest, reply: FastifyReply) {
  const orders = await prisma.order.findMany({
    include: ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  return reply.send(await Promise.all(orders.map((order) => addTracking(order))));
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
  const initialOrders = (await listAccessibleOrders(requester)).map(addTracking);
  const resolvedInitialOrders = await Promise.all(initialOrders);
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

  for (const order of resolvedInitialOrders) {
    sendEvent({
      type: 'snapshot',
      orderId: order.id,
      order,
      tracking: await orderTrackingService.getSnapshot(order.id),
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

  return reply.send(serializedOrder);
}
