import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuditService } from '../../../services/audit.service.js';
import { CourierDirectoryService } from '../../../services/courier-directory.service.js';

export async function getAdminCourierDirectory(request: FastifyRequest, reply: FastifyReply) {
  const couriers = await CourierDirectoryService.listForAdmin();
  return reply.send(couriers);
}

export async function createCourierByAdmin(
  request: FastifyRequest<{
    Body: {
      telegramId: bigint;
      fullName: string;
      phoneNumber?: string;
      telegramUsername?: string;
      isActive: boolean;
    };
  }>,
  reply: FastifyReply,
) {
  const admin = request.user as any;

  try {
    const createdCourier = await CourierDirectoryService.createByAdmin(request.body);

    await AuditService.record({
      userId: admin.id,
      actorRole: admin.role,
      action: 'CREATE_COURIER',
      entity: 'User',
      entityId: createdCourier.id,
      newValue: createdCourier,
    });

    return reply.status(201).send(createdCourier);
  } catch (error) {
    return reply.status(400).send({
      error: error instanceof Error ? error.message : "Kuryerni yaratib bo'lmadi",
    });
  }
}

export async function updateCourierByAdmin(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      fullName?: string;
      phoneNumber?: string;
      telegramUsername?: string;
      isActive?: boolean;
    };
  }>,
  reply: FastifyReply,
) {
  const admin = request.user as any;

  try {
    const updatedCourier = await CourierDirectoryService.updateByAdmin(request.params.id, request.body);

    await AuditService.record({
      userId: admin.id,
      actorRole: admin.role,
      action: 'UPDATE_COURIER',
      entity: 'User',
      entityId: updatedCourier.id,
      newValue: updatedCourier,
    });

    return reply.send(updatedCourier);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kuryerni yangilab bo'lmadi";
    return reply.status(message === 'Kuryer topilmadi' ? 404 : 400).send({ error: message });
  }
}

export async function getMyCourierProfile(request: FastifyRequest, reply: FastifyReply) {
  const requester = request.user as any;

  try {
    const profile = await CourierDirectoryService.getProfile(requester.id);
    return reply.send(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kuryer profilini yuklab bo'lmadi";
    return reply.status(message === 'Kuryer topilmadi' ? 404 : 400).send({ error: message });
  }
}

export async function updateMyCourierProfile(
  request: FastifyRequest<{
    Body: {
      fullName?: string;
      phoneNumber?: string;
      telegramUsername?: string;
    };
  }>,
  reply: FastifyReply,
) {
  const requester = request.user as any;

  try {
    const profile = await CourierDirectoryService.updateOwnProfile(requester.id, request.body);

    await AuditService.record({
      userId: requester.id,
      actorRole: requester.role,
      action: 'UPDATE_COURIER_PROFILE',
      entity: 'User',
      entityId: requester.id,
      newValue: profile,
    });

    return reply.send(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profilni yangilab bo'lmadi";
    return reply.status(message === 'Kuryer topilmadi' ? 404 : 400).send({ error: message });
  }
}

export async function getMyCourierHistory(request: FastifyRequest, reply: FastifyReply) {
  const requester = request.user as any;

  try {
    const history = await CourierDirectoryService.getHistory(requester.id);
    return reply.send(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tarixni yuklab bo'lmadi";
    return reply.status(message === 'Kuryer topilmadi' ? 404 : 400).send({ error: message });
  }
}
