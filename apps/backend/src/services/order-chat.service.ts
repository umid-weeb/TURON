import { ChatSenderRoleEnum } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { orderTrackingService } from './order-tracking.service.js';
import { scheduleFallback, cancelFallbacksForOrder, getFallbackDelayMs } from './admin-chat-fallback.service.js';

export interface ChatMessageDto {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: 'COURIER' | 'CUSTOMER' | 'ADMIN';
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  /** Only set on ADMIN messages. null = visible to all parties. */
  targetRole: 'COURIER' | 'CUSTOMER' | null;
}

function serializeChatMessage(msg: any): ChatMessageDto {
  return {
    id: msg.id,
    orderId: msg.orderId,
    senderId: msg.senderId,
    senderRole: msg.senderRole as 'COURIER' | 'CUSTOMER' | 'ADMIN',
    senderName: msg.sender?.fullName ?? 'Foydalanuvchi',
    content: msg.content,
    isRead: msg.isRead,
    createdAt: msg.createdAt.toISOString(),
    targetRole: (msg.targetRole as 'COURIER' | 'CUSTOMER' | null) ?? null,
  };
}

export class OrderChatService {
  /**
   * Verify the caller has access to this order's chat.
   * - CUSTOMER: must be the order owner
   * - COURIER: must have been assigned at any point
   * - ADMIN: always has access
   */
  static async verifyAccess(orderId: string, userId: string, role: 'COURIER' | 'CUSTOMER' | 'ADMIN') {
    if (role === 'ADMIN') return true;
    if (role === 'CUSTOMER') {
      const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
      return order !== null;
    }
    const assignment = await prisma.courierAssignment.findFirst({
      where: { orderId, courierId: userId },
    });
    return assignment !== null;
  }

  /**
   * Fetch messages for an order, filtered by the requester's role.
   * - ADMIN sees ALL messages.
   * - COURIER sees: non-admin messages + admin messages targeted at COURIER (or null).
   * - CUSTOMER sees: non-admin messages + admin messages targeted at CUSTOMER (or null).
   */
  static async getMessages(
    orderId: string,
    readerRole: 'COURIER' | 'CUSTOMER' | 'ADMIN' = 'ADMIN',
  ): Promise<ChatMessageDto[]> {
    const where =
      readerRole === 'ADMIN'
        ? { orderId }
        : {
            orderId,
            OR: [
              // Non-admin messages: always visible
              { senderRole: { in: [ChatSenderRoleEnum.COURIER, ChatSenderRoleEnum.CUSTOMER] as ChatSenderRoleEnum[] } },
              // Admin messages with no specific target (broadcast)
              { senderRole: ChatSenderRoleEnum.ADMIN, targetRole: null },
              // Admin messages specifically for this role
              { senderRole: ChatSenderRoleEnum.ADMIN, targetRole: readerRole as ChatSenderRoleEnum },
            ],
          };

    const messages = await prisma.orderChatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, fullName: true } } },
    });
    return messages.map(serializeChatMessage);
  }

  static async sendMessage(
    orderId: string,
    senderId: string,
    senderRole: 'COURIER' | 'CUSTOMER' | 'ADMIN',
    content: string,
    options?: {
      telegramMessageId?: bigint;
      /** Which party the admin is directing this message to. Only meaningful when senderRole === 'ADMIN'. */
      targetRole?: 'COURIER' | 'CUSTOMER' | null;
    },
  ): Promise<ChatMessageDto> {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 500) {
      throw new Error('Xabar 1–500 belgi bo\'lishi kerak');
    }

    // targetRole is only stored for ADMIN messages
    const targetRole =
      senderRole === 'ADMIN' ? (options?.targetRole ?? null) : null;

    const msg = await prisma.orderChatMessage.create({
      data: {
        orderId,
        senderId,
        senderRole: senderRole as ChatSenderRoleEnum,
        targetRole: targetRole ? (targetRole as ChatSenderRoleEnum) : null,
        content: trimmed,
        telegramMessageId: options?.telegramMessageId ?? null,
      },
      include: { sender: { select: { id: true, fullName: true } } },
    });

    const dto = serializeChatMessage(msg);

    // Publish via SSE so the other party receives it instantly
    orderTrackingService.publishChatMessage(orderId, dto);

    if (senderRole === 'ADMIN') {
      // Admin sent a message → cancel any pending fallbacks
      cancelFallbacksForOrder(orderId);

      // Schedule 60-second unread reminder for the targeted role
      if (targetRole && (targetRole === 'COURIER' || targetRole === 'CUSTOMER')) {
        const msgId = msg.id;
        const reminderRole = targetRole;
        setTimeout(async () => {
          try {
            const stillUnread = await prisma.orderChatMessage.findFirst({
              where: { id: msgId, isRead: false },
              select: { id: true },
            });
            if (stillUnread) {
              orderTrackingService.publishChatUnreadReminder(orderId, reminderRole, msgId);
            }
          } catch { /* best-effort */ }
        }, 60_000);
      }
    } else {
      // Courier or Customer sent → schedule fallback to Telegram group if admin doesn't read
      const delayMs = getFallbackDelayMs();
      scheduleFallback(msg.id, orderId, senderRole, delayMs);

      // Also schedule 60-second unread reminder for ADMIN (the recipient)
      // Note: we only remind courier/customer (not admin) via SSE unread reminder
      // Admin fallback is handled separately via the Telegram group fallback service
    }

    return dto;
  }

  static async markRead(orderId: string, readerRole: 'COURIER' | 'CUSTOMER' | 'ADMIN') {
    let senderRoles: ChatSenderRoleEnum[];

    if (readerRole === 'ADMIN') {
      // Admin reading → mark all COURIER and CUSTOMER messages as read
      senderRoles = [ChatSenderRoleEnum.COURIER, ChatSenderRoleEnum.CUSTOMER];
      // Cancel pending fallbacks since admin is now reading
      cancelFallbacksForOrder(orderId);
    } else {
      // Courier/Customer reading → mark ADMIN messages targeted at them + null-target admin messages
      // plus any messages from the other peer role
      senderRoles = [ChatSenderRoleEnum.ADMIN];
      const otherPeer =
        readerRole === 'COURIER' ? ChatSenderRoleEnum.CUSTOMER : ChatSenderRoleEnum.COURIER;
      senderRoles.push(otherPeer);
    }

    const updated = await prisma.orderChatMessage.updateMany({
      where: { orderId, senderRole: { in: senderRoles }, isRead: false },
      data: { isRead: true },
    });

    // Broadcast read receipt to all parties on the SSE stream
    if (updated.count > 0) {
      orderTrackingService.publishChatRead(orderId, readerRole);
    }
  }

  static async getUnreadCount(orderId: string, readerRole: 'COURIER' | 'CUSTOMER' | 'ADMIN'): Promise<number> {
    if (readerRole === 'ADMIN') {
      // Admin sees unread messages from couriers and customers
      return prisma.orderChatMessage.count({
        where: {
          orderId,
          senderRole: { in: [ChatSenderRoleEnum.COURIER, ChatSenderRoleEnum.CUSTOMER] },
          isRead: false,
        },
      });
    }

    // Courier/customer: unread = admin messages (targeted at them or null) + other peer messages
    const otherPeer =
      readerRole === 'COURIER' ? ChatSenderRoleEnum.CUSTOMER : ChatSenderRoleEnum.COURIER;

    return prisma.orderChatMessage.count({
      where: {
        orderId,
        isRead: false,
        OR: [
          { senderRole: otherPeer },
          { senderRole: ChatSenderRoleEnum.ADMIN, targetRole: null },
          { senderRole: ChatSenderRoleEnum.ADMIN, targetRole: readerRole as ChatSenderRoleEnum },
        ],
      },
    });
  }

  /**
   * Find a message by its Telegram message ID (for bot reply routing).
   */
  static async findByTelegramMessageId(
    telegramMessageId: bigint,
  ): Promise<{ id: string; orderId: string } | null> {
    return prisma.orderChatMessage.findFirst({
      where: { telegramMessageId },
      select: { id: true, orderId: true },
    });
  }

  /**
   * Get orders that have unread messages from couriers or customers (for admin inbox).
   */
  static async getAdminInbox(): Promise<{
    courierMessages: Array<{ orderId: string; orderNumber: string; unreadCount: number; lastMessage: string; lastAt: string }>;
    customerMessages: Array<{ orderId: string; orderNumber: string; unreadCount: number; lastMessage: string; lastAt: string }>;
  }> {
    const unreadMessages = await prisma.orderChatMessage.findMany({
      where: {
        senderRole: { in: [ChatSenderRoleEnum.COURIER, ChatSenderRoleEnum.CUSTOMER] },
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { id: true, orderNumber: true } },
      },
    });

    const courierMap = new Map<string, { orderId: string; orderNumber: string; unreadCount: number; lastMessage: string; lastAt: string }>();
    const customerMap = new Map<string, { orderId: string; orderNumber: string; unreadCount: number; lastMessage: string; lastAt: string }>();

    for (const msg of unreadMessages) {
      const map = msg.senderRole === ChatSenderRoleEnum.COURIER ? courierMap : customerMap;
      const existing = map.get(msg.orderId);
      if (existing) {
        existing.unreadCount++;
      } else {
        map.set(msg.orderId, {
          orderId: msg.orderId,
          orderNumber: String(msg.order.orderNumber),
          unreadCount: 1,
          lastMessage: msg.content.slice(0, 100),
          lastAt: msg.createdAt.toISOString(),
        });
      }
    }

    return {
      courierMessages: Array.from(courierMap.values()),
      customerMessages: Array.from(customerMap.values()),
    };
  }
}
