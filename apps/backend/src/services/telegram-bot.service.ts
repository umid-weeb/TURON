import { Markup, Telegraf } from 'telegraf';
import {
  NotificationTypeEnum,
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  UserRoleEnum,
} from '@turon/shared';
import { env } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { InAppNotificationsService } from './in-app-notifications.service.js';
import { SupportService } from './support.service.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const botToken = env.BOT_TOKEN;
const webAppUrl = env.WEB_APP_URL;
const MINI_APP_RELEASE = '20260414-r8-search-desktop-frame';

// ─── In-memory role cache (TTL: 5 min) ───────────────────────────────────────
const roleCache = new Map<string, { role: UserRoleEnum; expiresAt: number }>();
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedRole(telegramId: string): UserRoleEnum | null {
  const entry = roleCache.get(telegramId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { roleCache.delete(telegramId); return null; }
  return entry.role;
}

function setCachedRole(telegramId: string, role: UserRoleEnum) {
  roleCache.set(telegramId, { role, expiresAt: Date.now() + ROLE_CACHE_TTL_MS });
}

/**
 * Resolve the stable base URL for the Mini App.
 *
 * Priority:
 *   1. WEB_APP_URL env variable (custom domain, e.g. https://app.turon.uz)
 *   2. Fallback to turon-miniapp.vercel.app
 *
 * Random Vercel preview URLs (*.vercel.app other than the canonical one) are
 * rejected — they change on every deploy and break old Telegram messages.
 */
function resolveStableWebAppBaseUrl(): string {
  const CANONICAL_FALLBACK = 'https://turon-miniapp.vercel.app/';

  if (!webAppUrl) {
    console.warn('[Bot] WEB_APP_URL is not set. Using canonical fallback URL.');
    return CANONICAL_FALLBACK;
  }

  try {
    const parsed = new URL(webAppUrl);
    const hostname = parsed.hostname.toLowerCase();

    // Reject random Vercel preview URLs — only the canonical .vercel.app or a custom domain is allowed
    if (
      hostname.endsWith('.vercel.app') &&
      hostname !== 'turon-miniapp.vercel.app'
    ) {
      console.warn(
        `[Bot] WEB_APP_URL (${webAppUrl}) is a Vercel preview URL. Using canonical fallback.`,
      );
      return CANONICAL_FALLBACK;
    }

    return webAppUrl.endsWith('/') ? webAppUrl : `${webAppUrl}/`;
  } catch {
    return CANONICAL_FALLBACK;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BotLaunchContext = 'api' | 'bot';

type AdminReplyMessage = {
  message_id: number;
  text?: string;
  chat: { id: number | string };
  from?: { first_name?: string; last_name?: string; username?: string };
  reply_to_message?: { message_id?: number };
};

// ─── DB-backed message ID storage ─────────────────────────────────────────────
//
// We store the last /start message_id per chat in RestaurantSetting using a
// namespaced key: `_bot_msg_<chatId>`. This survives server restarts and
// Railway redeploys, so we can always edit/delete the old message.
//
// RestaurantSetting is a key-value table that already exists — no migration needed.

const BOT_MSG_PREFIX = '_bot_msg_';
const BOT_MSG_MAX_TRACKED = 30; // keep last N message IDs per chat

// Value format: JSON array e.g. "[100,200,300]"
// Legacy format: plain number string "100" — parsed on read

async function getStoredMessageIds(chatId: number): Promise<number[]> {
  try {
    const row = await prisma.restaurantSetting.findUnique({
      where: { key: `${BOT_MSG_PREFIX}${chatId}` },
      select: { value: true },
    });
    if (!row) return [];
    // Support both legacy "123" and new "[123,456]"
    const raw = row.value.trim();
    if (raw.startsWith('[')) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : [];
    }
    const id = parseInt(raw, 10);
    return isNaN(id) ? [] : [id];
  } catch {
    return [];
  }
}

// Kept for backward-compat call sites that only need the last ID
async function getStoredMessageId(chatId: number): Promise<number | null> {
  const ids = await getStoredMessageIds(chatId);
  return ids.length > 0 ? ids[ids.length - 1] : null;
}

async function storeMessageId(chatId: number, messageId: number): Promise<void> {
  try {
    const key = `${BOT_MSG_PREFIX}${chatId}`;
    const existing = await getStoredMessageIds(chatId);
    const updated = [...existing, messageId].slice(-BOT_MSG_MAX_TRACKED);
    await prisma.restaurantSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(updated) },
      create: { key, value: JSON.stringify(updated), dataType: 'string' },
    });
  } catch {
    // Non-critical
  }
}

async function clearStoredMessageId(chatId: number): Promise<void> {
  try {
    await prisma.restaurantSetting.delete({
      where: { key: `${BOT_MSG_PREFIX}${chatId}` },
    });
  } catch {
    // Ignore if not found
  }
}

async function deleteAllStoredMessages(bot: Telegraf, chatId: number): Promise<void> {
  const ids = await getStoredMessageIds(chatId);
  if (ids.length === 0) return;
  await Promise.allSettled(ids.map((id) => bot.telegram.deleteMessage(chatId, id)));
  void clearStoredMessageId(chatId);
}

// ─── Bot singleton ────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __turonTelegramBotState:
    | { bot: Telegraf; launched: boolean; handlersBound: boolean }
    | undefined;
}

function getBotState() {
  if (!globalThis.__turonTelegramBotState) {
    globalThis.__turonTelegramBotState = {
      bot: new Telegraf(botToken),
      launched: false,
      handlersBound: false,
    };
  }
  return globalThis.__turonTelegramBotState;
}

// ─── Prisma connection warmup ─────────────────────────────────────────────────
// Runs a cheap query to open the connection pool before the first real request.
// Without this, the very first /start hits a cold PrismaClient (~1-2s).
let warmupDone = false;
async function prismaWarmup(): Promise<void> {
  if (warmupDone) return;
  warmupDone = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch { /* non-fatal */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveAdminChatId(): string | null {
  if (env.ADMIN_CHAT_ID?.trim()) return env.ADMIN_CHAT_ID.trim();

  return (
    parseConfiguredChatIds(env.ADMIN_IDS)
      .find(Boolean) ?? null
  );
}

function parseConfiguredChatIds(rawValue?: string | null): string[] {
  if (!rawValue?.trim()) {
    return [];
  }

  const trimmed = rawValue.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => String(value).trim())
        .filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated parsing below.
  }

  return trimmed
    .split(',')
    .map((value) => value.replace(/[[\]"]/g, '').trim())
    .filter(Boolean);
}

function resolveOrderNotificationRecipientChatIds(): string[] {
  const chatId = env.ADMIN_CHAT_ID?.trim();
  if (!chatId) return [];
  return [chatId];
}

async function getUserRole(telegramId: string): Promise<UserRoleEnum> {
  // Serve from cache — avoids DB round-trip for repeat /start calls
  const cached = getCachedRole(telegramId);
  if (cached !== null) return cached;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { role: true },
    });
    const role = (user?.role as UserRoleEnum) || UserRoleEnum.CUSTOMER;
    setCachedRole(telegramId, role);
    return role;
  } catch {
    // Non-blocking fallback — never delay the user for a role lookup failure
    return UserRoleEnum.CUSTOMER;
  }
}

function resolveRoleLaunchUrl(role: UserRoleEnum): string {
  const path =
    role === UserRoleEnum.ADMIN
      ? 'admin/dashboard'
      : role === UserRoleEnum.COURIER
        ? 'courier'
        : 'customer';
  return resolveMiniAppLaunchUrl(path);
}

function resolveMiniAppLaunchUrl(path: string): string {
  const url = new URL(path, resolveStableWebAppBaseUrl());

  // Keep all bot entry points on the same launch contract; the Mini App also
  // asks Telegram for requestFullscreen() + disabled vertical swipes on boot.
  url.searchParams.set('tg_fullscreen', '1');
  url.searchParams.set('tg_swipe', 'disabled');
  url.searchParams.set('v', MINI_APP_RELEASE);

  return url.toString();
}

function getStartMessageContent(role: UserRoleEnum) {
  if (role === UserRoleEnum.ADMIN) {
    return {
      text: 'Assalomu alaykum, Admin! Turon boshqaruv paneliga xush kelibsiz.\n\nBoshqaruvni boshlash uchun tugmani bosing:',
      buttonLabel: 'Admin panelini ochish',
    };
  }
  if (role === UserRoleEnum.COURIER) {
    return {
      text: "Assalomu alaykum, Kuryer! Siz uchun yetkazib berish paneli tayyor.\n\nKuryer panelini ochish uchun tugmani bosing:",
      buttonLabel: 'Kuryer panelini ochish',
    };
  }
  return {
    text: 'Assalomu alaykum! Turon kafesi botiga xush kelibsiz.\n\nQuyidagi tugma orqali taom buyurtma qilishingiz mumkin:',
    buttonLabel: 'Ilovani ochish',
  };
}

function getAdminSenderLabel(message: AdminReplyMessage): string {
  const fullName = [message.from?.first_name, message.from?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || message.from?.username || 'Operator';
}

async function handleAdminSupportReply(message: AdminReplyMessage) {
  const adminChatId = resolveAdminChatId();
  if (!adminChatId) return;
  if (!message.text?.trim()) return;
  if (String(message.chat.id) !== String(adminChatId)) return;

  const replyToMessageId = message.reply_to_message?.message_id;
  if (!replyToMessageId) return;

  await SupportService.createAdminReplyFromTelegram({
    adminChatId: String(message.chat.id),
    telegramMessageId: message.message_id,
    replyToTelegramMessageId: replyToMessageId,
    senderLabel: getAdminSenderLabel(message),
    text: message.text.trim(),
  });
}

// ─── Menu Button setup ────────────────────────────────────────────────────────
//
// Sets the persistent "Menu" button visible in ALL chats with this bot.
// This button always opens the latest Mini App URL regardless of old messages.
// Called once on bot launch and can be re-called after domain changes.

async function setupMenuButton(bot: Telegraf) {
  const customerUrl = resolveMiniAppLaunchUrl('customer');

  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Ilovani ochish' },
      { command: 'app', description: "To'g'ridan ilovaga o'tish" },
    ]);

    // This sets the persistent WebApp button (bottom-left in chat)
    // Uses callApi for compatibility with all Telegraf versions
    await bot.telegram.callApi('setChatMenuButton' as any, {
      menu_button: {
        type: 'web_app',
        text: 'Ilovani ochish',
        web_app: { url: customerUrl },
      },
    } as any);

    console.log(`[Bot] Menu button set → ${customerUrl}`);
  } catch (error) {
    console.warn('[Bot] Could not set menu button (non-critical):', (error as Error).message);
  }
}

// ─── Send or edit start message ───────────────────────────────────────────────
//
// Strategy (survives server restarts):
//   1. Load previously stored message_id from DB for this chat
//   2. Try to EDIT that message with updated role-based content + button URL
//   3. If edit fails (message deleted, too old) → send a brand new message
//   4. Store the final message_id in DB for next time

async function sendOrUpdateStartMessage(
  bot: Telegraf,
  chatId: number,
  role: UserRoleEnum,
): Promise<void> {
  const launchUrl = resolveRoleLaunchUrl(role);
  const { text, buttonLabel } = getStartMessageContent(role);
  const keyboard = Markup.inlineKeyboard([[Markup.button.webApp(buttonLabel, launchUrl)]]);

  // Set per-user menu button so "Ilovani ochish" always opens the correct role page.
  // Fire-and-forget — never block the message send on this.
  void (bot.telegram.callApi as any)('setChatMenuButton', {
    chat_id: chatId,
    menu_button: { type: 'web_app', text: buttonLabel, web_app: { url: launchUrl } },
  }).catch(() => { /* non-critical */ });

  // Fetch stored message ID while we already have role — no serial wait
  const prevMessageId = await getStoredMessageId(chatId);

  if (prevMessageId) {
    try {
      await bot.telegram.editMessageText(
        chatId,
        prevMessageId,
        undefined,
        text,
        { ...keyboard, parse_mode: undefined },
      );
      // Successfully edited — done, no DB write needed
      return;
    } catch {
      // Message deleted / too old — clear async, don't block sending
      void clearStoredMessageId(chatId);
    }
  }

  // Send fresh message — store ID fire-and-forget (non-blocking)
  const sent = await bot.telegram.sendMessage(chatId, text, keyboard);
  void storeMessageId(chatId, sent.message_id);
}

// ─── Order notification message ID storage ────────────────────────────────────

const ORDER_MSG_PREFIX = '_order_msg_';
const ORDER_MSG_TEXT_PREFIX = '_order_msg_text_';

function buildOrderMessageKey(orderId: string, chatId: string | number) {
  return `${ORDER_MSG_PREFIX}${orderId}:${chatId}`;
}

async function listOrderMessages(orderId: string): Promise<Array<{ chatId: string; messageId: number }>> {
  try {
    const rows = await prisma.restaurantSetting.findMany({
      where: {
        key: {
          startsWith: `${ORDER_MSG_PREFIX}${orderId}:`,
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    return rows
      .map((row) => {
        const chatId = row.key.slice(`${ORDER_MSG_PREFIX}${orderId}:`.length);
        const messageId = parseInt(row.value, 10);

        if (!chatId || Number.isNaN(messageId)) {
          return null;
        }

        return { chatId, messageId };
      })
      .filter((entry): entry is { chatId: string; messageId: number } => Boolean(entry));
  } catch {
    return [];
  }
}

async function storeOrderMessageId(
  orderId: string,
  chatId: string | number,
  messageId: number,
): Promise<void> {
  try {
    const key = buildOrderMessageKey(orderId, chatId);
    await prisma.restaurantSetting.upsert({
      where: { key },
      update: { value: String(messageId) },
      create: { key, value: String(messageId), dataType: 'number' },
    });
  } catch {
    // Non-critical.
  }
}

async function storeOrderMessageText(orderId: string, text: string): Promise<void> {
  try {
    const key = `${ORDER_MSG_TEXT_PREFIX}${orderId}`;
    await prisma.restaurantSetting.upsert({
      where: { key },
      update: { value: text },
      create: { key, value: text, dataType: 'string' },
    });
  } catch {
    // Non-critical.
  }
}

async function getStoredOrderMessageText(orderId: string): Promise<string | null> {
  try {
    const row = await prisma.restaurantSetting.findUnique({
      where: { key: `${ORDER_MSG_TEXT_PREFIX}${orderId}` },
      select: { value: true },
    });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

// ─── Order notification helpers ───────────────────────────────────────────────

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMoney(value: number): string {
  return Number(value || 0).toLocaleString('uz-UZ');
}

function formatTelegramOrderDisplayNumber(orderNumber: string | number | bigint): string {
  const normalized = String(orderNumber).replace(/[^\d]/g, '');
  const numeric = Number.parseInt(normalized, 10);

  if (!Number.isNaN(numeric)) {
    return `ORD-${String(numeric).padStart(3, '0')}`;
  }

  return `ORD-${String(orderNumber)}`;
}

function formatTelegramOrderDate(value?: string | Date | null): string {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getTelegramOrderStatusLabel(status?: string | null): string {
  switch (status) {
    case OrderStatusEnum.PREPARING:
      return 'Qabul qilindi';
    case OrderStatusEnum.READY_FOR_PICKUP:
      return 'Tayyor';
    case OrderStatusEnum.DELIVERING:
      return "Yo'lda";
    case OrderStatusEnum.DELIVERED:
      return 'Yetkazildi';
    case OrderStatusEnum.CANCELLED:
      return 'Bekor qilindi';
    case OrderStatusEnum.PENDING:
    default:
      return 'Kutilmoqda';
  }
}

function buildAdminOrderNotificationText(order: {
  orderNumber: string | number | bigint;
  createdAt?: string | Date | null;
  orderStatus?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerAddress: string;
  customerAddressNote?: string | null;
  paymentMethod: string;
  items: Array<{ name: string; quantity: number; totalPrice: number }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  hasReceipt: boolean;
}): string {
  const paymentLabel =
    order.paymentMethod === PaymentMethodEnum.MANUAL_TRANSFER
      ? 'Karta orqali'
      : order.paymentMethod === PaymentMethodEnum.EXTERNAL_PAYMENT
        ? 'Click / Payme'
        : 'Naqd pul';

  const itemLines = order.items
    .map((item) => `${item.quantity}x ${escapeHtml(item.name)} - ${formatMoney(item.totalPrice)} so'm`)
    .join('\n');

  return [
    `<b>Buyurtma ${escapeHtml(formatTelegramOrderDisplayNumber(order.orderNumber))}</b>`,
    '',
    `Vaqt: <b>${escapeHtml(formatTelegramOrderDate(order.createdAt))}</b>`,
    `Holat: <b>${escapeHtml(getTelegramOrderStatusLabel(order.orderStatus))}</b>`,
    '',
    `<b>Mijoz ma'lumotlari</b>`,
    `Ism: ${escapeHtml(order.customerName)}`,
    order.customerPhone ? `Telefon: ${escapeHtml(order.customerPhone)}` : null,
    `Manzil: ${escapeHtml(order.customerAddress)}`,
    order.customerAddressNote ? `Izoh: ${escapeHtml(order.customerAddressNote)}` : null,
    '',
    `<b>Buyurtma tarkibi</b>`,
    itemLines,
    '',
    `<b>To'lov</b>`,
    `Usul: ${escapeHtml(paymentLabel)}`,
    order.hasReceipt ? `Chek: yuborilgan` : null,
    `Mahsulotlar: ${formatMoney(order.subtotal)} so'm`,
    `Yetkazib berish: ${formatMoney(order.deliveryFee)} so'm`,
    `<b>Jami: ${formatMoney(order.total)} so'm</b>`,
  ].filter((line) => line !== null).join('\n');
}

async function resolveTelegramAdminUserId(telegramUserId?: number): Promise<string | null> {
  if (!telegramUserId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramUserId) },
      select: { id: true, role: true },
    });

    return user?.role === UserRoleEnum.ADMIN ? user.id : null;
  } catch {
    return null;
  }
}

function buildOrderInitialKeyboard(orderId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🟢 Qabul qilish', `order_approve:${orderId}`),
      Markup.button.callback('🔴 Bekor qilish', `order_reject:${orderId}`),
    ],
  ]);
}

function buildOrderConfirmKeyboard(isApprove: boolean, orderId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        isApprove ? '✅ Ha, tasdiqlayman' : '❌ Ha, bekor qilaman',
        isApprove ? `order_approve_confirm:${orderId}` : `order_reject_confirm:${orderId}`,
      ),
      Markup.button.callback('✖ Orqaga', `order_dismiss_confirm:${orderId}`),
    ],
  ]);
}


function updateTelegramOrderStatusLine(messageText: string, statusLabel: string): string {
  return messageText.replace(
    /Holat:\s*<b>.*?<\/b>/,
    `Holat: <b>${escapeHtml(statusLabel)}</b>`,
  );
}

async function syncTelegramOrderMessages(orderId: string, statusLabel: string) {
  const baseText = await getStoredOrderMessageText(orderId);
  if (!baseText) {
    return;
  }

  const nextText = updateTelegramOrderStatusLine(baseText, statusLabel);
  const messageTargets = await listOrderMessages(orderId);
  const state = getBotState();

  await Promise.all(
    messageTargets.map(async (target) => {
      try {
        // Try photo caption first (receipt+caption messages), fall back to text
        try {
          await state.bot.telegram.editMessageCaption(
            target.chatId,
            target.messageId,
            undefined,
            nextText,
            { parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } },
          );
        } catch {
          await state.bot.telegram.editMessageText(
            target.chatId,
            target.messageId,
            undefined,
            nextText,
            { parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } },
          );
        }
      } catch (error) {
        console.warn('[Bot] Could not sync order message state:', {
          orderId,
          chatId: target.chatId,
          messageId: target.messageId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );
}

function deriveStatusLabelFromTelegramResultLine(resultLine: string): string {
  if (resultLine.toLowerCase().includes('bekor')) {
    return 'Bekor qilindi';
  }
  if (resultLine.toLowerCase().includes('tasdiq')) {
    return 'Qabul qilindi';
  }
  if (resultLine.toLowerCase().includes('topilmadi')) {
    return 'Topilmadi';
  }
  return 'Kutilmoqda';
}

async function applyTelegramOrderAction(params: {
  orderId: string;
  isApprove: boolean;
  telegramUserId?: number;
}) {
  const adminUserId = await resolveTelegramAdminUserId(params.telegramUserId);
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { payment: true },
  });

  if (!order) {
    return {
      answerText: 'Buyurtma topilmadi',
      resultLine: '❌ Buyurtma topilmadi',
    };
  }

  const orderNumber = String(order.orderNumber);
  const isTerminal =
    order.status === OrderStatusEnum.CANCELLED ||
    order.status === OrderStatusEnum.DELIVERED;

  if (isTerminal) {
    const isCancelled = order.status === OrderStatusEnum.CANCELLED;
    return {
      answerText: isCancelled ? 'Buyurtma allaqachon bekor qilingan' : 'Buyurtma yakunlangan',
      resultLine: isCancelled ? '❌ Bekor qilingan' : '✅ Tasdiqlangan',
    };
  }

  const now = new Date();

  if (params.isApprove) {
    const shouldCompleteManualPayment =
      order.paymentMethod === PaymentMethodEnum.MANUAL_TRANSFER &&
      order.paymentStatus === PaymentStatusEnum.PENDING;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status:
            order.status === OrderStatusEnum.PENDING
              ? (OrderStatusEnum.PREPARING as any)
              : order.status,
          approvedByUserId: adminUserId ?? undefined,
          approvedAt: now,
          paymentStatus: shouldCompleteManualPayment
            ? (PaymentStatusEnum.COMPLETED as any)
            : undefined,
        },
      });

      if (shouldCompleteManualPayment && order.payment) {
        await tx.payment.update({
          where: { orderId: order.id },
          data: {
            status: PaymentStatusEnum.COMPLETED as any,
            verifiedByAdminId: adminUserId ?? undefined,
            verifiedAt: now,
            rejectionReason: null,
          },
        });
      }
    });

    await InAppNotificationsService.notifyUser({
      userId: order.userId,
      roleTarget: UserRoleEnum.CUSTOMER,
      type: NotificationTypeEnum.SUCCESS,
      title: 'Buyurtma tasdiqlandi',
      message: `#${orderNumber} buyurtma tasdiqlandi`,
      relatedOrderId: order.id,
    });

    return {
      answerText: 'Tasdiqlandi',
      resultLine: '✅ Tasdiqlangan',
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatusEnum.CANCELLED as any,
        cancellationReason: 'Telegram group orqali bekor qilindi',
        cancelledByRole: 'admin',
        paymentStatus:
          order.paymentStatus === PaymentStatusEnum.PENDING
            ? (PaymentStatusEnum.CANCELLED as any)
            : undefined,
      },
    });

    if (order.payment?.status === PaymentStatusEnum.PENDING) {
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status: PaymentStatusEnum.CANCELLED as any,
          rejectionReason: 'Telegram group orqali bekor qilindi',
          verifiedByAdminId: null,
          verifiedAt: null,
        },
      });
    }
  });

  await InAppNotificationsService.notifyUser({
    userId: order.userId,
    roleTarget: UserRoleEnum.CUSTOMER,
    type: NotificationTypeEnum.ERROR,
    title: 'Buyurtma bekor qilindi',
    message: `#${orderNumber} buyurtma bekor qilindi`,
    relatedOrderId: order.id,
  });

  return {
    answerText: 'Bekor qilindi',
    resultLine: '❌ Bekor qilingan',
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function bindHandlers(bot: Telegraf) {
  // /start — fetch role + stored message ID in parallel, then send/edit
  bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const chatId = ctx.chat.id;
    // Run DB queries concurrently — saves one full round-trip
    const [role] = await Promise.all([
      getUserRole(telegramId),
      prismaWarmup(),          // keep connection warm while we fetch role
    ]);
    await sendOrUpdateStartMessage(bot, chatId, role);
  });

  // /app — shortcut that deletes the command message then shows the app button
  bot.command('app', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const chatId = ctx.chat.id;

    // Delete the /app command message for clean UX
    try {
      await ctx.deleteMessage();
    } catch {
      // Ignore if can't delete
    }

    const role = await getUserRole(telegramId);
    await sendOrUpdateStartMessage(bot, chatId, role);
  });

  bot.command('chatid', async (ctx) => {
    await ctx.reply(`Chat ID: ${ctx.chat.id}`);
  });

  // Admin-only: trigger broadcast immediately (for testing)
  bot.command('broadcastnow', async (ctx) => {
    const adminIds = parseConfiguredChatIds(env.ADMIN_IDS);
    if (!adminIds.includes(String(ctx.from.id))) {
      return ctx.reply('Ruxsat yo\'q.');
    }
    await ctx.reply('⏳ Broadcast boshlanmoqda...');
    try {
      await sendBroadcastToAllCustomers(bot);
      await prisma.restaurantSetting.upsert({
        where: { key: BROADCAST_SETTING_KEY },
        update: { value: String(Date.now()) },
        create: { key: BROADCAST_SETTING_KEY, value: String(Date.now()), dataType: 'number' },
      });
      await ctx.reply('✅ Broadcast tugadi! Keyingi 3 kunda avtomatik.');
    } catch (err) {
      await ctx.reply(`❌ Xatolik: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Handle admin support replies
  bot.on('message', async (ctx, next) => {
    const message = ctx.message;
    if ('text' in message) {
      await handleAdminSupportReply(message);
    }
    return next();
  });

  // ── Order approve / reject callback buttons ───────────────────────────────
  bot.on('callback_query', async (ctx) => {
    const data = (ctx.callbackQuery as any).data as string | undefined;
    if (!data) return ctx.answerCbQuery();

    const allowedRecipientChatIds = resolveOrderNotificationRecipientChatIds();
    const chatId = (ctx.callbackQuery as any).message?.chat?.id;

    // Only process if this callback comes from an allowed order-recipient chat.
    if (allowedRecipientChatIds.length > 0 && !allowedRecipientChatIds.includes(String(chatId))) {
      return ctx.answerCbQuery('Ruxsat yo\'q');
    }

    // ── Step 1: Show confirmation dialog ──────────────────────────────────
    if (data.startsWith('order_approve:') || data.startsWith('order_reject:')) {
      const orderId = data.split(':')[1];
      const isApprove = data.startsWith('order_approve:');
      const question = isApprove
        ? '❓ Haqiqatdan tasdiqlamoqchimisiz?'
        : '❓ Haqiqatdan bekor qilmoqchimisiz?';
      const confirmKeyboard = buildOrderConfirmKeyboard(isApprove, orderId);
      const message = (ctx.callbackQuery as any).message;
      const msgId = message?.message_id;

      if (msgId && chatId) {
        try {
          const hasPhoto = Boolean(message.photo?.length);
          const currentText = hasPhoto ? (message.caption ?? '') : (message.text ?? '');
          const newText = `${currentText}\n\n${question}`;
          if (hasPhoto) {
            await ctx.telegram.editMessageCaption(chatId, msgId, undefined, newText, {
              parse_mode: 'HTML',
              ...confirmKeyboard,
            });
          } else {
            await ctx.telegram.editMessageText(chatId, msgId, undefined, newText, {
              parse_mode: 'HTML',
              ...confirmKeyboard,
            });
          }
        } catch { /* message already updated or too old */ }
      }

      await ctx.answerCbQuery();
      return;
    }

    // ── Dismiss: restore original message + initial keyboard ──────────────
    if (data.startsWith('order_dismiss_confirm:')) {
      const orderId = data.slice('order_dismiss_confirm:'.length);
      const message = (ctx.callbackQuery as any).message;
      const msgId = message?.message_id;

      if (msgId && chatId) {
        const storedText = await getStoredOrderMessageText(orderId);
        const restoredKeyboard = buildOrderInitialKeyboard(orderId);
        const hasPhoto = Boolean(message.photo?.length);
        const restoreText = storedText || (hasPhoto ? (message.caption ?? '') : (message.text ?? ''));

        try {
          if (hasPhoto) {
            await ctx.telegram.editMessageCaption(chatId, msgId, undefined, restoreText, {
              parse_mode: 'HTML',
              ...restoredKeyboard,
            });
          } else {
            await ctx.telegram.editMessageText(chatId, msgId, undefined, restoreText, {
              parse_mode: 'HTML',
              ...restoredKeyboard,
            });
          }
        } catch { /* ignore */ }
      }

      await ctx.answerCbQuery();
      return;
    }

    // ── Step 2: Execute confirmed action ──────────────────────────────────
    if (data.startsWith('order_approve_confirm:') || data.startsWith('order_reject_confirm:')) {
      const isApprove = data.startsWith('order_approve_confirm:');
      const orderId = data.split(':')[1];

      try {
        const result = await applyTelegramOrderAction({
          orderId,
          isApprove,
          telegramUserId: ctx.from?.id,
        });
        await syncTelegramOrderMessages(
          orderId,
          deriveStatusLabelFromTelegramResultLine(result.resultLine),
        );
        await ctx.answerCbQuery(result.answerText);
      } catch (err) {
        console.error('[Bot] Order callback error:', err);
        await ctx.answerCbQuery('Xatolik yuz berdi');
      }
      return;
    }

    return ctx.answerCbQuery();
  });

  bot.catch((error, ctx) => {
    console.error('[Bot] Unhandled error', {
      updateId: ctx.update?.update_id,
      error,
    });
  });
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

const BROADCAST_SETTING_KEY = '_bot_last_broadcast';
const BROADCAST_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const BROADCAST_HOUR_UTC = 15; // 20:00 Uzbekistan (UTC+5)

async function getPopularMenuItemNames(): Promise<string[]> {
  try {
    const items = await prisma.menuItem.findMany({
      where: { isActive: true, availabilityStatus: 'AVAILABLE' as any, isPopular: true },
      select: { nameUz: true },
      orderBy: { sortOrder: 'asc' },
      take: 4,
    });
    return items.map((i) => i.nameUz).filter(Boolean);
  } catch {
    return [];
  }
}

// One DB call for ALL customers — no per-user queries in the loop
async function buildFavoriteItemMap(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  try {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const rows = await prisma.orderItem.findMany({
      where: {
        order: {
          userId: { in: userIds },
          status: 'DELIVERED' as any,
          createdAt: { gte: threeMonthsAgo },
        },
      },
      select: {
        itemName: true,
        quantity: true,
        order: { select: { userId: true } },
      },
    });

    // Aggregate: userId → itemName → total quantity ordered
    const agg = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const uid = row.order.userId;
      if (!agg.has(uid)) agg.set(uid, new Map());
      const m = agg.get(uid)!;
      m.set(row.itemName, (m.get(row.itemName) ?? 0) + row.quantity);
    }

    // Pick the top item per user
    const result = new Map<string, string>();
    for (const [userId, itemMap] of agg) {
      let bestItem = '';
      let bestQty = 0;
      for (const [name, qty] of itemMap) {
        if (qty > bestQty) { bestQty = qty; bestItem = name; }
      }
      if (bestItem) result.set(userId, bestItem);
    }
    return result;
  } catch {
    return new Map();
  }
}

// Drinks should never be described as "issiq pishirilgan"
const DRINK_PATTERN = /pepsi|cola|sprite|fanta|sharbat|limonad|mors|kompot|choy|kofe|qahva|mineral|ayron|kefir|yogurt|juice|sut|lassi/i;

async function getActivePromoLine(): Promise<string | null> {
  try {
    const now = new Date();
    const promo = await prisma.promoCode.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
        targetUserId: null,
      },
      select: { code: true, discountType: true, discountValue: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!promo) return null;

    const discountStr =
      promo.discountType === 'PERCENTAGE'
        ? `${Number(promo.discountValue)}%`
        : `${Number(promo.discountValue).toLocaleString()} so'm`;

    return `🎁 <b>${escapeHtml(promo.code)}</b> promokodi bilan ${discountStr} chegirma!`;
  } catch {
    return null;
  }
}

function buildBroadcastText(
  favItem: string | null,
  popularItems: string[],
  promoLine: string | null,
): string {
  const variant = Math.floor(Date.now() / BROADCAST_INTERVAL_MS) % 3;
  let main: string;

  if (favItem) {
    const item = escapeHtml(favItem);
    if (DRINK_PATTERN.test(favItem)) {
      // Drink — no cooking/temperature references
      const opts = [
        `Sizning sevimlingiz — ${item} bor! 😊\n\nBuyurtma bering, yetkazib beramiz.`,
        `${item} — bugun ham menyuda 🥤\n\nBuyurtma qiling!`,
        `${item} xohlaysizmi?\n\nBuyurtma bering 🛒`,
      ];
      main = opts[variant];
    } else {
      // Food — can say hot/freshly cooked
      const opts = [
        `${item} — bugun yangi pishirildi 🍽️\n\nIssiq holda yetkazib beramiz.`,
        `Sizning sevimli taomingiz — ${item} 😋\n\nBugun ham tayyor, issiq.`,
        `${item} pishdi! 🔥\n\nBuyurtma qiling, issiq holda eshigingizga.`,
      ];
      main = opts[variant];
    }
  } else if (popularItems.length > 0) {
    const list = popularItems.slice(0, 3).map(escapeHtml).join(', ');
    const opts = [
      `Bugun menyumizda: ${list} 🍽️\n\nYangi pishirilgan, issiq.`,
      `${list} — barchasi tayyor 🔥\n\nBugun buyurtma qilasizmi?`,
      `Issiq taomlar tayyor: ${list} 😋\n\nBuyurtma qiling!`,
    ];
    main = opts[variant];
  } else {
    const opts = [
      `Bugun Turon kafesidan buyurtma qilasizmi? 🍽️\n\n30 daqiqada eshigingizda.`,
      `Issiq taomlar tayyor 😋\n\nBuyurtma qiling, tez yetkazamiz.`,
      `Bugun menyumiz boy 🍽️\n\nBir nazar tashlaysizmi?`,
    ];
    main = opts[variant];
  }

  return promoLine ? `${main}\n\n${promoLine}` : main;
}

function calcNextBroadcastMs(lastTimestamp: number): number {
  const now = Date.now();
  // Earliest allowed time = 3 days after last broadcast
  const earliest = lastTimestamp > 0 ? lastTimestamp + BROADCAST_INTERVAL_MS : now;

  // Find the next BROADCAST_HOUR_UTC o'clock that is >= earliest
  const candidate = new Date(earliest);
  candidate.setUTCHours(BROADCAST_HOUR_UTC, 0, 0, 0);
  if (candidate.getTime() <= earliest) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }

  return candidate.getTime();
}

async function sendBroadcastToAllCustomers(bot: Telegraf): Promise<void> {
  const customers = await prisma.user.findMany({
    where: { role: UserRoleEnum.CUSTOMER as any, isActive: true },
    select: { id: true, telegramId: true },
  });

  // Prefetch all personalisation data before the loop — no per-user DB calls
  const userIds = customers.map((c) => c.id);
  const [favoriteItems, popularItems, promoLine] = await Promise.all([
    buildFavoriteItemMap(userIds),
    getPopularMenuItemNames(),
    getActivePromoLine(),
  ]);

  const launchUrl = resolveMiniAppLaunchUrl('customer');
  const keyboard = Markup.inlineKeyboard([[Markup.button.webApp('🛒 Buyurtma qilish', launchUrl)]]);

  let sent = 0;
  let failed = 0;

  for (const customer of customers) {
    if (!customer.telegramId) continue;
    const chatId = Number(customer.telegramId);

    try {
      // Delete ALL previously stored bot messages so the chat stays clean
      await deleteAllStoredMessages(bot, chatId);

      const favItem = favoriteItems.get(customer.id) ?? null;
      const text = buildBroadcastText(favItem, popularItems, promoLine);

      const sentMsg = await bot.telegram.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        ...keyboard,
      });
      void storeMessageId(chatId, sentMsg.message_id);
      sent++;
    } catch (err: any) {
      // 403 = user blocked the bot — skip silently
      // 400 = chat not found (user deleted account) — skip silently
      if (err?.response?.error_code !== 403 && err?.response?.error_code !== 400) {
        console.warn('[Bot] Broadcast send failed:', err?.message ?? err);
      }
      failed++;
    }

    // Telegram rate limit: ~30 msg/s across all chats
    if ((sent + failed) % 25 === 0) {
      await new Promise<void>((r) => setTimeout(r, 1000));
    }
  }

  console.log(`[Bot] Broadcast done — sent: ${sent}, skipped: ${failed}`);
}

async function scheduleBroadcast(bot: Telegraf): Promise<void> {
  let lastTimestamp = 0;
  try {
    const row = await prisma.restaurantSetting.findUnique({
      where: { key: BROADCAST_SETTING_KEY },
      select: { value: true },
    });
    lastTimestamp = row?.value ? parseInt(row.value, 10) : 0;
  } catch { /* non-fatal */ }

  const nextMs = calcNextBroadcastMs(lastTimestamp);
  const delayMs = Math.max(0, nextMs - Date.now());

  console.log(`[Bot] Next broadcast in ${Math.round(delayMs / 60_000)} min (${new Date(nextMs).toISOString()})`);

  setTimeout(async () => {
    try {
      await sendBroadcastToAllCustomers(bot);
      await prisma.restaurantSetting.upsert({
        where: { key: BROADCAST_SETTING_KEY },
        update: { value: String(Date.now()) },
        create: { key: BROADCAST_SETTING_KEY, value: String(Date.now()), dataType: 'number' },
      });
    } catch (err) {
      console.error('[Bot] Broadcast error:', err);
    }
    // Schedule the next one
    void scheduleBroadcast(bot);
  }, delayMs);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function launchTelegramBot(context: BotLaunchContext): Promise<Telegraf> {
  const state = getBotState();

  if (!state.handlersBound) {
    bindHandlers(state.bot);
    state.handlersBound = true;
  }

  if (state.launched) {
    return state.bot;
  }

  state.launched = true;
  void state.bot
    .launch(() => {
      console.log(`[Bot] Turon Bot launched (${context}). Web App URL: ${resolveStableWebAppBaseUrl()}`);

      // Warm up DB connection pool immediately after launch so the first /start
      // finds an open connection instead of paying the cold-start penalty (~1-2s)
      void prismaWarmup();

      // Set the persistent menu button so users never need to type /start
      void setupMenuButton(state.bot);

      // Start 3-day broadcast scheduler
      void scheduleBroadcast(state.bot);
    })
    .catch((error) => {
      state.launched = false;
      console.error(`[Bot] Turon Bot launch failed (${context}):`, error);
    });

  return state.bot;
}

export async function forwardSupportMessageToAdmin(payload: {
  orderNumber?: string;
  customerName?: string;
  senderLabel: string;
  text: string;
  topic?: string;
}) {
  const adminChatId = resolveAdminChatId();
  if (!adminChatId) throw new Error('ADMIN_CHAT_ID yoki ADMIN_IDS sozlanmagan');

  const state = getBotState();
  if (!state.handlersBound) {
    bindHandlers(state.bot);
    state.handlersBound = true;
  }

  const lines = [
    'Yangi support xabari',
    payload.orderNumber ? `Buyurtma: #${payload.orderNumber}` : 'Buyurtma: Umumiy savol',
    `Mijoz: ${payload.customerName || payload.senderLabel || 'Mijoz'}`,
    payload.topic ? `Mavzu: ${payload.topic}` : null,
    '',
    payload.text,
    '',
    'Javob berish uchun shu xabarga reply qiling.',
  ]
    .filter(Boolean)
    .join('\n');

  const sentMessage = await state.bot.telegram.sendMessage(adminChatId, lines);

  return {
    chatId: String(sentMessage.chat.id),
    messageId: sentMessage.message_id,
  };
}

export async function sendOrderNotificationToAdmin(payload: {
  orderId: string;
  orderNumber: string | number | bigint;
  createdAt?: string | Date | null;
  orderStatus?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerAddress: string;
  customerAddressNote?: string | null;
  paymentMethod: string;
  items: Array<{ name: string; quantity: number; totalPrice: number }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  receiptImageBase64?: string;
}) {
  const recipientChatIds = resolveOrderNotificationRecipientChatIds();
  if (recipientChatIds.length === 0) return; // silently skip if not configured

  const state = getBotState();
  if (!state.handlersBound) {
    bindHandlers(state.bot);
    state.handlersBound = true;
  }

  const text = buildAdminOrderNotificationText({
    ...payload,
    hasReceipt: Boolean(payload.receiptImageBase64),
  });
  void storeOrderMessageText(payload.orderId, text);

  const orderKeyboard = buildOrderInitialKeyboard(payload.orderId);

  // Telegram caption limit is 1024 chars — truncate if needed
  const CAPTION_MAX = 1024;
  const captionText = text.length <= CAPTION_MAX ? text : `${text.slice(0, 1021)}…`;

  try {
    const imageBuffer = payload.receiptImageBase64
      ? Buffer.from(payload.receiptImageBase64.replace(/^data:image\/[^;]+;base64,/, ''), 'base64')
      : null;

    for (const recipientChatId of recipientChatIds) {
      try {
        if (imageBuffer) {
          // Single message: receipt photo on top, order details as caption
          const sent = await state.bot.telegram.sendPhoto(
            recipientChatId,
            { source: imageBuffer },
            {
              caption: captionText,
              parse_mode: 'HTML',
              ...orderKeyboard,
            },
          );
          void storeOrderMessageId(payload.orderId, recipientChatId, sent.message_id);
        } else {
          // No receipt — plain text message
          const sent = await state.bot.telegram.sendMessage(recipientChatId, text, {
            parse_mode: 'HTML',
            ...orderKeyboard,
          });
          void storeOrderMessageId(payload.orderId, recipientChatId, sent.message_id);
        }
      } catch (error) {
        console.warn('[Bot] Could not send order notification to recipient:', {
          orderId: payload.orderId,
          chatId: recipientChatId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (err) {
    console.error('[Bot] sendOrderNotificationToAdmin error:', err);
  }
}

/**
 * Called when a user's role changes (e.g. customer promoted to courier).
 * Clears the role cache and pushes a new start message so the user sees
 * the correct panel immediately without re-sending /start.
 */
export async function notifyUserRoleUpdate(telegramId: bigint, newRole: UserRoleEnum): Promise<void> {
  // Bust role cache so the next /start reads fresh from DB
  roleCache.delete(String(telegramId));

  const state = getBotState();
  if (!state.handlersBound) {
    bindHandlers(state.bot);
    state.handlersBound = true;
  }

  try {
    await sendOrUpdateStartMessage(state.bot, Number(telegramId), newRole);
  } catch {
    // User may not have started the bot yet — silently ignore (403 from Telegram)
  }
}

export async function stopTelegramBot(signal: string) {
  const state = globalThis.__turonTelegramBotState;
  if (!state?.launched) return;
  state.bot.stop(signal);
  state.launched = false;
}
