import React, { useEffect, useRef, useState } from 'react';
import type { RouteMapProps, RouteStep } from '../MapProvider';
import { getMapAnimationDuration, getMapZoomMargin } from '../performance';
import MockMapComponent from './MockMapComponent';
import { createBoundsFromPins, isYandexMapsEnabled, loadYandexMaps, toYandexCoords } from '../yandex';

const FALLBACK_MESSAGE = 'Demo xarita ishlatilmoqda. Yandex uchun `VITE_MAP_API_KEY` ni sozlang.';
const NAV_ZOOM = 17; // Street-level zoom for navigation mode

// ── Courier arrow SVG (pointing north = 0°, Yandex rotates by iconAngle) ─────
const COURIER_ARROW_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="20" fill="rgba(239,68,68,0.18)"/>
    <path d="M22 6 L34 36 L22 29 L10 36 Z"
      fill="#EF4444" stroke="white" stroke-width="2" stroke-linejoin="round"/>
  </svg>`
);
const COURIER_ARROW_URL = `data:image/svg+xml;charset=utf-8,${COURIER_ARROW_SVG}`;

export default function YandexRouteMap({
  pickup,
  destination,
  courierPos,
  routeFrom,
  routeTo,
  height = '60vh',
  className = '',
  followMode = false,
  heading,
  onMapInteraction,
  onMapReady,
  onRouteInfoChange,
  onNextStepChange,
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
  const courierPosRef = useRef(courierPos);
  const hasNavZoomedRef = useRef(false);        // true after first GPS-based nav zoom
  const isManualModeRef = useRef(false);        // true during user pan/zoom (snap-back)
  const snapBackTimerRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(isYandexMapsEnabled());
  const [hasFallback, setHasFallback] = useState(!isYandexMapsEnabled());

  const activeRouteFrom = routeFrom ?? pickup;
  const activeRouteTo = routeTo ?? destination;

  // Keep refs in sync
  useEffect(() => { followModeRef.current = followMode; }, [followMode]);
  useEffect(() => { courierPosRef.current = courierPos; }, [courierPos]);

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

  // ── Route builder ─────────────────────────────────────────────────────────
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
            strokeColor: '#22c55e',   // green route — matches Yandex nav style
            strokeOpacity: 0.95,
            strokeWidth: 6,
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

          // Extract turn-by-turn steps
          const steps: RouteStep[] = [];
          route.getPaths().each((path: any) => {
            try {
              path.getSegments().each((seg: any) => {
                const text: string = seg.properties?.get?.('text') ?? '';
                const dist: number = seg.properties?.get?.('distance.value') ?? 0;
                if (text && text.trim()) {
                  const dm = typeof dist === 'number' ? dist : 0;
                  steps.push({
                    instruction: text.trim(),
                    distanceText: dm < 1000 ? `${Math.round(dm)} m` : `${(dm / 1000).toFixed(1)} km`,
                    distanceMeters: dm,
                  });
                }
              });
            } catch {
              // segment info unavailable
            }
          });
          onNextStepChange?.(steps[0] ?? null);
        } catch {
          // ignore info extraction errors
        }

        // Only fit bounds on very first load (before courier GPS acquired)
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
            { strokeColor: '#22c55e', strokeOpacity: 0.9, strokeWidth: 6 },
          );
          map.geoObjects.add(routeRef.current);
        }
        if (!courierPlacemarkRef.current) {
          fitBounds([pickup, destination, courierPos]);
        }
      });
  }

  // ── Init map once ─────────────────────────────────────────────────────────
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

        // ── Snap-back: re-center after user pans (3 seconds) ──────────────
        map.events.add(['dragstart', 'multitouchstart'], () => {
          isManualModeRef.current = true;
          if (snapBackTimerRef.current) window.clearTimeout(snapBackTimerRef.current);
          onMapInteraction?.();
        });
        map.events.add(['dragend', 'multitouchend'], () => {
          if (snapBackTimerRef.current) window.clearTimeout(snapBackTimerRef.current);
          snapBackTimerRef.current = window.setTimeout(() => {
            isManualModeRef.current = false;
            const pos = courierPosRef.current;
            if (followModeRef.current && pos && mapRef.current) {
              mapRef.current.panTo(toYandexCoords(pos), { flying: false, duration: 500 });
            }
          }, 3000);
        });

        // Pickup marker (green circle)
        const pickupPlacemark = new ymaps.Placemark(
          toYandexCoords(pickup),
          { hintContent: 'Restoran' },
          { preset: 'islands#greenCircleIcon', iconColor: '#10B981' },
        );

        // Destination marker (red circle)
        const destinationPlacemark = new ymaps.Placemark(
          toYandexCoords(destination),
          { hintContent: 'Mijoz' },
          { preset: 'islands#redCircleIcon', iconColor: '#EF4444' },
        );

        map.geoObjects.add(pickupPlacemark);
        map.geoObjects.add(destinationPlacemark);

        mapRef.current = map;
        pickupPlacemarkRef.current = pickupPlacemark;
        destinationPlacemarkRef.current = destinationPlacemark;

        // Courier arrow marker
        if (courierPos) {
          const courierPlacemark = new ymaps.Placemark(
            toYandexCoords(courierPos),
            {},
            {
              iconLayout: 'default#image',
              iconImageHref: COURIER_ARROW_URL,
              iconImageSize: [44, 44],
              iconImageOffset: [-22, -22],
              iconAngle: heading ?? 0,
              zIndex: 200,
            },
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
      if (snapBackTimerRef.current) window.clearTimeout(snapBackTimerRef.current);
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

  // ── Rebuild route when endpoints change ───────────────────────────────────
  useEffect(() => {
    const ymaps = ymapsRef.current;
    const map = mapRef.current;
    if (!ymaps || !map) return;

    pickupPlacemarkRef.current?.geometry?.setCoordinates?.(toYandexCoords(pickup));
    destinationPlacemarkRef.current?.geometry?.setCoordinates?.(toYandexCoords(destination));

    const requestId = ++routeRequestIdRef.current;
    void buildYmapsRoute(ymaps, map, activeRouteFrom, activeRouteTo, requestId);
  }, [
    pickup.lat, pickup.lng,
    destination.lat, destination.lng,
    activeRouteFrom.lat, activeRouteFrom.lng,
    activeRouteTo.lat, activeRouteTo.lng,
  ]);

  // ── Update courier arrow position + follow ────────────────────────────────
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
      // Create arrow marker on first GPS fix
      courierPlacemarkRef.current = new ymaps.Placemark(
        toYandexCoords(courierPos),
        {},
        {
          iconLayout: 'default#image',
          iconImageHref: COURIER_ARROW_URL,
          iconImageSize: [44, 44],
          iconImageOffset: [-22, -22],
          iconAngle: heading ?? 0,
          zIndex: 200,
        },
      );
      map.geoObjects.add(courierPlacemarkRef.current);
    } else {
      courierPlacemarkRef.current.geometry?.setCoordinates?.(toYandexCoords(courierPos));
    }

    // Follow: pan to courier (skip if user is temporarily panning)
    if (followModeRef.current && !isManualModeRef.current) {
      if (!hasNavZoomedRef.current) {
        // First GPS fix: zoom to street level
        hasNavZoomedRef.current = true;
        map.setCenter(toYandexCoords(courierPos), NAV_ZOOM, { duration: 600 });
      } else {
        map.panTo(toYandexCoords(courierPos), { flying: false, duration: 600 });
      }
    }
  }, [courierPos?.lat, courierPos?.lng]);

  // ── Update courier arrow heading (iconAngle) ──────────────────────────────
  useEffect(() => {
    if (courierPlacemarkRef.current && heading !== undefined) {
      courierPlacemarkRef.current.options?.set?.('iconAngle', heading);
    }
  }, [heading]);

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
