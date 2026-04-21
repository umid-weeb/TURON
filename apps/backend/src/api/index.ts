import fastify from 'fastify';
import { env } from '../config.js';
import app from './app.js';
import { launchTelegramBot, stopTelegramBot } from '../services/telegram-bot.service.js';
import { startOrderExpiryScheduler } from '../services/order-expiry.service.js';
import { locationWriteBuffer } from '../services/location-write-buffer.service.js';
import { recoverPendingFallbacks } from '../services/admin-chat-fallback.service.js';
import { startOrderWorker } from '../lib/order.worker.js';
import { closeCourierAssignmentQueue } from '../lib/order.queue.js';
import { closeRedisConnection } from '../lib/redis.js';

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

    // Start order timeout scheduler (warnings always on, system cancellation optional via env)
    startOrderExpiryScheduler();

    // Start location write buffer — batches courier GPS DB writes every 10s
    // (prevents 10k upserts/sec killing Postgres at scale)
    locationWriteBuffer.start();

    // Recover any chat messages that were waiting for admin fallback before restart
    void recoverPendingFallbacks();

    // Start BullMQ courier-assignment worker (no-op if REDIS_URL not set)
    startOrderWorker();

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
  void closeCourierAssignmentQueue().then(() => closeRedisConnection());
});

process.once('SIGTERM', () => {
  void stopTelegramBot('SIGTERM');
  void closeCourierAssignmentQueue().then(() => closeRedisConnection());
});
