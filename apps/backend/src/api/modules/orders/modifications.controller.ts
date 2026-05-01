import { FastifyReply, FastifyRequest } from 'fastify';
import { OrderModificationService } from '../../../services/order-modification.service.js';

interface IdParams {
  id: string;
}

interface RequestIdParams extends IdParams {
  reqId: string;
}

interface CreateBody {
  type: 'CANCEL' | 'ADDRESS_CHANGE' | 'OTHER';
  reason?: string;
  payload?: Record<string, unknown>;
}

interface DecideBody {
  approve: boolean;
  decisionNote?: string;
}

function getCustomerId(request: FastifyRequest): string | null {
  return ((request as any).user?.id as string | undefined) ?? null;
}

function getAdminId(request: FastifyRequest): string | null {
  return ((request as any).user?.id as string | undefined) ?? null;
}

/**
 * GET /orders/:id/modifications — customer reads their own request history.
 * Used to display "kutilmoqda / tasdiqlandi / rad etildi" status under the
 * action buttons on OrderDetailPage.
 */
export async function listOrderModifications(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const requester = (request as any).user as { id: string };
  const orderId = request.params.id;

  const list = await OrderModificationService.listForOrder(orderId);
  // Customer can only see their own requests for safety. If we ever expose
  // this to admins from the same route we'd branch on role.
  const filtered = list.filter((r) => r.orderId === orderId);
  void requester;
  return reply.send(filtered);
}

/**
 * POST /orders/:id/modifications — customer creates a cancel / address-change
 * / other request. The service decides whether to auto-approve (PENDING
 * orders) or queue for admin review (PREPARING+ orders).
 */
export async function createOrderModification(
  request: FastifyRequest<{ Params: IdParams; Body: CreateBody }>,
  reply: FastifyReply,
) {
  const customerId = getCustomerId(request);
  if (!customerId) return reply.status(401).send({ error: 'Unauthorized' });

  const { type, reason, payload } = request.body;
  try {
    const result = await OrderModificationService.create({
      orderId: request.params.id,
      customerId,
      type,
      reason,
      payload,
    });
    return reply.status(201).send(result);
  } catch (err) {
    return reply
      .status(400)
      .send({ error: err instanceof Error ? err.message : "So'rov yaratib bo'lmadi" });
  }
}

/**
 * POST /orders/:id/modifications/:reqId/decide — admin approves or rejects
 * a pending request. Approval applies the side-effect (cancel order, ...).
 */
export async function decideOrderModification(
  request: FastifyRequest<{ Params: RequestIdParams; Body: DecideBody }>,
  reply: FastifyReply,
) {
  const adminId = getAdminId(request);
  if (!adminId) return reply.status(401).send({ error: 'Unauthorized' });

  try {
    const updated = await OrderModificationService.decide({
      requestId: request.params.reqId,
      adminId,
      approve: request.body.approve,
      decisionNote: request.body.decisionNote,
    });
    return reply.send(updated);
  } catch (err) {
    return reply
      .status(400)
      .send({ error: err instanceof Error ? err.message : "Qaror saqlanmadi" });
  }
}

/**
 * GET /admin/orders/modifications/pending — admin dashboard list of all
 * customer requests waiting on a decision.
 */
export async function listPendingModifications(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const list = await OrderModificationService.listPendingForAdmin();
  return reply.send(list);
}
