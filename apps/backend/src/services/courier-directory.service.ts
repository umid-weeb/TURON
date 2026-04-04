import type { Prisma } from '@prisma/client';
import { UserRoleEnum } from '@turon/shared';
import { prisma } from '../lib/prisma.js';
import { CourierStatsService } from './courier-stats.service.js';

type DbClient = Prisma.TransactionClient | typeof prisma;

const ACTIVE_ASSIGNMENT_STATUSES = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'] as const;
const HISTORY_ASSIGNMENT_STATUSES = ['DELIVERED', 'CANCELLED', 'REJECTED'] as const;
const TASHKENT_UTC_OFFSET = '+05:00';

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return typeof value === 'number' ? value : Number(value);
}

function getTashkentDayRange() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    const fallback = new Date();
    return {
      start: new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()),
      end: new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate() + 1),
    };
  }

  const start = new Date(`${year}-${month}-${day}T00:00:00${TASHKENT_UTC_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function serializeAdminCourier(user: any) {
  const { start, end } = getTashkentDayRange();
  const assignments = user.courierAssignments || [];
  const activeAssignments = assignments.filter((assignment: any) =>
    ACTIVE_ASSIGNMENT_STATUSES.includes(assignment.status),
  );
  const completedTodayAssignments = assignments.filter(
    (assignment: any) =>
      assignment.status === 'DELIVERED' &&
      assignment.deliveredAt &&
      assignment.deliveredAt >= start &&
      assignment.deliveredAt < end,
  );
  const totalDelivered = assignments.filter((assignment: any) => assignment.status === 'DELIVERED').length;
  const todayDeliveryFees = completedTodayAssignments.reduce(
    (sum: number, assignment: any) => sum + decimalToNumber(assignment.order?.deliveryFee),
    0,
  );
  const lastDeliveredAt = assignments
    .filter((assignment: any) => assignment.deliveredAt)
    .sort((left: any, right: any) => right.deliveredAt.getTime() - left.deliveredAt.getTime())[0]
    ?.deliveredAt;

  return {
    id: user.id,
    telegramId: user.telegramId.toString(),
    telegramUsername: user.telegramUsername || null,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber || null,
    isActive: user.isActive,
    isOnline: user.courierOperationalStatus?.isOnline ?? false,
    isAcceptingOrders: user.courierOperationalStatus?.isAcceptingOrders ?? false,
    activeAssignments: activeAssignments.length,
    completedToday: completedTodayAssignments.length,
    totalDelivered,
    deliveryFeesToday: todayDeliveryFees,
    lastOnlineAt: user.courierOperationalStatus?.lastOnlineAt?.toISOString?.() ?? null,
    lastOfflineAt: user.courierOperationalStatus?.lastOfflineAt?.toISOString?.() ?? null,
    lastSeenAt: user.courierPresence?.updatedAt?.toISOString?.() ?? null,
    currentOrderId: activeAssignments[0]?.orderId ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastDeliveredAt: lastDeliveredAt?.toISOString?.() ?? null,
  };
}

function serializeCourierHistoryEntry(assignment: any) {
  return {
    assignmentId: assignment.id,
    orderId: assignment.orderId,
    orderNumber: String(assignment.order?.orderNumber ?? ''),
    customerName: assignment.order?.user?.fullName || 'Mijoz',
    customerPhone: assignment.order?.user?.phoneNumber || null,
    destinationAddress: assignment.order?.deliveryAddress?.address || "Manzil ko'rsatilmagan",
    assignmentStatus: assignment.status,
    orderStatus: assignment.order?.status,
    paymentMethod: assignment.order?.paymentMethod,
    total: decimalToNumber(assignment.order?.totalAmount),
    deliveryFee: decimalToNumber(assignment.order?.deliveryFee),
    itemCount: assignment.order?.items?.length ?? 0,
    note: assignment.order?.note || null,
    assignedAt: assignment.assignedAt.toISOString(),
    acceptedAt: assignment.acceptedAt?.toISOString?.() ?? null,
    pickedUpAt: assignment.pickedUpAt?.toISOString?.() ?? null,
    deliveringAt: assignment.deliveringAt?.toISOString?.() ?? null,
    deliveredAt: assignment.deliveredAt?.toISOString?.() ?? null,
    cancelledAt: assignment.cancelledAt?.toISOString?.() ?? null,
    latestEventType: assignment.events?.[0]?.eventType ?? null,
  };
}

export class CourierDirectoryService {
  static async listForAdmin(db: DbClient = prisma) {
    const couriers = await db.user.findMany({
      where: {
        role: UserRoleEnum.COURIER as any,
      },
      include: {
        courierOperationalStatus: true,
        courierPresence: true,
        courierAssignments: {
          include: {
            order: {
              select: {
                id: true,
                deliveryFee: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return couriers.map(serializeAdminCourier);
  }

  static async createByAdmin(
    input: {
      telegramId: bigint;
      fullName: string;
      phoneNumber?: string | null;
      telegramUsername?: string | null;
      isActive: boolean;
    },
    db: DbClient = prisma,
  ) {
    const existingUser = await db.user.findUnique({
      where: {
        telegramId: input.telegramId,
      },
    });

    if (existingUser) {
      throw new Error('Bu Telegram ID allaqachon tizimda mavjud');
    }

    const createdCourier = await db.user.create({
      data: {
        telegramId: input.telegramId,
        telegramUsername: normalizeOptionalText(input.telegramUsername),
        fullName: input.fullName.trim(),
        phoneNumber: normalizeOptionalText(input.phoneNumber),
        role: UserRoleEnum.COURIER as any,
        isActive: input.isActive,
      },
    });

    await db.courierOperationalStatus.create({
      data: {
        courierId: createdCourier.id,
        isOnline: false,
        isAcceptingOrders: false,
      },
    });

    const freshCourier = await db.user.findUnique({
      where: { id: createdCourier.id },
      include: {
        courierOperationalStatus: true,
        courierPresence: true,
        courierAssignments: {
          include: {
            order: {
              select: {
                id: true,
                deliveryFee: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
      },
    });

    if (!freshCourier) {
      throw new Error("Kuryerni saqlab bo'lmadi");
    }

    return serializeAdminCourier(freshCourier);
  }

  static async updateByAdmin(
    courierId: string,
    input: {
      fullName?: string;
      phoneNumber?: string | null;
      telegramUsername?: string | null;
      isActive?: boolean;
    },
    db: DbClient = prisma,
  ) {
    const existing = await db.user.findFirst({
      where: {
        id: courierId,
        role: UserRoleEnum.COURIER as any,
      },
      include: {
        courierOperationalStatus: true,
      },
    });

    if (!existing) {
      throw new Error('Kuryer topilmadi');
    }

    await db.user.update({
      where: { id: courierId },
      data: {
        fullName: input.fullName?.trim() || undefined,
        phoneNumber:
          typeof input.phoneNumber === 'string' ? normalizeOptionalText(input.phoneNumber) : undefined,
        telegramUsername:
          typeof input.telegramUsername === 'string'
            ? normalizeOptionalText(input.telegramUsername)
            : undefined,
        isActive: typeof input.isActive === 'boolean' ? input.isActive : undefined,
      },
    });

    if (input.isActive === false && existing.courierOperationalStatus) {
      await db.courierOperationalStatus.update({
        where: {
          courierId,
        },
        data: {
          isOnline: false,
          isAcceptingOrders: false,
          lastOfflineAt: new Date(),
        },
      });
    }

    const freshCourier = await db.user.findUnique({
      where: { id: courierId },
      include: {
        courierOperationalStatus: true,
        courierPresence: true,
        courierAssignments: {
          include: {
            order: {
              select: {
                id: true,
                deliveryFee: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
      },
    });

    if (!freshCourier) {
      throw new Error('Kuryer topilmadi');
    }

    return serializeAdminCourier(freshCourier);
  }

  static async getProfile(courierId: string, db: DbClient = prisma) {
    const courier = await db.user.findFirst({
      where: {
        id: courierId,
        role: UserRoleEnum.COURIER as any,
      },
      include: {
        courierOperationalStatus: true,
        courierPresence: true,
        courierAssignments: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
      },
    });

    if (!courier) {
      throw new Error('Kuryer topilmadi');
    }

    const stats = await CourierStatsService.getTodayStats(courierId, db);
    const activeAssignments = courier.courierAssignments.filter((assignment: any) =>
      ACTIVE_ASSIGNMENT_STATUSES.includes(assignment.status),
    );
    const totalDeliveredCount = courier.courierAssignments.filter(
      (assignment: any) => assignment.status === 'DELIVERED',
    ).length;

    return {
      courierId: courier.id,
      telegramId: courier.telegramId.toString(),
      telegramUsername: courier.telegramUsername || null,
      fullName: courier.fullName,
      phoneNumber: courier.phoneNumber || null,
      isActive: courier.isActive,
      isOnline: courier.courierOperationalStatus?.isOnline ?? false,
      isAcceptingOrders: courier.courierOperationalStatus?.isAcceptingOrders ?? false,
      createdAt: courier.createdAt.toISOString(),
      updatedAt: courier.updatedAt.toISOString(),
      lastOnlineAt: courier.courierOperationalStatus?.lastOnlineAt?.toISOString?.() ?? null,
      lastOfflineAt: courier.courierOperationalStatus?.lastOfflineAt?.toISOString?.() ?? null,
      lastSeenAt: courier.courierPresence?.updatedAt?.toISOString?.() ?? null,
      totalDeliveredCount,
      activeAssignments: activeAssignments.length,
      completedToday: stats.completedCount,
      latestPresence: courier.courierPresence
        ? {
            latitude: Number(courier.courierPresence.latitude),
            longitude: Number(courier.courierPresence.longitude),
            updatedAt: courier.courierPresence.updatedAt.toISOString(),
            orderId: courier.courierPresence.orderId ?? null,
          }
        : null,
      activeAssignment: activeAssignments[0]?.order
        ? {
            assignmentId: activeAssignments[0].id,
            orderId: activeAssignments[0].order.id,
            orderNumber: String(activeAssignments[0].order.orderNumber),
            assignmentStatus: activeAssignments[0].status,
            orderStatus: activeAssignments[0].order.status,
          }
        : null,
      todayStats: stats,
    };
  }

  static async updateOwnProfile(
    courierId: string,
    input: {
      fullName?: string;
      phoneNumber?: string | null;
      telegramUsername?: string | null;
    },
    db: DbClient = prisma,
  ) {
    const courier = await db.user.findFirst({
      where: {
        id: courierId,
        role: UserRoleEnum.COURIER as any,
      },
      select: {
        id: true,
      },
    });

    if (!courier) {
      throw new Error('Kuryer topilmadi');
    }

    await db.user.update({
      where: { id: courierId },
      data: {
        fullName: input.fullName?.trim() || undefined,
        phoneNumber:
          typeof input.phoneNumber === 'string' ? normalizeOptionalText(input.phoneNumber) : undefined,
        telegramUsername:
          typeof input.telegramUsername === 'string'
            ? normalizeOptionalText(input.telegramUsername)
            : undefined,
      },
    });

    return this.getProfile(courierId, db);
  }

  static async getHistory(courierId: string, db: DbClient = prisma) {
    const courier = await db.user.findFirst({
      where: {
        id: courierId,
        role: UserRoleEnum.COURIER as any,
      },
      select: {
        id: true,
      },
    });

    if (!courier) {
      throw new Error('Kuryer topilmadi');
    }

    const assignments = await db.courierAssignment.findMany({
      where: {
        courierId,
        status: {
          in: [...ACTIVE_ASSIGNMENT_STATUSES, ...HISTORY_ASSIGNMENT_STATUSES] as any,
        },
      },
      include: {
        events: {
          orderBy: {
            eventAt: 'desc',
          },
          take: 1,
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentMethod: true,
            totalAmount: true,
            deliveryFee: true,
            note: true,
            user: {
              select: {
                fullName: true,
                phoneNumber: true,
              },
            },
            deliveryAddress: {
              select: {
                address: true,
              },
            },
            items: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: [
        { deliveredAt: 'desc' },
        { cancelledAt: 'desc' },
        { assignedAt: 'desc' },
      ],
      take: 100,
    });

    return assignments.map(serializeCourierHistoryEntry);
  }
}
