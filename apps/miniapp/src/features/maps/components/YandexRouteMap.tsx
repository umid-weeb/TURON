import React, { useEffect, useRef, useState } from 'react';
import type { RouteMapProps } from '../MapProvider';
import { isYandexMaps3Enabled, loadYandexMaps3, toLngLat } from '../yandex3';
import MockMapComponent from './MockMapComponent';

const FALLBACK_MESSAGE = 'Demo xarita ishlatilmoqda. Yandex uchun `VITE_MAP_API_KEY` ni sozlang.';
const NAV_ZOOM = 17;
const NAV_TILT = 50; // degrees: 0=flat overhead, 50=3D perspective like Yandex Maps

// ── DOM marker helpers ────────────────────────────────────────────────────────

function createCourierElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'width:44px;height:44px;transform-origin:center center;will-change:transform;';
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44">
    <circle cx="22" cy="22" r="20" fill="rgba(239,68,68,0.20)"/>
    <path d="M22 6 L35 37 L22 30 L9 37 Z"
      fill="#EF4444" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
  </svg>`;
  return el;
}

function createPickupElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText =
    'width:18px;height:18px;border-radius:50%;background:#10B981;' +
    'border:3px solid white;box-shadow:0 2px 8px rgba(16,185,129,0.5);' +
    'transform:translate(-50%,-50%);';
  return el;
}

function createDestinationElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText =
    'width:18px;height:18px;border-radius:50%;background:#EF4444;' +
    'border:3px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.5);' +
    'transform:translate(-50%,-50%);';
  return el;
}

// ── Component ─────────────────────────────────────────────────────────────────

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
  const mapContainerRef  = useRef<HTMLDivElement | null>(null);
  const mapRef           = useRef<any>(null);
  const ymaps3Ref        = useRef<any>(null);
  const routeFeatureRef  = useRef<any>(null);
  const pickupMarkerRef  = useRef<any>(null);
  const destMarkerRef    = useRef<any>(null);
  const courierMarkerRef = useRef<any>(null);
  const courierElRef     = useRef<HTMLDivElement | null>(null);
  const routeReqRef      = useRef(0);
  const lastRouteKeyRef  = useRef<string | null>(null);
  const followModeRef    = useRef(followMode);
  const courierPosRef    = useRef(courierPos);
  const headingRef       = useRef(heading);
  const hasNavZoomedRef  = useRef(false);
  const isManualRef      = useRef(false);
  const snapTimerRef     = useRef<number | null>(null);
  const cleanupEvtsRef   = useRef<(() => void) | null>(null);

  const [isLoading,   setIsLoading]   = useState(isYandexMaps3Enabled());
  const [hasFallback, setHasFallback] = useState(!isYandexMaps3Enabled());

  const activeFrom = routeFrom ?? pickup;
  const activeTo   = routeTo   ?? destination;

  // Keep refs in sync
  useEffect(() => { followModeRef.current  = followMode;  }, [followMode]);
  useEffect(() => { courierPosRef.current  = courierPos;  }, [courierPos]);
  useEffect(() => { headingRef.current     = heading;     }, [heading]);

  // ── Emit route info (deduplicated) ──────────────────────────────────────────
  const emitRouteInfo = (dist: string, eta: string) => {
    const key = `${dist}|${eta}`;
    if (lastRouteKeyRef.current === key) return;
    lastRouteKeyRef.current = key;
    onRouteInfoChange?.({ distance: dist, eta });
  };

  // ── Camera: pan + rotate + tilt ─────────────────────────────────────────────
  function applyCamera(pos: { lat: number; lng: number }, zoom?: number) {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.update({
        location: {
          center: toLngLat(pos),
          ...(zoom !== undefined ? { zoom } : {}),
          duration: 600,
        },
        camera: {
          azimuth: headingRef.current ?? 0,
          tilt: NAV_TILT,
        },
      });
    } catch {
      try { map.setLocation?.({ center: toLngLat(pos), duration: 600 }); } catch { /* skip */ }
    }
  }

  // ── Build route ─────────────────────────────────────────────────────────────
  async function buildRoute(
    ymaps3: any,
    map: any,
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    reqId: number,
  ) {
    // Remove old route
    if (routeFeatureRef.current) {
      try { map.removeChild(routeFeatureRef.current); } catch { /* skip */ }
      routeFeatureRef.current = null;
    }

    let coords: [number, number][] = [];
    let distText = '';
    let etaText  = '';
    let firstStepInstruction = '';
    let firstStepDistM = 0;

    try {
      const result = await ymaps3.route({
        points: [
          { type: 'coordinates', coordinates: toLngLat(from) },
          { type: 'coordinates', coordinates: toLngLat(to) },
        ],
        type: 'driving',
      });

      if (reqId !== routeReqRef.current || !mapRef.current) return;

      const route = result?.routes?.[0];
      if (route) {
        // Flatten MultiLineString or LineString coords
        const rawCoords =
          route.geometry?.type === 'MultiLineString'
            ? (route.geometry.coordinates as number[][][]).flat(1)
            : (route.geometry?.coordinates ?? []);
        coords = rawCoords as [number, number][];

        try {
          const dM = route.properties?.distance?.value ?? route.distance?.value;
          const dS = route.properties?.duration?.value ?? route.duration?.value;
          if (typeof dM === 'number') {
            const km = dM / 1000;
            distText = km < 1 ? `${Math.round(dM)} m` : `${km.toFixed(1)} km`;
          }
          if (typeof dS === 'number') {
            etaText = `${Math.ceil(dS / 60)} daq`;
          }
        } catch { /* skip */ }

        try {
          const step = (route.legs?.[0]?.steps ?? route.properties?.legs?.[0]?.steps ?? [])[0];
          if (step) {
            firstStepInstruction =
              step.properties?.instruction ?? step.instruction ?? step.properties?.text ?? '';
            firstStepDistM =
              step.properties?.distance?.value ?? step.distance?.value ?? 0;
          }
        } catch { /* skip */ }
      }
    } catch {
      if (reqId !== routeReqRef.current || !mapRef.current) return;
      // Fallback: straight polyline
      coords = [toLngLat(from), toLngLat(to)];
    }

    if (reqId !== routeReqRef.current || !mapRef.current) return;

    // Draw route feature
    if (coords.length >= 2) {
      try {
        const feature = new ymaps3.YMapFeature({
          id: 'route',
          geometry: { type: 'LineString', coordinates: coords },
          style: { stroke: [{ color: '#22c55e', width: 6, opacity: 0.95 }] },
        });
        map.addChild(feature);
        routeFeatureRef.current = feature;
      } catch { /* skip */ }
    }

    if (distText && etaText) emitRouteInfo(distText, etaText);

    if (firstStepInstruction) {
      onNextStepChange?.({
        instruction: firstStepInstruction,
        distanceText:
          firstStepDistM < 1000
            ? `${Math.round(firstStepDistM)} m`
            : `${(firstStepDistM / 1000).toFixed(1)} km`,
        distanceMeters: firstStepDistM,
      });
    }
  }

  // ── Init map once ────────────────────────────────────────────────────────────
  useEffect(() => {
    let isDisposed = false;

    async function initMap() {
      if (!isYandexMaps3Enabled()) { setHasFallback(true); setIsLoading(false); return; }

      try {
        const ymaps3 = await loadYandexMaps3();
        if (isDisposed || !mapContainerRef.current) return;

        ymaps3Ref.current = ymaps3;

        // Create map with 3D camera support
        const map = new ymaps3.YMap(mapContainerRef.current, {
          location: { center: toLngLat(pickup), zoom: 14 },
          camera: { azimuth: 0, tilt: 0 },
        });

        // Dark tile layer (matches our dark UI)
        map.addChild(new ymaps3.YMapDefaultSchemeLayer({ theme: 'dark' }));

        // Zoom control
        try {
          const controls = new ymaps3.YMapControls({ position: 'right' });
          controls.addChild(new ymaps3.YMapZoomControl({}));
          map.addChild(controls);
        } catch { /* controls optional */ }

        // ── Snap-back: DOM pointer events on map container ──────────────────
        const el = mapContainerRef.current;
        const onDown = () => {
          isManualRef.current = true;
          if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
          onMapInteraction?.();
        };
        const onUp = () => {
          if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
          snapTimerRef.current = window.setTimeout(() => {
            isManualRef.current = false;
            const p = courierPosRef.current;
            if (followModeRef.current && p && mapRef.current) applyCamera(p);
          }, 3000);
        };
        el.addEventListener('pointerdown', onDown, { passive: true });
        el.addEventListener('pointerup',   onUp,   { passive: true });
        el.addEventListener('pointercancel', onUp, { passive: true });
        cleanupEvtsRef.current = () => {
          el.removeEventListener('pointerdown', onDown);
          el.removeEventListener('pointerup',   onUp);
          el.removeEventListener('pointercancel', onUp);
        };

        // ── Pickup marker ────────────────────────────────────────────────────
        const pickupEl = createPickupElement();
        const pickupMarker = new ymaps3.YMapMarker(
          { coordinates: toLngLat(pickup), zIndex: 100 },
          pickupEl,
        );
        map.addChild(pickupMarker);
        pickupMarkerRef.current = pickupMarker;

        // ── Destination marker ────────────────────────────────────────────────
        const destEl = createDestinationElement();
        const destMarker = new ymaps3.YMapMarker(
          { coordinates: toLngLat(destination), zIndex: 100 },
          destEl,
        );
        map.addChild(destMarker);
        destMarkerRef.current = destMarker;

        // ── Courier arrow marker ──────────────────────────────────────────────
        if (courierPos) {
          const cEl = createCourierElement();
          cEl.style.transform = `rotate(${heading ?? 0}deg)`;
          courierElRef.current = cEl;
          const cMarker = new ymaps3.YMapMarker(
            { coordinates: toLngLat(courierPos), zIndex: 200 },
            cEl,
          );
          map.addChild(cMarker);
          courierMarkerRef.current = cMarker;
        }

        mapRef.current = map;

        // Build first route
        const reqId = ++routeReqRef.current;
        if (!isDisposed) {
          await buildRoute(ymaps3, map, activeFrom, activeTo, reqId);
        }

        onMapReady?.(map);
      } catch {
        if (!isDisposed) setHasFallback(true);
      } finally {
        if (!isDisposed) setIsLoading(false);
      }
    }

    void initMap();

    return () => {
      isDisposed = true;
      routeReqRef.current += 1;
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      cleanupEvtsRef.current?.();
      try { mapRef.current?.destroy(); } catch { /* skip */ }
      mapRef.current       = null;
      ymaps3Ref.current    = null;
      routeFeatureRef.current  = null;
      pickupMarkerRef.current  = null;
      destMarkerRef.current    = null;
      courierMarkerRef.current = null;
      courierElRef.current     = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMapReady]);

  // ── Rebuild route when endpoints change ───────────────────────────────────
  useEffect(() => {
    const ymaps3 = ymaps3Ref.current;
    const map    = mapRef.current;
    if (!ymaps3 || !map) return;

    try { pickupMarkerRef.current?.update({ coordinates: toLngLat(pickup) }); }     catch { /* skip */ }
    try { destMarkerRef.current?.update({ coordinates: toLngLat(destination) }); } catch { /* skip */ }

    const reqId = ++routeReqRef.current;
    void buildRoute(ymaps3, map, activeFrom, activeTo, reqId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickup.lat, pickup.lng,
    destination.lat, destination.lng,
    activeFrom.lat, activeFrom.lng,
    activeTo.lat, activeTo.lng,
  ]);

  // ── Update courier position + camera follow ───────────────────────────────
  useEffect(() => {
    const ymaps3 = ymaps3Ref.current;
    const map    = mapRef.current;
    if (!ymaps3 || !map) return;

    if (!courierPos) {
      if (courierMarkerRef.current) {
        try { map.removeChild(courierMarkerRef.current); } catch { /* skip */ }
        courierMarkerRef.current = null;
        courierElRef.current     = null;
      }
      return;
    }

    // Create marker if it doesn't exist yet
    if (!courierMarkerRef.current) {
      const cEl = createCourierElement();
      cEl.style.transform = `rotate(${heading ?? 0}deg)`;
      courierElRef.current = cEl;
      const marker = new ymaps3.YMapMarker(
        { coordinates: toLngLat(courierPos), zIndex: 200 },
        cEl,
      );
      map.addChild(marker);
      courierMarkerRef.current = marker;
    } else {
      try { courierMarkerRef.current.update({ coordinates: toLngLat(courierPos) }); }
      catch { /* skip */ }
    }

    if (followModeRef.current && !isManualRef.current) {
      if (!hasNavZoomedRef.current) {
        hasNavZoomedRef.current = true;
        applyCamera(courierPos, NAV_ZOOM);
      } else {
        applyCamera(courierPos);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierPos?.lat, courierPos?.lng]);

  // ── Update courier arrow CSS rotation + camera azimuth ───────────────────
  useEffect(() => {
    if (courierElRef.current && heading !== undefined) {
      courierElRef.current.style.transform = `rotate(${heading}deg)`;
    }
    // Smoothly rotate the map camera to match heading in follow mode
    if (
      mapRef.current &&
      followModeRef.current &&
      !isManualRef.current &&
      heading !== undefined
    ) {
      try {
        mapRef.current.update({ camera: { azimuth: heading, tilt: NAV_TILT } });
      } catch { /* skip */ }
    }
  }, [heading]);

  // ── Fallback (no API key) ─────────────────────────────────────────────────
  if (hasFallback) {
    const markers = [
      { id: 'pickup',      position: pickup,      label: 'RESTORAN', type: 'PICKUP'   as const },
      { id: 'destination', position: destination, label: 'MIJOZ',    type: 'DELIVERY' as const },
      ...(courierPos
        ? [{ id: 'courier', position: courierPos, label: 'KURYER', type: 'COURIER' as const }]
        : []),
    ];
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-gray-100 shadow-inner ${className}`}
        style={{ height }}
      >
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
    <div
      className={`relative overflow-hidden rounded-2xl bg-gray-100 shadow-inner ${className}`}
      style={{ height }}
    >
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
