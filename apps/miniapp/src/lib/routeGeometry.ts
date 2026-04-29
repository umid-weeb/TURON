/**
 * Lightweight geometry helpers for the courier navigation view.
 *
 * Coordinates are in [longitude, latitude] order to match Yandex Maps v3
 * (`ymaps3`). All distances are returned in meters.
 */

export type LngLat = [number, number];

const EARTH_RADIUS_M = 6_371_000;
const DEG2RAD = Math.PI / 180;

/** Great-circle distance between two GPS points (meters). */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const sLat1 = Math.sin(dLat / 2);
  const sLng1 = Math.sin(dLng / 2);
  const h =
    sLat1 * sLat1 +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * sLng1 * sLng1;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Locally-flat projection good enough for sub-kilometer geometry. Lets us
 * project a GPS point onto a polyline segment with simple linear algebra
 * instead of solving the full geodesic projection.
 */
function flat(point: LngLat, anchorLat: number): { x: number; y: number } {
  const cosLat = Math.cos(anchorLat * DEG2RAD);
  return {
    x: point[0] * cosLat * EARTH_RADIUS_M * DEG2RAD,
    y: point[1] * EARTH_RADIUS_M * DEG2RAD,
  };
}

/**
 * Project `point` onto the polyline. Returns the closest point on the line,
 * the distance to it (meters), the segment index it falls on, and the
 * arc-length progress (0..1) inside that segment.
 *
 * Used to "snap" the courier marker onto the road geometry so the route
 * doesn't appear to start from inside a building when GPS drifts.
 */
export function projectOntoPolyline(
  point: LngLat,
  polyline: LngLat[],
): {
  point: LngLat;
  distanceMeters: number;
  segmentIndex: number;
  progress: number;
} | null {
  if (polyline.length < 2) return null;

  const anchorLat = point[1];
  const p = flat(point, anchorLat);

  let bestDist = Infinity;
  let bestSeg = 0;
  let bestT = 0;
  let bestProj: LngLat = polyline[0];

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = flat(polyline[i], anchorLat);
    const b = flat(polyline[i + 1], anchorLat);
    const ax = p.x - a.x;
    const ay = p.y - a.y;
    const bx = b.x - a.x;
    const by = b.y - a.y;
    const segLenSq = bx * bx + by * by;
    if (segLenSq === 0) continue;

    let t = (ax * bx + ay * by) / segLenSq;
    t = Math.max(0, Math.min(1, t));

    const projLng = polyline[i][0] + (polyline[i + 1][0] - polyline[i][0]) * t;
    const projLat = polyline[i][1] + (polyline[i + 1][1] - polyline[i][1]) * t;
    const projLngLat: LngLat = [projLng, projLat];
    const dist = haversineMeters(point, projLngLat);
    if (dist < bestDist) {
      bestDist = dist;
      bestSeg = i;
      bestT = t;
      bestProj = projLngLat;
    }
  }

  return {
    point: bestProj,
    distanceMeters: bestDist,
    segmentIndex: bestSeg,
    progress: bestT,
  };
}

/**
 * Compute bearing (degrees, 0..360, north=0, east=90) from `from` to `to`.
 * Useful when GPS doesn't supply a heading at low speed.
 */
export function bearingDegrees(from: LngLat, to: LngLat): number {
  const lat1 = from[1] * DEG2RAD;
  const lat2 = to[1] * DEG2RAD;
  const dLng = (to[0] - from[0]) * DEG2RAD;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}
