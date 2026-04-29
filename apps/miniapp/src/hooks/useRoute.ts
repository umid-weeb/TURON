import { useCallback, useEffect, useRef, useState } from 'react';
import { useCourierStore } from '../store/courierStore';
import { extractRouteSteps } from '../features/maps/maneuvers';

interface UseRouteResult {
  isLoading: boolean;
  error: string | null;
  updateCourier: (lat: number, lon: number) => void;
}

function toYmapsPoint(point: [number, number]) {
  return [point[1], point[0]];
}

function collectionToArray(collection: any) {
  if (!collection) return [] as any[];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.each === 'function') {
    const values: any[] = [];
    collection.each((item: any) => values.push(item));
    return values;
  }
  if (typeof collection.getLength === 'function' && typeof collection.get === 'function') {
    return Array.from({ length: collection.getLength() }, (_, index) => collection.get(index));
  }
  return [] as any[];
}

function pushCoordinates(points: [number, number][], value: unknown) {
  if (!Array.isArray(value)) return;

  if (value.length >= 2 && !Array.isArray(value[0]) && !Array.isArray(value[1])) {
    const lat = Number(value[0]);
    const lon = Number(value[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      points.push([lon, lat]);
    }
    return;
  }

  value.forEach((item) => pushCoordinates(points, item));
}

function extractRoutePoints(route: any) {
  const points: [number, number][] = [];

  pushCoordinates(points, route?.geometry?.getCoordinates?.());

  const paths = collectionToArray(route?.getPaths?.());
  paths.forEach((path) => {
    pushCoordinates(points, path?.geometry?.getCoordinates?.());
    const segments = collectionToArray(path?.getSegments?.());
    segments.forEach((segment) => {
      pushCoordinates(points, segment?.geometry?.getCoordinates?.());
      pushCoordinates(points, segment?.getCoordinates?.());
    });
  });

  return points;
}

function readRouteMetric(route: any, key: 'distance' | 'duration' | 'durationInTraffic') {
  const value = route?.properties?.get?.(key);
  if (typeof value === 'number') return value;
  if (typeof value?.value === 'number') return value.value;
  return 0;
}

export function useRoute(ymaps: any | null, destination: [number, number] | null): UseRouteResult {
  const coords = useCourierStore((s) => s.coords);
  const setRouteInfo = useCourierStore((s) => s.setRouteInfo);
  const setRouteSteps = useCourierStore((s) => s.setRouteSteps);
  const setCurrentStepIndex = useCourierStore((s) => s.setCurrentStepIndex);
  const markRouteFetched = useCourierStore((s) => s.markRouteFetched);
  const multiRouteRef = useRef<any>(null);
  const destinationRef = useRef<[number, number] | null>(destination);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncRouteInfo = useCallback(() => {
    const multiRoute = multiRouteRef.current;
    if (!multiRoute) return;

    const activeRoute =
      multiRoute.getActiveRoute?.() ||
      (multiRoute.getRoutes?.()?.getLength?.() ? multiRoute.getRoutes().get(0) : null);

    if (!activeRoute) return;

    const distanceMeters = readRouteMetric(activeRoute, 'distance');
    const timeSeconds =
      readRouteMetric(activeRoute, 'durationInTraffic') || readRouteMetric(activeRoute, 'duration');
    const points = extractRoutePoints(activeRoute);
    const steps = extractRouteSteps(activeRoute);

    setRouteInfo(distanceMeters, timeSeconds, points);
    setRouteSteps(steps);
    // Reset step pointer; the navigation tracker will set it from courier coords.
    setCurrentStepIndex(steps.length > 0 ? 0 : null);
    markRouteFetched();
    setLoading(false);
    setError(null);
  }, [setRouteInfo, setRouteSteps, setCurrentStepIndex, markRouteFetched]);

  const updateReferencePoints = useCallback(
    (from: [number, number], to: [number, number]) => {
      const multiRoute = multiRouteRef.current;
      if (!multiRoute) return;

      setLoading(true);
      multiRoute.model.setReferencePoints([toYmapsPoint(from), toYmapsPoint(to)]);
    },
    [],
  );

  const updateCourier = useCallback(
    (lat: number, lon: number) => {
      const to = destinationRef.current;
      if (!to) return;
      updateReferencePoints([lon, lat], to);
    },
    [updateReferencePoints],
  );

  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);

  useEffect(() => {
    if (!ymaps || !coords || !destination) return undefined;

    if (!multiRouteRef.current) {
      setLoading(true);
      const multiRoute = new ymaps.multiRouter.MultiRoute(
        {
          referencePoints: [toYmapsPoint(coords), toYmapsPoint(destination)],
          params: {
            routingMode: 'pedestrian',
            avoidTrafficJams: true,
            results: 1,
          },
        },
        {
          boundsAutoApply: false,
          routeActiveStrokeWidth: 6,
          routeActiveStrokeColor: '#FF4500',
          wayPointVisible: false,
          pinIconFillColor: 'transparent',
        },
      );

      multiRoute.model.events.add('requestsuccess', syncRouteInfo);
      multiRoute.model.events.add('requesterror', (event: any) => {
        setLoading(false);
        setError(event?.error?.message || 'Yandex marshrutini hisoblab bo‘lmadi');
      });

      multiRouteRef.current = multiRoute;
      return undefined;
    }

    updateReferencePoints(coords, destination);
    return undefined;
  }, [coords, destination, syncRouteInfo, updateReferencePoints, ymaps]);

  useEffect(() => {
    return () => {
      multiRouteRef.current = null;
    };
  }, []);

  return { isLoading, error, updateCourier };
}
