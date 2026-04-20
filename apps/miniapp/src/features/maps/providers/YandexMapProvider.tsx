import type { LocationPickerProps, MapProvider, RouteMapProps } from '../MapProvider';
import { detectBrowserGeolocation, isBrowserGeolocationSupported } from '../geolocation';
import {
  formatCoordinateAddress,
  isYandexMapsEnabled,
  resolveCandidate,
  reverseGeocodeCoordinates,
  searchAddressCandidates,
} from '../yandex';
import YandexLocationPicker from '../components/YandexLocationPicker';
import YandexRouteMap from '../components/YandexRouteMap';

const YANDEX_FALLBACK_MESSAGE = 'Demo xarita ishlatilmoqda. Yandex uchun `VITE_MAP_API_KEY` ni sozlang.';

function YandexLocationPickerLoader(props: LocationPickerProps) {
  return <YandexLocationPicker {...props} />;
}

function YandexRouteMapLoader(props: RouteMapProps) {
  return <YandexRouteMap {...props} />;
}

export const YandexMapProvider: MapProvider = {
  id: 'yandex',
  label: 'Yandex Maps',
  isEnabled: isYandexMapsEnabled(),
  supportsAddressSearch: isYandexMapsEnabled(),
  supportsRouting: isYandexMapsEnabled(),
  supportsGeolocation: isBrowserGeolocationSupported(),
  fallbackMessage: YANDEX_FALLBACK_MESSAGE,
  formatCoordinateAddress,
  detectUserLocation: detectBrowserGeolocation,
  reverseGeocode: reverseGeocodeCoordinates,
  searchAddresses: searchAddressCandidates,
  resolveAddressCandidate: resolveCandidate,
  LocationPicker: YandexLocationPickerLoader,
  RouteMap: YandexRouteMapLoader,
};
