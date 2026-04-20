import { Queue } from 'bullmq';
import { getRedisConnection } from './redis.js';

export interface CourierAssignJobData {
  orderId: string;
  orderNumber: string;
  /** Rad etgan kuryer IDlarini takroran yubormaslik uchun */
  excludeCourierIds?: string[];
}

let _queue: Queue<CourierAssignJobData> | null = null;

function getQueue(): Queue<CourierAssignJobData> | null {
  const conn = getRedisConnection();
  if (!conn) return null;

  if (!_queue) {
    _queue = new Queue<CourierAssignJobData>('courier-assignment', {
      connection: conn,
      defaultJobOptions: {
        removeOnComplete: { count: 300 },
        removeOnFail: { count: 100 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 }, // 5s → 25s → 125s
      },
    });
  }

  return _queue;
}

/**
 * Kuryer tayinlash jobini BullMQ navbatiga qo'yadi.
 *
 * @returns true  — job navbatga qo'yildi (BullMQ/Redis mavjud)
 * @returns false — Redis yo'q, caller o'zi in-process fallback ishlatishi kerak
 */
export async function enqueueCourierAssignment(
  data: CourierAssignJobData,
): Promise<boolean> {
  const queue = getQueue();
  if (!queue) return false;

  await queue.add('assign-courier', data, {
    // Bir buyurtma uchun faqat bitta job bo'lishi uchun dedup
    jobId: `assign-${data.orderId}`,
  });

  return true;
}

export async function closeCourierAssignmentQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}
