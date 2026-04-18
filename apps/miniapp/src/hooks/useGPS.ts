import { useEffect } from 'react';
import { useCourierStore } from '../store/courierStore';

/**
 * Production-ready GPS hook. Continually tracks position, speed, and heading.
 * Feeds directly into the Zustand Courier Store to trigger the Smart Hybrid Mode.
 */
export function useGPS() {
  const setGpsData = useCourierStore((s) => s.setGpsData);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported by this device.');
      return;
    }

    // Production Note: watchPosition provides updates natively without us polling.
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading } = position.coords;
        // Speed is in m/s, heading is true north bearing if speed > 0
        setGpsData(latitude, longitude, speed, heading);
      },
      (error) => {
        console.error('GPS Watch Error:', error.message);
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
}