/**
 * OrderReassignmentQueue
 *
 * In-process retry queue that auto-reassigns an order when a courier declines
 * or ignores the assignment timeout.
 *
 * Architecture mirrors a real job queue (enqueue → process → retry → dead-letter).
 * Upgrade path: replace setTimeout/Map with BullMQ + Redis — interfaces stay the same.
 *
 * Flow:
 *   courier declines / times out
 *     → enqueue(orderId)
 *     → attempt 1: immediate       — autoAssignOrder (excluding all failed couriers)
 *     → attempt 2: +15 s           — retry if no eligible courier found
 *     → attempt 3: +45 s           — last retry
 *     → dead-letter: manual dispatch required
 */

import { NotificationTypeEnum } from '@turon/shared';
import { prisma } from '../lib/prisma.js';
import { AuditService } from './audit.service.js';
import { CourierAssignmentService } from './courier-assignment.service.js';
import { InAppNotificationsService } from './in-app-notifications.service.js';
import { orderTrackingService } from './order-tracking.service.js';
import { sendAdminAlert, sendAdminCourierListOptions } from './telegram-bot.service.js';
import { ORDER_INCLUDE, serializeOrder } from '../api/modules/orders/order-helpers.js';

// ── Config ────────────────────────────────────────────────────────────────────

/** Milliseconds to wait before each retry (index 0 = after 1st failure). */
const RETRY_DELAYS_MS = [15_000, 45_000] as const;

/** Total attempts before giving up and notifying admin. */
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1; // = 3
const ASSIGNMENT_ACCEPT_TIMEOUT_MS = 30_000;
const ASSIGNMENT_ACCEPT_TIMEOUT_SECONDS = ASSIGNMENT_ACCEPT_TIMEOUT_MS / 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReassignmentJob {
  orderId: string;
  orderNumber: string;
  attempts: number;
}

function getEventReason(event: any): string | null {
  const payload = event?.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const reason = (payload as Record<string, unknown>).reason;
  return typeof reason === 'string' ? reason : null;
}

async function publishOrderUpdate(orderId: string): Promise<void> {
  try {
    const refreshed = await prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE as any,
    });
    if (!refreshed) return;
    const serialized = {
      ...serializeOrder(refreshed),
      tracking: await orderTrackingService.getSnapshot(orderId),
    };
    orderTrackingService.publishOrderUpdate(orderId, serialized);
  } catch {
    // Non-critical — UI will recover on next poll
  }
}

export function scheduleCourierAcceptanceTimeout(params: {
  orderId: string;
  orderNumber: string | number | bigint;
  assignmentId: string;
  courierId: string;
}): void {
  setTimeout(() => {
    void (async () => {
      const assignment = await prisma.courierAssignment.findUnique({
        where: { id: params.assignmentId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!assignment || assignment.status !== 'ASSIGNED') {
        return;
      }

      const now = new Date();
      const orderNumber = String(params.orderNumber);

      await prisma.$transaction(async (tx) => {
        await tx.courierAssignment.update({
          where: { id: params.assignmentId },
          data: {
            status: 'CANCELLED' as any,
            cancelledAt: now,
          },
        });

        await tx.order.updateMany({
          where: {
            id: params.orderId,
            courierId: params.courierId,
          },
          data: {
            courierId: null,
          },
        });

        await tx.courierAssignmentEvent.create({
          data: {
            assignmentId: params.assignmentId,
            orderId: params.orderId,
            courierId: params.courierId,
            eventType: 'CANCELLED' as any,
            eventAt: now,
            payload: {
              reason: 'courier_response_timeout',
              timeoutSeconds: ASSIGNMENT_ACCEPT_TIMEOUT_SECONDS,
            },
          },
        });

        await InAppNotificationsService.notifyAdmins(
          {
            type: NotificationTypeEnum.WARNING,
            title: 'Kuryer javob bermadi',
            message:
              `#${orderNumber} buyurtma ${ASSIGNMENT_ACCEPT_TIMEOUT_SECONDS} soniyada qabul qilinmadi. ` +
              `Tizim boshqa mos kuryerni qidirmoqda.`,
            relatedOrderId: params.orderId,
          },
          tx,
        );
      });

      await publishOrderUpdate(params.orderId);
      OrderReassignmentQueue.enqueue(params.orderId, orderNumber);
    })().catch((error) => {
      console.warn('[ReassignQueue] Courier acceptance timeout failed.', {
        orderId: params.orderId,
        assignmentId: params.assignmentId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, ASSIGNMENT_ACCEPT_TIMEOUT_MS);
}

// ── Service ───────────────────────────────────────────────────────────────────

export class OrderReassignmentQueue {
  /** In-flight jobs keyed by orderId — prevents duplicate processing. */
  private static readonly pending = new Map<string, ReassignmentJob>();

  /**
   * Schedule auto-reassignment for an order whose courier just declined.
   * Idempotent: duplicate calls for the same orderId are silently ignored.
   */
  static enqueue(orderId: string, orderNumber: string | number): void {
    if (this.pending.has(orderId)) {
      return;
    }

    const job: ReassignmentJob = {
      orderId,
      orderNumber: String(orderNumber),
      attempts: 0,
    };

    this.pending.set(orderId, job);

    // First attempt fires immediately on the next event-loop tick
    setImmediate(() => {
      void this._process(job);
    });
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private static _scheduleRetry(job: ReassignmentJob): void {
    const delay = RETRY_DELAYS_MS[job.attempts - 1] ?? 45_000;
    console.warn(
      `[ReassignQueue] No eligible courier for #${job.orderNumber} — ` +
      `retry in ${delay / 1000}s (attempt ${job.attempts}/${MAX_ATTEMPTS})`,
    );
    setTimeout(() => {
      void this._process(job);
    }, delay);
  }

  private static async _process(job: ReassignmentJob): Promise<void> {
    job.attempts++;

    try {
      // Guard 1 — stop if order was already closed or manually reassigned
      const order = await prisma.order.findUnique({
        where: { id: job.orderId },
        include: {
          courierAssignments: {
            where: {
              status: { in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'] as any },
            },
            take: 1,
          },
        },
      });

      if (!order || order.status === 'DELIVERED' || order.status === 'CANCELLED') {
        this.pending.delete(job.orderId);
        return;
      }

      if ((order.courierAssignments as any[]).length > 0) {
        // Someone already reassigned manually while we were waiting
        this.pending.delete(job.orderId);
        return;
      }

      // Exclude couriers who already declined or timed out on this order.
      const failedRows = await prisma.courierAssignment.findMany({
        where: {
          orderId: job.orderId,
          status: { in: ['REJECTED', 'CANCELLED'] as any },
        },
        select: {
          courierId: true,
          status: true,
          events: {
            orderBy: [
              { eventAt: 'desc' },
              { createdAt: 'desc' },
            ],
            take: 1,
            select: {
              payload: true,
            },
          },
        },
      });
      const excludeIds = [
        ...new Set(
          failedRows
            .filter((row: any) => {
              if (row.status === 'REJECTED') {
                return true;
              }

              return getEventReason(row.events?.[0]) === 'courier_response_timeout';
            })
            .map((row: any) => row.courierId),
        ),
      ];

      // Attempt auto-assignment
      const result = await CourierAssignmentService.autoAssignOrder(
        job.orderId,
        prisma,
        excludeIds,
      );

      if (result.assignment) {
        console.log(
          `[ReassignQueue] ✓ Order #${job.orderNumber} → ${result.assignment.courierName} ` +
          `(attempt ${job.attempts})`,
        );
        this.pending.delete(job.orderId);
        await AuditService.record({
          action: 'AUTO_ASSIGN_COURIER',
          entity: 'Order',
          entityId: job.orderId,
          newValue: {
            assignmentId: result.assignment.assignmentId,
            courierId: result.assignment.courierId,
            courierName: result.assignment.courierName,
            etaMinutes: result.assignment.etaMinutes,
            distanceMeters: result.assignment.distanceMeters,
            rankingCandidate: result.selectedCandidate,
          },
          metadata: {
            mode: 'AUTO',
            attempt: job.attempts,
          },
        }).catch(() => {});
        if (!result.assignment.reusedExistingAssignment) {
          scheduleCourierAcceptanceTimeout({
            orderId: job.orderId,
            orderNumber: job.orderNumber,
            assignmentId: result.assignment.assignmentId,
            courierId: result.assignment.courierId,
          });
        }
        await publishOrderUpdate(job.orderId);
        return;
      }

      // No eligible courier — retry or dead-letter
      if (job.attempts < MAX_ATTEMPTS) {
        this._scheduleRetry(job);
      } else {
        await this._deadLetter(job);
      }
    } catch (err) {
      console.error(
        `[ReassignQueue] Error on attempt ${job.attempts} for order ${job.orderId}:`,
        err,
      );
      if (job.attempts < MAX_ATTEMPTS) {
        this._scheduleRetry(job);
      } else {
        await this._deadLetter(job).catch(() => {});
      }
    }
  }

  /** All retries exhausted — notify admin for manual action. */
  private static async _deadLetter(job: ReassignmentJob): Promise<void> {
    this.pending.delete(job.orderId);
    console.error(
      `[ReassignQueue] ✗ Exhausted ${MAX_ATTEMPTS} attempts for order #${job.orderNumber} — notifying admin`,
    );

    const latestAssignment = await prisma.courierAssignment.findFirst({
      where: { orderId: job.orderId },
      orderBy: { assignedAt: 'desc' },
      select: {
        id: true,
        courierId: true,
      },
    });

    if (latestAssignment) {
      await prisma.courierAssignmentEvent.create({
        data: {
          assignmentId: latestAssignment.id,
          orderId: job.orderId,
          courierId: latestAssignment.courierId,
          eventType: 'CANCELLED' as any,
          eventAt: new Date(),
          payload: {
            reason: 'manual_dispatch_required',
            attempts: job.attempts,
          },
        },
      }).catch(() => {});
    }

    await InAppNotificationsService.notifyAdmins({
      type: NotificationTypeEnum.WARNING,
      title: "Kuryer topilmadi — qo'lda biriktiring",
      message:
        `#${job.orderNumber} buyurtma uchun ${MAX_ATTEMPTS} ta avtomatik urinish bajarildi. ` +
        `Endi buyurtma qo'lda kuryer biriktirishni kutmoqda.`,
      relatedOrderId: job.orderId,
    }).catch(() => {});

    await publishOrderUpdate(job.orderId);
    await sendAdminCourierListOptions(job.orderId, job.orderNumber).catch(() => {});
    await sendAdminAlert(
      `🚨 <b>Kuryer topilmadi!</b>\n\n` +
      `📦 Buyurtma: <b>#${job.orderNumber}</b>\n` +
      `🔄 ${MAX_ATTEMPTS} marta avtomatik biriktirish urinildi\n` +
      `❌ Hech kim buyurtmani olmadi\n\n` +
      `⚠️ Iltimos, Telegram yoki admin paneldan qo'lda kuryer biriktiring!`,
    ).catch(() => {});
  }
}
