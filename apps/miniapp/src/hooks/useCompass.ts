import { useCallback, useEffect, useRef } from 'react';
import { useCourierStore } from '../store/courierStore';
import { alphaToHeading, webkitToHeading } from '../lib/headingUtils';

interface DeviceOrientationExtended extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

type DeviceOrientationPermissionApi = {
  requestPermission?: () => Promise<'denied' | 'granted'>;
};

/**
 * Kompas sensorini kuzatadi va courierStore ga yozadi.
 *
 * setCompassHeading store ichida lowPassFilter qo'llab smoothedHeading ni
 * ham yangilab boradi — marker va kamera shu qiymatdan aylanadi.
 *
 * iOS 13+ da DeviceOrientationEvent.requestPermission() kerak:
 *   const { requestPermission, compassPermission } = useCompass();
 *   // Faqat user gesture ichida:
 *   <button onClick={() => requestPermission()}>Navigatsiyani boshlash</button>
 *
 * Android va boshqa qurilmalarda avtomatik boshlanadi.
 */
export function useCompass() {
  const compassPermission = useCourierStore((s) => s.compassPermission);
  const setCompassHeading = useCourierStore((s) => s.setCompassHeading);
  const setCompassPermission = useCourierStore((s) => s.setCompassPermission);

  // Cleanup uchun handler reference ni saqlaymiz
  const listenerRef = useRef<((e: Event) => void) | null>(null);

  const startListening = useCallback(() => {
    if (listenerRef.current) return; // allaqachon boshlangan

    const handler = (e: Event) => {
      const event = e as DeviceOrientationExtended;

      // iOS: webkitCompassHeading — to'g'ridan-to'g'ri magnetic north (0-360°).
      // webkitCompassAccuracy tekshirilmaydi — -1 (kalibrsiz) holatda ham heading
      // ishlaydi, accuracy filtri ko'pincha hech narsa o'tkazmaslikka olib keladi.
      // MUHIM: (360 - alpha) formulasi ANDROID ONLY — webkitCompassHeading ga
      // hech qanday transformatsiya qo'llanmaydi.
      if (
        typeof event.webkitCompassHeading === 'number' &&
        Number.isFinite(event.webkitCompassHeading)
      ) {
        setCompassHeading(event.webkitCompassHeading); // to'g'ridan-to'g'ri, transform yo'q
        return;
      }

      // Android: deviceorientationabsolute yoki absolute=true bo'lganda
      if (event.absolute && typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
        setCompassHeading(alphaToHeading(event.alpha));
      }
    };

    listenerRef.current = handler;

    // deviceorientationabsolute — Android da eng aniq (magnetic north relative)
    window.addEventListener('deviceorientationabsolute', handler, { passive: true });
    // deviceorientation — iOS va fallback
    window.addEventListener('deviceorientation', handler, { passive: true });
  }, [setCompassHeading]);

  /**
   * iOS 13+ uchun explicit ruxsat so'rash.
   * FAQAT user gesture (click/tap) ichida chaqirilsin — aks holda browser bloklaydi.
   * Android da darhol true qaytaradi va listenerni boshlaydi.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const permApi = DeviceOrientationEvent as unknown as DeviceOrientationPermissionApi;

    if (typeof permApi.requestPermission === 'function') {
      try {
        const result = await permApi.requestPermission();
        const granted = result === 'granted';
        setCompassPermission(granted ? 'granted' : 'denied');
        if (granted) startListening();
        return granted;
      } catch {
        setCompassPermission('denied');
        return false;
      }
    }

    // Android va boshqalar — ruxsat so'ramasdan boshlanadi
    startListening();
    setCompassPermission('granted');
    return true;
  }, [startListening, setCompassPermission]);

  useEffect(() => {
    // iOS 13+ da explicit tap kerak — avtomatik boshlamaymiz
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const needsExplicitPermission =
      isIOS &&
      typeof (DeviceOrientationEvent as unknown as DeviceOrientationPermissionApi).requestPermission ===
        'function';

    if (!needsExplicitPermission && compassPermission === 'unknown') {
      void requestPermission();
    }

    return () => {
      if (listenerRef.current) {
        window.removeEventListener('deviceorientationabsolute', listenerRef.current);
        window.removeEventListener('deviceorientation', listenerRef.current);
        listenerRef.current = null;
      }
    };
    // Intentionally run only on mount — compassPermission o'zgarganda
    // qayta ishga tushmaslik uchun deps bo'sh qoldirildi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { requestPermission, compassPermission };
}
