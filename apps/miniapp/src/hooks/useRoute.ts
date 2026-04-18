import { useQuery } from '@tanstack/react-query';
import { useCourierStore } from '../store/courierStore';

interface RouteResult {
  points: [number, number][];     // Polyline nuqtalari [lon, lat][]
  distanceMeters: number;
  timeSeconds: number;
}

/**
 * ymaps 2.1 multiRouter bilan pedestrian marshrut olish.
 * ymaps — useYmaps21() dan kelgan instance.
 *
 * multiRouter natijalarini courierStore da saqlaymiz.
 */
async function fetchPedestrianRoute(
  ymaps: any,
  from: [number, number],
  to: [number, number],
): Promise<RouteResult> {
  return new Promise((resolve, reject) => {
    const multiRoute = new ymaps.multiRouter.MultiRoute(
      {
        referencePoints: [
          [from[1], from[0]],   // ymaps: [lat, lon] (swap!)
          [to[1], to[0]],
        ],
        params: {
          routingMode: 'pedestrian',   // Piyoda marshrut — courier uchun
          results: 1,
        },
      },
      { boundsAutoApply: false },
    );

    multiRoute.model.events.add('requestsuccess', () => {
      const routes = multiRoute.getRoutes();
      if (!routes.getLength()) {
        reject(new Error('No route found'));
        return;
      }

      const route = routes.get(0);
      const geometry = route.geometry.getCoordinates(); // [[lat, lon], ...]
      const props = route.properties.getAll();

      // ymaps [lat, lon] → bizning [lon, lat] formatiga o'tkazish (GeoJSON)
      resolve({
        points: geometry.map(([lat, lon]: number[]) => [lon, lat]),
        distanceMeters: props.distance?.value ?? 0,
        timeSeconds: props.duration?.value ?? 0,
      });
    });

    multiRoute.model.events.add('requesterror', (event: any) => {
      reject(new Error(`multiRouter error: ${event.error}`));
    });
  });
}

/**
 * Courier destinatsiyasigacha marshrut kalkulyatsiya qilish.
 * Har 30 soniyada avtomatik yangilaydi.
 * courierStore da distanceLeft, timeLeft, routePoints saqlaymiz.
 */
export function useRoute(
  ymaps: any | null,
  destination: [number, number] | null,
) {
  const coords = useCourierStore((s) => s.coords);
  const setRouteInfo = useCourierStore((s) => s.setRouteInfo);

  const query = useQuery<RouteResult>({
    queryKey: [
      'route',
      coords?.[0],
      coords?.[1],
      destination?.[0],
      destination?.[1],
    ],
    queryFn: async () => {
      if (!ymaps || !coords || !destination) throw new Error('Not ready');
      const result = await fetchPedestrianRoute(ymaps, coords, destination);
      setRouteInfo(result.distanceMeters, result.timeSeconds, result.points);
      return result;
    },
    enabled: !!ymaps && !!coords && !!destination,
    staleTime: 30_000,        // 30 soniyada bir yangilanadi
    refetchInterval: 30_000,  // Avtomatik yangilash
    retry: 2,
  });

  return query;
}
