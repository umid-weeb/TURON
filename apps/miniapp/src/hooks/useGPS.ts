import { useEffect, useRef, useState } from 'react';
import { useCourierStore } from '../store/courierStore';
import {
  getUserGeolocationErrorMessage,
  stopWatchingBrowserGeolocation,
  watchBrowserGeolocation,
} from '../features/maps/geolocation';
import { getHeadingFromPositions } from '../lib/headingUtils';

/**
 * GPS ni kuzatadi va natijalarni courierStore ga yozadi.
 *
 * coords:      [longitude, latitude] — GeoJSON / ymaps3 format
 * gpsHeading:  GPS heading (harakatda ishlaydi); kompas yo'q bo'lganda
 *              smoothedHeading fallback sifatida ham yangilanadi
 *
 * Agar GPS heading null/NaN bo'lsa — ketma-ket ikkita nuqtadan
 * heading derivatsiya qilinadi.
 */
export function useGPS() {
  const setCoords = useCourierStore((s) => s.setCoords);
  const setGpsHeading = useCourierStore((s) => s.setGpsHeading);
  const [error, setError] = useState<string | null>(null);

  // Ketma-ket pozitsiyalar orqali heading derivatsiyasi uchun
  const prevPosRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Bu qurilmada GPS qo'llab-quvvatlanmaydi");
      return;
    }

    const watchId = watchBrowserGeolocation(
      (location) => {
        setError(null);
        const { lat, lng } = location.pin;

        // [longitude, latitude] — ymaps3 va GeoJSON formati
        setCoords([lng, lat], location.accuracy ?? 0);

        if (typeof location.heading === 'number' && Number.isFinite(location.heading)) {
          // GPS to'g'ridan-to'g'ri heading berdi (odatda harakatda)
          setGpsHeading(location.heading);
        } else if (prevPosRef.current) {
          // Ikkita nuqtadan heading hisoblash (GPS heading bo'lmaganda zaxira)
          const derived = getHeadingFromPositions(prevPosRef.current, { lat, lng });
          if (derived !== undefined) {
            setGpsHeading(derived);
          }
        }

        prevPosRef.current = { lat, lng };
      },
      (watchError) => setError(getUserGeolocationErrorMessage(watchError)),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 },
    );

    return () => stopWatchingBrowserGeolocation(watchId);
    // setCoords / setGpsHeading — Zustand actions, har doim stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { error };
}
