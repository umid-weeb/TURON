import { create } from 'zustand';

export interface CourierLocation {
  lat: number;
  lng: number;
}

interface CourierLocationState {
  currentLocation: CourierLocation | null;
  setCurrentLocation: (location: CourierLocation) => void;
  clearLocation: () => void;
}

export const useCourierLocationStore = create<CourierLocationState>((set) => ({
  currentLocation: null,
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  clearLocation: () => set({ currentLocation: null }),
}));
