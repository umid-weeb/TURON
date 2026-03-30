import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';
import { 
  OrderStatusEnum, 
  PaymentStatusEnum, 
  DeliveryStageEnum, 
  CourierAssignmentStatusEnum 
} from '@turon/shared';
import { StatusService } from '../../../services/status.service.js';
import { AuditService } from '../../../services/audit.service.js';

export async function handleCreateOrder(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const user = request.user as any;
  const { items, deliveryAddressId, paymentMethod, promoCode } = request.body as any;

  // 1. Validate items and availability
  const dbItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((i: any) => i.menuItemId) }, isActive: true }
  });

  if (dbItems.length !== items.length) {
    return reply.status(400).send({ error: 'Ba`zi taomlar ochirilgan yoki topilmadi' });
  }

  // 2. Calculate totals on backend
  let subtotal = 0;
  const orderItemsData = items.map((i: any) => {
    const dbItem = dbItems.find((d: any) => d.id === i.menuItemId)!;
    const price = Number(dbItem.price);
    subtotal += price * i.quantity;
    return {
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      priceAtOrder: dbItem.price
    };
  });

  // 3. Handle Promo (Backend Validation)
  let discountAmount = 0;
  let promoId = null;
  if (promoCode) {
    const promo = await prisma.promoCode.findUnique({
      where: { code: promoCode.toUpperCase(), isActive: true }
    });

    if (promo && new Date() <= promo.endDate && subtotal >= Number(promo.minOrderValue)) {
      promoId = promo.id;
      if (promo.discountType === 'PERCENTAGE') {
        discountAmount = (subtotal * Number(promo.discountValue)) / 100;
      } else {
        discountAmount = Number(promo.discountValue);
      }
    }
  }

  const deliveryFee = 15000; // Hardcoded foundation
  const totalAmount = subtotal - discountAmount + deliveryFee;

  // 4. Create Order + OrderItems (Transaction)
  const order = await prisma.$transaction(async (tx: any) => {
    const newOrder = await tx.order.create({
      data: {
        userId: user.id,
        status: OrderStatusEnum.PENDING,
        deliveryStage: DeliveryStageEnum.IDLE,
        subtotal,
        discountAmount,
        deliveryFee,
        totalAmount,
        paymentMethod,
        paymentStatus: PaymentStatusEnum.PENDING,
        deliveryAddressId,
        promoCodeId: promoId,
        items: { create: orderItemsData }
      }
    });

    // Clear cart if needed
    await tx.cartItem.deleteMany({
      where: { cart: { userId: user.id } }
    });

    return newOrder;
  });

  // 5. Audit Log
  await AuditService.record({
    userId: user.id,
    action: 'CREATE_ORDER',
    entity: 'Order',
    entityId: order.id,
    newValue: order
  });

  return reply.status(201).send(order);
}

export async function getMyOrders(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: 'desc' }
  });
  return reply.send(orders);
}

export async function getOrderDetail(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const order = await prisma.order.findUnique({
    where: { id: request.params.id },
    include: {
      user: true,
      items: { include: { menuItem: true } },
      deliveryAddress: true,
      courierAssignments: { include: { courier: true } }
    }
  });
  if (!order) return reply.status(404).send({ error: 'Buyurtma topilmadi' });
  return reply.send(order);
}

export async function handleUpdateStatus(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply
) {
  const admin = request.user as any;
  const { status } = request.body as any;

  const order = await prisma.order.findUnique({ where: { id: request.params.id } });
  if (!order) return reply.status(404).send({ error: 'Buyurtma topilmadi' });

  // Status transition validation
  if (!StatusService.validateOrderStatusTransition(order.status as OrderStatusEnum, status)) {
    return reply.status(400).send({ 
       error: `Statusni ozgartirib bolmaydi: ${order.status} -> ${status}` 
    });
  }

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: { status }
  });

  await AuditService.recordStatusChange({
    userId: admin.id,
    entity: 'Order',
    entityId: order.id,
    from: order.status,
    to: status
  });

  return reply.send(updatedOrder);
}

export async function handleAssignCourier(
  request: FastifyRequest<{ Params: { id: string }; Body: { courierId: string } }>,
  reply: FastifyReply
) {
  const admin = request.user as any;
  const { courierId } = request.body;

  const assignment = await prisma.courierAssignment.create({
    data: {
      orderId: request.params.id,
      courierId,
      status: CourierAssignmentStatusEnum.ASSIGNED
    }
  });

  await AuditService.record({
    userId: admin.id,
    action: 'ASSIGN_COURIER',
    entity: 'CourierAssignment',
    entityId: assignment.id,
    newValue: assignment
  });

  return reply.send(assignment);
}
