import { Queue } from 'bullmq';
import { getRedisConnection } from './redis.js';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface CourierAssignJobData {
  orderId: string;
  orderNumber: string;
  excludeCourierIds?: string[];
}

// ── Queues ─────────────────────────────────────────────────────────────────────
const conn = getRedisConnection();

/**
 * Order creation queue — serialises heavy DB writes under high load.
 * Falls back gracefully when REDIS_URL is not set.
 */
export const orderQueue: Queue | null = conn
  ? new Queue('order-processing', {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    })
  : null;

/**
 * Courier auto-assignment queue — triggered after every approved order.
 */
export const courierAssignmentQueue: Queue | null = conn
  ? new Queue('courier-assignment', {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    })
  : null;

// ── Helpers ────────────────────────────────────────────────────────────────────
/**
 * Adds a courier-assignment job to the BullMQ queue.
 * Returns `true` if successfully enqueued via Redis, `false` if Redis is unavailable.
 * Caller is responsible for the in-process fallback when `false` is returned.
 */
export async function enqueueCourierAssignment(data: CourierAssignJobData): Promise<boolean> {
  if (courierAssignmentQueue) {
    await courierAssignmentQueue.add('assign-courier', data);
    return true;
  }

  return false;
}

/**
 * Gracefully closes both queues on process shutdown.
 */
export async function closeCourierAssignmentQueue(): Promise<void> {
  await Promise.allSettled([orderQueue?.close(), courierAssignmentQueue?.close()]);
}
