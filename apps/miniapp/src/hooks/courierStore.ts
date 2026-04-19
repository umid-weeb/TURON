import { create } from 'zustand';
import { lowPassFilterCircular } from '../lib/headingUtils';

interface CourierState {
  location: { lat: number; lng: number } | null;
  speed: number | null;
  gpsHeading: number | null;
  compassHeading: number | null;
  smoothedHeading: number;
  compassPermission: 'unknown' | 'granted' | 'denied';
  
  setGpsData: (lat: number, lng: number, speed: number | null, heading: number | null) => void;
  setCompassHeading: (heading: number) => void;
  setCompassPermission: (status: 'unknown' | 'granted' | 'denied') => void;
  _updateSmoothedHeading: () => void;
}

export const useCourierStore = create<CourierState>((set, get) => ({
  location: null,
  speed: null,
  gpsHeading: null,
  compassHeading: null,
  smoothedHeading: 0, // Starts at 0, continuously updated by hybrid logic
  compassPermission: 'unknown',

  setGpsData: (lat, lng, speed, heading) => {
    set({ location: { lat, lng }, speed, gpsHeading: heading });
    get()._updateSmoothedHeading(); // Trigger smoothing recalculation
  },

  setCompassHeading: (heading) => {
    set({ compassHeading: heading });
    get()._updateSmoothedHeading(); // Trigger smoothing recalculation
  },

  setCompassPermission: (status) => set({ compassPermission: status }),

  /**
   * SMART HYBRID MODE ENGINE
   * Evaluates the best heading source based on speed, then applies a circular
   * low-pass filter to prevent snapping when toggling between GPS and Compass.
   */
  _updateSmoothedHeading: () => {
    const { speed, gpsHeading, compassHeading, smoothedHeading } = get();
    
    let targetHeading = compassHeading; // Default to compass when stationary/slow
    
    // Speed > 1.5 m/s (~5.4 km/h) = override with highly accurate GPS bearing
    if (speed !== null && speed > 1.5 && gpsHeading !== null) {
      targetHeading = gpsHeading;
    }

    if (targetHeading === null) return;
    
    // Apply smoothing factor. 0.15 provides a highly responsive yet jitter-free fluid rotation.
    const newSmoothed = lowPassFilterCircular(smoothedHeading, targetHeading, 0.15);
    set({ smoothedHeading: newSmoothed });
  }
}));