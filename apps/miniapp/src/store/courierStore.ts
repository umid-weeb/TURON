import { create } from 'zustand';
import { lowPassFilter } from '../lib/headingUtils';

interface CourierState {
  // ── GPS ────────────────────────────────────────────────────────────────────
  /** [longitude, latitude] — GeoJSON / ymaps3 format */
  coords: [number, number] | null;
  accuracy: number | null;
  /** Raw heading from GPS (faqat harakatda ishlaydi, zaxira) */
  gpsHeading: number | null;

  // ── Kompas ─────────────────────────────────────────────────────────────────
  /** Raw heading from DeviceOrientation sensor */
  compassHeading: number | null;
  /** Low-pass filtered heading — marker + kamera shu qiymatdan aylanadi */
  smoothedHeading: number;
  compassPermission: 'unknown' | 'granted' | 'denied';

  // ── Marshrut (ymaps 2.1 multiRouter dan) ──────────────────────────────────
  /** Qolgan masofa (metr) */
  distanceLeft: number | null;
  /** Qolgan vaqt (sekund) */
  timeLeft: number | null;
  /** Polyline nuqtalari [longitude, latitude][] */
  routePoints: [number, number][];

  // ── Actions ────────────────────────────────────────────────────────────────
  setCoords: (coords: [number, number], accuracy: number) => void;
  setGpsHeading: (heading: number) => void;
  setCompassHeading: (raw: number) => void;
  setCompassPermission: (status: 'granted' | 'denied') => void;
  setRouteInfo: (distance: number, time: number, points: [number, number][]) => void;
  resetCourierState: () => void;
}

export const useCourierStore = create<CourierState>((set, get) => ({
  coords: null,
  accuracy: null,
  gpsHeading: null,
  compassHeading: null,
  smoothedHeading: 0,
  compassPermission: 'unknown',
  distanceLeft: null,
  timeLeft: null,
  routePoints: [],

  setCoords: (coords, accuracy) => set({ coords, accuracy }),

  /**
   * GPS heading — compass yo'q bo'lganda smoothedHeading ni ham yangilaydi
   * (sekinroq filtr: 0.15 — GPS heading kompasdan ko'ra o'zgaruvchan)
   */
  setGpsHeading: (heading) => {
    const { compassHeading, smoothedHeading } = get();
    set({
      gpsHeading: heading,
      ...(compassHeading === null
        ? { smoothedHeading: lowPassFilter(heading, smoothedHeading, 0.15) }
        : {}),
    });
  },

  /**
   * Compass heading — asosiy manba.
   * Low-pass filter (0.2) bilan silliqlangan smoothedHeading ni yangilaydi.
   */
  setCompassHeading: (raw) => {
    const { smoothedHeading } = get();
    const next = lowPassFilter(raw, smoothedHeading, 0.2);
    set({ compassHeading: raw, smoothedHeading: next });
  },

  setCompassPermission: (status) => set({ compassPermission: status }),

  setRouteInfo: (distance, time, points) =>
    set({ distanceLeft: distance, timeLeft: time, routePoints: points }),

  resetCourierState: () =>
    set({
      coords: null,
      accuracy: null,
      gpsHeading: null,
      compassHeading: null,
      smoothedHeading: 0,
      compassPermission: 'unknown',
      distanceLeft: null,
      timeLeft: null,
      routePoints: [],
    }),
}));
