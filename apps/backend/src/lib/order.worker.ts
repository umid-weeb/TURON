import { Worker, type Job } from 'bullmq';
import { NotificationTypeEnum } from '@turon/shared';
import { prisma } from './prisma.js';
import { getRedisConnection } from './redis.js';
import type { CourierAssignJobData } from './order.queue.js';

export type { CourierAssignJobData };

const WORKER_CONCURRENCY = 5; // Bir vaqtda max 5 kuryer-tayinlash operatsiyasi

/**
 * BullMQ job processori — kuryer tayinlashning butun tsikli bu yerda.
 *
 * Strategiya:
 *  1. autoAssignOrder → agar topilsa: DB'ni yangilab SSE push, tugaydi.
 *  2. Agar topilmasa: attempts tugashidan keyin admin alert yuboradi.
 *  3. Error throw → BullMQ retry (exponential backoff) ishga tushadi.
 */
async function processCourierAssignJob(job: Job<CourierAssignJobData>) {
  const { orderId, orderNumber, excludeCourierIds = [] } = job.data;

  // Lazy import — circular dep oldini olish
  const { CourierAssignmentService } = await import('../services/courier-assignment.service.js');
  const { ORDER_INCLUDE, serializeOrder } = await import('../api/modules/orders/order-helpers.js');
  const { orderTrackingService } = await import('../services/order-tracking.service.js');
  const { InAppNotificationsService } = await import('../services/in-app-notifications.service.js');
  const { AuditService } = await import('../services/audit.service.js');

  const result = await CourierAssignmentService.autoAssignOrder(orderId, prisma, excludeCourierIds);

  if (result.assignment && !result.assignment.reusedExistingAssignment) {
    // SSE orqali admin va courier UI'ga push
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    const snapshot = order
      ? {
          ...serializeOrder(order),
          tracking: await orderTrackingService.getSnapshot(orderId),
        }
      : null;
    if (snapshot) {
      orderTrackingService.publishOrderUpdate(orderId, snapshot);
    }

    void AuditService.record({
      action: 'AUTO_ASSIGN_COURIER',
      entity: 'Order',
      entityId: orderId,
      newValue: {
        courierId: result.assignment.courierId,
        courierName: result.assignment.courierName,
        etaMinutes: result.assignment.etaMinutes,
        distanceMeters: result.assignment.distanceMeters,
        source: 'bullmq-worker',
      },
    });

    return { assigned: true, courierId: result.assignment.courierId };
  }

  if (result.assignment?.reusedExistingAssignment) {
    return { assigned: true, reused: true };
  }

  // Hech qanday kuryer topilmadi — retry tugagandan keyin admin xabardor qil
  const maxAttempts = job.opts.attempts ?? 3;
  if (job.attemptsMade >= maxAttempts - 1) {
    await InAppNotificationsService.notifyAdmins({
      type: NotificationTypeEnum.WARNING,
      title: 'Kuryer topilmadi',
      message: `#${orderNumber} buyurtma uchun ${maxAttempts} urinishdan keyin ham avtomatik tayinlash amalga oshmadi. Qo'lda dispatch qiling.`,
      relatedOrderId: orderId,
    });
    return { assigned: false, reason: 'no_eligible_courier_after_retries' };
  }

  // Yana urinish qilish uchun error throw → BullMQ backoff bilan qayta urinadi
  throw new Error(`No eligible courier for order ${orderId} (attempt ${job.attemptsMade + 1}/${maxAttempts})`);
}

/**
 * BullMQ workerini ishga tushiradi.
 * REDIS_URL sozlanmagan bo'lsa null qaytaradi — caller in-process fallback ishlatadi.
 */
export function startOrderWorker(): Worker<CourierAssignJobData> | null {
  const conn = getRedisConnection();
  if (!conn) {
    console.info(
      '[OrderWorker] REDIS_URL topilmadi — kuryer tayinlash in-process (setTimeout) rejimida ishlaydi.',
    );
    return null;
  }

  const worker = new Worker<CourierAssignJobData>(
    'courier-assignment',
    processCourierAssignJob,
    {
      connection: conn,
      concurrency: WORKER_CONCURRENCY,
      limiter: {
        max: 100,
        duration: 10_000, // 10 soniyada max 100 job
      },
    },
  );

  worker.on('completed', (job, result: unknown) => {
    console.info(`[OrderWorker] ✅ Job ${job.id} (${job.data.orderNumber}) completed`, result);
  });

  worker.on('failed', (job, err: Error) => {
    console.error(
      `[OrderWorker] ❌ Job ${job?.id} (${job?.data?.orderNumber}) failed (attempt ${job?.attemptsMade}):`,
      err.message,
    );
  });

  worker.on('error', (err: Error) => {
    console.error('[OrderWorker] Worker error:', err.message);
  });

  console.info(`[OrderWorker] Started with concurrency=${WORKER_CONCURRENCY}`);
  return worker;
}
