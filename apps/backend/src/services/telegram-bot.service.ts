import { Markup, Telegraf } from 'telegraf';
import type { Message } from 'telegraf/typings/core/types/typegram';
import { UserRoleEnum } from '@turon/shared';
import { env } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { SupportService } from './support.service.js';

const botToken = env.BOT_TOKEN;
const webAppUrl = env.WEB_APP_URL;
const canonicalWebAppUrl = 'https://turon-miniapp.vercel.app/';

type BotLaunchContext = 'api' | 'bot';

declare global {
  // eslint-disable-next-line no-var
  var __turonTelegramBotState:
    | {
        bot: Telegraf;
        launched: boolean;
        handlersBound: boolean;
      }
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

function resolveAdminChatId() {
  if (env.ADMIN_CHAT_ID?.trim()) {
    return env.ADMIN_CHAT_ID.trim();
  }

  const fallbackAdminId = env.ADMIN_IDS?.split(',')
    .map((value) => value.trim())
    .find(Boolean);

  return fallbackAdminId || null;
}

async function getUserRole(telegramId: string): Promise<UserRoleEnum> {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    return (user?.role as UserRoleEnum | undefined) || UserRoleEnum.CUSTOMER;
  } catch (error) {
    console.error('Failed to resolve Telegram user role, defaulting to CUSTOMER.', error);
    return UserRoleEnum.CUSTOMER;
  }
}

function resolveRoleLaunchUrl(role: UserRoleEnum) {
  const normalizedBaseUrl = resolveStableWebAppBaseUrl();
  const launchPath =
    role === UserRoleEnum.ADMIN
      ? 'admin/dashboard'
      : role === UserRoleEnum.COURIER
        ? 'courier'
        : 'customer';

  return new URL(launchPath, normalizedBaseUrl).toString();
}

function resolveStableWebAppBaseUrl() {
  if (!webAppUrl) {
    return canonicalWebAppUrl;
  }

  try {
    const parsedUrl = new URL(webAppUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname.endsWith('.vercel.app') && hostname !== 'turon-miniapp.vercel.app') {
      return canonicalWebAppUrl;
    }

    return webAppUrl.endsWith('/') ? webAppUrl : `${webAppUrl}/`;
  } catch {
    return canonicalWebAppUrl;
  }
}

function getAdminSenderLabel(message: Message.CommonMessage) {
  const firstName = message.from?.first_name?.trim();
  const lastName = message.from?.last_name?.trim();
  const username = message.from?.username?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return fullName || username || 'Operator';
}

async function handleAdminSupportReply(message: Message.CommonMessage) {
  const adminChatId = resolveAdminChatId();

  if (!adminChatId) {
    return;
  }

  if (!message.text?.trim()) {
    return;
  }

  if (String(message.chat.id) !== String(adminChatId)) {
    return;
  }

  const replyToMessageId = message.reply_to_message?.message_id;
  if (!replyToMessageId) {
    return;
  }

  await SupportService.createAdminReplyFromTelegram({
    adminChatId: String(message.chat.id),
    telegramMessageId: message.message_id,
    replyToTelegramMessageId: replyToMessageId,
    senderLabel: getAdminSenderLabel(message),
    text: message.text.trim(),
  });
}

function bindHandlers(bot: Telegraf) {
  bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const role = await getUserRole(telegramId);

    let message =
      'Assalomu alaykum! Turon kafesi botiga xush kelibsiz.\n\nQuyidagi tugma orqali taom buyurtma qilishingiz mumkin:';
    let buttonLabel = 'Ilovani ochish';

    if (role === UserRoleEnum.ADMIN) {
      message =
        'Assalomu alaykum, Admin! Turon boshqaruv paneliga xush kelibsiz.\n\nBoshqaruvni boshlash uchun tugmani bosing:';
      buttonLabel = 'Admin panelini ochish';
    } else if (role === UserRoleEnum.COURIER) {
      message =
        'Assalomu alaykum, Kuryer! Siz uchun yetkazib berish paneli tayyor.\n\nKuryer panelini ochish:';
      buttonLabel = 'Kuryer panelini ochish';
    }

    const launchUrl = resolveRoleLaunchUrl(role);

    if (!launchUrl) {
      return ctx.reply(message);
    }

    return ctx.reply(
      message,
      Markup.inlineKeyboard([[Markup.button.webApp(buttonLabel, launchUrl)]]),
    );
  });

  bot.on('message', async (ctx, next) => {
    const message = ctx.message;

    if ('text' in message) {
      await handleAdminSupportReply(message);
    }

    return next();
  });

  bot.catch((error, ctx) => {
    console.error('Unhandled bot error', {
      updateId: ctx.update?.update_id,
      error,
    });
  });
}

export async function launchTelegramBot(context: BotLaunchContext) {
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
  console.log(`Turon Bot is running (${context})...`);

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

  if (!adminChatId) {
    throw new Error('ADMIN_CHAT_ID yoki ADMIN_IDS sozlanmagan');
  }

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
    "Javob berish uchun shu xabarga reply qiling.",
  ].filter(Boolean);

  const sentMessage = await state.bot.telegram.sendMessage(adminChatId, lines.join('\n'));

  return {
    chatId: String(sentMessage.chat.id),
    messageId: sentMessage.message_id,
  };
}

export async function stopTelegramBot(signal: string) {
  const state = globalThis.__turonTelegramBotState;
  if (!state?.launched) {
    return;
  }

  state.bot.stop(signal);
  state.launched = false;
}
