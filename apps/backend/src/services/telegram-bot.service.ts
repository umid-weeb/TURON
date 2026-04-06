import { Markup, Telegraf } from 'telegraf';
import { UserRoleEnum } from '@turon/shared';
import { env } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { SupportService } from './support.service.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const botToken = env.BOT_TOKEN;
const webAppUrl = env.WEB_APP_URL;

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
    await prisma.restaurantSetting.upsert({
      where: { key: `${BOT_MSG_PREFIX}${chatId}` },
      update: { value: String(messageId) },
      create: {
        key: `${BOT_MSG_PREFIX}${chatId}`,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveAdminChatId(): string | null {
  if (env.ADMIN_CHAT_ID?.trim()) return env.ADMIN_CHAT_ID.trim();

  return (
    env.ADMIN_IDS?.split(',')
      .map((v) => v.trim())
      .find(Boolean) ?? null
  );
}

async function getUserRole(telegramId: string, retryCount = 0): Promise<UserRoleEnum> {
  const MAX_RETRIES = 2;
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { role: true },
    });
    if (!user) return UserRoleEnum.CUSTOMER;
    return (user.role as UserRoleEnum) || UserRoleEnum.CUSTOMER;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.warn(`[Bot] Retrying getUserRole for ${telegramId} (attempt ${retryCount + 1})...`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return getUserRole(telegramId, retryCount + 1);
    }
    console.error(`[Bot] CRITICAL: Failed to resolve role for ${telegramId} after ${MAX_RETRIES} retries.`, error);
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
      // Successfully edited — no new message, no DB update needed
      return;
    } catch {
      // Message was deleted, too old, or not from this bot — fall through to send new
      await clearStoredMessageId(chatId);
    }
  }

  // Send a fresh message and persist its ID
  const sent = await bot.telegram.sendMessage(chatId, text, keyboard);
  await storeMessageId(chatId, sent.message_id);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function bindHandlers(bot: Telegraf) {
  // /start — edit existing start message (or send new if none stored)
  bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const chatId = ctx.chat.id;
    const role = await getUserRole(telegramId);
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

  // Handle admin support replies
  bot.on('message', async (ctx, next) => {
    const message = ctx.message;
    if ('text' in message) {
      await handleAdminSupportReply(message);
    }
    return next();
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

export async function stopTelegramBot(signal: string) {
  const state = globalThis.__turonTelegramBotState;
  if (!state?.launched) return;
  state.bot.stop(signal);
  state.launched = false;
}
