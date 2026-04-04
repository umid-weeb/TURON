import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserRoleEnum } from '@turon/shared';
import { InAppNotificationsService } from '../../../services/in-app-notifications.service.js';

function resolveRequesterRole(request: FastifyRequest) {
  const requester = request.user as any;
  return requester.role as UserRoleEnum;
}

export async function getMyNotifications(request: FastifyRequest, reply: FastifyReply) {
  const requester = request.user as any;
  const notifications = await InAppNotificationsService.listForUser(
    requester.id,
    resolveRequesterRole(request),
  );

  return reply.send(notifications);
}

export async function markNotificationAsRead(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;

  try {
    const notification = await InAppNotificationsService.markAsRead(
      requester.id,
      resolveRequesterRole(request),
      request.params.id,
    );

    return reply.send(notification);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bildirishnomani o'qib bo'lmadi";
    return reply.status(message === 'Bildirishnoma topilmadi' ? 404 : 400).send({ error: message });
  }
}

export async function markAllNotificationsAsRead(request: FastifyRequest, reply: FastifyReply) {
  const requester = request.user as any;

  await InAppNotificationsService.markAllAsRead(
    requester.id,
    resolveRequesterRole(request),
  );

  return reply.send({ success: true });
}
