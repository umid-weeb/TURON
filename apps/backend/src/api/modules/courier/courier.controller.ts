import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';
import { 
  DeliveryStageEnum, 
  CourierAssignmentStatusEnum, 
  OrderStatusEnum 
} from '@turon/shared';
import { StatusService } from '../../../services/status.service.js';
import { AuditService } from '../../../services/audit.service.js';

export async function getCourierOrders(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as any;
  const courierId = user.id;

  const assignments = await prisma.courierAssignment.findMany({
    where: {
      courierId,
      status: { in: [CourierAssignmentStatusEnum.ASSIGNED, CourierAssignmentStatusEnum.REJECTED] }
    },
    include: {
      order: {
        include: {
          user: true,
          deliveryAddress: true
        }
      }
    },
    orderBy: { assignedAt: 'desc' }
  });

  const formattedOrders = assignments.map((a: any) => ({
    id: a.order.id,
    orderNumber: a.order.orderNumber,
    status: a.order.status,
    deliveryStage: a.order.deliveryStage,
    totalAmount: a.order.totalAmount,
    paymentMethod: a.order.paymentMethod,
    customerName: `${a.order.user.firstName} ${a.order.user.lastName || ''}`.trim(),
    destinationAddress: a.order.deliveryAddress.address,
    createdAt: a.order.createdAt
  }));

  return reply.send(formattedOrders);
}

export async function getCourierOrderDetail(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const user = request.user as any;
  const courierId = user.id;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      deliveryAddress: true,
      courierAssignments: {
          where: { courierId }
      }
    }
  });

  if (!order || order.courierAssignments.length === 0) {
    return reply.status(403).send({ error: 'Ruxsat etilmadi: Bu buyurtma sizga tegishli emas.' });
  }

  return reply.send({
    ...order,
    customerName: `${order.user.firstName} ${order.user.lastName || ''}`,
    customerPhone: order.user.phoneNumber,
    destinationAddress: order.deliveryAddress.address,
    pickupLat: order.pickupLat || 41.311081,
    pickupLng: order.pickupLng || 69.240562,
    destinationLat: order.deliveryAddress.latitude,
    destinationLng: order.deliveryAddress.longitude
  });
}

export async function updateOrderStage(
  request: FastifyRequest<{ Params: { id: string }; Body: { stage: DeliveryStageEnum } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { stage } = request.body;
  const user = request.user as any;
  const courierId = user.id;

  // 1. Fetch current order state
  const order = await prisma.order.findUnique({
    where: { id },
    include: { courierAssignments: { where: { courierId } } }
  });

  if (!order || order.courierAssignments.length === 0) {
    return reply.status(403).send({ error: 'Ruxsat etilmadi.' });
  }

  // 2. Sequential Validation via StatusService
  const currentStage = order.deliveryStage as DeliveryStageEnum;
  const isValidTransition = StatusService.validateDeliveryStageTransition(currentStage, stage);

  if (!isValidTransition) {
    return reply.status(400).send({ 
       error: `Bosqichni o'zgartirib bo'lmaydi: ${currentStage} -> ${stage}` 
    });
  }

  // 3. Update Order and Record Time
  const updateData: any = { 
    deliveryStage: stage,
  };

  const newStatus = StatusService.mapStageToOrderStatus(stage);
  if (newStatus) {
    updateData.status = newStatus;
  }

  // Handle timestamps
  const now = new Date();
  if (stage === DeliveryStageEnum.PICKED_UP) updateData.pickupAt = now;
  if (stage === DeliveryStageEnum.DELIVERED) updateData.deliveredAt = now;

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: updateData
  });

  // 4. Centralized Audit Log
  await AuditService.record({
    userId: courierId,
    action: 'UPDATE_DELIVERY_STAGE',
    entity: 'Order',
    entityId: id,
    oldValue: { stage: currentStage },
    newValue: { stage: stage }
  });

  return reply.send(updatedOrder);
}
