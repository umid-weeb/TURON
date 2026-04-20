import type { Prisma } from '@prisma/client';
import {
  NotificationTypeEnum,
  RESTAURANT_COORDINATES,
  UserRoleEnum,
} from '@turon/shared';
import { prisma } from '../lib/prisma.js';
import { invalidateNotifCache } from './in-app-notifications.service.js';
import { CourierOperationalStatusService } from './courier-operational-status.service.js';
import { CourierPresenceService } from './courier-presence.service.js';
import { StatusService } from './status.service.js';
import { YandexMapsService } from './yandex-maps.service.js';

const ACTIVE_ASSIGNMENT_STATUSES = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'] as const;
const RESTAURANT_POINT = {
  latitude: RESTAURANT_COORDINATES.lat,
  longitude: RESTAURANT_COORDINATES.lng,
};
const FALLBACK_AVERAGE_SPEED_KMH = 24;
const FALLBACK_MIN_ETA_MINUTES = 4;

/**
 * EligibleCourierCache — `rankEligibleCouriers` natijasini 30 soniya
 * keshda saqlaydi.
 *
 * Muammo: har bir buyurtma kelganda `rankEligibleCouriers()` chaqiriladi —
 * bu `findMany(users) + findMany(courierPresence) + external API call` ni
 * amalga oshiradi. 100 ta buyurtma/soniya da bu 300+ parallel DB so'roviga
 * olib keladi.
 *
 * Yechim: Bir marta chaqirib, 30 soniya keshda saqlaymiz.
 * Trade-off: Yangi online bo'lgan kuryer maksimal 30 s kechikish bilan
 * topiladi — bu delivery UX uchun qabul qilinadi.
 *
 * Keshni yangilash: kuryer online/offline o'tganda `invalidate()` chaqiriladi.
 */
class EligibleCourierCache {
  private cached: { data: RankedCourierCandidate[]; expiresAt: number } | null = null;
  private readonly ttlMs = 30_000;

  async get(db: DbClient): Promise<RankedCourierCandidate[]> {
    if (this.cached && Date.now() < this.cached.expiresAt) {
      return this.cached.data;
    }
    const data = await CourierAssignmentService.rankEligibleCouriersRaw(db);
    this.cached = { data, expiresAt: Date.now() + this.ttlMs };
    return data;
  }

  /** Kuryer holati o'zganda (online/offline/accept toggle) keshni tozalash */
  invalidate() {
    this.cached = null;
  }
}

export const eligibleCourierCache = new EligibleCourierCache();

type DbClient = Prisma.TransactionClient | typeof prisma;

interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

interface RankedCourierMetrics {
  distanceMeters: number | null;
  etaMinutes: number | null;
  remainingDeliveryDistanceMeters?: number | null;
  source: 'live-location' | 'workload';
  hasLiveLocation: boolean;
  liveLocationUpdatedAt: string | null;
}

interface RankedCourierCandidateInternal {
  id: string;
  fullName: string;
  phoneNumber: string;
  activeAssignments: number;
  lastAssignedAt: string | null;
  isOnline: boolean;
  isAcceptingOrders: boolean;
  metrics: RankedCourierMetrics;
}

export interface RankedCourierCandidate extends RankedCourierCandidateInternal {
  rank: number;
}

export interface AssignCourierOptions {
  db?: DbClient;
  assignedByUserId?: string;
  actorRole?: string;
  mode: 'AUTO' | 'MANUAL';
  metrics?: RankedCourierMetrics;
}

export interface AssignCourierResult {
  assignmentId: string;
  orderId: string;
  courierId: string;
  courierName: string;
  assignedAt: string;
  distanceMeters: number | null;
  etaMinutes: number | null;
  wasReassigned: boolean;
  reusedExistingAssignment: boolean;
}

export interface AutoAssignResult {
  assignment: AssignCourierResult | null;
  selectedCandidate: RankedCourierCandidate | null;
  candidates: RankedCourierCandidate[];
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(from: CoordinatePoint, to: CoordinatePoint) {
  const earthRadiusMeters = 6_371_000;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lngDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  return Math.max(
    0,
    Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))),
  );
}

function fallbackEtaMinutes(distanceMeters: number) {
  if (distanceMeters <= 0) {
    return 0;
  }

  const distanceKm = distanceMeters / 1000;
  return Math.max(Math.ceil((distanceKm / FALLBACK_AVERAGE_SPEED_KMH) * 60), FALLBACK_MIN_ETA_MINUTES);
}

function compareByLastAssigned(left: string | null, right: string | null) {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return -1;
  }

  if (!right) {
    return 1;
  }

  return new Date(left).getTime() - new Date(right).getTime();
}

function compareRankedCouriers(
  left: RankedCourierCandidateInternal,
  right: RankedCourierCandidateInternal,
) {
  if (left.metrics.hasLiveLocation !== right.metrics.hasLiveLocation) {
    return left.metrics.hasLiveLocation ? -1 : 1;
  }

  if (left.metrics.hasLiveLocation && right.metrics.hasLiveLocation) {
    const leftDistance = left.metrics.distanceMeters ?? Number.POSITIVE_INFINITY;
    const rightDistance = right.metrics.distanceMeters ?? Number.POSITIVE_INFINITY;
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    const leftEta = left.metrics.etaMinutes ?? Number.POSITIVE_INFINITY;
    const rightEta = right.metrics.etaMinutes ?? Number.POSITIVE_INFINITY;
    if (leftEta !== rightEta) {
      return leftEta - rightEta;
    }
  }

  if (left.activeAssignments !== right.activeAssignments) {
    return left.activeAssignments - right.activeAssignments;
  }

  const lastAssignedComparison = compareByLastAssigned(left.lastAssignedAt, right.lastAssignedAt);
  if (lastAssignedComparison !== 0) {
    return lastAssignedComparison;
  }

  return left.fullName.localeCompare(right.fullName);
}

function isImmediatelyFree(candidate: RankedCourierCandidateInternal) {
  return candidate.isOnline && candidate.isAcceptingOrders && candidate.activeAssignments === 0;
}

function compareDispatchCouriers(
  left: RankedCourierCandidateInternal,
  right: RankedCourierCandidateInternal,
) {
  const leftFree = isImmediatelyFree(left);
  const rightFree = isImmediatelyFree(right);

  if (leftFree !== rightFree) {
    return leftFree ? -1 : 1;
  }

  if (leftFree && rightFree) {
    return compareRankedCouriers(left, right);
  }

  const leftRemaining = left.metrics.remainingDeliveryDistanceMeters ?? Number.POSITIVE_INFINITY;
  const rightRemaining = right.metrics.remainingDeliveryDistanceMeters ?? Number.POSITIVE_INFINITY;
  if (leftRemaining !== rightRemaining) {
    return leftRemaining - rightRemaining;
  }

  if (left.activeAssignments !== right.activeAssignments) {
    return left.activeAssignments - right.activeAssignments;
  }

  return compareByLastAssigned(left.lastAssignedAt, right.lastAssignedAt) || left.fullName.localeCompare(right.fullName);
}

async function resolveLiveLocationMetrics(
  locations: Array<CoordinatePoint | null>,
): Promise<Array<{ distanceMeters: number | null; etaMinutes: number | null }>> {
  const results: Array<{ distanceMeters: number | null; etaMinutes: number | null }> = locations.map(() => ({
    distanceMeters: null,
    etaMinutes: null,
  }));
  const indexedLocations = locations
    .map((location, index) => ({ location, index }))
    .filter((entry): entry is { location: CoordinatePoint; index: number } => Boolean(entry.location));

  if (!indexedLocations.length) {
    return results;
  }

  if (YandexMapsService.isDistanceMatrixConfigured()) {
    try {
      const matrix = await YandexMapsService.getDistanceMatrix(
        indexedLocations.map((entry) => entry.location),
        [RESTAURANT_POINT],
      );

      indexedLocations.forEach((entry, matrixIndex) => {
        const cell = matrix[matrixIndex]?.[0];
        if (
          cell?.status === 'OK' &&
          typeof cell.distanceMeters === 'number' &&
          typeof cell.etaSeconds === 'number'
        ) {
          results[entry.index] = {
            distanceMeters: Math.max(0, Math.round(cell.distanceMeters)),
            etaMinutes: Math.max(Math.ceil(cell.etaSeconds / 60), 0),
          };
        }
      });
    } catch {
      // Fall back to coordinate-based estimate below.
    }
  }

  indexedLocations.forEach((entry) => {
    if (results[entry.index].distanceMeters !== null) {
      return;
    }

    const distanceMeters = haversineDistanceMeters(entry.location, RESTAURANT_POINT);
    results[entry.index] = {
      distanceMeters,
      etaMinutes: fallbackEtaMinutes(distanceMeters),
    };
  });

  return results;
}

async function fetchAssignableOrder(orderId: string, db: DbClient) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      courierAssignments: {
        include: {
          courier: true,
        },
        orderBy: { assignedAt: 'desc' },
      },
    },
  });
}

function getActiveAssignment(order: any) {
  return order.courierAssignments.find((assignment: any) =>
    StatusService.isActiveAssignmentStatus(assignment.status),
  );
}

async function runWriteTransaction<T>(db: DbClient, callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  if ('$transaction' in db) {
    return db.$transaction(callback);
  }

  return callback(db);
}

export class CourierAssignmentService {
  /**
   * Kesh orqali o'tadigan public versiya.
   * `autoAssignOrder` va tashqi callerlar shu metoddan foydalanadi.
   * Kesh miss bo'lganda `rankEligibleCouriersRaw` chaqiriladi.
   */
  static async rankEligibleCouriers(db: DbClient = prisma): Promise<RankedCourierCandidate[]> {
    return eligibleCourierCache.get(db);
  }

  /**
   * DB ga to'g'ridan-to'g'ri so'rov yuboradi — kesh miss bo'lganda
   * `EligibleCourierCache.get()` ichidan chaqiriladi.
   * Tashqaridan bevosita chaqirilmasin.
   */
  static async rankEligibleCouriersRaw(db: DbClient = prisma): Promise<RankedCourierCandidate[]> {
    const couriers = await db.user.findMany({
      where: CourierOperationalStatusService.eligibleCourierWhere() as any,
      include: {
        courierOperationalStatus: true,
        courierAssignments: {
          include: {
            order: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const liveLocationMap = await CourierPresenceService.getFreshCourierLocations(
      couriers.map((courier) => courier.id),
      db,
    );
    const liveLocations = couriers.map((courier) => liveLocationMap.get(courier.id) ?? null);
    const liveLocationMetrics = await resolveLiveLocationMetrics(
      liveLocations.map((location) =>
        location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
            }
          : null,
      ),
    );

    const candidates: RankedCourierCandidateInternal[] = couriers.map((courier, index) => {
      const activeAssignments = (courier.courierAssignments || []).filter((assignment: any) =>
        StatusService.isActiveAssignmentStatus(assignment.status),
      );
      const lastAssignedAt = courier.courierAssignments?.[0]?.assignedAt?.toISOString?.() ?? null;
      const liveLocation = liveLocations[index];
      const locationMetrics = liveLocationMetrics[index];
      const metrics: RankedCourierMetrics = {
        distanceMeters: locationMetrics.distanceMeters,
        etaMinutes: locationMetrics.etaMinutes,
        source: liveLocation ? 'live-location' : 'workload',
        hasLiveLocation: Boolean(liveLocation),
        liveLocationUpdatedAt: liveLocation?.updatedAt ?? null,
      };

      return {
        id: courier.id,
        fullName: courier.fullName || 'Kuryer',
        phoneNumber: courier.phoneNumber || '',
        activeAssignments: activeAssignments.length,
        lastAssignedAt,
        isOnline: courier.courierOperationalStatus?.isOnline ?? false,
        isAcceptingOrders: courier.courierOperationalStatus?.isAcceptingOrders ?? false,
        metrics,
      };
    });

    return candidates
      .sort(compareRankedCouriers)
      .map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
      }));
  }

  static async rankDispatchCouriers(db: DbClient = prisma): Promise<RankedCourierCandidate[]> {
    const couriers = await db.user.findMany({
      where: {
        isActive: true,
        role: UserRoleEnum.COURIER as any,
        courierOperationalStatus: {
          is: {
            isOnline: true,
          },
        },
      },
      include: {
        courierOperationalStatus: true,
        courierAssignments: {
          include: {
            order: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const liveLocationMap = await CourierPresenceService.getFreshCourierLocations(
      couriers.map((courier) => courier.id),
      db,
    );
    const liveLocations = couriers.map((courier) => liveLocationMap.get(courier.id) ?? null);
    const liveLocationMetrics = await resolveLiveLocationMetrics(
      liveLocations.map((location) =>
        location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
            }
          : null,
      ),
    );

    const candidates: RankedCourierCandidateInternal[] = couriers.map((courier, index) => {
      const activeAssignments = (courier.courierAssignments || []).filter((assignment: any) =>
        StatusService.isActiveAssignmentStatus(assignment.status),
      );
      const lastAssignedAt = courier.courierAssignments?.[0]?.assignedAt?.toISOString?.() ?? null;
      const liveLocation = liveLocations[index];
      const locationMetrics = liveLocationMetrics[index];
      const metrics: RankedCourierMetrics = {
        distanceMeters: locationMetrics.distanceMeters,
        etaMinutes: locationMetrics.etaMinutes,
        remainingDeliveryDistanceMeters:
          typeof liveLocation?.remainingDistanceKm === 'number'
            ? Math.round(liveLocation.remainingDistanceKm * 1000)
            : null,
        source: liveLocation ? 'live-location' : 'workload',
        hasLiveLocation: Boolean(liveLocation),
        liveLocationUpdatedAt: liveLocation?.updatedAt ?? null,
      };

      return {
        id: courier.id,
        fullName: courier.fullName || 'Kuryer',
        phoneNumber: courier.phoneNumber || '',
        activeAssignments: activeAssignments.length,
        lastAssignedAt,
        isOnline: courier.courierOperationalStatus?.isOnline ?? false,
        isAcceptingOrders:
          (courier.courierOperationalStatus?.isAcceptingOrders ?? false) && activeAssignments.length === 0,
        metrics,
      };
    });

    return candidates
      .sort(compareDispatchCouriers)
      .map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
      }));
  }

  static async assignCourierToOrder(
    orderId: string,
    courierId: string,
    options: AssignCourierOptions,
  ): Promise<AssignCourierResult> {
    const db = options.db ?? prisma;

    // ── Dastlabki tezkor tekshiruvlar (transaction tashqarisida) ────────────
    const order = await fetchAssignableOrder(orderId, db);

    if (!order) throw new Error('Buyurtma topilmadi');
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new Error("Yakunlangan buyurtmaga kuryer biriktirib bo'lmaydi");
    }
    if (order.status === 'PENDING') {
      throw new Error("Buyurtmani avval admin tasdiqlashi kerak");
    }

    const courier = await db.user.findFirst({
      where: { id: courierId, ...CourierOperationalStatusService.eligibleCourierWhere() } as any,
      include: { courierOperationalStatus: true },
    });

    if (!courier) {
      throw new Error("Tanlangan kuryer hozir buyurtma qabul qilishga tayyor emas");
    }

    // ── Barcha kritik o'zgarishlar bitta atomik transaksiyada ───────────────
    const assignmentTimestamp = new Date();
    const createdAssignment = await runWriteTransaction(db, async (tx) => {
      // ── Transaksiya ichida kuryer va buyurtma holatini qayta tekshirish ───
      // Note: SELECT FOR UPDATE olib tashlandi — Supabase pgBouncer bilan
      // mos kelmasligi mumkin. Quyidagi idempotency tekshiruvi yetarli.
      const existingActiveForOrder = await tx.courierAssignment.findFirst({
        where: {
          orderId,
          status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] as any },
        },
        select: { id: true, courierId: true, assignedAt: true, distanceMeters: true, etaMinutes: true },
      });

      // Idempotent: allaqachon shu kuryerga biriktirilgan bo'lsa, qaytaramiz
      if (existingActiveForOrder?.courierId === courierId) {
        return {
          __reused: true as const,
          id: existingActiveForOrder.id,
          assignedAt: existingActiveForOrder.assignedAt,
          distanceMeters: existingActiveForOrder.distanceMeters,
          etaMinutes: existingActiveForOrder.etaMinutes,
        };
      }

      // Boshqa kuryer allaqachon biriktirilgan (race condition yutqazuvchi)
      if (existingActiveForOrder && existingActiveForOrder.courierId !== courierId) {
        throw new Error('Buyurtma allaqachon boshqa kuryerga biriktirilgan');
      }

      // Kuryerning boshqa aktiv assignmenti bor-yo'qligini tekshirish
      const courierBusy = await tx.courierAssignment.findFirst({
        where: {
          courierId,
          orderId: { not: orderId },
          status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] as any },
        },
        select: { id: true },
      });

      if (courierBusy) {
        throw new Error("Tanlangan kuryer hozir boshqa buyurtmada band");
      }

      // Aktiv assignmentlarni transaksiya ichida olish (stale data emas)
      const previousActiveAssignments = await tx.courierAssignment.findMany({
        where: {
          orderId: order.id,
          status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] as any },
        },
        select: { id: true, courierId: true },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { courierId },
      });

      if (previousActiveAssignments.length > 0) {
        await tx.courierAssignment.updateMany({
          where: { id: { in: previousActiveAssignments.map((a) => a.id) } },
          data: { status: 'CANCELLED' as any, cancelledAt: assignmentTimestamp },
        });

        await tx.courierAssignmentEvent.createMany({
          data: previousActiveAssignments.map((assignment) => ({
            assignmentId: assignment.id,
            orderId: order.id,
            courierId: assignment.courierId,
            eventType: 'CANCELLED' as any,
            eventAt: assignmentTimestamp,
            actorUserId: options.assignedByUserId ?? null,
          })),
        });
      }

      const assignment = await tx.courierAssignment.create({
        data: {
          orderId: order.id,
          courierId,
          status: 'ASSIGNED' as any,
          assignedAt: assignmentTimestamp,
          etaMinutes: options.metrics?.etaMinutes ?? null,
          distanceMeters: options.metrics?.distanceMeters ?? null,
        },
      });

      await tx.courierAssignmentEvent.create({
        data: {
          assignmentId: assignment.id,
          orderId: order.id,
          courierId,
          eventType: 'ASSIGNED' as any,
          eventAt: assignmentTimestamp,
          actorUserId: options.assignedByUserId ?? null,
          payload:
            options.mode === 'AUTO'
              ? {
                  mode: 'AUTO',
                }
              : {
                  mode: 'MANUAL',
                },
        },
      });

      await tx.notification.create({
        data: {
          userId: courierId,
          roleTarget: UserRoleEnum.COURIER as any,
          type: NotificationTypeEnum.ORDER_STATUS_UPDATE as any,
          title: "Yangi buyurtma biriktirildi",
          message: `#${String(order.orderNumber)} buyurtma sizga biriktirildi`,
          relatedOrderId: order.id,
        },
      });

      return assignment;
    });

    // Transaksiya ichida idempotent qaytish signali
    if ('__reused' in createdAssignment) {
      return {
        assignmentId: createdAssignment.id,
        orderId: order.id,
        courierId,
        courierName: courier.fullName || 'Kuryer',
        assignedAt: createdAssignment.assignedAt.toISOString(),
        distanceMeters: createdAssignment.distanceMeters ?? null,
        etaMinutes: createdAssignment.etaMinutes ?? null,
        wasReassigned: false,
        reusedExistingAssignment: true,
      };
    }

    invalidateNotifCache(courierId);

    return {
      assignmentId: createdAssignment.id,
      orderId: order.id,
      courierId,
      courierName: courier.fullName || 'Kuryer',
      assignedAt: createdAssignment.assignedAt.toISOString(),
      distanceMeters: createdAssignment.distanceMeters ?? null,
      etaMinutes: createdAssignment.etaMinutes ?? null,
      wasReassigned: true,
      reusedExistingAssignment: false,
    };
  }

  static async autoAssignOrder(
    orderId: string,
    db: DbClient = prisma,
    excludeCourierIds: string[] = [],
  ): Promise<AutoAssignResult> {
    const order = await fetchAssignableOrder(orderId, db);

    if (!order) {
      throw new Error('Buyurtma topilmadi');
    }

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      return {
        assignment: null,
        selectedCandidate: null,
        candidates: [],
      };
    }

    const activeAssignment = getActiveAssignment(order);
    if (activeAssignment) {
      const existingCourier = await db.user.findUnique({
        where: { id: activeAssignment.courierId },
      });

      return {
        assignment: {
          assignmentId: activeAssignment.id,
          orderId: order.id,
          courierId: activeAssignment.courierId,
          courierName: existingCourier?.fullName || 'Kuryer',
          assignedAt: activeAssignment.assignedAt.toISOString(),
          distanceMeters: activeAssignment.distanceMeters ?? null,
          etaMinutes: activeAssignment.etaMinutes ?? null,
          wasReassigned: false,
          reusedExistingAssignment: true,
        },
        selectedCandidate: null,
        candidates: [],
      };
    }

    const candidates = await this.rankEligibleCouriers(db);

    // Filter out couriers who already declined this order
    const eligible =
      excludeCourierIds.length > 0
        ? candidates.filter((c) => !excludeCourierIds.includes(c.id))
        : candidates;

    const selectedCandidate = eligible[0] ?? null;

    if (!selectedCandidate) {
      return {
        assignment: null,
        selectedCandidate: null,
        candidates,
      };
    }

    const assignment = await this.assignCourierToOrder(orderId, selectedCandidate.id, {
      db,
      mode: 'AUTO',
      metrics: selectedCandidate.metrics,
    });

    return {
      assignment,
      selectedCandidate,
      candidates,
    };
  }
}
