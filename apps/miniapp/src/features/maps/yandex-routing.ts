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

function readDistanceMeters(entity: any) {
  const property = readPropertyValue(entity, 'distance');
  const fromProperty = normalizeNumericValue(property?.value ?? property);
  const fromMethod =
    typeof entity?.getLength === 'function' ? normalizeNumericValue(entity.getLength()) : undefined;

  return Math.max(0, Math.round(fromProperty ?? fromMethod ?? 0));
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

function extractRouteSteps(route: any): RouteStep[] {
  const paths = collectionToArray(route?.getPaths?.());
  const steps: RouteStep[] = [];

  paths.forEach((path) => {
    const segments = collectionToArray(path?.getSegments?.());

    segments.forEach((segment, index) => {
      const actionValue = readPropertyValue(segment, 'action');
      const actionText =
        typeof actionValue === 'string' ? actionValue : actionValue?.text;
      const street =
        (typeof segment?.getStreet === 'function' ? segment.getStreet() : undefined) ||
        readPropertyValue(segment, 'street');
      const distanceMeters = readDistanceMeters(segment);

      steps.push({
        instruction: extractSegmentInstruction(segment, index),
        distanceMeters,
        distanceText:
          distanceMeters < 1000
            ? `${Math.round(distanceMeters)} m`
            : `${(distanceMeters / 1000).toFixed(1)} km`,
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

    try {
      const ymaps = await loadYandexMaps();
      if (gen !== this.generation) return; // superseded by a newer init() or destroy()

      if (!ymaps.multiRouter?.MultiRoute) {
        throw new Error('ymaps.multiRouter yuklanmadi  -  package.full kerak');
      }

      const mr = new ymaps.multiRouter.MultiRoute(
        {
          referencePoints: [
            [from.lat, from.lng],
            [to.lat, to.lng],
          ],
          params: {
            // pedestrian mode lets a scooter use small streets and shortcuts
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

  /** Call on every GPS tick  -  multiRouter recalculates only what changed. */
  updateOrigin(from: MapPin): void {
    if (!this.multiRoute || !this.destination) return;
    try {
      this.multiRoute.model.setReferencePoints([
        [from.lat, from.lng],
        [this.destination.lat, this.destination.lng],
      ]);
    } catch { /* ignore transient errors */ }
  }

  private handleSuccess(): void {
    try {
      const route = this.multiRoute?.getActiveRoute();
      if (!route) return;

      const polyline = extractRoutePolyline(route);
      if (polyline.length < 2) return;

      const info = createRouteInfoFromMeters(
        readDistanceMeters(route),
        readEtaSeconds(route),
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
