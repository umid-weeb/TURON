/**
 * Low-pass filter — kompas "titrab-sakrashini" yumshatish.
 * alpha: 0.1 = juda sekin, 0.2 = tavsiya, 0.4 = tez
 * 359° → 1° o'tishda qisqaroq yo'lni tanlaydi.
 */
export function lowPassFilter(newVal: number, oldVal: number, alpha = 0.2): number {
  let diff = newVal - oldVal;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  let result = oldVal + diff * alpha;
  if (result < 0) result += 360;
  if (result >= 360) result -= 360;
  return result;
}

/**
 * Backward-compatible circular low-pass helper.
 * Some courier hooks call it as (current, target), while lowPassFilter uses
 * (newVal, oldVal), so this wrapper keeps both call sites correct.
 */
export function lowPassFilterCircular(current: number, target: number, alpha = 0.2): number {
  return lowPassFilter(target, current, alpha);
}

/**
 * Current screen rotation in degrees. Safari older builds expose
 * window.orientation, modern browsers expose screen.orientation.angle.
 */
export function getScreenOrientation(): number {
  const legacyOrientation = typeof window.orientation === 'number' ? window.orientation : 0;
  const angle = window.screen?.orientation?.angle ?? legacyOrientation;
  return Number.isFinite(angle) ? angle : 0;
}

/**
 * Android: deviceorientationabsolute.alpha → heading (magnetic north = 0)
 */
export function alphaToHeading(alpha: number, screenOrientation = 0): number {
  return (360 - alpha + screenOrientation + 360) % 360;
}

/**
 * iOS: webkitCompassHeading to'g'ridan-to'g'ri heading sifatida keladi
 */
export function webkitToHeading(webkitCompassHeading: number, screenOrientation = 0): number {
  return (webkitCompassHeading + screenOrientation + 360) % 360;
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
