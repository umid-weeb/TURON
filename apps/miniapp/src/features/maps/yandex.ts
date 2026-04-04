import type { AddressCandidate, MapPin } from './MapProvider';
import {
  fetchAddressSuggestions,
  resolveAddressSuggestion,
  reverseGeocodePin,
} from './api';

const MAP_PROVIDER = import.meta.env.VITE_MAPS_PROVIDER ?? 'yandex';
const MAP_API_KEY = import.meta.env.VITE_MAP_API_KEY ?? '';
const MAP_LANGUAGE = import.meta.env.VITE_MAP_LANGUAGE ?? 'uz_UZ';
const SCRIPT_ID = 'turon-yandex-maps-script';

type YandexMapsNamespace = {
  Map: new (container: HTMLElement, state: Record<string, unknown>, options?: Record<string, unknown>) => any;
  Placemark: new (geometry: number[], properties?: Record<string, unknown>, options?: Record<string, unknown>) => any;
  Polyline?: new (geometry: number[][], properties?: Record<string, unknown>, options?: Record<string, unknown>) => any;
  geocode: (request: string | number[], options?: Record<string, unknown>) => Promise<any>;
  ready: (callback: () => void) => void;
  multiRouter?: {
    MultiRoute: new (model: Record<string, unknown>, options?: Record<string, unknown>) => any;
  };
  Circle: new (geometry: [number[], number], properties?: Record<string, unknown>, options?: Record<string, unknown>) => any;
  control: {
    ZoomControl: new (options?: Record<string, unknown>) => any;
  };
};

let mapsLoadPromise: Promise<YandexMapsNamespace> | null = null;

export function isYandexMapsEnabled() {
  return MAP_PROVIDER === 'yandex' && MAP_API_KEY.trim().length > 0;
}

export function formatCoordinateAddress(pin: MapPin) {
  return `Xaritada tanlangan nuqta (${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)})`;
}

export function toYandexCoords(pin: MapPin) {
  return [pin.lat, pin.lng];
}

export function createBoundsFromPins(pins: MapPin[]) {
  if (pins.length === 0) {
    return null;
  }

  const latitudes = pins.map((pin) => pin.lat);
  const longitudes = pins.map((pin) => pin.lng);

  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)],
  ];
}

function getGeoObjectText(geoObject: any) {
  return (
    geoObject?.getAddressLine?.() ||
    geoObject?.properties?.get?.('text') ||
    geoObject?.properties?.get?.('name') ||
    null
  );
}

function normalizeGeoObject(geoObject: any, index: number): AddressCandidate | null {
  const coordinates = geoObject?.geometry?.getCoordinates?.() as number[] | undefined;

  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  const address = getGeoObjectText(geoObject);
  if (!address) {
    return null;
  }

  const title = geoObject?.properties?.get?.('name') || address;
  const subtitle = geoObject?.properties?.get?.('description') || undefined;

  return {
    id: `${coordinates[0]}:${coordinates[1]}:${index}`,
    title,
    subtitle,
    address,
    pin: { lat: coordinates[0], lng: coordinates[1] },
  };
}

function waitUntilMapsReady(resolve: (ymaps: YandexMapsNamespace) => void, reject: (error: Error) => void) {
  if (!window.ymaps) {
    mapsLoadPromise = null;
    reject(new Error('Yandex Maps yuklanmadi'));
    return;
  }

  window.ymaps.ready(() => resolve(window.ymaps as YandexMapsNamespace));
}

export async function loadYandexMaps() {
  if (window.ymaps) {
    return window.ymaps as YandexMapsNamespace;
  }

  if (!isYandexMapsEnabled()) {
    throw new Error('Yandex Maps sozlanmagan');
  }

  if (mapsLoadPromise) {
    return mapsLoadPromise;
  }

  mapsLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const handleError = () => {
      mapsLoadPromise = null;
      reject(new Error('Yandex Maps skriptini yuklab bo\'lmadi'));
    };
    const handleLoad = () => waitUntilMapsReady(resolve, reject);

    if (existingScript) {
      if (window.ymaps) {
        handleLoad();
        return;
      }

      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(MAP_API_KEY)}&lang=${encodeURIComponent(MAP_LANGUAGE)}`;
    script.async = true;
    script.onload = handleLoad;
    script.onerror = handleError;

    document.head.appendChild(script);
  });

  return mapsLoadPromise;
}

async function geocodeAddressText(query: string, limit = 5, biasPoint?: MapPin | null) {
  const ymaps = await loadYandexMaps();
  const geocodeOptions: any = {
    provider: 'yandex#map',
    results: limit,
  };

  if (biasPoint) {
    // Create a 5km bounding box around the bias point for local relevance
    const delta = 0.045; // Roughly 5km
    geocodeOptions.boundedBy = [
      [biasPoint.lat - delta, biasPoint.lng - delta],
      [biasPoint.lat + delta, biasPoint.lng + delta],
    ];
    // We don't use strictBounds: true to allow finding addresses outside if nothing found inside
  }

  const result = await ymaps.geocode(query, geocodeOptions);

  const matches: AddressCandidate[] = [];
  const total = result?.geoObjects?.getLength?.() ?? 0;

  for (let index = 0; index < total; index += 1) {
    const candidate = normalizeGeoObject(result.geoObjects.get(index), index);
    if (candidate) {
      matches.push(candidate);
    }
  }

  return matches;
}

export async function searchAddressCandidates(query: string, limit = 5, biasPoint?: MapPin | null) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 3) {
    return [];
  }

  try {
    const suggestions = await fetchAddressSuggestions(normalizedQuery, limit, biasPoint);
    if (suggestions.length > 0) {
      return suggestions;
    }
  } catch {
    // Fallback to client-side geocode below.
  }

  return geocodeAddressText(normalizedQuery, limit, biasPoint);
}

export async function resolveCandidate(candidate: AddressCandidate) {
  if (candidate.pin) {
    return candidate;
  }

  try {
    const resolved = await resolveAddressSuggestion(candidate);
    if (resolved.pin) {
      return resolved;
    }
  } catch {
    // Fall back to client-side geocoding below.
  }

  const fallbackMatches = await geocodeAddressText(candidate.address || candidate.title, 1);
  const firstMatch = fallbackMatches[0];

  if (!firstMatch?.pin) {
    throw new Error('Tanlangan manzil koordinatalari topilmadi');
  }

  return {
    ...candidate,
    title: firstMatch.title || candidate.title,
    subtitle: firstMatch.subtitle || candidate.subtitle,
    address: firstMatch.address || candidate.address,
    pin: firstMatch.pin,
  };
}

export async function reverseGeocodeCoordinates(pin: MapPin) {
  try {
    const backendAddress = await reverseGeocodePin(pin);
    if (backendAddress) {
      return backendAddress;
    }
  } catch {
    // Fall back to client-side geocoder below.
  }

  try {
    const ymaps = await loadYandexMaps();
    const result = await ymaps.geocode(toYandexCoords(pin), {
      kind: 'house',
      results: 1,
    });
    const firstGeoObject = result.geoObjects.get(0);
    return normalizeGeoObject(firstGeoObject, 0)?.address ?? getGeoObjectText(firstGeoObject);
  } catch {
    return null;
  }
}

declare global {
  interface Window {
    ymaps?: YandexMapsNamespace;
  }
}
