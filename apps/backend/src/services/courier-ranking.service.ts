/**
 * SmartCourierRankingService
 *
 * Barcha online kuryerlarni restoranga yetib kelish ETA'si bo'yicha saralaydi.
 *
 * ETA hisoblash mantiq:
 *  - Bo'sh kuryer (activeAssignments === 0):
 *      ETA = kuryer_joylashuvi → restoran
 *  - Band kuryer (DELIVERING/PICKED_UP):
 *      ETA = (kuryer → hozirgi mijoz manzili) + (mijoz → restoran)
 *      (hozirgi yetkazish tugagach restoranga qaytib keladi)
 *
 * Bo'sh kuryerlar doimo band kuryerlardan oldinda (avval saralanadi).
 * Masofani hisoblashda Yandex Maps Distance Matrix (asosiy) yoki
 * Haversine formula (fallback) ishlatiladi.
 */

import type { Prisma } from '@prisma/client';
import { RESTAURANT_COORDINATES, UserRoleEnum } from '@turon/shared';
import { prisma } from '../lib/prisma.js';
import { CourierPresenceService } from './courier-presence.service.js';
import { YandexMapsService } from './yandex-maps.service.js';

// ─── Konstantalar ────────────────────────────────────────────────────────────

const RESTAURANT: CoordPoint = {
  lat: RESTAURANT_COORDINATES.lat,
  lng: RESTAURANT_COORDINATES.lng,
};

const DELIVERY_ACTIVE_STATUSES = ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] as const;
const FALLBACK_SPEED_KMH = 24;
const MIN_ETA_MINUTES = 2;

// ─── Turlar ──────────────────────────────────────────────────────────────────

type DbClient = Prisma.TransactionClient | typeof prisma;

interface CoordPoint {
  lat: number;
  lng: number;
}

export type CourierAvailability = 'FREE' | 'FINISHING_DELIVERY';

export interface SmartRankedCourier {
  rank: number;
  courierId: string;
  courierName: string;
  courierPhone: string;
  /** Restoranga yetib kelish uchun taxminiy daqiqalar (eng kam = eng yaxshi) */
  etaToRestaurantMinutes: number;
  /** Restorangacha masofa (metr) */
  distanceToRestaurantMeters: number;
  availability: CourierAvailability;
  /** Band kuryer uchun hozirgi yetkazish manzili (debug uchun) */
  currentDeliveryAddress?: string | null;
  hasLiveLocation: boolean;
  liveLocationUpdatedAt: string | null;
}

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineMeters(from: CoordPoint, to: CoordPoint): number {
  const R = 6_371_000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function fallbackEta(distanceMeters: number): number {
  if (distanceMeters <= 0) return 0;
  return Math.max(
    MIN_ETA_MINUTES,
    Math.ceil((distanceMeters / 1000 / FALLBACK_SPEED_KMH) * 60),
  );
}

// ─── Batch ETA hisoblash ──────────────────────────────────────────────────────

interface EtaResult {
  distanceMeters: number;
  etaMinutes: number;
}

/** Bir nechta point → restoran uchun ETA ni batch tarzda hisoblaydi */
async function batchEtaToRestaurant(
  points: CoordPoint[],
): Promise<EtaResult[]> {
  const results: EtaResult[] = points.map((p) => {
    const d = haversineMeters(p, RESTAURANT);
    return { distanceMeters: d, etaMinutes: fallbackEta(d) };
  });

  if (!points.length || !YandexMapsService.isDistanceMatrixConfigured()) {
    return results;
  }

  try {
    const origins = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
    const destinations = [{ latitude: RESTAURANT.lat, longitude: RESTAURANT.lng }];
    const matrix = await YandexMapsService.getDistanceMatrix(origins, destinations);

    points.forEach((_, i) => {
      const cell = matrix[i]?.[0];
      if (cell?.status === 'OK' && cell.distanceMeters != null && cell.etaSeconds != null) {
        results[i] = {
          distanceMeters: Math.max(0, Math.round(cell.distanceMeters)),
          etaMinutes: Math.max(0, Math.ceil(cell.etaSeconds / 60)),
        };
      }
    });
  } catch {
    // Yandex API muvaffaqiyatsiz bo'lsa Haversine fallback allaqachon to'ldirilgan
  }

  return results;
}

/** Ikki segmentli marshrut: A → B → C uchun umumiy ETA */
async function twoSegmentEta(
  from: CoordPoint,
  via: CoordPoint,
  to: CoordPoint,
): Promise<EtaResult> {
  if (!YandexMapsService.isDistanceMatrixConfigured()) {
    const d1 = haversineMeters(from, via);
    const d2 = haversineMeters(via, to);
    return {
      distanceMeters: d1 + d2,
      etaMinutes: fallbackEta(d1) + fallbackEta(d2),
    };
  }

  try {
    const origins = [
      { latitude: from.lat, longitude: from.lng },
      { latitude: via.lat, longitude: via.lng },
    ];
    const destinations = [
      { latitude: via.lat, longitude: via.lng },
      { latitude: to.lat, longitude: to.lng },
    ];
    // Parallel matrix calls: [from→via] va [via→to]
    const [matrix1, matrix2] = await Promise.all([
      YandexMapsService.getDistanceMatrix([origins[0]], [destinations[0]]),
      YandexMapsService.getDistanceMatrix([origins[1]], [destinations[1]]),
    ]);

    const seg1 = matrix1[0]?.[0];
    const seg2 = matrix2[0]?.[0];

    const d1 =
      seg1?.status === 'OK' && seg1.distanceMeters != null
        ? Math.round(seg1.distanceMeters)
        : haversineMeters(from, via);
    const eta1 =
      seg1?.status === 'OK' && seg1.etaSeconds != null
        ? Math.ceil(seg1.etaSeconds / 60)
        : fallbackEta(d1);

    const d2 =
      seg2?.status === 'OK' && seg2.distanceMeters != null
        ? Math.round(seg2.distanceMeters)
        : haversineMeters(via, to);
    const eta2 =
      seg2?.status === 'OK' && seg2.etaSeconds != null
        ? Math.ceil(seg2.etaSeconds / 60)
        : fallbackEta(d2);

    return { distanceMeters: d1 + d2, etaMinutes: eta1 + eta2 };
  } catch {
    const d1 = haversineMeters(from, via);
    const d2 = haversineMeters(via, to);
    return { distanceMeters: d1 + d2, etaMinutes: fallbackEta(d1) + fallbackEta(d2) };
  }
}

// ─── Asosiy servis ────────────────────────────────────────────────────────────

export class SmartCourierRankingService {
  /**
   * Barcha online kuryerlarni ETA bo'yicha saralangan holda qaytaradi.
   *
   * Bo'sh (FREE) kuryerlar doim band (FINISHING_DELIVERY) kuryerlardan oldin.
   * Bir xil holat ichida — kichik ETA birinchi.
   */
  static async rankAllOnlineByETA(
    db: DbClient = prisma,
  ): Promise<SmartRankedCourier[]> {
    const couriers = await db.user.findMany({
      where: {
        isActive: true,
        role: UserRoleEnum.COURIER as any,
        courierOperationalStatus: { is: { isOnline: true } },
      },
      include: {
        courierOperationalStatus: true,
        courierAssignments: {
          where: { status: { in: DELIVERY_ACTIVE_STATUSES as any } },
          include: {
            order: {
              select: {
                id: true,
                destinationLat: true,
                destinationLng: true,
                deliveryAddress: { select: { address: true } },
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
          take: 1, // Faqat eng yangi aktiv assignment
        },
      },
    }) as any[];

    if (!couriers.length) return [];

    // Live GPS joylashuvlarini bir vaqtda yuklash
    const locationMap = await CourierPresenceService.getFreshCourierLocations(
      couriers.map((c) => c.id),
      db,
    );

    // ETA hisoblash uchun kuryer va ularning yo'nalishlarini tayyorlash
    const ranked = await Promise.all(
      couriers.map(async (courier) => {
        const loc = locationMap.get(courier.id);
        const activeAssignment = courier.courierAssignments[0] ?? null;
        const isBusy = activeAssignment != null;

        let eta: EtaResult;
        let currentDeliveryAddress: string | null = null;

        if (!loc) {
          // GPS joylashuvi yo'q — fallback: band kuryerga 999 daqiqa berish
          eta = isBusy
            ? { distanceMeters: 999_999, etaMinutes: 999 }
            : { distanceMeters: 999_999, etaMinutes: 999 };
        } else if (!isBusy) {
          // Bo'sh kuryer: to'g'ridan-to'g'ri restoranga
          const pts = await batchEtaToRestaurant([{ lat: loc.latitude, lng: loc.longitude }]);
          eta = pts[0];
        } else {
          // Band kuryer: kuryer → yetkazish manzili → restoran
          const destLat = activeAssignment.order?.destinationLat;
          const destLng = activeAssignment.order?.destinationLng;

          if (destLat != null && destLng != null) {
            currentDeliveryAddress =
              activeAssignment.order?.deliveryAddress?.address ?? null;
            eta = await twoSegmentEta(
              { lat: loc.latitude, lng: loc.longitude },
              { lat: Number(destLat), lng: Number(destLng) },
              RESTAURANT,
            );
          } else {
            // Manzil koordinatalari yo'q — fallback
            const pts = await batchEtaToRestaurant([{ lat: loc.latitude, lng: loc.longitude }]);
            eta = { distanceMeters: pts[0].distanceMeters + 3000, etaMinutes: pts[0].etaMinutes + 10 };
          }
        }

        return {
          courierId: courier.id,
          courierName: courier.fullName || 'Kuryer',
          courierPhone: courier.phoneNumber || '',
          etaToRestaurantMinutes: eta.etaMinutes,
          distanceToRestaurantMeters: eta.distanceMeters,
          availability: (isBusy ? 'FINISHING_DELIVERY' : 'FREE') as CourierAvailability,
          currentDeliveryAddress,
          hasLiveLocation: Boolean(loc),
          liveLocationUpdatedAt: loc?.updatedAt ?? null,
        };
      }),
    );

    // Saralash: FREE birinchi, keyin ETA bo'yicha o'sish tartibida
    ranked.sort((a, b) => {
      if (a.availability !== b.availability) {
        return a.availability === 'FREE' ? -1 : 1;
      }
      return a.etaToRestaurantMinutes - b.etaToRestaurantMinutes;
    });

    return ranked.map((c, i) => ({ ...c, rank: i + 1 }));
  }

  /**
   * Faqat bo'sh kuryerlarni ETA bo'yicha saralaydi.
   * Assignment uchun (band kuryerlarga yangi buyurtma bermaslik).
   */
  static async rankFreeByETA(db: DbClient = prisma): Promise<SmartRankedCourier[]> {
    const all = await this.rankAllOnlineByETA(db);
    return all.filter((c) => c.availability === 'FREE');
  }
}
