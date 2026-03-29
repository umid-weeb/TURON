import React from 'react';

export interface MapPin {
  lat: number;
  lng: number;
}

export interface Marker {
  id: string;
  position: MapPin;
  label?: string;
  type?: 'PICKUP' | 'DELIVERY' | 'COURIER';
}

export interface MapProviderProps {
  initialCenter: MapPin;
  initialZoom?: number;
  onLocationSelect?: (pin: MapPin) => void;
  markers?: Marker[];
  showRoute?: boolean;
  markerDraggable?: boolean;
  height?: string;
  className?: string;
}

export interface MapProvider {
  Component: React.FC<MapProviderProps>;
}
