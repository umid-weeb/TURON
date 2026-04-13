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

async function getStoredMessageId(chatId: number): Promise<number | null> {
  try {
    const row = await prisma.restaurantSetting.findUnique({
      where: { key: `${BOT_MSG_PREFIX}${chatId}` },
      select: { value: true },
    });
    if (!row) return null;
    const id = parseInt(row.value, 10);
    return isNaN(id) ? null : id;
  } catch {
    return null;
  }
}

async function storeMessageId(chatId: number, messageId: number): Promise<void> {
  try {
    const key = `${BOT_MSG_PREFIX}${chatId}`;
    await prisma.restaurantSetting.upsert({
      where: { key },
      update: { value: String(messageId) },
      create: {
        id: `bot-msg-${chatId}`,
        key,
        value: String(messageId),
        dataType: 'number',
      },
    });
  } catch {
    // Non-critical — message tracking failure doesn't break bot functionality
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
    env.ADMIN_IDS?.split(',')
      .map((v) => v.trim())
      .find(Boolean) ?? null
  );
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
  const baseUrl = resolveStableWebAppBaseUrl();
  const path =
    role === UserRoleEnum.ADMIN
      ? 'admin/dashboard'
      : role === UserRoleEnum.COURIER
        ? 'courier'
        : 'customer';
  return new URL(path, baseUrl).toString();
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
  const baseUrl = resolveStableWebAppBaseUrl();
  const customerUrl = new URL('customer', baseUrl).toString();

  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Ilovani ochish' },
      { command: 'app', description: "To'g'ridan ilovaga o'tish" },
    ]);

    // This sets the persistent WebApp button (bottom-left in chat)
    // Works independently of messages — always shows current URL
    await (bot.telegram as any).setMenuButton({
      type: 'web_app',
      text: 'Ilovani ochish',
      web_app: { url: customerUrl },
    });

    console.log(`[Bot] Menu button set → ${customerUrl}`);
  } catch (error) {
    // setMenuButton may not be available in all Telegraf versions
    // This is non-critical — bot works without it
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

async function getOrderMessageId(orderId: string): Promise<number | null> {
  try {
    const row = await prisma.restaurantSetting.findUnique({
      where: { key: `${ORDER_MSG_PREFIX}${orderId}` },
      select: { value: true },
    });
    if (!row) return null;
    const id = parseInt(row.value, 10);
    return isNaN(id) ? null : id;
  } catch {
    return null;
  }
}

async function storeOrderMessageId(orderId: string, messageId: number): Promise<void> {
  try {
    const key = `${ORDER_MSG_PREFIX}${orderId}`;
    await prisma.restaurantSetting.upsert({
      where: { key },
      update: { value: String(messageId) },
      create: { id: `order-msg-${orderId}`, key, value: String(messageId), dataType: 'number' },
    });
  } catch { /* non-critical */ }
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

function buildOrderNotificationText(order: {
  orderNumber: string | number | bigint;
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
      ? '💳 Karta orqali'
      : order.paymentMethod === PaymentMethodEnum.EXTERNAL_PAYMENT
        ? '📱 Click / Payme'
        : '💵 Naqd pul';

  const itemLines = order.items
    .map((i) => `  • ${escapeHtml(i.name)} ×${i.quantity} — ${formatMoney(i.totalPrice)} so'm`)
    .join('\n');

  return [
    `🆕 <b>Yangi buyurtma #${escapeHtml(order.orderNumber)}</b>`,
    '',
    `👤 Mijoz: <b>${escapeHtml(order.customerName)}</b>`,
    order.customerPhone ? `📞 Telefon: ${escapeHtml(order.customerPhone)}` : null,
    `📍 Manzil: ${escapeHtml(order.customerAddress)}`,
    order.customerAddressNote ? `📝 Manzil izohi: ${escapeHtml(order.customerAddressNote)}` : null,
    `${paymentLabel}${order.hasReceipt ? ' — <b>chek yuborildi</b>' : ''}`,
    '',
    '🛒 Taomlar:',
    itemLines,
    '',
    `📦 Taomlar: ${formatMoney(order.subtotal)} so'm`,
    `🚚 Yetkazish: ${formatMoney(order.deliveryFee)} so'm`,
    `💰 <b>Jami: ${formatMoney(order.total)} so'm</b>`,
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

function appendTelegramOrderResultLine(messageText: string, resultLine: string) {
  const trimmed = messageText.trimEnd();
  const knownResultLines = ['✅ Tasdiqlangan', '❌ Bekor qilingan'];
  const withoutOldResult = knownResultLines.reduce((text, line) => {
    return text.endsWith(line) ? text.slice(0, -line.length).trimEnd() : text;
  }, trimmed);

  return `${withoutOldResult}\n\n${resultLine}`;
}

async function editTelegramOrderMessage(ctx: any, resultLine: string) {
  const message = ctx.callbackQuery?.message;
  const chatId = message?.chat?.id;
  const messageId = message?.message_id;

  if (!chatId || !messageId) return;

  const editOptions = { reply_markup: { inline_keyboard: [] } };
  const hasPhotoCaption = Boolean(message.photo && typeof message.caption === 'string');
  const currentText = hasPhotoCaption ? message.caption : message.text ?? '';
  const nextText = appendTelegramOrderResultLine(currentText, resultLine);

  if (hasPhotoCaption) {
    await ctx.telegram.editMessageCaption(chatId, messageId, undefined, nextText, editOptions);
    return;
  }

  await ctx.telegram.editMessageText(chatId, messageId, undefined, nextText, editOptions);
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

    const adminChatId = resolveAdminChatId();
    const chatId = (ctx.callbackQuery as any).message?.chat?.id;

    // Only process if this callback comes from the configured admin chat
    if (adminChatId && String(chatId) !== String(adminChatId)) {
      return ctx.answerCbQuery('Ruxsat yo\'q');
    }

    if (data.startsWith('order_approve:') || data.startsWith('order_reject:')) {
      const [action, orderId] = data.split(':');
      const isApprove = action === 'order_approve';

      try {
        const result = await applyTelegramOrderAction({
          orderId,
          isApprove,
          telegramUserId: ctx.from?.id,
        });
        await editTelegramOrderMessage(ctx, result.resultLine);
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

  await state.bot.launch();
  state.launched = true;
  console.log(`[Bot] Turon Bot launched (${context}). Web App URL: ${resolveStableWebAppBaseUrl()}`);

  // Warm up DB connection pool immediately after launch so the first /start
  // finds an open connection instead of paying the cold-start penalty (~1-2s)
  void prismaWarmup();

  // Set the persistent menu button so users never need to type /start
  void setupMenuButton(state.bot);

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
  const adminChatId = resolveAdminChatId();
  if (!adminChatId) return; // silently skip if not configured

  const state = getBotState();
  if (!state.handlersBound) {
    bindHandlers(state.bot);
    state.handlersBound = true;
  }

  const text = buildOrderNotificationText({ ...payload, hasReceipt: Boolean(payload.receiptImageBase64) });

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tasdiqlash', `order_approve:${payload.orderId}`),
      Markup.button.callback('❌ Bekor qilish', `order_reject:${payload.orderId}`),
    ],
  ]);

  try {
    let sentMessageId: number;

    if (payload.receiptImageBase64) {
      // Strip "data:image/...;base64," prefix and convert to Buffer
      const base64Data = payload.receiptImageBase64.replace(/^data:image\/[^;]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      if (text.length <= 950) {
        const sent = await state.bot.telegram.sendPhoto(
          adminChatId,
          { source: imageBuffer },
          { caption: text, parse_mode: 'HTML', ...keyboard },
        );
        sentMessageId = sent.message_id;
      } else {
        const photo = await state.bot.telegram.sendPhoto(
          adminChatId,
          { source: imageBuffer },
          { caption: `#${escapeHtml(payload.orderNumber)} to'lov cheki`, parse_mode: 'HTML' },
        );
        const sent = await state.bot.telegram.sendMessage(
          adminChatId,
          `${text}\n\n<i>Chek rasmi yuqoridagi xabarda.</i>`,
          {
            parse_mode: 'HTML',
            reply_parameters: { message_id: photo.message_id },
            ...keyboard,
          },
        );
        sentMessageId = sent.message_id;
      }
    } else {
      const sent = await state.bot.telegram.sendMessage(adminChatId, text, {
        parse_mode: 'HTML',
        ...keyboard,
      });
      sentMessageId = sent.message_id;
    }

    // Store message ID so callback can edit/reference it
    void storeOrderMessageId(payload.orderId, sentMessageId);
  } catch (err) {
    console.error('[Bot] sendOrderNotificationToAdmin error:', err);
  }
}

export async function stopTelegramBot(signal: string) {
  const state = globalThis.__turonTelegramBotState;
  if (!state?.launched) return;
  state.bot.stop(signal);
  state.launched = false;
}
