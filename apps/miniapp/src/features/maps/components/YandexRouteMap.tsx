import React, { useEffect, useRef, useState } from 'react';
import type { RouteMapProps } from '../MapProvider';
import { getMapAnimationDuration, getMapZoomMargin } from '../performance';
import MockMapComponent from './MockMapComponent';
import { createBoundsFromPins, isYandexMapsEnabled, loadYandexMaps, toYandexCoords } from '../yandex';

const FALLBACK_MESSAGE = 'Demo xarita ishlatilmoqda. Yandex uchun `VITE_MAP_API_KEY` ni sozlang.';

export default function YandexRouteMap({
  pickup,
  destination,
  courierPos,
  routeFrom,
  routeTo,
  height = '60vh',
  className = '',
  followMode = false,
  onMapInteraction,
  onMapReady,
  onRouteInfoChange,
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const ymapsRef = useRef<any>(null);
  const routeRef = useRef<any>(null);
  const pickupPlacemarkRef = useRef<any>(null);
  const destinationPlacemarkRef = useRef<any>(null);
  const courierPlacemarkRef = useRef<any>(null);
  const routeRequestIdRef = useRef(0);
  const lastRouteInfoRef = useRef<string | null>(null);
  const followModeRef = useRef(followMode);
  const [isLoading, setIsLoading] = useState(isYandexMapsEnabled());
  const [hasFallback, setHasFallback] = useState(!isYandexMapsEnabled());

  const activeRouteFrom = routeFrom ?? pickup;
  const activeRouteTo = routeTo ?? destination;

  // Keep followMode ref in sync so the GPS effect closure always has the latest value
  useEffect(() => {
    followModeRef.current = followMode;
  }, [followMode]);

  const emitRouteInfo = (distance: string, eta: string) => {
    const nextKey = `${distance}|${eta}`;
    if (lastRouteInfoRef.current === nextKey) return;
    lastRouteInfoRef.current = nextKey;
    onRouteInfoChange?.({ distance, eta });
  };

  const fitBounds = (pins: Array<typeof pickup | undefined>) => {
    if (!mapRef.current) return;
    const bounds = createBoundsFromPins(pins.filter((pin): pin is typeof pickup => Boolean(pin)));
    if (!bounds) return;
    mapRef.current.setBounds(bounds, {
      checkZoomRange: true,
      zoomMargin: getMapZoomMargin(60),
      duration: getMapAnimationDuration(200),
    });
  };

  // Build a road-following route and style it
  function buildYmapsRoute(
    ymaps: any,
    map: any,
    from: typeof pickup,
    to: typeof pickup,
    requestId: number,
  ) {
    return ymaps
      .route([toYandexCoords(from), toYandexCoords(to)], {
        routingMode: 'auto',
        mapStateAutoApply: false,
        avoidTrafficJams: true,
      })
      .then((route: any) => {
        if (requestId !== routeRequestIdRef.current || !mapRef.current || !ymaps) return;

        if (routeRef.current) {
          map.geoObjects.remove(routeRef.current);
          routeRef.current = null;
        }

        route.getWayPoints().each((wp: any) => {
          wp.options.set({ visible: false });
        });

        route.getPaths().each((path: any) => {
          path.options.set({
            strokeColor: '#FFD700',
            strokeOpacity: 0.9,
            strokeWidth: 5,
          });
        });

        map.geoObjects.add(route);
        routeRef.current = route;

        try {
          const distanceM = route.getLength();
          const durationS = route.getTime();
          if (typeof distanceM === 'number' && typeof durationS === 'number') {
            const distKm = distanceM / 1000;
            const distStr = distKm < 1 ? `${Math.round(distanceM)} m` : `${distKm.toFixed(1)} km`;
            const etaMin = Math.ceil(durationS / 60);
            emitRouteInfo(distStr, `${etaMin} daq`);
          }
        } catch {
          // ignore info extraction errors
        }

        // Only fit bounds on first load (when courier pos not yet established)
        if (!courierPlacemarkRef.current) {
          fitBounds([pickup, destination, courierPos]);
        }
      })
      .catch(() => {
        if (requestId !== routeRequestIdRef.current || !mapRef.current) return;
        if (routeRef.current) {
          map.geoObjects.remove(routeRef.current);
          routeRef.current = null;
        }
        if (ymaps.Polyline) {
          routeRef.current = new ymaps.Polyline(
            [toYandexCoords(from), toYandexCoords(to)],
            {},
            { strokeColor: '#f59e0b', strokeOpacity: 0.9, strokeWidth: 5 },
          );
          map.geoObjects.add(routeRef.current);
        }
        if (!courierPlacemarkRef.current) {
          fitBounds([pickup, destination, courierPos]);
        }
      });
  }

  // ── Init map once ────────────────────────────────────────────────────────────
  useEffect(() => {
    let isDisposed = false;

    async function initMap() {
      if (!isYandexMapsEnabled()) {
        setHasFallback(true);
        setIsLoading(false);
        return;
      }

      try {
        const ymaps = await loadYandexMaps();
        if (isDisposed || !mapContainerRef.current) return;

        ymapsRef.current = ymaps;

        const map = new ymaps.Map(
          mapContainerRef.current,
          { center: toYandexCoords(pickup), zoom: 14, controls: ['zoomControl'] },
          { suppressMapOpenBlock: true, suppressLbsEvents: true },
        );

        map.behaviors.enable(['scrollZoom', 'dblClickZoom', 'multiTouchZoom', 'drag']);
        map.behaviors.disable(['leftMouseButtonMagnifier']);

        // Notify parent when user manually interacts with the map (disable follow mode)
        map.events.add(['dragstart', 'multitouchstart'], () => {
          onMapInteraction?.();
        });

        const pickupPlacemark = new ymaps.Placemark(
          toYandexCoords(pickup),
          { hintContent: 'Restoran', balloonContent: 'Restorandan olib ketish nuqtasi' },
          { preset: 'islands#greenCircleIcon', iconColor: '#10B981' },
        );

        const destinationPlacemark = new ymaps.Placemark(
          toYandexCoords(destination),
          { hintContent: 'Mijoz', balloonContent: 'Yetkazib berish manzili' },
          { preset: 'islands#redCircleIcon', iconColor: '#EF4444' },
        );

        map.geoObjects.add(pickupPlacemark);
        map.geoObjects.add(destinationPlacemark);

        mapRef.current = map;
        pickupPlacemarkRef.current = pickupPlacemark;
        destinationPlacemarkRef.current = destinationPlacemark;

        if (courierPos) {
          const courierPlacemark = new ymaps.Placemark(
            toYandexCoords(courierPos),
            { hintContent: 'Kuryer', balloonContent: 'Kuryerning joriy joylashuvi' },
            { preset: 'islands#yellowCircleIcon', iconColor: '#FFD700', zIndex: 200 },
          );
          map.geoObjects.add(courierPlacemark);
          courierPlacemarkRef.current = courierPlacemark;
        }

        routeRequestIdRef.current += 1;
        const requestId = routeRequestIdRef.current;

        if (!isDisposed) {
          await buildYmapsRoute(ymaps, map, activeRouteFrom, activeRouteTo, requestId);
        }

        onMapReady?.(map);
      } catch {
        setHasFallback(true);
      } finally {
        if (!isDisposed) setIsLoading(false);
      }
    }

    void initMap();

    return () => {
      isDisposed = true;
      routeRequestIdRef.current += 1;
      if (mapRef.current) mapRef.current.destroy();
      mapRef.current = null;
      ymapsRef.current = null;
      routeRef.current = null;
      pickupPlacemarkRef.current = null;
      destinationPlacemarkRef.current = null;
      courierPlacemarkRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMapReady]);

  // ── Rebuild route ONLY when route endpoints change (not on GPS update) ────────
  useEffect(() => {
    const ymaps = ymapsRef.current;
    const map = mapRef.current;
    if (!ymaps || !map) return;

    pickupPlacemarkRef.current?.geometry?.setCoordinates?.(toYandexCoords(pickup));
    destinationPlacemarkRef.current?.geometry?.setCoordinates?.(toYandexCoords(destination));

    const requestId = ++routeRequestIdRef.current;
    void buildYmapsRoute(ymaps, map, activeRouteFrom, activeRouteTo, requestId);
  }, [
    pickup.lat,
    pickup.lng,
    destination.lat,
    destination.lng,
    activeRouteFrom.lat,
    activeRouteFrom.lng,
    activeRouteTo.lat,
    activeRouteTo.lng,
  ]);

  // ── Update courier marker position without rebuilding the route ──────────────
  useEffect(() => {
    const ymaps = ymapsRef.current;
    const map = mapRef.current;
    if (!ymaps || !map) return;

    if (!courierPos) {
      if (courierPlacemarkRef.current) {
        map.geoObjects.remove(courierPlacemarkRef.current);
        courierPlacemarkRef.current = null;
      }
      return;
    }

    if (!courierPlacemarkRef.current) {
      courierPlacemarkRef.current = new ymaps.Placemark(
        toYandexCoords(courierPos),
        { hintContent: 'Kuryer', balloonContent: 'Kuryerning joriy joylashuvi' },
        { preset: 'islands#yellowCircleIcon', iconColor: '#FFD700', zIndex: 200 },
      );
      map.geoObjects.add(courierPlacemarkRef.current);
    } else {
      courierPlacemarkRef.current.geometry?.setCoordinates?.(toYandexCoords(courierPos));
    }

    // Auto-follow: smoothly pan the map to keep the courier centered
    if (followModeRef.current) {
      map.panTo(toYandexCoords(courierPos), { flying: false, duration: 600 });
    }
  }, [courierPos?.lat, courierPos?.lng]);

  if (hasFallback) {
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
          {FALLBACK_MESSAGE}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-100 shadow-inner ${className}`} style={{ height }}>
      <div ref={mapContainerRef} className="h-full w-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-lg">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <span className="text-sm font-bold text-slate-700">Xarita yuklanmoqda...</span>
          </div>
        </div>
      )}
    </div>
  );
}
