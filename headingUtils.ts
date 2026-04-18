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

export function alphaToHeading(alpha: number, orientation: number): number {
  // Android alpha is 0-360 counter-clockwise. Heading must be clockwise.
  const heading = 360 - alpha;
  return applyOrientationOffset(heading, orientation);
}

export function webkitToHeading(heading: number, orientation: number): number {
  // iOS webkitCompassHeading is already clockwise true/magnetic north.
  return applyOrientationOffset(heading, orientation);
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