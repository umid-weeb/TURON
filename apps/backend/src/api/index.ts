import fastify from 'fastify';
import { env } from '../config.js';
import app from './app.js';
import { launchTelegramBot, stopTelegramBot } from '../services/telegram-bot.service.js';
import { startOrderExpiryScheduler } from '../services/order-expiry.service.js';

const server = fastify({
  logger: true,
  bodyLimit: 12 * 1024 * 1024,
});

async function main() {
  try {
    await server.register(app);

    const port = env.PORT;
    const host = env.API_HOST;

    await server.listen({ port, host });
    console.log(`Turon API is running at http://${host}:${port}`);

    // Start auto-cancellation scheduler (unaccepted 5h + delivery timeout 3h)
    startOrderExpiryScheduler();

    // Never block API health/startup on Telegram bot launch.
    if (env.NODE_ENV === 'production') {
      if (process.env.RUN_TELEGRAM_BOT === 'true') {
        void launchTelegramBot('api').catch((botError) => {
          server.log.error(botError, 'Telegram bot failed to launch inside API process');
        });
      } else {
        server.log.warn('RUN_TELEGRAM_BOT != true, skipping bot launch inside API process');
      }
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();

process.once('SIGINT', () => {
  void stopTelegramBot('SIGINT');
});

process.once('SIGTERM', () => {
  void stopTelegramBot('SIGTERM');
});
