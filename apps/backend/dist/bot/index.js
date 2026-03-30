import {
  env
} from "../chunk-X57UHOE3.js";

// src/bot/index.ts
import { Telegraf, Markup } from "telegraf";
import { PrismaClient } from "@prisma/client";
var botToken = env.BOT_TOKEN;
var webAppUrl = env.WEB_APP_URL || "https://your-ngrok-url.ngrok-free.dev";
if (!botToken) {
  console.error("\u274C BOT_TOKEN is missing in .env");
  process.exit(1);
}
var bot = new Telegraf(botToken);
var prisma = new PrismaClient();
async function getUserRole(telegramId) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { roles: true }
  });
  if (!user || user.roles.length === 0) return "CUSTOMER" /* CUSTOMER */;
  const roles = user.roles.map((r) => r.role);
  if (roles.includes("ADMIN" /* ADMIN */)) return "ADMIN" /* ADMIN */;
  if (roles.includes("COURIER" /* COURIER */)) return "COURIER" /* COURIER */;
  return "CUSTOMER" /* CUSTOMER */;
}
bot.start(async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const role = await getUserRole(telegramId);
  let message = "Assalomu alaykum! Turon kafesi botiga xush kelibsiz. \u{1F958}\n\nQuyidagi tugma orqali taom buyurtma qilishingiz mumkin:";
  let buttonLabel = "\u{1F4F1} Ilovani ochish";
  if (role === "ADMIN" /* ADMIN */) {
    message = "Assalomu alaykum, Admin! Turon boshqaruv paneliga xush kelibsiz. \u{1F3E2}\n\nBoshqaruvni boshlash uchun tugmani bosing:";
    buttonLabel = "\u{1F39B}\uFE0F Admin Panelni ochish";
  } else if (role === "COURIER" /* COURIER */) {
    message = "Assalomu alaykum, Kurer! Senga yangi buyurtmalar va yetkazib berish xaritasi tayyor. \u{1F69A}\n\nKurer profilini ochish:";
    buttonLabel = "\u{1F4E6} Kurer Panelni ochish";
  }
  return ctx.reply(message, Markup.inlineKeyboard([
    [Markup.button.webApp(buttonLabel, webAppUrl)]
  ]));
});
bot.launch().then(() => {
  console.log("\u{1F916} Turon Bot is running...");
});
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
