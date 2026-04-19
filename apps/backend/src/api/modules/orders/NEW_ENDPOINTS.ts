// NEW API ENDPOINTS FOR PRODUCTION FIXES
// Add these to apps/backend/src/api/modules/orders/orders.controller.ts

import type { FastifyReply, FastifyRequest } from 'fastify';
import { OrderStatusEnum, UserRoleEnum } from '@turon/shared';
import { prisma } from '../../../lib/prisma.js';
import { AuditService } from '../../../services/audit.service.js';
import { orderTrackingService } from '../../../services/order-tracking.service.js';
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  ORDER_INCLUDE,
  serializeOrder,
} from './order-helpers.js';

async function publishOrderSnapshot(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: ORDER_INCLUDE,
  });

  if (!order) {
    return null;
  }

  const serializedOrder = {
    ...serializeOrder(order),
    tracking: await orderTrackingService.getSnapshot(orderId),
  };

  orderTrackingService.publishOrderUpdate(orderId, serializedOrder);
  return serializedOrder;
}

export async function handleGetPaymentReceipt(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;
  const order = await prisma.order.findUnique({
    where: { id: request.params.id },
    include: { payment: true },
  });

  if (!order) {
    return reply.status(404).send({ error: 'Buyurtma topilmadi' });
  }

  // Only admin can view receipts
  if (requester.role !== UserRoleEnum.ADMIN) {
    return reply.status(403).send({ error: "Bu ma'lumotga kirish ruxsati yo'q" });
  }

  if (!order.payment?.receiptImageBase64) {
    return reply.status(404).send({ error: "Bu buyurtma uchun receipt topilmadi" });
  }

  return reply.send({
    orderId: order.id,
    orderNumber: order.orderNumber,
    receiptImageBase64: order.payment.receiptImageBase64,
    uploadedAt: order.payment.receiptUploadedAt,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.payment.status,
  });
}

export async function handleSubmitDeliveryProof(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply,
) {
  const courier = request.user as any;
  const { photoBase64, gpsLatitude, gpsLongitude, customerOtp } = request.body as any;

  const order = await prisma.order.findUnique({
    where: { id: request.params.id },
    include: {
      courierAssignments: {
        where: {
          courierId: courier.id,
          status: { in: ACTIVE_ASSIGNMENT_STATUSES as any },
        },
      },
      deliveryAddress: true,
    },
  });

  if (!order) {
    return reply.status(404).send({ error: 'Buyurtma topilmadi' });
  }

  if (!order.courierAssignments.length) {
    return reply.status(403).send({ error: "Bu buyurtma siz uchun emas" });
  }

  if (!photoBase64 || typeof photoBase64 !== 'string') {
    return reply.status(400).send({ error: "To'lov proof fotografi kerak" });
  }

  // Validate GPS if provided
  let distanceMeters: number | null = null;
  if (gpsLatitude !== undefined && gpsLongitude !== undefined) {
    const gpsDistance = calculateDistance(
      Number(gpsLatitude),
      Number(gpsLongitude),
      Number(order.destinationLat),
      Number(order.destinationLng),
    );
    
    if (gpsDistance > 200) {
      return reply.status(400).send({
        error: `Siz manzildan ${gpsDistance}m uzoq. Manzilga yaqinroq turing.`,
        distanceMeters: gpsDistance,
      });
    }
    
    distanceMeters = gpsDistance;
  }

  // Save proof
  const proof = await prisma.deliveryProof.create({
    data: {
      orderId: order.id,
      courierAssignmentId: order.courierAssignments[0].id,
      photoBase64,
      gpsLatitude: gpsLatitude ? Number(gpsLatitude) : null,
      gpsLongitude: gpsLongitude ? Number(gpsLongitude) : null,
      distanceMeters,
      customerOtp: customerOtp?.trim() || null,
      createdAt: new Date(),
    },
  });

  // Mark order as delivered
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatusEnum.DELIVERED as any },
    });

    await tx.courierAssignment.update({
      where: { id: order.courierAssignments[0].id },
      data: {
        status: 'DELIVERED' as any,
        deliveredAt: new Date(),
      },
    });
  });

  await AuditService.record({
    userId: courier.id,
    actorRole: courier.role,
    action: 'DELIVERY_COMPLETE',
    entity: 'Order',
    entityId: order.id,
    newValue: {
      status: OrderStatusEnum.DELIVERED,
      proofId: proof.id,
      gpsDistance: distanceMeters,
    },
  });

  const serializedOrder = await publishOrderSnapshot(order.id);
  return reply.send(serializedOrder);
}

export async function handleGetDeliveryProof(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;

  const proof = await prisma.deliveryProof.findFirst({
    where: { orderId: request.params.id },
  });

  if (!proof) {
    return reply.status(404).send({ error: "Delivery proof topilmadi" });
  }

  // Only admin or order owner can view
  const order = await prisma.order.findUnique({
    where: { id: request.params.id },
  });

  if (!order) {
    return reply.status(404).send({ error: 'Buyurtma topilmadi' });
  }

  const canView = requester.role === UserRoleEnum.ADMIN || order.userId === requester.id;
  if (!canView) {
    return reply.status(403).send({ error: "Bu ma'lumotga kirish ruxsati yo'q" });
  }

  return reply.send({
    orderId: proof.orderId,
    photoBase64: proof.photoBase64,
    gpsLatitude: proof.gpsLatitude,
    gpsLongitude: proof.gpsLongitude,
    distanceMeters: proof.distanceMeters,
    otpVerified: !!proof.otpVerifiedAt,
    createdAt: proof.createdAt,
  });
}

// Helper function for distance calculation
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c); // Distance in meters
}
