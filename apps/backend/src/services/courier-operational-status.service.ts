import type { Prisma } from '@prisma/client';
import { UserRoleEnum } from '@turon/shared';
import { prisma } from '../lib/prisma.js';

const ACTIVE_ASSIGNMENT_STATUSES = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'] as const;

type DbClient = Prisma.TransactionClient | typeof prisma;
const TASHKENT_UTC_OFFSET = '+05:00';

export interface UpdateCourierOperationalStatusInput {
  isOnline?: boolean;
  isAcceptingOrders?: boolean;
}

function buildEligibleCourierWhere(): Prisma.UserWhereInput {
  return {
    isActive: true,
    role: UserRoleEnum.COURIER as any,
    courierOperationalStatus: {
      is: {
        isOnline: true,
        isAcceptingOrders: true,
      },
    },
    courierAssignments: {
      none: {
        status: {
          in: [...ACTIVE_ASSIGNMENT_STATUSES] as any,
        },
      },
    },
  };
}

async function getActiveAssignmentSnapshot(courierId: string, db: DbClient) {
  return db.courierAssignment.findFirst({
    where: {
      courierId,
      status: {
        in: [...ACTIVE_ASSIGNMENT_STATUSES] as any,
      },
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });
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

function serializeStatus(
  status: any,
  activeAssignmentCount: number,
  completedToday: number,
  activeAssignment: any,
) {
  return {
    courierId: status.courierId,
    isOnline: status.isOnline,
    isAcceptingOrders: status.isAcceptingOrders && activeAssignmentCount === 0,
    lastOnlineAt: status.lastOnlineAt?.toISOString() ?? null,
    lastOfflineAt: status.lastOfflineAt?.toISOString() ?? null,
    updatedAt: status.updatedAt.toISOString(),
    activeAssignments: activeAssignmentCount,
    completedToday,
    activeAssignment: activeAssignment?.order
      ? {
          assignmentId: activeAssignment.id,
          orderId: activeAssignment.order.id,
          orderNumber: String(activeAssignment.order.orderNumber),
          assignmentStatus: activeAssignment.status,
          orderStatus: activeAssignment.order.status,
        }
      : null,
  };
}

export class CourierOperationalStatusService {
  static eligibleCourierWhere(): Prisma.UserWhereInput {
    return buildEligibleCourierWhere();
  }

  static async getOrCreate(courierId: string, db: DbClient = prisma) {
    return db.courierOperationalStatus.upsert({
      where: { courierId },
      update: {},
      create: {
        courierId,
        isOnline: false,
        isAcceptingOrders: false,
      },
    });
  }

  static async getSummary(courierId: string, db: DbClient = prisma) {
    const { start, end } = getTashkentDayRange();
    const [status, activeAssignmentCount, completedToday, activeAssignment] = await Promise.all([
      this.getOrCreate(courierId, db),
      db.courierAssignment.count({
        where: {
          courierId,
          status: {
            in: [...ACTIVE_ASSIGNMENT_STATUSES] as any,
          },
        },
      }),
      db.courierAssignment.count({
        where: {
          courierId,
          status: 'DELIVERED' as any,
          deliveredAt: {
            gte: start,
            lt: end,
          },
        },
      }),
      getActiveAssignmentSnapshot(courierId, db),
    ]);

    return serializeStatus(status, activeAssignmentCount, completedToday, activeAssignment);
  }

  static async updateSummary(
    courierId: string,
    input: UpdateCourierOperationalStatusInput,
    db: DbClient = prisma,
  ) {
    const current = await this.getOrCreate(courierId, db);
    const currentActiveAssignmentCount = await db.courierAssignment.count({
      where: {
        courierId,
        status: {
          in: [...ACTIVE_ASSIGNMENT_STATUSES] as any,
        },
      },
    });

    if (input.isAcceptingOrders === true && currentActiveAssignmentCount > 0) {
      throw new Error("Faol buyurtmangiz bor paytda yangi buyurtma qabul qilishni yoqib bo'lmaydi");
    }

    const nextIsOnline = input.isOnline ?? current.isOnline;

    if (!nextIsOnline && input.isAcceptingOrders === true && input.isOnline !== true) {
      throw new Error("Buyurtma qabul qilishni yoqish uchun avval onlayn bo'ling");
    }

    const nextIsAcceptingOrders =
      input.isOnline === false || currentActiveAssignmentCount > 0
        ? false
        : input.isAcceptingOrders ?? current.isAcceptingOrders;

    const now = new Date();
    const updated = await db.courierOperationalStatus.upsert({
      where: { courierId },
      create: {
        courierId,
        isOnline: nextIsOnline,
        isAcceptingOrders: nextIsAcceptingOrders,
        lastOnlineAt: nextIsOnline ? now : null,
        lastOfflineAt: nextIsOnline ? null : now,
      },
      update: {
        isOnline: nextIsOnline,
        isAcceptingOrders: nextIsAcceptingOrders,
        lastOnlineAt: !current.isOnline && nextIsOnline ? now : undefined,
        lastOfflineAt: current.isOnline && !nextIsOnline ? now : undefined,
      },
    });

    const { start, end } = getTashkentDayRange();
    const [completedToday, activeAssignment] = await Promise.all([
      db.courierAssignment.count({
        where: {
          courierId,
          status: 'DELIVERED' as any,
          deliveredAt: {
            gte: start,
            lt: end,
          },
        },
      }),
      getActiveAssignmentSnapshot(courierId, db),
    ]);

    return {
      before: serializeStatus(current, currentActiveAssignmentCount, completedToday, activeAssignment),
      after: serializeStatus(updated, currentActiveAssignmentCount, completedToday, activeAssignment),
    };
  }
}
