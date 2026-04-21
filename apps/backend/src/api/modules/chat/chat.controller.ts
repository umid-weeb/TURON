import { FastifyReply, FastifyRequest } from 'fastify';
import { OrderChatService } from '../../../services/order-chat.service.js';

interface IdParams { id: string }
interface SendBody { content: string }
type ChatRequester = { id: string; role: string };

function getRequester(request: FastifyRequest): ChatRequester | null {
  return ((request as any).user || (request as any).requester || null) as ChatRequester | null;
}

function getReaderRole(requester: ChatRequester): 'COURIER' | 'CUSTOMER' {
  return requester.role === 'COURIER' ? 'COURIER' : 'CUSTOMER';
}

/**
 * GET /courier/order/:id/chat   — courier fetches messages
 * GET /orders/:id/chat          — customer fetches messages
 */
export async function getOrderChat(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const { id: orderId } = request.params;
  const requester = getRequester(request);
  if (!requester) return reply.status(401).send({ error: 'Unauthorized' });
  const role = getReaderRole(requester);

  const hasAccess = await OrderChatService.verifyAccess(orderId, requester.id, role);
  if (!hasAccess) return reply.status(403).send({ error: 'Ruxsat yo\'q' });

  // Mark inbound messages as read on open
  await OrderChatService.markRead(orderId, role);

  // Return only messages visible to this role (admin→other-party messages filtered out)
  const messages = await OrderChatService.getMessages(orderId, role);
  return reply.send(messages);
}

/**
 * POST /courier/order/:id/chat  — courier sends a message
 * POST /orders/:id/chat         — customer sends a message
 */
export async function sendOrderChat(
  request: FastifyRequest<{ Params: IdParams; Body: SendBody }>,
  reply: FastifyReply,
) {
  const { id: orderId } = request.params;
  const { content } = request.body;
  const requester = getRequester(request);
  if (!requester) return reply.status(401).send({ error: 'Unauthorized' });
  const role = getReaderRole(requester);

  const hasAccess = await OrderChatService.verifyAccess(orderId, requester.id, role);
  if (!hasAccess) return reply.status(403).send({ error: 'Ruxsat yo\'q' });

  try {
    const msg = await OrderChatService.sendMessage(orderId, requester.id, role, content);
    return reply.status(201).send(msg);
  } catch (err) {
    return reply.status(400).send({ error: err instanceof Error ? err.message : 'Xatolik' });
  }
}

/**
 * GET /courier/order/:id/chat/unread  — unread count for courier
 * GET /orders/:id/chat/unread         — unread count for customer
 */
export async function getUnreadCount(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const { id: orderId } = request.params;
  const requester = getRequester(request);
  if (!requester) return reply.status(401).send({ error: 'Unauthorized' });
  const role = getReaderRole(requester);

  const hasAccess = await OrderChatService.verifyAccess(orderId, requester.id, role);
  if (!hasAccess) return reply.status(403).send({ error: 'Ruxsat yo\'q' });

  const count = await OrderChatService.getUnreadCount(orderId, role);
  return reply.send({ count });
}
