import { FastifyReply, FastifyRequest } from 'fastify';
import { SupportService, type SupportMessageDto } from '../../../services/support.service.js';
import { forwardSupportMessageToAdmin } from '../../../services/telegram-bot.service.js';
import { touchAdminPresence } from '../../../services/admin-chat-fallback.service.js';

interface ThreadParams { threadId: string }
interface SendBody { content: string }

interface AdminChatMessageDto {
  id: string;
  orderId: string; // synthetic — uses "support:<threadId>" so the frontend can route
  senderId: string;
  senderRole: 'COURIER' | 'CUSTOMER' | 'ADMIN';
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  targetRole: 'COURIER' | 'CUSTOMER' | null;
}

function getAdminId(request: FastifyRequest): string | null {
  return ((request as any).user?.id || (request as any).requester?.id || null) as string | null;
}

function getAdminName(request: FastifyRequest): string {
  return (
    ((request as any).user?.fullName as string | undefined) ||
    ((request as any).requester?.fullName as string | undefined) ||
    'Admin'
  );
}

function toAdminChatMessage(
  threadId: string,
  msg: SupportMessageDto,
  options: { customerName: string; adminId: string },
): AdminChatMessageDto {
  const isAdmin = msg.senderRole === 'ADMIN';
  return {
    id: msg.id,
    orderId: `support:${threadId}`,
    senderId: isAdmin ? options.adminId : `support-customer:${threadId}`,
    senderRole: msg.senderRole as 'COURIER' | 'CUSTOMER' | 'ADMIN',
    senderName: msg.senderLabel || (isAdmin ? 'Admin' : options.customerName),
    content: msg.text,
    isRead: true, // panel acts as the read marker; UI shows ✓✓ on admin replies
    createdAt: msg.createdAt,
    targetRole: isAdmin ? 'CUSTOMER' : null,
  };
}

/**
 * GET /admin/support/:threadId/messages
 * Admin fetches all messages for a support thread.
 */
export async function getAdminSupportThread(
  request: FastifyRequest<{ Params: ThreadParams }>,
  reply: FastifyReply,
) {
  const adminId = getAdminId(request);
  if (adminId) touchAdminPresence(adminId);

  const result = await SupportService.getThreadForAdmin(request.params.threadId);
  if (!result) {
    return reply.status(404).send({ error: 'Support thread topilmadi' });
  }

  const messages = result.thread.messages.map((m) =>
    toAdminChatMessage(result.thread.id, m, {
      customerName: result.customerName,
      adminId: adminId ?? '',
    }),
  );
  return reply.send(messages);
}

/**
 * POST /admin/support/:threadId/messages
 * Admin sends a reply via the panel.
 * Persists in support_messages and forwards to Telegram so it's archived there too.
 */
export async function sendAdminSupportMessage(
  request: FastifyRequest<{ Params: ThreadParams; Body: SendBody }>,
  reply: FastifyReply,
) {
  const adminId = getAdminId(request);
  if (!adminId) return reply.status(401).send({ error: 'Unauthorized' });
  touchAdminPresence(adminId);

  const adminName = getAdminName(request);
  const content = request.body.content;

  try {
    const created = await SupportService.createAdminMessageFromPanel({
      threadId: request.params.threadId,
      adminUserId: adminId,
      senderLabel: adminName,
      text: content,
    });

    // Best-effort mirror to Telegram so admin group has the trail.
    // Failure here must not break the panel send — already persisted in DB.
    try {
      const threadCtx = await SupportService.getThreadForAdmin(request.params.threadId);
      const telegramMeta = await forwardSupportMessageToAdmin({
        orderNumber: threadCtx?.orderNumber ?? undefined,
        customerName: threadCtx?.customerName,
        senderLabel: `Admin (${adminName})`,
        text: created.text,
      });
      if (telegramMeta?.messageId && telegramMeta?.chatId) {
        await SupportService.attachTelegramMetadata(created.id, {
          telegramChatId: telegramMeta.chatId,
          telegramMessageId: telegramMeta.messageId,
        });
      }
    } catch (err) {
      console.error('Admin support reply Telegram mirror failed (non-fatal).', err);
    }

    const dto: AdminChatMessageDto = {
      id: created.id,
      orderId: `support:${created.threadId}`,
      senderId: adminId,
      senderRole: 'ADMIN',
      senderName: adminName,
      content: created.text,
      isRead: true,
      createdAt: created.createdAt,
      targetRole: 'CUSTOMER',
    };
    return reply.status(201).send(dto);
  } catch (err) {
    return reply.status(400).send({ error: err instanceof Error ? err.message : 'Xatolik' });
  }
}

/**
 * POST /admin/support/:threadId/read
 * No-op for now — unread is computed from the latest ADMIN reply timestamp,
 * so the count automatically clears when the admin sends a reply.
 * Endpoint kept so the frontend lifecycle (open chat → mark read) compiles.
 */
export async function markAdminSupportRead(
  request: FastifyRequest<{ Params: ThreadParams }>,
  reply: FastifyReply,
) {
  const adminId = getAdminId(request);
  if (adminId) touchAdminPresence(adminId);
  return reply.send({ ok: true });
}
