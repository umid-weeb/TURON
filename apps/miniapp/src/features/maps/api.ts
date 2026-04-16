import { api } from '../../lib/api';
import type { AddressCandidate, MapPin, RouteInfo } from './MapProvider';
import { mapYandexActionToDirection } from './navigation';
import { createRouteInfoFromMeters, createZeroRouteInfo } from './route';

interface YandexRouteApiResponse {
  distanceMeters: number;
  etaSeconds: number;
  polyline?: Array<{ lat: number; lng: number }>;
  steps?: Array<{
    instruction: string;
    distanceMeters: number;
    etaSeconds?: number;
    action?: string;
    street?: string;
  }>;
  source?: string;
}

interface YandexMatrixApiResponse {
  rows?: Array<
    Array<{
      status: 'OK' | 'FAIL';
      distanceMeters?: number;
      etaSeconds?: number;
    }>
  >;
  source?: string;
}

export async function fetchAddressSuggestions(
  query: string,
  limit = 5,
  biasPoint?: MapPin | null,
) {
  const response = (await api.get('/maps/suggest', {
    params: {
      text: query,
      results: limit,
      latitude: biasPoint?.lat,
      longitude: biasPoint?.lng,
    },
  })) as AddressCandidate[];

  return response.map((candidate) => ({
    ...candidate,
    pin: candidate.pin
      ? {
          lat: candidate.pin.lat,
          lng: candidate.pin.lng,
        }
      : undefined,
  }));
}

export async function resolveAddressSuggestion(candidate: AddressCandidate) {
  if (candidate.pin) {
    return candidate;
  }

  const response = (await api.post('/maps/resolve', {
    uri: candidate.uri,
    text: candidate.address || candidate.title,
  })) as {
    title?: string;
    address?: string;
    pin?: { lat: number; lng: number };
  };

  return {
    ...candidate,
    title: response.title || candidate.title,
    address: response.address || candidate.address,
    pin: response.pin
      ? {
          lat: response.pin.lat,
          lng: response.pin.lng,
        }
      : candidate.pin,
  };
}

export async function reverseGeocodePin(pin: MapPin) {
  const response = (await api.post('/maps/reverse-geocode', {
    latitude: pin.lat,
    longitude: pin.lng,
  })) as {
    address?: string | null;
  };

  return response.address || null;
}

export async function fetchRouteDetails(
  from: MapPin,
  to: MapPin,
  options: {
    mode?: 'driving' | 'walking' | 'bicycle' | 'scooter' | 'transit';
    traffic?: 'enabled' | 'disabled';
  } = {},
) {
  const response = (await api.post('/maps/route', {
    from: {
      latitude: from.lat,
      longitude: from.lng,
    },
    to: {
      latitude: to.lat,
      longitude: to.lng,
    },
    mode: options.mode,
    traffic: options.traffic,
  })) as YandexRouteApiResponse;

  return createRouteInfoFromMeters(response.distanceMeters, response.etaSeconds, {
    polyline: (response.polyline || []).map((point) => ({
      lat: point.lat,
      lng: point.lng,
    })),
    source: response.source || 'yandex-router',
    steps: (response.steps || []).map((step) => ({
      instruction: step.instruction,
      distanceMeters: step.distanceMeters,
      distanceText:
        step.distanceMeters < 1000
          ? `${Math.round(step.distanceMeters)} m`
          : `${(step.distanceMeters / 1000).toFixed(1)} km`,
      action: mapYandexActionToDirection(step.action),
      street: step.street,
    })),
  });
}

export async function fetchDistanceMatrixEstimate(
  origin: MapPin,
  destination: MapPin,
  options: {
    mode?: 'driving' | 'walking' | 'bicycle' | 'scooter' | 'transit';
    traffic?: 'enabled' | 'disabled';
  } = {},
): Promise<RouteInfo> {
  try {
    const response = (await api.post('/maps/distance-matrix', {
      origins: [
        {
          latitude: origin.lat,
          longitude: origin.lng,
        },
      ],
      destinations: [
        {
          latitude: destination.lat,
          longitude: destination.lng,
        },
      ],
      mode: options.mode,
      traffic: options.traffic,
    })) as YandexMatrixApiResponse;

    const cell = response.rows?.[0]?.[0];
    if (
      cell &&
      cell.status === 'OK' &&
      typeof cell.distanceMeters === 'number' &&
      typeof cell.etaSeconds === 'number'
    ) {
      return createRouteInfoFromMeters(cell.distanceMeters, cell.etaSeconds, {
        source: response.source || 'yandex-distance-matrix',
      });
    }
  } catch {
    // Fall through to router-based estimate below.
  }

  try {
    return await fetchRouteDetails(origin, destination, options);
  } catch {
    return createZeroRouteInfo();
  }
}
