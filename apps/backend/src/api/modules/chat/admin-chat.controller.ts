import { FastifyReply, FastifyRequest } from 'fastify';
import { OrderChatService } from '../../../services/order-chat.service.js';
import { touchAdminPresence } from '../../../services/admin-chat-fallback.service.js';

interface IdParams { id: string }

interface SendBody {
  content: string;
  /**
   * Which party this admin message is directed to.
   * 'COURIER' → only the courier will see it in their chat.
   * 'CUSTOMER' → only the customer will see it in their chat.
   * null/omitted → visible to all parties (broadcast).
   */
  targetRole?: 'COURIER' | 'CUSTOMER' | null;
}

function getAdminId(request: FastifyRequest): string | null {
  return ((request as any).user?.id || (request as any).requester?.id || null) as string | null;
}

/**
 * GET /admin/chats
 * Returns lists of orders with unread messages from couriers and customers.
 */
export async function getAdminInbox(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const adminId = getAdminId(request);
  if (adminId) touchAdminPresence(adminId);

  const inbox = await OrderChatService.getAdminInbox();
  return reply.send(inbox);
}

/**
 * GET /admin/order/:id/chat
 * Admin fetches all messages for an order and marks unread as read.
 */
export async function getAdminOrderChat(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const { id: orderId } = request.params;
  const adminId = getAdminId(request);
  if (adminId) touchAdminPresence(adminId);

  // Mark all courier/customer messages in this order as read (broadcasts chat.read SSE)
  await OrderChatService.markRead(orderId, 'ADMIN');

  // Admin sees ALL messages for the order
  const messages = await OrderChatService.getMessages(orderId, 'ADMIN');
  return reply.send(messages);
}

/**
 * POST /admin/order/:id/chat
 * Admin sends a message to the order chat, optionally directed at a specific role.
 */
export async function sendAdminOrderChat(
  request: FastifyRequest<{ Params: IdParams; Body: SendBody }>,
  reply: FastifyReply,
) {
  const { id: orderId } = request.params;
  const { content, targetRole = null } = request.body;
  const adminId = getAdminId(request);

  if (!adminId) return reply.status(401).send({ error: 'Unauthorized' });
  touchAdminPresence(adminId);

  try {
    const msg = await OrderChatService.sendMessage(orderId, adminId, 'ADMIN', content, {
      targetRole: targetRole ?? null,
    });
    return reply.status(201).send(msg);
  } catch (err) {
    return reply.status(400).send({ error: err instanceof Error ? err.message : 'Xatolik' });
  }
}

/**
 * POST /admin/order/:id/chat/read
 * Admin explicitly marks all messages in an order as read (broadcasts SSE read receipt).
 */
export async function markAdminOrderChatRead(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const { id: orderId } = request.params;
  const adminId = getAdminId(request);
  if (adminId) touchAdminPresence(adminId);

  await OrderChatService.markRead(orderId, 'ADMIN');
  return reply.send({ ok: true });
}
