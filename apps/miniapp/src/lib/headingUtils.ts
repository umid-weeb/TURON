/**
 * Safely fetches the current screen orientation angle.
 * Handles both modern browsers and legacy iOS Safari APIs.
 */
export function getScreenOrientation(): number {
  if (typeof window === 'undefined') return 0;
  
  // Modern standard (Android / Desktop)
  const screenAngle = window.screen?.orientation?.angle;
  if (typeof screenAngle === 'number') return screenAngle;
  
  // Legacy iOS fallback
  const windowOrientation = window.orientation;
  if (typeof windowOrientation === 'number') return windowOrientation;
  
  return 0;
}

/**
 * Normalizes any degree to a clean 0-359.9 range.
 */
export function normalizeHeading(heading: number): number {
  let h = heading % 360;
  if (h < 0) h += 360;
  return h;
}

export function applyOrientationOffset(rawHeading: number, orientation: number): number {
  return normalizeHeading(rawHeading + orientation);
}

/**
 * Android: deviceorientationabsolute.alpha → heading (magnetic north = 0)
 */
export function alphaToHeading(alpha: number, orientation: number = 0): number {
  const heading = 360 - alpha;
  return applyOrientationOffset(heading, orientation);
}

/**
 * iOS: webkitCompassHeading to'g'ridan-to'g'ri heading sifatida keladi
 */
export function webkitToHeading(webkitCompassHeading: number, orientation: number = 0): number {
  return applyOrientationOffset(webkitCompassHeading, orientation);
}

/**
 * CRITICAL: Low-pass filter for circular data (degrees).
 * Prevents the marker from wildly spinning backwards when crossing the 360 -> 0 threshold.
 */
export function lowPassFilterCircular(current: number, target: number, factor: number = 0.15): number {
  let diff = target - current;
  // Normalize the difference to the shortest path: [-180, 180]
  diff = ((diff + 540) % 360) - 180;
  return normalizeHeading(current + diff * factor);
}

/**
 * Low-pass filter — kompas "titrab-sakrashini" yumshatish.
 * alpha: 0.1 = juda sekin, 0.2 = tavsiya, 0.4 = tez
 * 359° → 1° o'tishda qisqaroq yo'lni tanlaydi.
 */
export function lowPassFilter(newVal: number, oldVal: number, alpha = 0.2): number {
  return lowPassFilterCircular(oldVal, newVal, alpha);
}

/**
 * Ikkita GPS nuqtadan heading hisoblash (shimol = 0°, soat yo'nalishi)
 */
export function getHeadingFromPositions(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number | undefined {
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  if (Math.abs(dLat) < 1e-6 && Math.abs(dLng) < 1e-6) return undefined;
  return ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
}

/**
 * Masofa formatlash: 320 m / 5.2 km
 */
export function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

/**
 * Vaqt formatlash: 5 daq / 1s 12d
 */
export function formatTime(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} daq`;
  return `${Math.floor(min / 60)}s ${min % 60}d`;
}
