import { useEffect, useRef, useState } from 'react';

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function shortestAngleDelta(from: number, to: number) {
  const delta = normalizeDegrees(to - from + 180) - 180;
  return delta === -180 ? 180 : delta;
}

function readCompassHeading(event: DeviceOrientationEvent) {
  const iosEvent = event as DeviceOrientationEvent & {
    webkitCompassAccuracy?: number;
    webkitCompassHeading?: number;
  };

  if (
    typeof iosEvent.webkitCompassHeading === 'number' &&
    Number.isFinite(iosEvent.webkitCompassHeading) &&
    (typeof iosEvent.webkitCompassAccuracy !== 'number' || iosEvent.webkitCompassAccuracy >= 0)
  ) {
    return normalizeDegrees(iosEvent.webkitCompassHeading);
  }

  if (event.absolute && typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
    return normalizeDegrees(360 - event.alpha);
  }

  return undefined;
}

type DeviceOrientationPermissionApi = {
  requestPermission?: () => Promise<'denied' | 'granted'>;
};

export function useDeviceHeading(enabled = true) {
  const [heading, setHeading] = useState<number | undefined>(undefined);
  const lastHeadingRef = useRef<number | undefined>(undefined);
  const rafRef = useRef<number | null>(null);
  const pendingHeadingRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
      return undefined;
    }

    const flushPendingHeading = () => {
      rafRef.current = null;

      if (pendingHeadingRef.current === undefined) {
        return;
      }

      const nextHeading = pendingHeadingRef.current;
      pendingHeadingRef.current = undefined;

      const previousHeading = lastHeadingRef.current;
      const smoothedHeading =
        previousHeading === undefined
          ? nextHeading
          : normalizeDegrees(previousHeading + shortestAngleDelta(previousHeading, nextHeading) * 0.22);

      if (
        previousHeading !== undefined &&
        Math.abs(shortestAngleDelta(previousHeading, smoothedHeading)) < 0.8
      ) {
        return;
      }

      lastHeadingRef.current = smoothedHeading;
      setHeading(smoothedHeading);
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const compassHeading = readCompassHeading(event);
      if (compassHeading === undefined) {
        return;
      }

      pendingHeadingRef.current = compassHeading;

      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(flushPendingHeading);
      }
    };

    let listening = false;

    const startListening = () => {
      if (listening) {
        return;
      }

      listening = true;
      window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, {
        passive: true,
      });
      window.addEventListener('deviceorientation', handleOrientation as EventListener, {
        passive: true,
      });
    };

    const permissionApi = DeviceOrientationEvent as DeviceOrientationPermissionApi;

    if (typeof permissionApi.requestPermission === 'function') {
      const requestPermission = () => {
        void permissionApi
          .requestPermission!()
          .then((state) => {
            if (state === 'granted') {
              startListening();
            }
          })
          .catch(() => {});
      };

      window.addEventListener('pointerdown', requestPermission, {
        once: true,
        passive: true,
      });

      return () => {
        window.removeEventListener('pointerdown', requestPermission);
        window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener);
        window.removeEventListener('deviceorientation', handleOrientation as EventListener);
        if (rafRef.current !== null) {
          window.cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }

    startListening();

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener);
      window.removeEventListener('deviceorientation', handleOrientation as EventListener);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled]);

  return heading;
}
