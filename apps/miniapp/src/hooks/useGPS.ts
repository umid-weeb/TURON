import { useEffect, useState } from 'react';
import { useCourierStore } from '../store/courierStore';

/**
 * Production-ready GPS hook. Continually tracks position, speed, and heading.
 * Feeds directly into the Zustand Courier Store to trigger the Smart Hybrid Mode.
 */
export function useGPS() {
  const setGpsData = useCourierStore((s) => s.setGpsData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported by this device.');
      return;
    }

    // Production Note: watchPosition provides updates natively without us polling.
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setError(null);
        const { latitude, longitude, speed, heading } = position.coords;
        // Speed is in m/s, heading is true north bearing if speed > 0
        setGpsData(latitude, longitude, speed, heading);
      },
      (watchError) => {
        setError(watchError.message);
        console.error('GPS Watch Error:', watchError.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000, // Reject stale locks
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [setGpsData]);

  return { error };
}
