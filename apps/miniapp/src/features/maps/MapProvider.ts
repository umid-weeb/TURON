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
  onRouteInfoChange?: (info: RouteInfo) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  userLocationPin?: MapPin | null;
  restaurantLocationPin?: MapPin | null;
  markers?: Marker[];
  showRoute?: boolean;
  markerDraggable?: boolean;
  height?: string;
  className?: string;
}

export interface AddressCandidate {
  id: string;
  title: string;
  subtitle?: string;
  address: string;
  pin?: MapPin;
  uri?: string;
  distanceText?: string;
}

export interface LocationPickerProps {
  initialCenter: MapPin;
  onLocationSelect?: (pin: MapPin) => void;
  onRouteInfoChange?: (info: RouteInfo) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  userLocationPin?: MapPin | null;
  restaurantLocationPin?: MapPin | null;
  height?: string;
  className?: string;
}

export interface RouteStep {
  instruction: string;
  distanceText: string;
  distanceMeters: number;
  action?: 'left' | 'right' | 'straight';
  street?: string;
}

export interface RouteInfo {
  distance: string;
  eta: string;
  distanceMeters?: number;
  etaSeconds?: number;
  polyline?: MapPin[];
  source?: string;
  steps?: RouteStep[];
}

export interface UserGeolocation {
  pin: MapPin;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface RouteMapProps {
  pickup: MapPin;
  destination: MapPin;
  courierPos?: MapPin;
  routeFrom?: MapPin;
  routeTo?: MapPin;
  height?: string;
  className?: string;
  /** When true the map pans to follow the courier on each GPS update */
  followMode?: boolean;
  /** Courier heading in degrees (0 = north, clockwise). Used to rotate the courier arrow marker. */
  heading?: number;
  /** Camera tilt angle in degrees (0 = overhead, ~50 = isometric 3D view) */
  tilt?: number;
  /** Called when the user starts manually panning/zooming the map */
  onMapInteraction?: () => void;
  /** Called when map is ready */
  onMapReady?: (map: unknown) => void;
  /** Called when route info changes (distance, ETA) */
  onRouteInfoChange?: (info: RouteInfo) => void;
  /** Called whenever the next turn instruction changes */
  onNextStepChange?: (step: RouteStep | null) => void;
  /** Called when user wants to change heading (camera rotation) */
  onHeadingChange?: (heading: number) => void;
  /** Called when user wants to change tilt (viewing angle) */
  onTiltChange?: (tilt: number) => void;
  /** Called when user toggles follow mode */
  onFollowModeChange?: (enabled: boolean) => void;
}

export interface MapProvider {
  id: 'yandex' | 'mock';
  label: string;
  isEnabled: boolean;
  supportsAddressSearch: boolean;
  supportsRouting: boolean;
  supportsGeolocation: boolean;
  fallbackMessage: string;
  formatCoordinateAddress: (pin: MapPin) => string;
  detectUserLocation: (options?: GeolocationOptions) => Promise<UserGeolocation>;
  reverseGeocode: (pin: MapPin) => Promise<string | null>;
  searchAddresses: (query: string, limit?: number, biasPoint?: MapPin | null) => Promise<AddressCandidate[]>;
  resolveAddressCandidate: (candidate: AddressCandidate) => Promise<AddressCandidate>;
  LocationPicker: React.FC<LocationPickerProps>;
  RouteMap: React.FC<RouteMapProps>;
}
