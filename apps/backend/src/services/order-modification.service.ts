import { OrderStatusEnum, NotificationTypeEnum, UserRoleEnum } from '@turon/shared';
import { prisma } from '../lib/prisma.js';
import { AuditService } from './audit.service.js';
import { InAppNotificationsService } from './in-app-notifications.service.js';
import { orderTrackingService } from './order-tracking.service.js';
import { ORDER_INCLUDE, serializeOrder } from '../api/modules/orders/order-helpers.js';
import { sendAdminAlert } from './telegram-bot.service.js';

/**
 * Yandex Eats / Uber Eats stilidagi buyurtmani o'zgartirish so'rovlari.
 *
 * Ikki rejim:
 *   1. Auto-approve  — order PENDING bo'lsa, mijoz darhol bekor qila oladi
 *      (admin tasdiqlamagani uchun ovqat tayyorlanmagan, risk yo'q).
 *   2. Manual review — order PREPARING / READY_FOR_PICKUP / DELIVERING bo'lsa,
 *      so'rov adminga yetkaziladi va admin approve / reject qiladi.
 *
 * DELIVERED va CANCELLED order'lar uchun hech qanday so'rov qabul qilinmaydi.
 */

export type ModificationType = 'CANCEL' | 'ADDRESS_CHANGE' | 'OTHER';
export type ModificationStatus = 'PENDING' | 'AUTO_APPROVED' | 'APPROVED' | 'REJECTED';

export interface ModificationRequestDto {
  id: string;
  orderId: string;
  type: ModificationType;
  status: ModificationStatus;
  payload: any;
  reason: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface CreateRequestInput {
  orderId: string;
  customerId: string;
  type: ModificationType;
  reason?: string;
  payload?: Record<string, unknown>;
}

export interface DecideInput {
  requestId: string;
  adminId: string;
  approve: boolean;
  decisionNote?: string;
}

const TERMINAL_ORDER_STATUSES = new Set<string>([
  OrderStatusEnum.DELIVERED,
  OrderStatusEnum.CANCELLED,
]);

function serialize(row: any): ModificationRequestDto {
  return {
    id: row.id,
    orderId: row.orderId,
    type: row.type as ModificationType,
    status: row.status as ModificationStatus,
    payload: row.payload ?? null,
    reason: row.reason ?? null,
    decisionNote: row.decisionNote ?? null,
    decidedAt: row.decidedAt ? new Date(row.decidedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

/**
 * Resolve the active modification window for a given order status.
 * Returns 'AUTO' (instant) | 'MANUAL' (admin must decide) | 'CLOSED' (refuse).
 */
function resolveDecisionMode(orderStatus: string): 'AUTO' | 'MANUAL' | 'CLOSED' {
  if (TERMINAL_ORDER_STATUSES.has(orderStatus)) return 'CLOSED';
  if (orderStatus === OrderStatusEnum.PENDING) return 'AUTO';
  return 'MANUAL';
}

export class OrderModificationService {
  /** List all modification requests for an order, newest first. */
  static async listForOrder(orderId: string): Promise<ModificationRequestDto[]> {
    const rows = await prisma.orderModificationRequest.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serialize);
  }

  /** List pending requests across all orders — admin dashboard. */
  static async listPendingForAdmin(): Promise<ModificationRequestDto[]> {
    const rows = await prisma.orderModificationRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serialize);
  }

  /**
   * Customer creates a modification request. Auto-approves for PENDING orders,
   * otherwise stores the request and notifies the admin for manual review.
   */
  static async create(
    input: CreateRequestInput,
  ): Promise<{ request: ModificationRequestDto; mode: 'AUTO' | 'MANUAL' }> {
    const { orderId, customerId, type, reason, payload } = input;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true, orderNumber: true },
    });
    if (!order) {
      throw new Error('Buyurtma topilmadi');
    }
    if (order.userId !== customerId) {
      throw new Error('Bu buyurtma sizniki emas');
    }

    const mode = resolveDecisionMode(order.status);
    if (mode === 'CLOSED') {
      throw new Error("Bu holatdagi buyurtmani o'zgartirib bo'lmaydi");
    }

    // Block duplicate active requests of the same type so the customer
    // can't spam admin notifications.
    const existing = await prisma.orderModificationRequest.findFirst({
      where: {
        orderId,
        type,
        status: 'PENDING',
      },
    });
    if (existing) {
      throw new Error("So'rov allaqachon yuborilgan, kuting");
    }

    const initialStatus: ModificationStatus =
      mode === 'AUTO' ? 'AUTO_APPROVED' : 'PENDING';

    const created = await prisma.orderModificationRequest.create({
      data: {
        orderId,
        requestedBy: customerId,
        type,
        payload: (payload ?? null) as any,
        status: initialStatus,
        reason: reason ?? null,
        // For AUTO_APPROVED also stamp decision time so the timeline reads cleanly.
        decidedAt: mode === 'AUTO' ? new Date() : null,
      },
    });

    if (mode === 'AUTO') {
      await this.applySideEffects(created.id);
    } else {
      await this.notifyAdminPending(created.id, type, order.orderNumber);
    }

    await AuditService.record({
      userId: customerId,
      actorRole: UserRoleEnum.CUSTOMER,
      action: mode === 'AUTO' ? 'ORDER_MODIFICATION_AUTO' : 'ORDER_MODIFICATION_REQUEST',
      entity: 'Order',
      entityId: orderId,
      newValue: { type, status: initialStatus, reason: reason ?? null },
      metadata: { requestId: created.id, mode },
    }).catch(() => {});

    return { request: serialize(created), mode };
  }

  /**
   * Admin approves or rejects a pending request. Approval applies the
   * modification side-effects (cancel the order, swap address, ...).
   */
  static async decide(input: DecideInput): Promise<ModificationRequestDto> {
    const { requestId, adminId, approve, decisionNote } = input;

    const row = await prisma.orderModificationRequest.findUnique({
      where: { id: requestId },
    });
    if (!row) {
      throw new Error("So'rov topilmadi");
    }
    if (row.status !== 'PENDING') {
      throw new Error("So'rov allaqachon hal qilingan");
    }

    const nextStatus: ModificationStatus = approve ? 'APPROVED' : 'REJECTED';
    const updated = await prisma.orderModificationRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        decidedBy: adminId,
        decidedAt: new Date(),
        decisionNote: decisionNote ?? null,
      },
    });

    if (approve) {
      await this.applySideEffects(requestId);
    } else {
      // Notify customer of the rejection so they aren't left waiting.
      const order = await prisma.order.findUnique({
        where: { id: row.orderId },
        select: { userId: true, orderNumber: true },
      });
      if (order) {
        await InAppNotificationsService.notifyUser({
          userId: order.userId,
          roleTarget: UserRoleEnum.CUSTOMER,
          type: NotificationTypeEnum.WARNING,
          title: "So'rov rad etildi",
          message:
            decisionNote
              ? `#${String(order.orderNumber)} buyurtma uchun so'rovingiz rad etildi: ${decisionNote}`
              : `#${String(order.orderNumber)} buyurtma uchun so'rovingiz rad etildi`,
          relatedOrderId: row.orderId,
        }).catch(() => {});
      }
    }

    await AuditService.record({
      userId: adminId,
      actorRole: UserRoleEnum.ADMIN,
      action: approve ? 'ORDER_MODIFICATION_APPROVE' : 'ORDER_MODIFICATION_REJECT',
      entity: 'Order',
      entityId: row.orderId,
      oldValue: { status: row.status },
      newValue: { status: nextStatus, decisionNote: decisionNote ?? null },
      metadata: { requestId },
    }).catch(() => {});

    return serialize(updated);
  }

  /**
   * Apply the modification's domain effect — only called after the request
   * has reached AUTO_APPROVED or APPROVED status.
   */
  private static async applySideEffects(requestId: string): Promise<void> {
    const row = await prisma.orderModificationRequest.findUnique({
      where: { id: requestId },
    });
    if (!row) return;

    if (row.type === 'CANCEL') {
      await this.applyCancel(row.orderId, row.reason ?? 'customer_requested');
      return;
    }

    if (row.type === 'ADDRESS_CHANGE') {
      // Address change application is part of the next iteration. The
      // request is still recorded so admin tooling can act on it manually.
      return;
    }

    // OTHER → no automatic effect, the conversation continues in support.
  }

  /** Cancel the order on behalf of the customer. */
  private static async applyCancel(orderId: string, reason: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { courierAssignments: true },
    });
    if (!order) return;
    if (TERMINAL_ORDER_STATUSES.has(order.status)) return;

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatusEnum.CANCELLED as any,
          cancellationReason: reason,
          cancelledByRole: 'customer',
        },
      });

      // Free the promo code, if any
      if (order.promoCodeId) {
        await tx.promoCode.update({
          where: { id: order.promoCodeId },
          data: { timesUsed: { decrement: 1 } },
        });
      }

      // Cancel any in-flight courier assignments
      const activeStatuses = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'];
      const assignments = order.courierAssignments.filter((a: any) =>
        activeStatuses.includes(a.status),
      );

      if (assignments.length > 0) {
        await tx.courierAssignment.updateMany({
          where: { orderId, status: { in: activeStatuses as any } },
          data: { status: 'CANCELLED' as any, cancelledAt: now },
        });
        await tx.courierAssignmentEvent.createMany({
          data: assignments.map((a: any) => ({
            assignmentId: a.id,
            orderId,
            courierId: a.courierId,
            eventType: 'CANCELLED' as any,
            eventAt: now,
            payload: { reason: `customer_${reason}` },
          })),
        });
      }
    });

    // Push the new state to all SSE listeners so the courier / admin UI updates.
    try {
      const refreshed = await prisma.order.findUnique({
        where: { id: orderId },
        include: ORDER_INCLUDE as any,
      });
      if (refreshed) {
        const payload = {
          ...serializeOrder(refreshed),
          tracking: await orderTrackingService.getSnapshot(orderId),
        };
        orderTrackingService.publishOrderUpdate(orderId, payload);
      }
    } catch {
      /* non-critical */
    }

    // Tell admins it happened (so they don't keep cooking).
    await InAppNotificationsService.notifyAdmins({
      type: NotificationTypeEnum.WARNING,
      title: 'Mijoz buyurtmani bekor qildi',
      message: `#${String(order.orderNumber)} mijoz tomonidan bekor qilindi (${reason})`,
      relatedOrderId: orderId,
    }).catch(() => {});
  }

  private static async notifyAdminPending(
    requestId: string,
    type: ModificationType,
    orderNumber: bigint | number,
  ): Promise<void> {
    const orderNumberStr = String(orderNumber);
    const typeLabel =
      type === 'CANCEL'
        ? 'Bekor qilish'
        : type === 'ADDRESS_CHANGE'
          ? "Manzilni o'zgartirish"
          : 'Boshqa';

    await InAppNotificationsService.notifyAdmins({
      type: NotificationTypeEnum.WARNING,
      title: "Mijozdan so'rov",
      message: `#${orderNumberStr} — mijoz "${typeLabel}" so'rovini yubordi. Tasdiqlang yoki rad eting.`,
      relatedOrderId: undefined,
    }).catch(() => {});

    await sendAdminAlert(
      `📝 <b>Mijoz so'rovi</b>\n\n` +
        `📦 Buyurtma: <b>#${orderNumberStr}</b>\n` +
        `📨 Turi: <b>${typeLabel}</b>\n\n` +
        `Admin paneldan tasdiqlang yoki rad eting.`,
    ).catch(() => {});

    void requestId; // request ID is in audit log; admin panel filters by status
  }
}
