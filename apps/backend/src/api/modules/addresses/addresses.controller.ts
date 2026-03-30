import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';
import { AuditService } from '../../../services/audit.service.js';

export async function getAddresses(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;
  const addresses = await prisma.deliveryAddress.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });
  return reply.send(addresses);
}

export async function handleCreateAddress(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const user = request.user as any;
  const data = request.body as any;
  const address = await prisma.deliveryAddress.create({
    data: {
      userId: user.id,
      title: data.title || 'Manzil',
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude
    }
  });

  await AuditService.record({
    userId: user.id,
    action: 'CREATE_ADDRESS',
    entity: 'DeliveryAddress',
    entityId: address.id,
    newValue: address
  });

  return reply.status(201).send(address);
}

export async function handleDeleteAddress(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user as any;
  const { id } = request.params;

  const address = await prisma.deliveryAddress.findUnique({
    where: { id }
  });

  if (!address || address.userId !== user.id) {
    return reply.status(403).send({ error: 'Ruxsat etilmadi' });
  }

  await prisma.deliveryAddress.delete({ where: { id } });

  await AuditService.record({
    userId: user.id,
    action: 'DELETE_ADDRESS',
    entity: 'DeliveryAddress',
    entityId: id,
    oldValue: address
  });

  return reply.status(204).send();
}
