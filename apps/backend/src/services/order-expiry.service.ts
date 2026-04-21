/**
 * Order Expiry Scheduler
 *
 * Runs every 5 minutes and handles three timeout rules:
 *
 * 1. UNACCEPTED warning (30 min): If a courier has not accepted within the
 *    first 30 minutes, admin is notified while 1 h 30 min still remains.
 *
 * 2. UNACCEPTED timeout (2 h): If no courier accepts within 2 hours, the
 *    order is auto-cancelled and admin is notified.
 *
 * 3. DELIVERY timeout (2 h): If a courier accepted an order but has not delivered
 *    it within 2 hours, the assignment + order are auto-cancelled and admin gets
 *    an urgent Telegram alert.
 */

import { NotificationTypeEnum } from '@turon/shared';
import { prisma } from '../lib/prisma.js';
import { InAppNotificationsService } from './in-app-notifications.service.js';
import { sendAdminAlert } from './telegram-bot.service.js';

const SYSTEM_ORDER_CANCELLATION_ENABLED =
  String(process.env.ORDER_SYSTEM_CANCELLATION_ENABLED || '').toLowerCase() === 'true';

const UNACCEPTED_TIMEOUT_MS  = 2 * 60 * 60 * 1000; // 2 hours
const UNACCEPTED_WARNING_MS  = 30 * 60 * 1000;      // warn admin when 1 h 30 min remains
const DELIVERY_TIMEOUT_MS    = 2 * 60 * 60 * 1000; // 2 hours
const CHECK_INTERVAL_MS      = 5 * 60 * 1000;       // every 5 minutes
const PROXIMITY_SAFE_METERS  = 500;                  // don't cancel if courier ≤ 500 m from customer
const UNACCEPTED_WARNING_TITLE = 'Kuryer qabul qilmayapti';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  return d.toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns true if the courier's last known position is within PROXIMITY_SAFE_METERS of the destination. */
async function isCourierNearDestination(
  courierId: string,
  destLat: number,
  destLng: number,
): Promise<boolean> {
  try {
    const presence = await prisma.courierPresence.findUnique({
      where: { courierId },
      select: { latitude: true, longitude: true, updatedAt: true },
    });
    if (!presence) return false;

    // Ignore stale GPS (>15 min old) — courier may have turned off the app
    const staleCutoff = new Date(Date.now() - 15 * 60 * 1000);
    if (presence.updatedAt < staleCutoff) return false;

    const dist = haversineMeters(
      Number(presence.latitude),
      Number(presence.longitude),
      destLat,
      destLng,
    );
    return dist <= PROXIMITY_SAFE_METERS;
  } catch {
    return false; // on error, don't block cancellation
  }
}

// ── Case 1: warn admins if no courier has accepted after 30 min ───────────────

async function warnUnacceptedOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - UNACCEPTED_WARNING_MS);
  const expiryCutoff = new Date(Date.now() - UNACCEPTED_TIMEOUT_MS);

  const orders = await prisma.order.findMany({
    where: {
      status: { notIn: ['DELIVERED', 'CANCELLED'] as any },
      createdAt: { lt: cutoff, gte: expiryCutoff },
      courierAssignments: {
        none: {
          status: { in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING', 'DELIVERED'] as any },
        },
      },
    },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
    },
  });

  for (const order of orders) {
    try {
      const existingWarning = await prisma.notification.findFirst({
        where: {
          relatedOrderId: order.id,
          roleTarget: 'ADMIN' as any,
          title: UNACCEPTED_WARNING_TITLE,
        },
        select: { id: true },
      });

      if (existingWarning) {
        continue;
      }

      await InAppNotificationsService.notifyAdmins({
        type: NotificationTypeEnum.WARNING,
        title: UNACCEPTED_WARNING_TITLE,
        message: `#${String(order.orderNumber)} buyurtmani kuryer hali qabul qilgani yo'q. 1 soat 30 daqiqa vaqt qoldi, vaziyatni ko'rib chiqing.`,
        relatedOrderId: order.id,
      });

      await sendAdminAlert(
        `⚠️ <b>Kuryer qabul qilmayapti</b>\n\n` +
        `📦 Buyurtma: <b>#${String(order.orderNumber)}</b>\n` +
        `⏳ Qabul qilish uchun qolgan vaqt: <b>1 soat 30 daqiqa</b>\n` +
        `📅 Yaratildi: ${formatDate(order.createdAt)}\n\n` +
        `Iltimos, kuryer biriktirish holatini tekshiring.`,
      ).catch(() => {});

      console.log(`[OrderExpiry] Admin warned about unaccepted order #${String(order.orderNumber)}`);
    } catch (err) {
      console.error(`[OrderExpiry] Failed to warn about unaccepted order ${order.id}:`, err);
    }
  }
}

// ── Case 2: orders with no courier acceptance within 2 h ─────────────────────

async function cancelUnacceptedOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - UNACCEPTED_TIMEOUT_MS);

  const orders = await prisma.order.findMany({
    where: {
      status: { notIn: ['DELIVERED', 'CANCELLED'] as any },
      createdAt: { lt: cutoff },
      // No assignment that has been accepted or later
      courierAssignments: {
        none: {
          status: { in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING', 'DELIVERED'] as any },
        },
      },
    },
    include: {
      courierAssignments: {
        where: { status: { in: ['ASSIGNED'] as any } },
      },
    },
  });

  for (const order of orders) {
    try {
      const now = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED' as any,
            cancellationReason: "2 soat ichida hech bir kuryer buyurtmani qabul qilmadi — avtomatik bekor",
            cancelledByRole: 'system',
          },
        });

        for (const assignment of order.courierAssignments) {
          await tx.courierAssignment.update({
            where: { id: assignment.id },
            data: { status: 'CANCELLED' as any, cancelledAt: now },
          });

          await tx.courierAssignmentEvent.create({
            data: {
              assignmentId: assignment.id,
              orderId: order.id,
              courierId: assignment.courierId,
              eventType: 'CANCELLED' as any,
              eventAt: now,
              actorUserId: null,
              payload: { reason: 'system_unaccepted_timeout' } as any,
            },
          });
        }

        await InAppNotificationsService.notifyAdmins(
          {
            type: NotificationTypeEnum.WARNING,
            title: 'Buyurtma avtomatik bekor qilindi',
            message: `#${String(order.orderNumber)} buyurtma 2 soat ichida qabul qilinmadi va avtomatik bekor qilindi.`,
            relatedOrderId: order.id,
          },
          tx,
        );
      });

      await sendAdminAlert(
        `⚠️ <b>Buyurtma avtomatik bekor qilindi</b>\n\n` +
        `📦 Buyurtma: <b>#${String(order.orderNumber)}</b>\n` +
        `🕐 Muammo: 2 soat ichida hech bir kuryer qabul qilmadi\n` +
        `📅 Yaratildi: ${formatDate(order.createdAt)}\n\n` +
        `Iltimos, buyurtma holatini tekshiring.`,
      ).catch(() => {});

      console.log(`[OrderExpiry] Unaccepted order #${String(order.orderNumber)} auto-cancelled`);
    } catch (err) {
      console.error(`[OrderExpiry] Failed to cancel unaccepted order ${order.id}:`, err);
    }
  }
}

// ── Case 3: active deliveries not completed within 2 h ───────────────────────

async function cancelExpiredDeliveries(): Promise<void> {
  const cutoff = new Date(Date.now() - DELIVERY_TIMEOUT_MS);

  const assignments = await prisma.courierAssignment.findMany({
    where: {
      status: { in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] as any },
      acceptedAt: { not: null, lt: cutoff },
      deliveredAt: null,
    },
    include: {
      order: true,
      courier: { select: { id: true, fullName: true } },
    },
  });

  for (const assignment of assignments) {
    try {
      const now = new Date();
      const order = assignment.order;

      // If courier is already near the customer (≤ 500 m) and actively delivering,
      // give them a chance to complete — do not cancel.
      if (
        (assignment.status === 'DELIVERING' || assignment.status === 'PICKED_UP') &&
        order.destinationLat !== null &&
        order.destinationLng !== null
      ) {
        const near = await isCourierNearDestination(
          assignment.courierId,
          Number(order.destinationLat),
          Number(order.destinationLng),
        );
        if (near) {
          console.log(
            `[OrderExpiry] Skipping timeout for #${String(order.orderNumber)} — courier is within 500 m of destination`,
          );
          continue;
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.courierAssignment.update({
          where: { id: assignment.id },
          data: { status: 'CANCELLED' as any, cancelledAt: now },
        });

        await tx.courierAssignmentEvent.create({
          data: {
            assignmentId: assignment.id,
            orderId: order.id,
            courierId: assignment.courierId,
            eventType: 'CANCELLED' as any,
            eventAt: now,
            actorUserId: null,
            payload: { reason: 'system_delivery_timeout' } as any,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED' as any,
            cancellationReason: `Kuryer 2 soat ichida yetkazib bermadi — avtomatik bekor`,
            cancelledByRole: 'system',
          },
        });

        await InAppNotificationsService.notifyAdmins(
          {
            type: NotificationTypeEnum.WARNING,
            title: 'Kuryer 2 soatda yetkazib bermadi!',
            message: `#${String(order.orderNumber)} buyurtma kuryer tomonidan 2 soat ichida yetkazilmadi va avtomatik bekor qilindi.`,
            relatedOrderId: order.id,
          },
          tx,
        );
      });

      const courierName = (assignment.courier as any)?.fullName || "Noma'lum kuryer";
      const acceptedAt = assignment.acceptedAt!;

      await sendAdminAlert(
        `🚨 <b>DIQQAT: Kuryer yetkazib bermadi!</b>\n\n` +
        `📦 Buyurtma: <b>#${String(order.orderNumber)}</b>\n` +
        `🛵 Kuryer: <b>${courierName}</b>\n` +
        `✅ Qabul qilindi: ${formatDate(acceptedAt)}\n` +
        `⏱ 2 soat o'tdi — yetkazib berish amalga oshmadi\n\n` +
        `❌ Buyurtma avtomatik bekor qilindi. Iltimos kuryer bilan bog'laning!`,
      ).catch(() => {});

      console.log(
        `[OrderExpiry] Delivery timeout — order #${String(order.orderNumber)}, assignment ${assignment.id}`,
      );
    } catch (err) {
      console.error(`[OrderExpiry] Failed to cancel expired delivery ${assignment.id}:`, err);
    }
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function runExpiryCheck(): Promise<void> {
  try {
    await warnUnacceptedOrders();
  } catch (err) {
    console.error('[OrderExpiry] Unaccepted orders warning check failed:', err);
  }

  if (!SYSTEM_ORDER_CANCELLATION_ENABLED) {
    return;
  }

  try {
    await cancelUnacceptedOrders();
  } catch (err) {
    console.error('[OrderExpiry] Unaccepted orders check failed:', err);
  }

  try {
    await cancelExpiredDeliveries();
  } catch (err) {
    console.error('[OrderExpiry] Delivery timeout check failed:', err);
  }
}

export function startOrderExpiryScheduler(): void {
  // Run once at startup to immediately clean up any backlog
  void runExpiryCheck();

  setInterval(() => {
    void runExpiryCheck();
  }, CHECK_INTERVAL_MS);

  console.log('[OrderExpiry] Scheduler started — checking every 5 minutes');
}
