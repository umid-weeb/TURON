import { useEffect, useRef, useState } from 'react';
import type { MapPin } from './MapProvider';

/**
 * Smoothly interpolates between successive courier GPS positions.
 *
 * When a new `target` arrives the hook starts a requestAnimationFrame loop
 * that lerps from the *current rendered* position to the new target over
 * `durationMs` milliseconds (ease-out cubic). If a newer target arrives
 * before the animation finishes we cancel in-flight and restart from wherever
 * the marker currently is — so there is never a visual jump.
 */
export function useSmoothedPin(
  target: MapPin | undefined,
  durationMs = 3000,
): MapPin | undefined {
  const [rendered, setRendered] = useState<MapPin | undefined>(target);

  // Tracks the last rendered position so we can start mid-animation lerps
  const renderedRef = useRef<MapPin | undefined>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!target) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      renderedRef.current = undefined;
      setRendered(undefined);
      return;
    }

    // First position — snap instantly, no animation needed
    if (!renderedRef.current) {
      renderedRef.current = target;
      setRendered(target);
      return;
    }

    // Same coords (value-based) — nothing to do
    if (
      renderedRef.current.lat === target.lat &&
      renderedRef.current.lng === target.lng
    ) {
      return;
    }

    // Cancel any in-flight animation and start fresh from current position
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const from = { lat: renderedRef.current.lat, lng: renderedRef.current.lng };
    const to = { lat: target.lat, lng: target.lng };
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(elapsed / durationMs, 1);

      // Ease-out cubic: fast start, slows to a stop
      const eased = 1 - Math.pow(1 - t, 3);

      const pin: MapPin = {
        lat: from.lat + (to.lat - from.lat) * eased,
        lng: from.lng + (to.lng - from.lng) * eased,
      };

      renderedRef.current = pin;
      setRendered({ ...pin }); // new reference so React sees the change

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target?.lat, target?.lng, durationMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return rendered;
}
