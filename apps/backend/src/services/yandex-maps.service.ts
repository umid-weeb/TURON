import { RESTAURANT_COORDINATES } from '@turon/shared';

interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

interface YandexSuggestItem {
  id: string;
  title: string;
  subtitle?: string;
  address: string;
  uri?: string;
  pin?: CoordinatePoint;
  distanceText?: string;
}

interface YandexRouteDetails {
  distanceMeters: number;
  etaSeconds: number;
  polyline: CoordinatePoint[];
  steps: YandexRouteStep[];
}

interface YandexRouteStep {
  instruction: string;
  distanceMeters: number;
  etaSeconds: number;
  action?: string;
  street?: string;
}

interface YandexMatrixCell {
  status: 'OK' | 'FAIL';
  distanceMeters?: number;
  etaSeconds?: number;
}

type YandexTrafficMode = 'enabled' | 'disabled' | 'forecast' | 'realtime';
const YANDEX_REQUEST_TIMEOUT_MS = 5000;

function readFirstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return '';
}

const ROUTER_API_KEY = readFirstEnv('YANDEX_ROUTER_API_KEY', 'YANDEX_DISTANCE_MATRIX_API_KEY');
const DISTANCE_MATRIX_API_KEY = readFirstEnv(
  'YANDEX_DISTANCE_MATRIX_API_KEY',
  'YANDEX_ROUTER_API_KEY',
);
const GEOSUGGEST_API_KEY = readFirstEnv('YANDEX_GEOSUGGEST_API_KEY');
const GEOCODER_API_KEY = readFirstEnv(
  'YANDEX_GEOCODER_API_KEY',
  'YANDEX_MAP_API_KEY',
  'VITE_MAP_API_KEY',
);
const MAP_LANGUAGE = readFirstEnv('YANDEX_MAP_LANGUAGE', 'VITE_MAP_LANGUAGE') || 'uz_UZ';
const DEFAULT_CITY_BIAS = {
  latitude: RESTAURANT_COORDINATES.lat,
  longitude: RESTAURANT_COORDINATES.lng,
};

function getSuggestLanguage() {
  return MAP_LANGUAGE.split('_')[0] || 'uz';
}

function formatCoordinatePair(point: CoordinatePoint) {
  return `${point.latitude},${point.longitude}`;
}

function formatBiasPair(point: CoordinatePoint) {
  return `${point.longitude},${point.latitude}`;
}

function normalizeTrafficQueryValue(traffic?: YandexTrafficMode) {
  if (!traffic || traffic === 'enabled') {
    return null;
  }

  if (traffic === 'disabled' || traffic === 'forecast' || traffic === 'realtime') {
    return traffic;
  }

  return null;
}

async function fetchYandexJson<T>(url: URL) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), YANDEX_REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new Error('Yandex servisi javobi juda sekin bo‘ldi');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = await response.text();
  let data: T | { errors?: string[]; message?: string };

  try {
    data = JSON.parse(payload) as T;
  } catch {
    throw new Error('Yandex servisi JSON qaytarmadi');
  }

  if (!response.ok) {
    const errorMessage =
      (Array.isArray((data as { errors?: string[] }).errors)
        ? (data as { errors?: string[] }).errors?.join(', ')
        : null) ||
      (data as { message?: string }).message ||
      `Yandex servisi ${response.status} bilan javob qaytardi`;

    throw new Error(errorMessage);
  }

  if (Array.isArray((data as { errors?: string[] }).errors) && (data as { errors?: string[] }).errors?.length) {
    throw new Error((data as { errors?: string[] }).errors!.join(', '));
  }

  return data as T;
}

function parsePointString(point: string | undefined | null) {
  if (!point) {
    return null;
  }

  const parts = point.split(' ').map(Number);
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
    return null;
  }

  const [longitude, latitude] = parts;
  return {
    latitude,
    longitude,
  };
}

function normalizeSuggestItem(item: any, index: number): YandexSuggestItem {
  const title = item?.title?.text || item?.title || item?.displayName || 'Manzil';
  const subtitle = item?.subtitle?.text || item?.subtitle || undefined;
  const address =
    item?.address?.formatted_address ||
    item?.displayName ||
    [title, subtitle].filter(Boolean).join(', ') ||
    title;

  const pin =
    parsePointString(item?.uri_meta?.point) ||
    parsePointString(item?.address?.component?.point) ||
    (Array.isArray(item?.center) && item.center.length >= 2
      ? {
          longitude: Number(item.center[0]),
          latitude: Number(item.center[1]),
        }
      : null);

  return {
    id: item?.uri || `${title}:${subtitle || ''}:${index}`,
    title,
    subtitle,
    address,
    uri: item?.uri || undefined,
    pin: pin || undefined,
    distanceText: item?.distance?.text || undefined,
  };
}

function flattenRoutePolyline(route: any): CoordinatePoint[] {
  const coordinates: CoordinatePoint[] = [];
  const seen = new Set<string>();

  // 1. Try to get combined polyline from the route root (if available)
  const combinedPolyline = route?.polyline?.points || [];
  if (combinedPolyline.length > 0) {
    for (const point of combinedPolyline) {
      const latitude = Number(point?.[0]);
      const longitude = Number(point?.[1]);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) continue;
      
      const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
      if (seen.has(key)) continue;
      
      seen.add(key);
      coordinates.push({ latitude, longitude });
    }
    return coordinates;
  }

  // 2. Fallback to leg/step iteration
  const legs = Array.isArray(route?.legs) ? route.legs : [];
  for (const leg of legs) {
    const steps = Array.isArray(leg?.steps) ? leg.steps : [];
    for (const step of steps) {
      const points = Array.isArray(step?.polyline?.points) ? step.polyline.points : [];
      for (const point of points) {
        const latitude = Number(point?.[0]);
        const longitude = Number(point?.[1]);
        if (Number.isNaN(latitude) || Number.isNaN(longitude)) continue;

        const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
        if (seen.has(key)) continue;

        seen.add(key);
        coordinates.push({ latitude, longitude });
      }
    }
  }

  return coordinates;
}

function calculateRouteTotals(route: any) {
  const legs = Array.isArray(route?.legs) ? route.legs : [];

  return legs.reduce(
    (
      accumulator: {
        distanceMeters: number;
        etaSeconds: number;
      },
      leg: any,
    ) => ({
      distanceMeters: accumulator.distanceMeters + Number(leg?.annotation?.distance?.value || 0),
      etaSeconds: accumulator.etaSeconds + Number(leg?.annotation?.duration?.value || 0),
    }),
    { distanceMeters: 0, etaSeconds: 0 },
  );
}

function extractStepStreet(step: any) {
  const street = step?.street;

  if (typeof street === 'string' && street.trim()) {
    return street.trim();
  }

  if (typeof street?.name === 'string' && street.name.trim()) {
    return street.name.trim();
  }

  if (typeof step?.streetName === 'string' && step.streetName.trim()) {
    return step.streetName.trim();
  }

  if (typeof step?.annotation?.street === 'string' && step.annotation.street.trim()) {
    return step.annotation.street.trim();
  }

  return undefined;
}

function extractStepAction(step: any) {
  const candidates = [
    step?.action,
    step?.maneuver?.action,
    step?.turn,
    step?.annotation?.action,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
}

function extractStepInstruction(step: any, index: number) {
  const candidates = [
    step?.instruction,
    step?.instruction?.text,
    step?.annotation?.text,
    step?.description,
    step?.description?.text,
    step?.summary?.text,
    step?.text,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  const action = extractStepAction(step);
  const street = extractStepStreet(step);
  const fallback = [action, street].filter(Boolean).join(' ');

  return fallback || `Bosqich ${index + 1}`;
}

function extractRouteSteps(route: any): YandexRouteStep[] {
  const legs = Array.isArray(route?.legs) ? route.legs : [];
  const steps: YandexRouteStep[] = [];

  for (const leg of legs) {
    const legSteps = Array.isArray(leg?.steps) ? leg.steps : [];

    legSteps.forEach((step: any, index: number) => {
      const distanceMeters = Math.max(
        0,
        Math.round(
          Number(step?.annotation?.distance?.value ?? step?.distance?.value ?? step?.distance ?? 0),
        ),
      );
      const etaSeconds = Math.max(
        0,
        Math.round(
          Number(step?.annotation?.duration?.value ?? step?.duration?.value ?? step?.duration ?? 0),
        ),
      );

      steps.push({
        instruction: extractStepInstruction(step, index),
        distanceMeters,
        etaSeconds,
        action: extractStepAction(step),
        street: extractStepStreet(step),
      });
    });
  }

  return steps;
}

export class YandexMapsService {
  static isGeosuggestConfigured() {
    return GEOSUGGEST_API_KEY.length > 0;
  }

  static isRouterConfigured() {
    return ROUTER_API_KEY.length > 0;
  }

  static isDistanceMatrixConfigured() {
    return DISTANCE_MATRIX_API_KEY.length > 0;
  }

  static isGeocoderConfigured() {
    return GEOCODER_API_KEY.length > 0;
  }

  static async suggestAddresses(
    text: string,
    options: {
      results?: number;
      biasPoint?: CoordinatePoint;
    } = {},
  ) {
    if (!this.isGeosuggestConfigured()) {
      throw new Error('YANDEX_GEOSUGGEST_API_KEY sozlanmagan');
    }

    const query = text.trim();
    if (!query) {
      return [];
    }

    const url = new URL('https://suggest-maps.yandex.ru/v1/suggest');
    url.searchParams.set('apikey', GEOSUGGEST_API_KEY);
    url.searchParams.set('text', query);
    url.searchParams.set('results', String(Math.min(Math.max(options.results ?? 5, 1), 10)));
    url.searchParams.set('lang', getSuggestLanguage());
    url.searchParams.set('print_address', '1');

    const biasPoint = options.biasPoint || DEFAULT_CITY_BIAS;
    url.searchParams.set('ll', formatBiasPair(biasPoint));
    url.searchParams.set('spn', '0.15,0.15'); // Tighter focus for better local results

    try {
      const result = await fetchYandexJson<{ results?: unknown[] }>(url);
      const rows = Array.isArray(result.results) ? result.results : [];
      return rows.map((item, index) => normalizeSuggestItem(item, index));
    } catch (error) {
      console.error(`[YandexMaps] Suggestion failed for "${query}":`, error);
      throw error;
    }
  }

  static async resolveSuggestion(input: { uri?: string; text?: string }) {
    if (!this.isGeocoderConfigured()) {
      throw new Error('YANDEX_GEOCODER_API_KEY sozlanmagan');
    }

    const url = new URL('https://geocode-maps.yandex.ru/v1/');
    url.searchParams.set('apikey', GEOCODER_API_KEY);
    url.searchParams.set('format', 'json');
    url.searchParams.set('lang', MAP_LANGUAGE);
    url.searchParams.set('results', '1');

    if (input.uri?.trim()) {
      url.searchParams.set('uri', input.uri.trim());
    } else if (input.text?.trim()) {
      url.searchParams.set('geocode', input.text.trim());
    } else {
      throw new Error('Manzilni aniqlash uchun uri yoki text kerak');
    }

    const result = await fetchYandexJson<any>(url);
    const geoObject =
      result?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;

    if (!geoObject) {
      throw new Error('Manzil koordinatalari topilmadi');
    }

    const pin = parsePointString(geoObject?.Point?.pos);
    if (!pin) {
      throw new Error('Koordinatalar Yandex javobida yo‘q');
    }

    const meta = geoObject?.metaDataProperty?.GeocoderMetaData;
    return {
      title: meta?.AddressDetails?.Country?.AddressLine || meta?.text || 'Manzil',
      address: meta?.text || 'Manzil',
      pin,
    };
  }

  static async reverseGeocode(point: CoordinatePoint) {
    if (!this.isGeocoderConfigured()) {
      throw new Error('YANDEX_GEOCODER_API_KEY sozlanmagan');
    }

    const url = new URL('https://geocode-maps.yandex.ru/v1/');
    url.searchParams.set('apikey', GEOCODER_API_KEY);
    url.searchParams.set('format', 'json');
    url.searchParams.set('lang', MAP_LANGUAGE);
    url.searchParams.set('results', '1');
    url.searchParams.set('kind', 'house');
    url.searchParams.set('sco', 'latlong');
    url.searchParams.set('geocode', formatCoordinatePair(point));

    const result = await fetchYandexJson<any>(url);
    const geoObject =
      result?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    const address =
      geoObject?.metaDataProperty?.GeocoderMetaData?.text ||
      geoObject?.name ||
      null;

    return {
      address,
    };
  }

  static async getRouteDetails(
    from: CoordinatePoint,
    to: CoordinatePoint,
    options: {
      mode?: 'driving' | 'walking' | 'bicycle' | 'scooter' | 'transit';
      traffic?: YandexTrafficMode;
    } = {},
  ): Promise<YandexRouteDetails> {
    if (!this.isRouterConfigured()) {
      throw new Error('YANDEX_ROUTER_API_KEY sozlanmagan');
    }

    const url = new URL('https://api.routing.yandex.net/v2/route');
    url.searchParams.set('apikey', ROUTER_API_KEY);
    url.searchParams.set('waypoints', `${formatCoordinatePair(from)}|${formatCoordinatePair(to)}`);
    url.searchParams.set('mode', options.mode || 'driving');
    const trafficMode = normalizeTrafficQueryValue(options.traffic);
    if (trafficMode) {
      url.searchParams.set('traffic', trafficMode);
    }

    const result = await fetchYandexJson<any>(url);
    const route = result?.route;

    if (!route) {
      throw new Error('Yandex marshrut topilmadi');
    }

    const totals = calculateRouteTotals(route);
    const polyline = flattenRoutePolyline(route);
    const steps = extractRouteSteps(route);

    return {
      distanceMeters: Math.max(0, Math.round(totals.distanceMeters)),
      etaSeconds: Math.max(0, Math.round(totals.etaSeconds)),
      polyline,
      steps,
    };
  }

  static async getDistanceMatrix(
    origins: CoordinatePoint[],
    destinations: CoordinatePoint[],
    options: {
      mode?: 'driving' | 'walking' | 'bicycle' | 'scooter' | 'transit';
      traffic?: YandexTrafficMode;
    } = {},
  ) {
    if (!this.isDistanceMatrixConfigured()) {
      throw new Error('YANDEX_DISTANCE_MATRIX_API_KEY sozlanmagan');
    }

    if (!origins.length || !destinations.length) {
      throw new Error('Origins va destinations bo‘sh bo‘lmasligi kerak');
    }

    const url = new URL('https://api.routing.yandex.net/v2/distancematrix');
    url.searchParams.set('apikey', DISTANCE_MATRIX_API_KEY);
    url.searchParams.set('origins', origins.map(formatCoordinatePair).join('|'));
    url.searchParams.set('destinations', destinations.map(formatCoordinatePair).join('|'));
    url.searchParams.set('mode', options.mode || 'driving');
    const trafficMode = normalizeTrafficQueryValue(options.traffic);
    if (trafficMode) {
      url.searchParams.set('traffic', trafficMode);
    }

    const result = await fetchYandexJson<any>(url);
    const rows = Array.isArray(result?.rows) ? result.rows : [];

    return rows.map((row: any) =>
      (Array.isArray(row?.elements) ? row.elements : []).map(
        (element: any): YandexMatrixCell => ({
          status: element?.status === 'OK' ? 'OK' : 'FAIL',
          distanceMeters:
            typeof element?.distance?.value === 'number' ? element.distance.value : undefined,
          etaSeconds:
            typeof element?.duration?.value === 'number' ? element.duration.value : undefined,
        }),
      ),
    );
  }
}
