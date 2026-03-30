import { Telegraf, Markup } from 'telegraf';
import { UserRoleEnum } from '@turon/shared';
import { env } from '../config.js';

const botToken = env.BOT_TOKEN;
const webAppUrl = env.WEB_APP_URL || 'https://your-ngrok-url.ngrok-free.dev';

if (!botToken) {
  console.error('❌ BOT_TOKEN is missing in .env');
  process.exit(1);
}

const bot = new Telegraf(botToken);
import { prisma } from '../lib/prisma.js';

// --- Auth Utilities ---
async function getUserRole(telegramId: string): Promise<UserRoleEnum> {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { roles: true }
  });

  if (!user || user.roles.length === 0) return UserRoleEnum.CUSTOMER;

  const roles = user.roles.map(r => r.role);
  if (roles.includes(UserRoleEnum.ADMIN)) return UserRoleEnum.ADMIN;
  if (roles.includes(UserRoleEnum.COURIER)) return UserRoleEnum.COURIER;
  
  return UserRoleEnum.CUSTOMER;
}

// --- Commands ---
bot.start(async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const role = await getUserRole(telegramId);

  let message = "Assalomu alaykum! Turon kafesi botiga xush kelibsiz. 🥘\n\nQuyidagi tugma orqali taom buyurtma qilishingiz mumkin:";
  let buttonLabel = "📱 Ilovani ochish";

  if (role === UserRoleEnum.ADMIN) {
    message = "Assalomu alaykum, Admin! Turon boshqaruv paneliga xush kelibsiz. 🏢\n\nBoshqaruvni boshlash uchun tugmani bosing:";
    buttonLabel = "🎛️ Admin Panelni ochish";
  } else if (role === UserRoleEnum.COURIER) {
    message = "Assalomu alaykum, Kurer! Senga yangi buyurtmalar va yetkazib berish xaritasi tayyor. 🚚\n\nKurer profilini ochish:";
    buttonLabel = "📦 Kurer Panelni ochish";
  }

  return ctx.reply(message, Markup.inlineKeyboard([
    [Markup.button.webApp(buttonLabel, webAppUrl)]
  ]));
});

// --- Execution ---
bot.launch().then(() => {
  console.log('🤖 Turon Bot is running...');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
