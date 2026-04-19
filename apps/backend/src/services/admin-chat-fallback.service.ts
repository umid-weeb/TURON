/**
 * AdminChatFallbackService
 *
 * When a courier or customer sends a chat message, we give the admin a window
 * to read it inside the Mini App. If they don't, we forward it to the admin
 * Telegram group so nothing slips through.
 *
 * Delay logic:
 *   - Admin active in Mini App within last 5 min → 5-min fallback delay
 *   - Admin not active → 2-min fallback delay
 *
 * On server restart: we query the DB for messages that were never forwarded
 * (no fallbackSentAt, unread) and reschedule them with the shorter delay.
 */

import { prisma } from '../lib/prisma.js';
import { env } from '../config.js';

// ── Admin presence tracking ───────────────────────────────────────────────────

/** userId → last activity timestamp (ms) */
const adminPresence = new Map<string, number>();

const ADMIN_ACTIVE_WINDOW_MS = 5 * 60 * 1000;   // 5 minutes
const FALLBACK_DELAY_ACTIVE_MS = 5 * 60 * 1000; // 5 min delay if admin is in app
const FALLBACK_DELAY_INACTIVE_MS = 2 * 60 * 1000; // 2 min delay if admin is away

export function touchAdminPresence(userId: string): void {
  adminPresence.set(userId, Date.now());
}

export function isAdminActive(): boolean {
  const now = Date.now();
  for (const lastSeen of adminPresence.values()) {
    if (now - lastSeen <= ADMIN_ACTIVE_WINDOW_MS) return true;
  }
  return false;
}

export function getFallbackDelayMs(): number {
  return isAdminActive() ? FALLBACK_DELAY_ACTIVE_MS : FALLBACK_DELAY_INACTIVE_MS;
}

// ── Timer registry ────────────────────────────────────────────────────────────

/** messageId → timeout handle */
const pendingTimers = new Map<string, NodeJS.Timeout>();
/** orderId → Set<messageId> for bulk cancel when admin reads an order's chat */
const orderToMessages = new Map<string, Set<string>>();

export function scheduleFallback(
  messageId: string,
  orderId: string,
  senderRole: 'COURIER' | 'CUSTOMER',
  delayMs: number,
): void {
  // Clear any existing timer for this message (idempotent)
  cancelFallback(messageId);

  const timer = setTimeout(() => {
    pendingTimers.delete(messageId);
    orderToMessages.get(orderId)?.delete(messageId);
    void sendFallbackToTelegram(messageId, orderId, senderRole);
  }, delayMs);

  pendingTimers.set(messageId, timer);

  if (!orderToMessages.has(orderId)) {
    orderToMessages.set(orderId, new Set());
  }
  orderToMessages.get(orderId)!.add(messageId);
}

export function cancelFallback(messageId: string): void {
  const timer = pendingTimers.get(messageId);
  if (timer) {
    clearTimeout(timer);
    pendingTimers.delete(messageId);
  }
}

/** Cancel all pending fallbacks for an order (called when admin reads the order chat). */
export function cancelFallbacksForOrder(orderId: string): void {
  const msgIds = orderToMessages.get(orderId);
  if (!msgIds) return;
  for (const id of msgIds) {
    cancelFallback(id);
  }
  orderToMessages.delete(orderId);
}

// ── Fallback sender ───────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendFallbackToTelegram(
  messageId: string,
  orderId: string,
  senderRole: 'COURIER' | 'CUSTOMER',
): Promise<void> {
  try {
    const adminChatId = env.ADMIN_CHAT_ID?.trim();
    if (!adminChatId) return;

    const msg = await prisma.orderChatMessage.findUnique({
      where: { id: messageId },
      include: {
        order: { select: { orderNumber: true } },
        sender: { select: { fullName: true } },
      },
    });

    if (!msg) return;
    if (msg.fallbackSentAt) return; // already forwarded (e.g. from recovery)
    if (msg.isRead) return;        // admin read it in the app before timer fired

    const roleLabel = senderRole === 'COURIER' ? 'Kuryer' : 'Mijoz';
    const orderNum = String(msg.order?.orderNumber ?? orderId);
    const senderName = msg.sender?.fullName ?? 'Foydalanuvchi';

    const text = [
      `<b>${roleLabel}dan yangi xabar</b>`,
      `Buyurtma: #${orderNum}`,
      `Kimdan: ${escapeHtml(senderName)}`,
      ``,
      escapeHtml(msg.content),
      ``,
      `<i>Javob berish uchun ushbu xabarga reply qiling.</i>`,
    ].join('\n');

    // Lazy-import to avoid circular dependency at module load time
    const { getBotState } = await import('./telegram-bot.service.js');
    const state = getBotState();
    const sent = await state.bot.telegram.sendMessage(adminChatId, text, { parse_mode: 'HTML' });

    await prisma.orderChatMessage.update({
      where: { id: messageId },
      data: {
        telegramMessageId: BigInt(sent.message_id),
        fallbackSentAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[AdminChatFallback] Failed to send fallback for message', messageId, err);
  }
}

// ── Server startup recovery ───────────────────────────────────────────────────

/**
 * On server restart, find messages that were waiting to be forwarded
 * (sent recently, not yet read by admin, not yet forwarded to Telegram)
 * and reschedule them with the short "inactive" delay.
 */
export async function recoverPendingFallbacks(): Promise<void> {
  try {
    const cutoffMs = FALLBACK_DELAY_ACTIVE_MS; // only consider messages in the active window
    const since = new Date(Date.now() - cutoffMs);

    const pending = await prisma.orderChatMessage.findMany({
      where: {
        senderRole: { in: ['COURIER', 'CUSTOMER'] as any },
        isRead: false,
        fallbackSentAt: null,
        createdAt: { gte: since },
      },
      select: { id: true, orderId: true, senderRole: true, createdAt: true },
    });

    for (const msg of pending) {
      // Delay = remaining time until the original deadline (createdAt + FALLBACK_DELAY_INACTIVE)
      const ageMs = Date.now() - msg.createdAt.getTime();
      const remainingMs = Math.max(0, FALLBACK_DELAY_INACTIVE_MS - ageMs);
      scheduleFallback(msg.id, msg.orderId, msg.senderRole as 'COURIER' | 'CUSTOMER', remainingMs);
    }

    if (pending.length > 0) {
      console.log(`[AdminChatFallback] Recovered ${pending.length} pending fallback(s) on startup`);
    }
  } catch (err) {
    console.error('[AdminChatFallback] Recovery failed:', err);
  }
}
