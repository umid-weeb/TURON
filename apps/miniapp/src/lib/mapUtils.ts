export interface LatLng { lat: number; lng: number; }

export const toRad = (value: number): number => (value * Math.PI) / 180;

export const haversineDistanceKm = (a: LatLng, b: LatLng): number => {
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);

  const h = sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfLng * sinHalfLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return R * c;
};

export const moveTowards = (from: LatLng, to: LatLng, distanceKm: number): LatLng => {
  if (distanceKm <= 0) return from;

  const totalDistance = haversineDistanceKm(from, to);
  if (totalDistance === 0) return to;

  const fraction = Math.min(1, distanceKm / totalDistance);

  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  };
};

export const etaMinutes = (distanceKm: number, speedKmh = 20): number => {
  if (speedKmh <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil((distanceKm / speedKmh) * 60);
};

export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
};

export const formatEta = (minutes: number): string => {
  if (minutes <= 1) return '1 daq';
  if (minutes < 60) return `${minutes} daq`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `${hrs} soat ${rem} daq`;
};
