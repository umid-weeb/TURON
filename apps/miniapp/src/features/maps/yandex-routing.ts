import type { MapPin, RouteInfo, RouteStep } from './MapProvider';
import { mapYandexActionToDirection } from './navigation';
import { createRouteInfoFromMeters } from './route';
import { loadYandexMaps } from './yandex';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeNumericValue(value: unknown) {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(normalized) ? normalized : undefined;
  }

  return undefined;
}

function readPropertyValue(entity: any, key: string) {
  try {
    return entity?.properties?.get?.(key);
  } catch {
    return undefined;
  }
}

function haversineMeters(coords: number[][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lng1] = coords[i - 1];
    const [lat2, lng2] = coords[i];
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total;
}

function readDistanceMeters(entity: any) {
  // PRIORITY 0: getAll() — ymaps2.1 multiRouter asosiy yo'li.
  // route.properties.getAll() → { distance: { value: <meters>, text: "5.2 km" }, ... }
  try {
    const all = entity?.properties?.getAll?.();
    if (all) {
      console.log('[readDistanceMeters] properties.getAll():', JSON.stringify(all));
      const fromAll = normalizeNumericValue(all?.distance?.value ?? all?.distance);
      if (fromAll !== undefined && fromAll > 0) {
        return Math.max(0, Math.round(fromAll));
      }
    }
  } catch { /* ignore */ }

  // Try 'distance' property (regular ymaps.route)
  const distProp = readPropertyValue(entity, 'distance');
  const fromDistance = normalizeNumericValue(distProp?.value ?? distProp);

  // Try 'length' property (some multiRouter segment variants)
  const lenProp = readPropertyValue(entity, 'length');
  const fromLength = normalizeNumericValue(lenProp?.value ?? lenProp);

  // Try metaData.distance (another multiRouter variant)
  const meta = readPropertyValue(entity, 'metaData');
  const fromMeta = normalizeNumericValue(meta?.distance?.value ?? meta?.distance);

  // Try getLength() method
  const fromMethod =
    typeof entity?.getLength === 'function' ? normalizeNumericValue(entity.getLength()) : undefined;

  const fromProps = fromDistance ?? fromLength ?? fromMeta ?? fromMethod;
  if (fromProps !== undefined && fromProps > 0) {
    return Math.max(0, Math.round(fromProps));
  }

  // Last resort: compute from polyline geometry (straight-line approximation — inaccurate)
  console.warn('[readDistanceMeters] falling back to haversine — properties did not contain distance');
  try {
    const rawCoords = entity?.geometry?.getCoordinates?.();
    if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
      const coords = rawCoords as number[][];
      if (Array.isArray(coords[0])) {
        return Math.max(0, Math.round(haversineMeters(coords)));
      }
    }
  } catch { /* ignore */ }

  return 0;
}

function readEtaSeconds(entity: any) {
  const property = readPropertyValue(entity, 'duration');
  const fromProperty = normalizeNumericValue(property?.value ?? property);
  const fromMethod =
    typeof entity?.getTime === 'function' ? normalizeNumericValue(entity.getTime()) : undefined;

  return Math.max(0, Math.round(fromProperty ?? fromMethod ?? 0));
}

function pushCoordinate(points: MapPin[], seen: Set<string>, value: unknown) {
  if (!Array.isArray(value) || value.length < 2) {
    return;
  }

  const lat = Number(value[0]);
  const lng = Number(value[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  const key = `${lat.toFixed(6)}:${lng.toFixed(6)}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  points.push({ lat, lng });
}

function pushCoordinatesDeep(points: MapPin[], seen: Set<string>, value: unknown) {
  if (!Array.isArray(value)) {
    return;
  }

  if (value.length >= 2 && !Array.isArray(value[0]) && !Array.isArray(value[1])) {
    pushCoordinate(points, seen, value);
    return;
  }

  value.forEach((item) => pushCoordinatesDeep(points, seen, item));
}

function collectionToArray(collection: any) {
  if (!collection) {
    return [] as any[];
  }

  if (Array.isArray(collection)) {
    return collection;
  }

  if (typeof collection.each === 'function') {
    const values: any[] = [];
    collection.each((item: any) => values.push(item));
    return values;
  }

  if (typeof collection.getLength === 'function' && typeof collection.get === 'function') {
    return Array.from({ length: collection.getLength() }, (_, index) => collection.get(index));
  }

  if (typeof collection.length === 'number') {
    return Array.from(collection);
  }

  return [] as any[];
}

function extractRoutePolyline(route: any) {
  const points: MapPin[] = [];
  const seen = new Set<string>();
  const paths = collectionToArray(route?.getPaths?.());

  paths.forEach((path) => {
    pushCoordinatesDeep(points, seen, path?.geometry?.getCoordinates?.());

    const segments = collectionToArray(path?.getSegments?.());
    segments.forEach((segment) => {
      pushCoordinatesDeep(points, seen, segment?.geometry?.getCoordinates?.());
      pushCoordinatesDeep(points, seen, segment?.getCoordinates?.());
    });
  });

  pushCoordinatesDeep(points, seen, route?.geometry?.getCoordinates?.());

  return points;
}

function extractSegmentInstruction(segment: any, index: number) {
  const actionText =
    readPropertyValue(segment, 'action')?.text ||
    (typeof segment?.getHumanAction === 'function' ? segment.getHumanAction() : undefined);
  const street =
    (typeof segment?.getStreet === 'function' ? segment.getStreet() : undefined) ||
    readPropertyValue(segment, 'street');

  if (typeof actionText === 'string' && actionText.trim()) {
    return street ? `${actionText} ${street}` : actionText;
  }

  if (typeof street === 'string' && street.trim()) {
    return street;
  }

  return `Bosqich ${index + 1}`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function extractRouteSteps(route: any): RouteStep[] {
  const paths = collectionToArray(route?.getPaths?.());
  const steps: RouteStep[] = [];

  paths.forEach((path) => {
    const segments = collectionToArray(path?.getSegments?.());

    // Gather per-segment geometry coords for haversine fallback
    const segmentCoords: number[][][] = segments.map((seg: any) => {
      try {
        const c = seg?.geometry?.getCoordinates?.();
        return Array.isArray(c) && c.length >= 2 ? (c as number[][]) : [];
      } catch { return []; }
    });

    // Check if all segment distances are zero — if so we'll compute from geometry
    const rawDistances = segments.map((seg: any) => readDistanceMeters(seg));
    const allZero = rawDistances.every((d: number) => d === 0);

    // Fallback: compute per-segment distance from path geometry proportionally
    let geoDistances: number[] = rawDistances;
    if (allZero && segmentCoords.some((c) => c.length >= 2)) {
      geoDistances = segmentCoords.map((coords) =>
        coords.length >= 2 ? Math.round(haversineMeters(coords)) : 0,
      );
    }

    segments.forEach((segment: any, index: number) => {
      const actionValue = readPropertyValue(segment, 'action');
      const actionText =
        typeof actionValue === 'string' ? actionValue : actionValue?.text;
      const street =
        (typeof segment?.getStreet === 'function' ? segment.getStreet() : undefined) ||
        readPropertyValue(segment, 'street');
      const distanceMeters = geoDistances[index] ?? 0;

      steps.push({
        instruction: extractSegmentInstruction(segment, index),
        distanceMeters,
        distanceText: formatDistance(distanceMeters),
        action: mapYandexActionToDirection(actionText),
        street: typeof street === 'string' && street.trim() ? street.trim() : undefined,
      });
    });
  });

  return steps;
}

function requestYandexRoute(ymaps: { route?: (points: unknown[], params?: Record<string, unknown>) => Promise<any> }, from: MapPin, to: MapPin) {
  if (typeof ymaps.route !== 'function') {
    throw new Error('Yandex JS routing moduli yuklanmadi');
  }

  return new Promise<any>((resolve, reject) => {
    ymaps
      .route!(
        [
          [from.lat, from.lng],
          [to.lat, to.lng],
        ],
        {
          avoidTrafficJams: true,
          mapStateAutoApply: false,
        },
      )
      .then(resolve, reject);
  });
}

/**
 * Project a raw GPS pin onto the nearest drivable road by asking Yandex
 * Routing for an `auto` (driving) micro-route. Yandex automatically snaps
 * routing endpoints to the nearest road graph vertex, so the first
 * polyline coord of the response is the closest road point.
 *
 * Returns null when:
 *   - Yandex isn't loaded yet
 *   - The snapped point would move the courier > `maxDriftMeters` away
 *     (defensive: avoids snapping a courier on a footpath onto a freeway
 *     exit far from them).
 */
export async function snapPointToNearestRoad(
  point: MapPin,
  maxDriftMeters = 120,
): Promise<MapPin | null> {
  try {
    const ymaps = await loadYandexMaps();
    if (typeof ymaps.route !== 'function') return null;

    // Cast a tiny driving probe to the same point — Yandex still snaps the
    // start to the nearest car-accessible road and returns a 1-vertex
    // polyline whose first coord is the snapped origin.
    const result = await new Promise<any>((resolve, reject) => {
      ymaps.route!(
        [
          [point.lat, point.lng],
          [point.lat + 0.0003, point.lng + 0.0003],
        ],
        {
          routingMode: 'auto',
          mapStateAutoApply: false,
          // single result is enough — we only need the first coord
          results: 1,
        } as any,
      ).then(resolve, reject);
    });

    const polyline = extractRoutePolyline(result);
    if (polyline.length === 0) return null;

    const [snapped] = polyline;
    const drift = Math.abs(snapped.lat - point.lat) + Math.abs(snapped.lng - point.lng);
    // Quick deg→m sanity check (~111km per degree at the equator).
    if (drift * 111_000 > maxDriftMeters) return null;
    return snapped;
  } catch (err) {
    console.warn('[snapPointToNearestRoad] failed:', err);
    return null;
  }
}

export async function resolveRouteWithYandexJsApi(from: MapPin, to: MapPin): Promise<RouteInfo> {
  const ymaps = await loadYandexMaps();
  const route = await requestYandexRoute(ymaps, from, to);
  const polyline = extractRoutePolyline(route);
  const steps = extractRouteSteps(route);
  const distanceMeters = readDistanceMeters(route);
  const etaSeconds = readEtaSeconds(route);

  if (polyline.length < 2) {
    throw new Error("Yandex JS routing polylinesi bo'sh qaytdi");
  }

  return createRouteInfoFromMeters(distanceMeters, etaSeconds, {
    polyline,
    source: 'yandex-jsapi',
    steps,
  });
}

/**
 * LiveMultiRouteTracker  -  uses ymaps.multiRouter.MultiRoute with pedestrian
 * routing mode (best for scooters  -  finds small-street shortcuts).
 *
 * GPS updates call updateOrigin() which invokes setReferencePoints() on the
 * existing multiRoute model instead of re-initialising from scratch, so the
 * route recalculates incrementally with no map flicker.
 */
export class LiveMultiRouteTracker {
  private multiRoute: any = null;
  private destination: MapPin | null = null;
  /** Last raw origin received (pre-snap) — used to decide when to re-snap. */
  private rawOrigin: MapPin | null = null;
  /** Last road-snapped origin — replays into setReferencePoints between snaps. */
  private snappedOrigin: MapPin | null = null;
  private readonly onRouteUpdate: (info: RouteInfo, polyline: MapPin[]) => void;
  /** Incremented on every init()/destroy() so stale async callbacks are ignored. */
  private generation = 0;

  constructor(onRouteUpdate: (info: RouteInfo, polyline: MapPin[]) => void) {
    this.onRouteUpdate = onRouteUpdate;
  }

  async init(from: MapPin, to: MapPin): Promise<void> {
    const gen = ++this.generation;
    this.cleanupMultiRoute();
    this.destination = to;
    this.rawOrigin = from;

    // Snap the very first origin to the nearest drivable road so the
    // polyline doesn't start from inside a building (Pdp University style).
    // If snapping fails or moves the point too far we fall back to the raw
    // GPS coords — multiRouter will still accept them.
    const snapped = await snapPointToNearestRoad(from);
    if (gen !== this.generation) return;
    this.snappedOrigin = snapped ?? from;
    const origin = this.snappedOrigin;

    try {
      const ymaps = await loadYandexMaps();
      if (gen !== this.generation) return; // superseded by a newer init() or destroy()

      if (!ymaps.multiRouter?.MultiRoute) {
        throw new Error('ymaps.multiRouter yuklanmadi  -  package.full kerak');
      }

      const mr = new ymaps.multiRouter.MultiRoute(
        {
          referencePoints: [
            [origin.lat, origin.lng],
            [to.lat, to.lng],
          ],
          params: {
            // 'pedestrian' uses inner streets and shortcuts — ideal for scooters
            routingMode: 'pedestrian',
            avoidTrafficJams: true,
          },
        },
        { boundsAutoApply: false },
      );

      // Store the handler reference so we can remove it precisely on cleanup.
      const handler = () => {
        if (gen !== this.generation) return;
        this.handleSuccess();
      };
      mr.model.events.add('requestsuccess', handler);
      (mr as any).__successHandler = handler;

      this.multiRoute = mr;
    } catch (err) {
      if (gen !== this.generation) return;
      console.warn('[LiveMultiRouteTracker] init failed:', err);
      throw err;
    }
  }

  /**
   * Call on every GPS tick — multiRouter recalculates only what changed.
   * Re-snaps to the nearest road every time the courier has drifted > 30m
   * from the last snap, so a courier that started inside a building keeps
   * a clean road-aligned route as they approach the actual street.
   */
  async updateOrigin(from: MapPin): Promise<void> {
    if (!this.multiRoute || !this.destination) return;
    const gen = this.generation;

    // Decide whether to re-snap. Cheap deg→m using equirectangular approx.
    const last = this.rawOrigin;
    const movedMeters = last
      ? Math.hypot(
          (from.lat - last.lat) * 111_000,
          (from.lng - last.lng) * 111_000 * Math.cos((from.lat * Math.PI) / 180),
        )
      : Infinity;
    this.rawOrigin = from;

    let origin: MapPin = this.snappedOrigin ?? from;
    if (movedMeters > 30) {
      const snapped = await snapPointToNearestRoad(from);
      if (gen !== this.generation) return;
      if (snapped) {
        this.snappedOrigin = snapped;
        origin = snapped;
      } else {
        origin = from;
      }
    }

    try {
      this.multiRoute.model.setReferencePoints([
        [origin.lat, origin.lng],
        [this.destination.lat, this.destination.lng],
      ]);
    } catch { /* ignore transient errors */ }
  }

  private handleSuccess(): void {
    try {
      const route = this.multiRoute?.getActiveRoute();
      if (!route) return;

      // Debug: log raw route properties to confirm key names
      try {
        console.log('[LiveMultiRouteTracker] route.properties.getAll():', route.properties?.getAll?.());
      } catch { /* ignore */ }

      const polyline = extractRoutePolyline(route);
      if (polyline.length < 2) return;

      const distanceMeters = readDistanceMeters(route);
      const etaSeconds = readEtaSeconds(route);
      console.log(`[LiveMultiRouteTracker] dist=${distanceMeters}m eta=${etaSeconds}s`);

      const info = createRouteInfoFromMeters(
        distanceMeters,
        etaSeconds,
        { polyline, source: 'yandex-multirouter', steps: extractRouteSteps(route) },
      );

      this.onRouteUpdate(info, polyline);
    } catch { /* skip */ }
  }

  private cleanupMultiRoute(): void {
    if (!this.multiRoute) return;
    try {
      const handler = (this.multiRoute as any).__successHandler;
      if (handler) this.multiRoute.model.events.remove('requestsuccess', handler);
    } catch { /* skip */ }
    this.multiRoute = null;
  }

  destroy(): void {
    this.generation++; // invalidate all pending async ops
    this.cleanupMultiRoute();
    this.destination = null;
  }
}
