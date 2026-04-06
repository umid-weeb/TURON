import { FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { verifyTelegramWebAppData, parseTelegramInitData } from '../../utils/telegram.js';
import { LanguageEnum, UserRoleEnum } from '@turon/shared';
import { env } from '../../../config.js';
import { AuditService } from '../../../services/audit.service.js';

export async function telegramAuthHandler(
  request: FastifyRequest<{ Body: { initData: string } }>,
  reply: FastifyReply
) {
  const { initData } = request.body;
  const botToken = env.BOT_TOKEN;

  // 1. Verify Telegram signature
  if (!verifyTelegramWebAppData(initData, botToken)) {
    return reply.status(401).send({ error: 'Invalid Telegram signature' });
  }

  // 2. Extract user info
  const tgUser = parseTelegramInitData(initData);
  if (!tgUser || !tgUser.id) {
    return reply.status(400).send({ error: 'Could not parse Telegram user' });
  }

  const telegramId = BigInt(tgUser.id);
  const telegramUsername = tgUser.username?.trim() || null;
  const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() || 'Telegram User';
  const language =
    tgUser.language_code === 'ru'
      ? LanguageEnum.RU
      : tgUser.language_code === 'en'
        ? LanguageEnum.EN
        : LanguageEnum.UZ;

  let user;

  try {
    user = await prisma.user.upsert({
      where: { telegramId },
      update: {
        telegramUsername,
        fullName,
        language,
        isActive: true,
      },
      create: {
        telegramId,
        telegramUsername,
        fullName,
        language,
        role: UserRoleEnum.CUSTOMER,
        isActive: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      try {
        user = await prisma.user.findUnique({ where: { telegramId } });
      } catch (findError) {
        console.error('[Auth] Failed to recover from P2002 conflict:', findError);
        return reply.status(503).send({ error: "Xizmat vaqtincha ishlamayapti. Qayta urinib ko'ring." });
      }
    } else {
      console.error('[Auth] Database error during user upsert:', error);
      return reply.status(503).send({ error: "Xizmat vaqtincha ishlamayapti. Qayta urinib ko'ring." });
    }
  }

  if (!user) {
    return reply.status(503).send({ error: "Foydalanuvchi ma'lumotlarini olishda xato yuz berdi." });
  }

  const primaryRole = user.role as UserRoleEnum;

  // 4. Audit Log (non-critical — errors are swallowed inside AuditService)
  void AuditService.record({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    actorRole: primaryRole,
    newValue: { role: primaryRole, timestamp: new Date() }
  });

  const token = await (reply.jwtSign({ id: user.id, role: primaryRole }) as Promise<string>).catch((jwtError: unknown) => {
    console.error('[Auth] JWT sign failed:', jwtError);
    return null;
  });

  if (!token) {
    return reply.status(503).send({ error: "Token yaratishda xato yuz berdi." });
  }

  return reply.send({
    user: {
      id: user.id,
      telegramId: user.telegramId.toString(),
      telegramUsername: user.telegramUsername,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: primaryRole,
      language: user.language
    },
    token
  });
}
