import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type {
  CourierLocationSnapshot,
  OrderTrackingSnapshot,
} from './order-tracking.service.js';

const LIVE_WINDOW_MS = 45_000;

type DbClient = Prisma.TransactionClient | typeof prisma;

interface UpsertCourierPresenceInput {
  courierId: string;
  orderId?: string | null;
  latitude: number;
  longitude: number;
  heading?: number;
  speedKmh?: number;
  remainingDistanceKm?: number;
  remainingEtaMinutes?: number;
}

function toLocationSnapshot(row: any): CourierLocationSnapshot {
  return {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    heading: typeof row.heading === 'number' ? row.heading : undefined,
    speedKmh: typeof row.speedKmh === 'number' ? row.speedKmh : undefined,
    remainingDistanceKm:
      typeof row.remainingDistanceKm === 'number' ? row.remainingDistanceKm : undefined,
    remainingEtaMinutes:
      typeof row.remainingEtaMinutes === 'number' ? row.remainingEtaMinutes : undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isLive(updatedAt: Date) {
  return Date.now() - updatedAt.getTime() <= LIVE_WINDOW_MS;
}

export class CourierPresenceService {
  static async upsert(input: UpsertCourierPresenceInput, db: DbClient = prisma) {
    const previous = await db.courierPresence.findUnique({
      where: { courierId: input.courierId },
      select: {
        orderId: true,
      },
    });

    const row = await db.courierPresence.upsert({
      where: { courierId: input.courierId },
      update: {
        orderId: input.orderId ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        heading: input.heading ?? null,
        speedKmh: input.speedKmh ?? null,
        remainingDistanceKm: input.remainingDistanceKm ?? null,
        remainingEtaMinutes: input.remainingEtaMinutes ?? null,
      },
      create: {
        courierId: input.courierId,
        orderId: input.orderId ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        heading: input.heading ?? null,
        speedKmh: input.speedKmh ?? null,
        remainingDistanceKm: input.remainingDistanceKm ?? null,
        remainingEtaMinutes: input.remainingEtaMinutes ?? null,
      },
    });

    return {
      row,
      tracking: this.rowToTrackingSnapshot(row),
      previousOrderId: previous?.orderId ?? null,
    };
  }

  static async getOrderTrackingSnapshot(orderId: string, db: DbClient = prisma): Promise<OrderTrackingSnapshot | undefined> {
    const row = await db.courierPresence.findFirst({
      where: { orderId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) return undefined;
    return this.rowToTrackingSnapshot(row);
  }

  // Batch: fetch snapshots for multiple orderIds in ONE query
  static async getOrderTrackingSnapshotBatch(
    orderIds: string[],
    db: DbClient = prisma,
  ): Promise<Map<string, OrderTrackingSnapshot>> {
    if (!orderIds.length) return new Map();

    const rows = await db.courierPresence.findMany({
      where: { orderId: { in: orderIds } },
      orderBy: { updatedAt: 'desc' },
    });

    // Keep only the freshest row per orderId
    const result = new Map<string, OrderTrackingSnapshot>();
    for (const row of rows) {
      if (row.orderId && !result.has(row.orderId)) {
        result.set(row.orderId, this.rowToTrackingSnapshot(row));
      }
    }
    return result;
  }

  static async getFreshCourierLocations(
    courierIds: string[],
    db: DbClient = prisma,
  ) {
    if (!courierIds.length) {
      return new Map<string, CourierLocationSnapshot>();
    }

    const freshnessBoundary = new Date(Date.now() - LIVE_WINDOW_MS);
    const rows = await db.courierPresence.findMany({
      where: {
        courierId: { in: courierIds },
        updatedAt: {
          gte: freshnessBoundary,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const map = new Map<string, CourierLocationSnapshot>();

    for (const row of rows) {
      if (!map.has(row.courierId)) {
        map.set(row.courierId, toLocationSnapshot(row));
      }
    }

    return map;
  }

  private static rowToTrackingSnapshot(row: any): OrderTrackingSnapshot {
    return {
      isLive: isLive(row.updatedAt),
      lastEventAt: row.updatedAt.toISOString(),
      courierLocation: toLocationSnapshot(row),
    };
  }
}
