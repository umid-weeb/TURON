import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';

/**
 * Normalize a raw phone string to +998XXXXXXXXX international format.
 *
 * Accepts:
 *   +998901234567   (13 chars with +)
 *    998901234567   (12 digits, no +)
 *     901234567     (9 digits, local short)
 *    0901234567     (10 digits, local with leading 0)
 *
 * Returns null if the number is not recognisable as Uzbek.
 */
function normalizeUzbekPhone(raw: string): string | null {
  // Strip everything except digits
  const digits = raw.replace(/\D/g, '');

  // +998 prefix already present → "998XXXXXXXXX" (12 digits)
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits}`;
  }

  // Local with leading 0 → "0XXXXXXXXX" (10 digits)
  if (digits.length === 10 && digits.startsWith('0')) {
    return `+998${digits.slice(1)}`;
  }

  // Short local → "XXXXXXXXX" (9 digits)
  if (digits.length === 9) {
    return `+998${digits}`;
  }

  return null;
}

/**
 * PATCH /users/me/phone
 *
 * Body: { phone: string }
 *
 * Validates, normalises, and persists the caller's phone number.
 * Returns { phoneNumber } so the client can update its auth store.
 */
export async function saveUserPhone(
  request: FastifyRequest<{ Body: { phone: string | null } }>,
  reply: FastifyReply,
) {
  const user = request.user as any;
  const raw: string = (request.body?.phone ?? '').trim();

  if (!raw) {
    return reply.status(400).send({ error: 'Telefon raqam kiritilmagan' });
  }

  const normalized = normalizeUzbekPhone(raw);
  if (!normalized) {
    return reply.status(400).send({
      error: "Noto'g'ri telefon raqam formati. Masalan: +998901234567",
    });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phoneNumber: normalized },
    select: { id: true, phoneNumber: true },
  });

  return reply.send({ phoneNumber: updated.phoneNumber });
}

/**
 * DELETE /users/me/phone
 *
 * Temporarily allows customers to remove a saved phone number. New orders still
 * require a phone, so checkout will ask again when needed.
 */
export async function deleteUserPhone(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as any;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phoneNumber: null },
    select: { id: true, phoneNumber: true },
  });

  return reply.send({ phoneNumber: updated.phoneNumber });
}
