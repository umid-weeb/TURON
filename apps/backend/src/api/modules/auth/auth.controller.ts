import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';
import { verifyTelegramWebAppData, parseTelegramInitData } from '../../utils/telegram.js';
import { UserRoleEnum } from '@turon/shared';
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

  const telegramId = tgUser.id.toString();

  // 3. Find or Create User in DB
  let user = await prisma.user.findUnique({
    where: { telegramId },
    include: { roles: true }
  });

  if (!user) {
    // New user defaults to CUSTOMER
    user = await prisma.user.create({
      data: {
        telegramId,
        firstName: tgUser.first_name || 'User',
        lastName: tgUser.last_name,
        username: tgUser.username,
        roles: { create: { role: UserRoleEnum.CUSTOMER } }
      },
      include: { roles: true }
    });
  }

  // 4. Determine Primary Role (Admin > Courier > Customer)
  const roleNames = user.roles.map((r: any) => r.role);
  let primaryRole: UserRoleEnum = UserRoleEnum.CUSTOMER;
  
  if (roleNames.includes(UserRoleEnum.ADMIN)) primaryRole = UserRoleEnum.ADMIN;
  else if (roleNames.includes(UserRoleEnum.COURIER)) primaryRole = UserRoleEnum.COURIER;

  // 6. Audit Log
  await AuditService.record({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    newValue: { role: primaryRole, timestamp: new Date() }
  });

  const token = await reply.jwtSign({ id: user.id, role: primaryRole });

  return reply.send({
    user: {
      id: user.id,
      telegramId: user.telegramId,
      fullName: `${user.firstName} ${user.lastName || ''}`.trim(),
      phoneNumber: user.phoneNumber,
      role: primaryRole,
      language: user.language
    },
    token
  });
}
