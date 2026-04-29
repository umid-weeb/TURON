/**
 * Helpers for translating Yandex Maps API 2.1 multiRouter segment data into
 * the simplified RouteStep model the courier UI consumes.
 *
 * Yandex segments expose:
 *   - properties.get('text')     → human instruction (often Russian/Uzbek)
 *   - properties.get('action')   → maneuver code (string, see ACTION_MAP)
 *   - properties.get('street')   → street name when relevant
 *   - properties.distance.value  → segment length (m)
 *   - geometry.getCoordinates()  → polyline of the segment ([lat, lng][])
 *
 * The list of action codes is a moving target (Yandex extends it
 * occasionally), so we normalise to the three buckets the courier panel
 * renders: 'left' | 'right' | 'straight'.
 */

import type { RouteStep } from '../../store/courierStore';

const RIGHT_ACTIONS = new Set([
  'right',
  'right-front',
  'right-back',
  'right-fork',
  'slight-right',
  'sharp-right',
  'turn-right',
  'fork-right',
  'keep-right',
]);

const LEFT_ACTIONS = new Set([
  'left',
  'left-front',
  'left-back',
  'left-fork',
  'slight-left',
  'sharp-left',
  'turn-left',
  'fork-left',
  'keep-left',
  'uturn',
  'u-turn',
]);

function normalizeAction(raw: string | null | undefined): RouteStep['action'] {
  if (!raw) return 'straight';
  const code = String(raw).toLowerCase();
  if (LEFT_ACTIONS.has(code)) return 'left';
  if (RIGHT_ACTIONS.has(code)) return 'right';
  return 'straight';
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** ymaps property bag has multiple shapes — read both. */
function readProp(properties: any, key: string): any {
  if (!properties) return null;
  if (typeof properties.get === 'function') {
    try {
      return properties.get(key);
    } catch {
      /* fall through */
    }
  }
  return properties[key] ?? null;
}

function firstCoordinate(segment: any): [number, number] | null {
  const get = segment?.geometry?.getCoordinates;
  if (typeof get === 'function') {
    const coords = get.call(segment.geometry);
    if (Array.isArray(coords) && coords.length > 0) {
      // ymaps 2 returns [lat, lng] — flip to [lng, lat] for consistency with
      // ymaps3 / GeoJSON which the rest of the courier code uses.
      const first = coords[0];
      if (Array.isArray(first) && first.length >= 2) {
        return [Number(first[1]), Number(first[0])];
      }
    }
  }
  if (typeof segment?.getCoordinates === 'function') {
    const coords = segment.getCoordinates();
    if (Array.isArray(coords) && coords.length > 0) {
      const first = coords[0];
      if (Array.isArray(first) && first.length >= 2) {
        return [Number(first[1]), Number(first[0])];
      }
    }
  }
  return null;
}

function collectionToArray(collection: any): any[] {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.each === 'function') {
    const out: any[] = [];
    collection.each((item: any) => out.push(item));
    return out;
  }
  if (typeof collection.getLength === 'function' && typeof collection.get === 'function') {
    return Array.from({ length: collection.getLength() }, (_, i) => collection.get(i));
  }
  return [];
}

/**
 * Walk every segment of every path of the active route and build a clean
 * step list. Yandex returns many tiny "stay-in-lane" segments — collapse
 * consecutive `straight` actions whose distance < 25m so the panel only
 * surfaces meaningful maneuvers.
 */
export function extractRouteSteps(activeRoute: any): RouteStep[] {
  const paths = collectionToArray(activeRoute?.getPaths?.());
  const raw: RouteStep[] = [];

  for (const path of paths) {
    const segments = collectionToArray(path?.getSegments?.());
    for (const segment of segments) {
      const props = segment?.properties;
      const action = normalizeAction(readProp(props, 'action'));
      const text = String(readProp(props, 'text') || '').trim();
      const street = String(readProp(props, 'street') || '').trim() || undefined;
      const distanceObj = readProp(props, 'distance');
      const distanceMeters =
        typeof distanceObj === 'number'
          ? distanceObj
          : Number(distanceObj?.value ?? distanceObj?.text ?? 0) || 0;
      const startCoords = firstCoordinate(segment);
      if (!startCoords) continue;

      raw.push({
        action,
        instruction:
          text ||
          (action === 'left'
            ? 'Chapga buriling'
            : action === 'right'
              ? "O'ngga buriling"
              : "To'g'ri yuring"),
        distanceMeters,
        distanceText: formatDistance(distanceMeters),
        street,
        startCoords,
      });
    }
  }

  // Collapse short straight micro-segments into the previous step so the
  // user only sees actionable instructions.
  const collapsed: RouteStep[] = [];
  for (const step of raw) {
    const last = collapsed[collapsed.length - 1];
    if (last && step.action === 'straight' && step.distanceMeters < 25) {
      last.distanceMeters += step.distanceMeters;
      last.distanceText = formatDistance(last.distanceMeters);
      continue;
    }
    collapsed.push({ ...step });
  }

  return collapsed;
}
