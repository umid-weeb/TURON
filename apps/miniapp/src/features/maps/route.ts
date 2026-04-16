import type { MapPin, RouteInfo, RouteStep } from './MapProvider';

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export interface RouteMetrics {
  distanceKm: number;
  etaMinutes: number;
  distanceMeters?: number;
  etaSeconds?: number;
  polyline?: MapPin[];
  source?: string;
  steps?: RouteStep[];
}

interface EstimateRouteOptions {
  minimumDistanceKm?: number;
  minimumEtaMinutes?: number;
  roadFactor?: number;
  averageSpeedKmh?: number;
}

export function formatRouteDistance(distanceKm: number) {
  if (distanceKm <= 0) {
    return '0 m';
  }

  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
}

export function formatEtaMinutes(etaMinutes: number) {
  if (etaMinutes <= 0) {
    return '0 daq';
  }

  return `${etaMinutes} daq`;
}

/** Returns wall-clock arrival time string like "15:30" */
export function formatArrivalTime(etaMinutes: number): string | null {
  if (etaMinutes <= 0) return null;
  const arrival = new Date(Date.now() + etaMinutes * 60 * 1000);
  return arrival.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

export function getEtaCountdownSeconds(
  etaMinutes: number,
  lastUpdatedAt?: string,
  now = Date.now(),
) {
  if (etaMinutes <= 0) {
    return 0;
  }

  const totalSeconds = Math.max(Math.round(etaMinutes * 60), 0);

  if (!lastUpdatedAt) {
    return totalSeconds;
  }

  const lastUpdatedTime = new Date(lastUpdatedAt).getTime();

  if (Number.isNaN(lastUpdatedTime)) {
    return totalSeconds;
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - lastUpdatedTime) / 1000));
  return Math.max(0, totalSeconds - elapsedSeconds);
}

export function formatEtaCountdown(totalSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function createRouteInfo(metrics: RouteMetrics): RouteInfo {
  const distanceMeters = metrics.distanceMeters ?? Math.max(Math.round(metrics.distanceKm * 1000), 0);
  const etaSeconds = metrics.etaSeconds ?? Math.max(Math.round(metrics.etaMinutes * 60), 0);
  const etaMinutes = etaSeconds > 0 ? Math.max(Math.round(etaSeconds / 60), 1) : 0;

  return {
    distance: formatRouteDistance(distanceMeters / 1000),
    eta: formatEtaMinutes(etaMinutes),
    distanceMeters,
    etaSeconds,
    polyline: metrics.polyline,
    source: metrics.source,
    steps: metrics.steps,
  };
}

export function createZeroRouteInfo(): RouteInfo {
  return {
    distance: '0 m',
    eta: '0 daq',
    distanceMeters: 0,
    etaSeconds: 0,
  };
}

export function createRouteInfoFromMeters(
  distanceMeters: number,
  etaSeconds: number,
  options: {
    polyline?: MapPin[];
    source?: string;
    steps?: RouteStep[];
  } = {},
): RouteInfo {
  return createRouteInfo({
    distanceKm: distanceMeters / 1000,
    etaMinutes: etaSeconds / 60,
    distanceMeters,
    etaSeconds,
    polyline: options.polyline,
    source: options.source,
    steps: options.steps,
  });
}

export function estimateRouteMetrics(
  from: MapPin,
  to: MapPin,
  options: EstimateRouteOptions = {},
): RouteMetrics {
  const {
    minimumDistanceKm = 0.2,
    minimumEtaMinutes = 2,
    roadFactor = 1.25,
    averageSpeedKmh = 28,
  } = options;
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const originLat = toRadians(from.lat);
  const targetLat = toRadians(to.lat);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  const directDistanceKm = earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const roadDistanceKm = Math.max(directDistanceKm * roadFactor, minimumDistanceKm);
  const etaMinutes = Math.max(Math.round((roadDistanceKm / averageSpeedKmh) * 60), minimumEtaMinutes);

  return {
    distanceKm: roadDistanceKm,
    etaMinutes,
  };
}

export function estimateRouteInfo(from: MapPin, to: MapPin, options?: EstimateRouteOptions): RouteInfo {
  return createRouteInfo(estimateRouteMetrics(from, to, options));
}
