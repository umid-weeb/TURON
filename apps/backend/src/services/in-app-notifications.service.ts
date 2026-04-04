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
    const notifications = await db.notification.findMany({
      where: {
        userId,
        roleTarget: role as any,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return notifications.map(serializeNotification);
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
