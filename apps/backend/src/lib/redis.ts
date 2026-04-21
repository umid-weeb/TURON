import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

/**
 * Singleton Redis client.
 * `null` when REDIS_URL is not configured — callers should handle gracefully.
 */
let _redis: Redis | null = null;

if (REDIS_URL) {
  _redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  _redis.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err.message);
  });
}

/**
 * Returns the live Redis instance, or null if REDIS_URL is not set.
 * Use this when you need the connection but can tolerate it being absent.
 */
export function getRedisConnection(): Redis | null {
  return _redis;
}

/**
 * @deprecated Use `getRedisConnection()` for new code.
 * Kept as a named export for legacy imports that destructure `{ redis }`.
 */
export const redis = _redis as Redis;

/**
 * Gracefully disconnects from Redis. Called on SIGINT / SIGTERM.
 */
export async function closeRedisConnection(): Promise<void> {
  if (_redis) {
    await _redis.quit().catch(() => _redis?.disconnect());
    _redis = null;
  }
}
