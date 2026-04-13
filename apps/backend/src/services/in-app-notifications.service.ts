import type { Prisma } from '@prisma/client';
import { NotificationTypeEnum, UserRoleEnum } from '@turon/shared';
import { prisma } from '../lib/prisma.js';

type DbClient = Prisma.TransactionClient | typeof prisma;

interface CreateNotificationInput {
  userId: string;
  roleTarget: UserRoleEnum;
  type: NotificationTypeEnum;
  title: string;
  message: string;
  relatedOrderId?: string | null;
}

function serializeNotification(notification: any) {
  return {
    id: notification.id,
    userId: notification.userId,
    roleTarget: notification.roleTarget,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    relatedOrderId: notification.relatedOrderId ?? null,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  };
}

// ── 5-second in-memory cache for listForUser ─────────────────────────────────
// Each SSE client calls /notifications/my every ~2 seconds — this eliminates
// repeated identical DB queries within the same polling window.
const notifCache = new Map<string, { data: unknown[]; expiresAt: number }>();
const NOTIF_CACHE_TTL = 5_000; // ms

function getCachedNotifs(userId: string, role: UserRoleEnum) {
  const entry = notifCache.get(`${userId}:${role}`);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

function setCachedNotifs(userId: string, role: UserRoleEnum, data: unknown[]) {
  notifCache.set(`${userId}:${role}`, { data, expiresAt: Date.now() + NOTIF_CACHE_TTL });
}

export function invalidateNotifCache(userId: string) {
  for (const key of notifCache.keys()) {
    if (key.startsWith(`${userId}:`)) notifCache.delete(key);
  }
}

export class InAppNotificationsService {
  static serialize = serializeNotification;

  static async createMany(
    notifications: CreateNotificationInput[],
    db: DbClient = prisma,
  ) {
    if (!notifications.length) {
      return;
    }

    await db.notification.createMany({
      data: notifications.map((notification) => ({
        userId: notification.userId,
        roleTarget: notification.roleTarget as any,
        type: notification.type as any,
        title: notification.title,
        message: notification.message,
        relatedOrderId: notification.relatedOrderId ?? null,
      })),
    });

    // Invalidate cache for all affected users
    for (const n of notifications) invalidateNotifCache(n.userId);
  }

  static async notifyAdmins(
    input: {
      type: NotificationTypeEnum;
      title: string;
      message: string;
      relatedOrderId?: string | null;
    },
    db: DbClient = prisma,
  ) {
    const admins = await db.user.findMany({
      where: {
        role: UserRoleEnum.ADMIN as any,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    await this.createMany(
      admins.map((admin) => ({
        userId: admin.id,
        roleTarget: UserRoleEnum.ADMIN,
        type: input.type,
        title: input.title,
        message: input.message,
        relatedOrderId: input.relatedOrderId ?? null,
      })),
      db,
    );
  }

  static async notifyUser(
    input: CreateNotificationInput,
    db: DbClient = prisma,
  ) {
    await this.createMany([input], db);
  }

  static async listForUser(
    userId: string,
    role: UserRoleEnum,
    db: DbClient = prisma,
  ) {
    const cached = getCachedNotifs(userId, role);
    if (cached) return cached;

    const notifications = await db.notification.findMany({
      where: { userId, roleTarget: role as any },
      orderBy: { createdAt: 'desc' },
      take: 50, // 100 → 50: fewer rows, faster serialization
      select: {
        id: true, userId: true, roleTarget: true, type: true,
        title: true, message: true, relatedOrderId: true,
        isRead: true, createdAt: true,
      },
    });

    const result = notifications.map(serializeNotification);
    setCachedNotifs(userId, role, result);
    return result;
  }

  static async markAsRead(
    userId: string,
    role: UserRoleEnum,
    notificationId: string,
    db: DbClient = prisma,
  ) {
    const notification = await db.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        roleTarget: role as any,
      },
    });

    if (!notification) {
      throw new Error('Bildirishnoma topilmadi');
    }

    const updatedNotification = await db.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
      },
    });

    return serializeNotification(updatedNotification);
  }

  static async markAllAsRead(
    userId: string,
    role: UserRoleEnum,
    db: DbClient = prisma,
  ) {
    await db.notification.updateMany({
      where: {
        userId,
        roleTarget: role as any,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }
}
