import { Redis } from 'ioredis';
import { env } from '../config.js';

let _connection: Redis | null = null;

/**
 * BullMQ uchun Redis ulanishini qaytaradi.
 * REDIS_URL o'rnatilmagan bo'lsa null qaytaradi —
 * bu holda queue in-process setTimeout rejimiga tushadi.
 */
export function getRedisConnection(): Redis | null {
  if (!env.REDIS_URL) return null;

  if (!_connection) {
    const connection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // BullMQ talab qiladi
      enableReadyCheck: false,
      lazyConnect: true,
    });

    connection.on('error', (err: Error) => {
      // Ulanish xatoligi dastur ishini to'xtatmasligi kerak
      console.error('[Redis] Connection error (non-fatal):', err.message);
    });

    connection.on('connect', () => {
      console.info('[Redis] Connected successfully.');
    });

    _connection = connection;
  }

  return _connection;
}

export async function closeRedisConnection(): Promise<void> {
  if (_connection) {
    await _connection.quit();
    _connection = null;
  }
}
