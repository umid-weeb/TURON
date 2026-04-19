import { FastifyReply, FastifyRequest } from 'fastify';
import { DeliveryStageEnum, NotificationTypeEnum, RESTAURANT_COORDINATES } from '@turon/shared';
import { prisma } from '../../../lib/prisma.js';
import { AuditService } from '../../../services/audit.service.js';
import {
  CourierOrderActionsService,
  type CourierActionName,
} from '../../../services/courier-order-actions.service.js';
import { InAppNotificationsService } from '../../../services/in-app-notifications.service.js';
import { CourierOperationalStatusService } from '../../../services/courier-operational-status.service.js';
import { CourierPresenceService } from '../../../services/courier-presence.service.js';
import { locationWriteBuffer } from '../../../services/location-write-buffer.service.js';
import { CourierStatsService } from '../../../services/courier-stats.service.js';
import { orderTrackingService } from '../../../services/order-tracking.service.js';
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  ORDER_INCLUDE,
  getActiveCourierAssignment,
  serializeOrder,
} from '../orders/order-helpers.js';
import { eligibleCourierCache } from '../../../services/courier-assignment.service.js';

const COURIER_LIST_ASSIGNMENT_STATUSES = [
  'ASSIGNED',
  'ACCEPTED',
  'PICKED_UP',
  'DELIVERING',
  'DELIVERED',
] as const;

async function addTracking(order: any) {
  return {
    ...serializeOrder(order),
    tracking: await orderTrackingService.getSnapshot(order.id),
  };
}

function getDestinationAreaLabel(addressText?: string) {
  if (!addressText?.trim()) {
    return "Manzil ko'rsatilmagan";
  }

  const [primaryChunk] = addressText
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return primaryChunk || addressText.trim();
}

function getRelevantAssignment(order: any, requester: any) {
  const activeAssignment = getActiveCourierAssignment(order);
  if (activeAssignment?.courierId === requester.id) {
    return activeAssignment;
  }

  return (
    order.courierAssignments?.find(
      (assignment: any) =>
        assignment.courierId === requester.id &&
        COURIER_LIST_ASSIGNMENT_STATUSES.includes(assignment.status as any),
    ) || null
  );
}

async function getAccessibleCourierOrder(orderId: string, requester: any) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: ORDER_INCLUDE as any,
  });

  if (!order) {
    return null;
  }

  const relevantAssignment = getRelevantAssignment(order, requester);
  if (!relevantAssignment) {
    return null;
  }

  return { order, relevantAssignment };
}

function mapStageToCourierAction(stage: DeliveryStageEnum): CourierActionName {
  switch (stage) {
    case DeliveryStageEnum.IDLE:
    case DeliveryStageEnum.GOING_TO_RESTAURANT:
      return 'ACCEPT';
    case DeliveryStageEnum.ARRIVED_AT_RESTAURANT:
      return 'ARRIVE_RESTAURANT';
    case DeliveryStageEnum.PICKED_UP:
      return 'PICKUP';
    case DeliveryStageEnum.DELIVERING:
      return 'START_DELIVERY';
    case DeliveryStageEnum.ARRIVED_AT_DESTINATION:
      return 'ARRIVE_DESTINATION';
    case DeliveryStageEnum.DELIVERED:
      return 'DELIVER';
    default:
      throw new Error("Ushbu bosqich uchun amal topilmadi");
  }
}

async function publishCourierActionResult(
  result: Awaited<ReturnType<typeof CourierOrderActionsService.perform>>,
) {
  const serializedOrder = await addTracking(result.order);
  orderTrackingService.publishOrderUpdate(result.order.id, serializedOrder);
  return serializedOrder;
}

async function runCourierAction(
  request: FastifyRequest,
  reply: FastifyReply,
  input: {
    action: CourierActionName;
    problemText?: string;
    compatibilityStage?: DeliveryStageEnum;
  },
) {
  const requester = request.user as any;
  const params = request.params as { id: string };

  try {
    const result = await CourierOrderActionsService.perform({
      orderId: params.id,
      courierId: requester.id,
      actorUserId: requester.id,
      action: input.action,
      problemText: input.problemText,
    });

    await AuditService.record({
      userId: requester.id,
      actorRole: requester.role,
      action:
        input.action === 'REPORT_PROBLEM'
          ? 'REPORT_COURIER_PROBLEM'
          : 'UPDATE_DELIVERY_STAGE',
      entity: 'Order',
      entityId: result.order.id,
      oldValue: result.before,
      newValue: {
        ...result.after,
        eventType: result.eventType,
        compatibilityStage: input.compatibilityStage ?? null,
      },
      metadata: {
        assignmentId: result.assignmentId,
        eventId: result.eventId,
        action: input.action,
      },
    });

    if (result.before.orderStatus !== result.after.orderStatus) {
      await AuditService.recordStatusChange({
        userId: requester.id,
        entity: 'Order',
        entityId: result.order.id,
        from: result.before.orderStatus,
        to: result.after.orderStatus,
      });
    }

    return reply.send(await publishCourierActionResult(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kuryer amalini bajarib bo'lmadi";
    const statusCode =
      message === 'Buyurtma topilmadi' ? 404 :
      message === 'Ruxsat etilmadi' ? 403 :
      400;

    return reply.status(statusCode).send({ error: message });
  }
}

export async function getCourierStatus(request: FastifyRequest, reply: FastifyReply) {
  const requester = request.user as any;
  const summary = await CourierOperationalStatusService.getSummary(requester.id);
  return reply.send(summary);
}

export async function updateCourierStatus(
  request: FastifyRequest<{
    Body: {
      isOnline?: boolean;
      isAcceptingOrders?: boolean;
    };
  }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;

  try {
    const { before, after } = await CourierOperationalStatusService.updateSummary(
      requester.id,
      request.body ?? {},
    );

    // Kuryer holati o'zganda keshni tozalaymiz — keyingi autoAssign frash
    // ro'yxatni oladi (max 30s kechikish emas, darhol).
    if (before.isOnline !== after.isOnline || before.isAcceptingOrders !== after.isAcceptingOrders) {
      eligibleCourierCache.invalidate();
    }

    await AuditService.record({
      userId: requester.id,
      actorRole: requester.role,
      action: 'UPDATE_COURIER_OPERATIONAL_STATUS',
      entity: 'CourierOperationalStatus',
      entityId: requester.id,
      oldValue: before,
      newValue: after,
    });

    return reply.send(after);
  } catch (error) {
    return reply.status(400).send({
      error: error instanceof Error ? error.message : "Kuryer statusini yangilab bo'lmadi",
    });
  }
}

export async function getCourierTodayStats(request: FastifyRequest, reply: FastifyReply) {
  const requester = request.user as any;
  const stats = await CourierStatsService.getTodayStats(requester.id);
  return reply.send(stats);
}

export async function getCourierOrders(request: FastifyRequest, reply: FastifyReply) {
  const requester = request.user as any;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      courierAssignments: {
        some: {
          courierId: requester.id,
          OR: [
            // Active in-progress assignments — always show regardless of age
            { status: { in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] as any } },
            // Pending assignments — only show if assigned within the last 24 h
            { status: 'ASSIGNED' as any, assignedAt: { gte: yesterday } },
            // Completed today — show for review
            { status: 'DELIVERED' as any, deliveredAt: { gte: yesterday } },
          ],
        },
      },
    },
    include: ORDER_INCLUDE as any,
    orderBy: { createdAt: 'desc' },
  });

  const formattedOrders = orders.map((order: any) => {
    const relevantAssignment = getRelevantAssignment(order, requester) || order.courierAssignments?.[0];
    const latestEvent = relevantAssignment?.events?.[0];
    const serialized = serializeOrder({
      ...order,
      courierAssignments: relevantAssignment ? [relevantAssignment] : [],
    });
    const destinationAddress = serialized.customerAddress?.addressText || '';

    return {
      id: serialized.id,
      assignmentId: relevantAssignment?.id ?? null,
      orderNumber: serialized.orderNumber,
      orderStatus: serialized.orderStatus,
      deliveryStage: serialized.deliveryStage,
      courierAssignmentStatus: relevantAssignment?.status || serialized.courierAssignmentStatus,
      total: serialized.total,
      deliveryFee: serialized.deliveryFee,
      paymentMethod: serialized.paymentMethod,
      restaurantName: RESTAURANT_COORDINATES.name,
      distanceToRestaurantMeters:
        typeof relevantAssignment?.distanceMeters === 'number' ? relevantAssignment.distanceMeters : null,
      etaToRestaurantMinutes:
        typeof relevantAssignment?.etaMinutes === 'number' ? relevantAssignment.etaMinutes : null,
      customerName: serialized.customerName || 'Mijoz',
      destinationAddress,
      destinationArea: getDestinationAreaLabel(destinationAddress),
      createdAt: serialized.createdAt,
      assignedAt: relevantAssignment?.assignedAt?.toISOString?.() ?? null,
      acceptedAt: relevantAssignment?.acceptedAt?.toISOString?.() ?? null,
      itemCount: serialized.items.length,
      latestCourierEventType: latestEvent?.eventType ?? null,
    };
  });

  return reply.send(formattedOrders);
}

export async function getCourierOrderDetail(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;

  // Allow couriers to view any order they were ever assigned to (any status incl. DECLINED/DELIVERED)
  const order = await prisma.order.findFirst({
    where: {
      id: request.params.id,
      courierAssignments: { some: { courierId: requester.id } },
    },
    include: ORDER_INCLUDE as any,
  });

  if (!order) {
    return reply.status(403).send({ error: 'Ruxsat etilmadi: Bu buyurtma sizga tegishli emas.' });
  }

  return reply.send(await addTracking(order));
}

export async function updateOrderStage(
  request: FastifyRequest<{ Params: { id: string }; Body: { stage: DeliveryStageEnum } }>,
  reply: FastifyReply,
) {
  const { stage } = request.body;
  return runCourierAction(request, reply, {
    action: mapStageToCourierAction(stage),
    compatibilityStage: stage,
  });
}

export async function acceptCourierOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return runCourierAction(request, reply, { action: 'ACCEPT' });
}

export async function arriveAtRestaurant(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return runCourierAction(request, reply, { action: 'ARRIVE_RESTAURANT' });
}

export async function pickupCourierOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return runCourierAction(request, reply, { action: 'PICKUP' });
}

export async function startCourierDelivery(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return runCourierAction(request, reply, { action: 'START_DELIVERY' });
}

export async function arriveAtDestination(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return runCourierAction(request, reply, { action: 'ARRIVE_DESTINATION' });
}

const MAX_DELIVERY_DISTANCE_METERS = 300;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function deliverCourierOrder(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { gpsLatitude: number; gpsLongitude: number; gpsAccuracy?: number; photoBase64?: string };
  }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;
  const { id: orderId } = request.params;
  const { gpsLatitude, gpsLongitude, photoBase64 } = request.body;

  try {
    // 1. Load order — verify courier has access and get destination coordinates
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        courierAssignments: { some: { courierId: requester.id } },
      },
      include: ORDER_INCLUDE as any,
    });

    if (!order) {
      return reply.status(404).send({ error: 'Buyurtma topilmadi' });
    }

    // 2. Server-side GPS geofencing — cannot be bypassed by client
    const destLat = Number((order as any).destinationLat);
    const destLng = Number((order as any).destinationLng);
    const distanceMeters = haversineMeters(gpsLatitude, gpsLongitude, destLat, destLng);

    if (distanceMeters > MAX_DELIVERY_DISTANCE_METERS) {
      return reply.status(400).send({
        error: `Siz mijoz manzilidan ${Math.round(distanceMeters)}m uzoqdasiz. Topshirish uchun ${MAX_DELIVERY_DISTANCE_METERS}m yaqin bo'lishingiz kerak.`,
      });
    }

    // 3. Confirm courier is in DELIVERING status
    const assignment = (order as any).courierAssignments?.find(
      (a: any) => a.courierId === requester.id && a.status === 'DELIVERING',
    );

    if (!assignment) {
      return reply.status(400).send({
        error: "Buyurtmani topshirishdan oldin yo'lga chiqqan bo'lishingiz kerak",
      });
    }

    // 4. Atomic: save DeliveryProof + perform DELIVER in one transaction
    const result = await prisma.$transaction(async (tx) => {
      await (tx as any).deliveryProof.create({
        data: {
          orderId,
          courierAssignmentId: assignment.id,
          gpsLatitude,
          gpsLongitude,
          distanceMeters: Math.round(distanceMeters),
          photoBase64: photoBase64 ?? null,
        },
      });

      return CourierOrderActionsService.perform({
        orderId,
        courierId: requester.id,
        actorUserId: requester.id,
        action: 'DELIVER',
        db: tx,
      });
    }, { timeout: 15000, maxWait: 5000 });

    // 5. Audit
    await AuditService.record({
      userId: requester.id,
      actorRole: requester.role,
      action: 'UPDATE_DELIVERY_STAGE',
      entity: 'Order',
      entityId: result.order.id,
      oldValue: result.before,
      newValue: {
        ...result.after,
        eventType: result.eventType,
        podGpsLatitude: gpsLatitude,
        podGpsLongitude: gpsLongitude,
        podDistanceMeters: Math.round(distanceMeters),
      },
      metadata: {
        assignmentId: result.assignmentId,
        eventId: result.eventId,
        action: 'DELIVER',
      },
    });

    if (result.before.orderStatus !== result.after.orderStatus) {
      await AuditService.recordStatusChange({
        userId: requester.id,
        entity: 'Order',
        entityId: result.order.id,
        from: result.before.orderStatus,
        to: result.after.orderStatus,
      });
    }

    return reply.send(await publishCourierActionResult(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Topshirishda xatolik yuz berdi";
    const statusCode =
      message === 'Buyurtma topilmadi' ? 404 :
      message === 'Ruxsat etilmadi' ? 403 :
      400;
    return reply.status(statusCode).send({ error: message });
  }
}

export async function reportCourierProblem(
  request: FastifyRequest<{ Params: { id: string }; Body: { text: string } }>,
  reply: FastifyReply,
) {
  return runCourierAction(request, reply, {
    action: 'REPORT_PROBLEM',
    problemText: request.body.text,
  });
}

export async function declineCourierOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;
  const { id: orderId } = request.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE as any,
    });

    if (!order) {
      return reply.status(404).send({ error: 'Buyurtma topilmadi' });
    }

    // Find the ASSIGNED assignment belonging to this courier
    const assignment = (order as any).courierAssignments?.find(
      (a: any) => a.courierId === requester.id && a.status === 'ASSIGNED',
    );

    if (!assignment) {
      return reply.status(400).send({ error: "Rad etish uchun ASSIGNED topshiriq topilmadi" });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.courierAssignment.update({
        where: { id: assignment.id },
        data: { status: 'REJECTED' as any },
      });

      await tx.courierAssignmentEvent.create({
        data: {
          assignmentId: assignment.id,
          orderId: order.id,
          courierId: requester.id,
          eventType: 'CANCELLED' as any,
          eventAt: now,
          actorUserId: requester.id,
        },
      });

      await InAppNotificationsService.notifyAdmins(
        {
          type: NotificationTypeEnum.WARNING,
          title: 'Kuryer buyurtmani rad etdi',
          message: `#${String((order as any).orderNumber)} buyurtma kuryer tomonidan rad etildi. Qayta biriktirish kerak.`,
          relatedOrderId: order.id,
        },
        tx,
      );
    });

    // Refresh and broadcast the updated order
    const refreshedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE as any,
    });

    if (refreshedOrder) {
      const serialized = {
        ...serializeOrder(refreshedOrder),
        tracking: await orderTrackingService.getSnapshot(orderId),
      };
      orderTrackingService.publishOrderUpdate(orderId, serialized);
    }

    await AuditService.record({
      userId: requester.id,
      actorRole: requester.role,
      action: 'DECLINE_ORDER',
      entity: 'Order',
      entityId: orderId,
      oldValue: { assignmentStatus: 'ASSIGNED' },
      newValue: { assignmentStatus: 'REJECTED' },
      metadata: { assignmentId: assignment.id },
    });

    return reply.send({ success: true, orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Buyurtmani rad etib bo'lmadi";
    return reply.status(400).send({ error: message });
  }
}

export async function notifyApproaching(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;
  const { id: orderId } = request.params;

  try {
    const result = await getAccessibleCourierOrder(orderId, requester);
    if (!result) {
      return reply.status(403).send({ error: 'Ruxsat etilmadi' });
    }

    const order = result.order as any;

    // Fire-and-forget — do not await to keep response fast
    InAppNotificationsService.notifyUser({
      userId: order.userId,
      roleTarget: 'CUSTOMER' as any,
      type: NotificationTypeEnum.ORDER_STATUS_UPDATE,
      title: "Buyurtmangiz yetib kelmoqda! 🛵",
      message: `${String(requester.fullName || 'Kuryer')} 500 metrdan kam masofada — tez orada yetib boradi`,
      relatedOrderId: orderId,
    }).catch(() => {});

    return reply.send({ ok: true });
  } catch (error) {
    return reply.status(400).send({ error: error instanceof Error ? error.message : 'Xato' });
  }
}

export async function updateCourierLocation(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      latitude: number;
      longitude: number;
      heading?: number;
      speedKmh?: number;
      remainingDistanceKm?: number;
      remainingEtaMinutes?: number;
    };
  }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;
  const result = await getAccessibleCourierOrder(request.params.id, requester);

  if (!result) {
    return reply.status(403).send({ error: 'Ruxsat etilmadi.' });
  }

  const { order, relevantAssignment } = result;

  if (!ACTIVE_ASSIGNMENT_STATUSES.includes(relevantAssignment.status as any)) {
    return reply.status(400).send({
      error: 'Kuryer lokatsiyasi faqat faol biriktirish uchun yuboriladi',
    });
  }

  // ── HOT PATH OPTIMISATION ──────────────────────────────────────────────────
  // At 10 000 concurrent couriers, every sync DB upsert + audit write would
  // produce ~20 000 Postgres writes/sec.  Instead:
  //   1. Push to in-memory EventEmitter → SSE clients IMMEDIATELY (no DB wait)
  //   2. Enqueue to LocationWriteBuffer → flushed to DB every 10 s (100× fewer writes)
  //   3. AuditService REMOVED from this path — GPS coordinates have no audit value
  //      at 1-Hz frequency; stage changes / accept / decline are still audited.

  const { latitude, longitude, heading, speedKmh, remainingDistanceKm, remainingEtaMinutes } =
    request.body;
  const now = new Date().toISOString();

  // Step 1 — immediate SSE push (no DB)
  const tracking = orderTrackingService.publishCourierLocation(order.id, {
    latitude,
    longitude,
    heading,
    speedKmh,
    remainingDistanceKm,
    remainingEtaMinutes,
    updatedAt: now,
  });

  // Step 2 — deferred DB write (buffered, flushed every 10 s)
  locationWriteBuffer.enqueue({
    courierId: requester.id,
    orderId: order.id,
    latitude,
    longitude,
    heading: heading ?? null,
    speedKmh: speedKmh ?? null,
    remainingDistanceKm: remainingDistanceKm ?? null,
    remainingEtaMinutes: remainingEtaMinutes ?? null,
  });

  // Step 3 — AuditService call REMOVED (was 1 extra write per heartbeat)

  return reply.send({ orderId: order.id, tracking: tracking ?? { isLive: true, lastEventAt: now } });
}

export async function getNextAvailableOrder(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const requester = request.user as any;

  // Find next ASSIGNED order (not yet accepted by this courier)
  const nextOrder = await prisma.order.findFirst({
    where: {
      courierAssignments: {
        some: {
          courierId: requester.id,
          status: 'ASSIGNED' as any,
        },
      },
    },
    include: ORDER_INCLUDE as any,
    orderBy: { createdAt: 'asc' }, // Oldest first (FIFO)
  });

  if (!nextOrder) {
    // No available orders
    return reply.send({ noOrdersAvailable: true });
  }

  // Format as CourierOrderPreview
  const relevantAssignment = nextOrder.courierAssignments?.find(
    (a: any) => a.courierId === requester.id && a.status === 'ASSIGNED',
  );
  const serialized = serializeOrder(nextOrder);
  const destinationAddress = serialized.customerAddress?.addressText || '';

  const ra = relevantAssignment as any;
  return reply.send({
    order: {
      id: serialized.id,
      assignmentId: ra?.id ?? null,
      orderNumber: serialized.orderNumber,
      orderStatus: serialized.orderStatus,
      deliveryStage: serialized.deliveryStage,
      courierAssignmentStatus: 'ASSIGNED',
      total: serialized.total,
      deliveryFee: serialized.deliveryFee,
      paymentMethod: serialized.paymentMethod,
      restaurantName: RESTAURANT_COORDINATES.name,
      distanceToRestaurantMeters:
        typeof ra?.distanceMeters === 'number' ? ra.distanceMeters : null,
      etaToRestaurantMinutes:
        typeof ra?.etaMinutes === 'number' ? ra.etaMinutes : null,
      customerName: serialized.customerName || 'Mijoz',
      destinationAddress,
      destinationArea: getDestinationAreaLabel(destinationAddress),
      createdAt: serialized.createdAt,
      assignedAt: ra?.assignedAt?.toISOString?.() ?? null,
      acceptedAt: ra?.acceptedAt?.toISOString?.() ?? null,
      itemCount: serialized.items.length,
      latestCourierEventType: null,
    },
  });
}
