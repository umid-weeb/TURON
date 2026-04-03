import React from 'react';
import type { LocationPickerProps, MapProvider, RouteMapProps } from '../MapProvider';
import MockMapComponent from '../components/MockMapComponent';
import { detectBrowserGeolocation, isBrowserGeolocationSupported } from '../geolocation';

const MOCK_FALLBACK_MESSAGE = 'Demo xarita ishlatilmoqda. Yandex uchun `VITE_MAP_API_KEY` ni sozlang.';

function MockLocationPicker({
  initialCenter,
  onLocationSelect,
  onRouteInfoChange,
  onInteractionStart,
  onInteractionEnd,
  userLocationPin,
  restaurantLocationPin,
  height,
  className,
}: LocationPickerProps) {
  return (
    <div className="relative" style={height ? { height } : undefined}>
      <MockMapComponent
        initialCenter={initialCenter}
        onLocationSelect={onLocationSelect}
        onRouteInfoChange={onRouteInfoChange}
        onInteractionStart={onInteractionStart}
        onInteractionEnd={onInteractionEnd}
        userLocationPin={userLocationPin}
        restaurantLocationPin={restaurantLocationPin}
        height={height}
        className={className}
      />
      <div className="pointer-events-none absolute left-4 right-4 top-4 rounded-2xl bg-slate-900/85 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white shadow-xl">
        {MOCK_FALLBACK_MESSAGE}
      </div>
    </div>
  );
}

function MockRouteMap({
  pickup,
  destination,
  courierPos,
  height = '60vh',
  className = '',
}: RouteMapProps) {
  const markers = [
    { id: 'pickup', position: pickup, label: 'RESTORAN', type: 'PICKUP' as const },
    { id: 'destination', position: destination, label: 'MIJOZ', type: 'DELIVERY' as const },
    ...(courierPos ? [{ id: 'courier', position: courierPos, label: 'KURYER', type: 'COURIER' as const }] : []),
  ];

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-100 shadow-inner ${className}`} style={{ height }}>
      <MockMapComponent
        initialCenter={pickup}
        markers={markers}
        showRoute
        height="100%"
        className="h-full rounded-none border-0"
      />
      <div className="pointer-events-none absolute left-4 right-4 top-4 rounded-2xl bg-slate-900/85 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white shadow-xl">
        {MOCK_FALLBACK_MESSAGE}
      </div>
    </div>
  );
}

export const MockMapProvider: MapProvider = {
  id: 'mock',
  label: 'Mock Maps',
  isEnabled: true,
  supportsAddressSearch: false,
  supportsRouting: false,
  supportsGeolocation: isBrowserGeolocationSupported(),
  fallbackMessage: MOCK_FALLBACK_MESSAGE,
  formatCoordinateAddress: (pin) => `Xaritada tanlangan nuqta (${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)})`,
  detectUserLocation: detectBrowserGeolocation,
  reverseGeocode: async () => null,
  searchAddresses: async () => [],
  resolveAddressCandidate: async (candidate) => candidate,
  LocationPicker: MockLocationPicker,
  RouteMap: MockRouteMap,
};
