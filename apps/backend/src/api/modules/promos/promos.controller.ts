import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';
import { PromoDiscountTypeEnum } from '@turon/shared';
import { AuditService } from '../../../services/audit.service.js';

export async function validatePromoCode(
  request: FastifyRequest<{ Body: { code: string } }>,
  reply: FastifyReply
) {
  const { code } = request.body;
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase(), isActive: true }
  });

  if (!promo) {
    return reply.status(404).send({ isValid: false, message: 'Promokod topilmadi' });
  }

  const now = new Date();
  if (now > promo.endDate) {
    return reply.status(400).send({ isValid: false, message: 'Promokod muddati tugagan' });
  }

  if (promo.usageLimit && promo.timesUsed >= promo.usageLimit) {
    return reply.status(400).send({ isValid: false, message: 'Promokod limiti tugagan' });
  }

  return reply.send({
    isValid: true,
    promo: {
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: Number(promo.discountValue),
      minOrderValue: Number(promo.minOrderValue)
    }
  });
}

export async function getAllPromos(request: FastifyRequest, reply: FastifyReply) {
  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return reply.send(promos);
}

export async function handleCreatePromo(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const admin = request.user as any;
  const data = request.body as any;

  const promo = await prisma.promoCode.create({
    data: {
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      usageLimit: data.usageLimit
    }
  });

  await AuditService.record({
    userId: admin.id,
    action: 'CREATE_PROMO',
    entity: 'PromoCode',
    entityId: promo.id,
    newValue: promo
  });

  return reply.status(201).send(promo);
}
