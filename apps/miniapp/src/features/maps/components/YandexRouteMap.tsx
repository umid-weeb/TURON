import React, { useEffect, useRef, useState } from 'react';
import type { RouteMapProps } from '../MapProvider';
import { isYandexMaps3Enabled, loadYandexMaps3, toLngLat } from '../yandex3';
import MockMapComponent from './MockMapComponent';

const FALLBACK_MESSAGE = 'Demo xarita ishlatilmoqda. Yandex uchun `VITE_MAP_API_KEY` ni sozlang.';
const NAV_ZOOM = 17;
const NAV_TILT = 50; // degrees: 0 = flat overhead, 50 = 3D like Yandex Maps app

// ── DOM marker factories ──────────────────────────────────────────────────────
// ymaps3 places the element's top-left at the coordinate — translate(-50%,-50%)
// centers it. Rotation is layered on top for the courier arrow.

function createCourierElement(initialHeading = 0): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText =
    'width:44px;height:44px;transform-origin:center center;will-change:transform;' +
    `transform:translate(-50%,-50%) rotate(${initialHeading}deg);`;
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
    'border:3px solid white;box-shadow:0 2px 8px rgba(16,185,129,0.55);' +
    'transform:translate(-50%,-50%);';
  return el;
}

function createDestinationElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText =
    'width:18px;height:18px;border-radius:50%;background:#EF4444;' +
    'border:3px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.55);' +
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
  const headingRef       = useRef(heading ?? 0);
  const hasNavZoomedRef  = useRef(false);
  const isManualRef      = useRef(false);
  const snapTimerRef     = useRef<number | null>(null);
  const cleanupRef       = useRef<(() => void) | null>(null);

  // Only show loading/fallback if ymaps3 is expected to work
  const ymaps3Expected = isYandexMaps3Enabled();
  const [isLoading,   setIsLoading]   = useState(ymaps3Expected);
  const [hasFallback, setHasFallback] = useState(false); // never start in fallback if key present

  const activeFrom = routeFrom ?? pickup;
  const activeTo   = routeTo   ?? destination;

  useEffect(() => { followModeRef.current = followMode; }, [followMode]);
  useEffect(() => { courierPosRef.current = courierPos; }, [courierPos]);
  useEffect(() => { headingRef.current    = heading ?? 0; }, [heading]);

  // ── Emit route info ──────────────────────────────────────────────────────
  const emitRouteInfo = (dist: string, eta: string) => {
    const key = `${dist}|${eta}`;
    if (lastRouteKeyRef.current === key) return;
    lastRouteKeyRef.current = key;
    onRouteInfoChange?.({ distance: dist, eta });
  };

  // ── Camera update (rotation + tilt + pan) ───────────────────────────────
  function updateCamera(pos: { lat: number; lng: number }, zoom?: number) {
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
          azimuth: headingRef.current,
          tilt: NAV_TILT,
        },
      });
    } catch {
      // Fallback: pan only, no camera control
      try { map.setLocation?.({ center: toLngLat(pos), duration: 600 }); } catch { /* skip */ }
    }
  }

  // ── Route builder ────────────────────────────────────────────────────────
  async function buildRoute(
    ymaps3: any,
    map: any,
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    reqId: number,
  ) {
    // Remove stale route
    if (routeFeatureRef.current) {
      try { map.removeChild(routeFeatureRef.current); } catch { /* skip */ }
      routeFeatureRef.current = null;
    }

    let coords: [number, number][] = [];
    let distText = '';
    let etaText  = '';
    let stepInstruction = '';
    let stepDistM = 0;

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
        // Handle both LineString and MultiLineString
        const geomCoords = route.geometry?.coordinates ?? [];
        if (route.geometry?.type === 'MultiLineString') {
          coords = (geomCoords as number[][][]).flat(1) as [number, number][];
        } else {
          coords = geomCoords as [number, number][];
        }

        // Distance & ETA
        try {
          const dM = route.properties?.distance?.value ?? route.distance?.value;
          const dS = route.properties?.duration?.value ?? route.duration?.value;
          if (typeof dM === 'number') {
            const km = dM / 1000;
            distText = km < 1 ? `${Math.round(dM)} m` : `${km.toFixed(1)} km`;
          }
          if (typeof dS === 'number') etaText = `${Math.ceil(dS / 60)} daq`;
        } catch { /* skip */ }

        // First turn instruction
        try {
          const steps =
            route.legs?.[0]?.steps ??
            route.properties?.legs?.[0]?.steps ??
            [];
          const step = steps[0];
          if (step) {
            stepInstruction =
              step.properties?.instruction ??
              step.instruction ??
              step.properties?.text ??
              '';
            stepDistM =
              step.properties?.distance?.value ??
              step.distance?.value ??
              0;
          }
        } catch { /* skip */ }
      }
    } catch {
      if (reqId !== routeReqRef.current || !mapRef.current) return;
      // Fallback: direct line
      coords = [toLngLat(from), toLngLat(to)];
    }

    if (reqId !== routeReqRef.current || !mapRef.current) return;

    // Draw route as GeoJSON LineString feature
    if (coords.length >= 2) {
      try {
        const feature = new ymaps3.YMapFeature({
          id: 'courier-route',
          geometry: { type: 'LineString', coordinates: coords },
          style: { stroke: [{ color: '#22c55e', width: 7, opacity: 0.92 }] },
        });
        map.addChild(feature);
        routeFeatureRef.current = feature;
      } catch (err) {
        console.warn('[YandexRouteMap] YMapFeature draw error:', err);
      }
    }

    if (distText && etaText) emitRouteInfo(distText, etaText);

    if (stepInstruction) {
      onNextStepChange?.({
        instruction: stepInstruction,
        distanceText:
          stepDistM < 1000
            ? `${Math.round(stepDistM)} m`
            : `${(stepDistM / 1000).toFixed(1)} km`,
        distanceMeters: stepDistM,
      });
    }
  }

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ymaps3Expected) {
      setHasFallback(true);
      setIsLoading(false);
      return;
    }

    let disposed = false;

    async function initMap() {
      try {
        const ymaps3 = await loadYandexMaps3();
        if (disposed || !mapContainerRef.current) return;
        ymaps3Ref.current = ymaps3;

        // ── Create map (no camera in constructor — set via update after init) ──
        const map = new ymaps3.YMap(mapContainerRef.current, {
          location: { center: toLngLat(pickup), zoom: 14 },
        });

        // ── Required layers ──────────────────────────────────────────────────
        // 1. Tile/scheme layer — dark theme for night navigation
        map.addChild(new ymaps3.YMapDefaultSchemeLayer({ theme: 'dark' }));

        // 2. Features layer — REQUIRED for YMapFeature (route polyline) to render
        if (ymaps3.YMapDefaultFeaturesLayer) {
          map.addChild(new ymaps3.YMapDefaultFeaturesLayer({}));
        }

        // ── Set 3D camera AFTER init ─────────────────────────────────────────
        try {
          map.update({ camera: { azimuth: 0, tilt: NAV_TILT } });
        } catch { /* camera might not be supported — non-fatal */ }

        // ── Zoom control ─────────────────────────────────────────────────────
        try {
          if (ymaps3.YMapControls && ymaps3.YMapZoomControl) {
            const controls = new ymaps3.YMapControls({ position: 'right' });
            controls.addChild(new ymaps3.YMapZoomControl({}));
            map.addChild(controls);
          }
        } catch { /* controls optional */ }

        // ── Snap-back: pointer events on container ───────────────────────────
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
            if (followModeRef.current && p) updateCamera(p);
          }, 3000);
        };
        el.addEventListener('pointerdown', onDown, { passive: true });
        el.addEventListener('pointerup',    onUp,  { passive: true });
        el.addEventListener('pointercancel', onUp, { passive: true });
        cleanupRef.current = () => {
          el.removeEventListener('pointerdown', onDown);
          el.removeEventListener('pointerup',    onUp);
          el.removeEventListener('pointercancel', onUp);
        };

        // ── Pickup marker (green dot) ────────────────────────────────────────
        try {
          const pEl = createPickupElement();
          const pMarker = new ymaps3.YMapMarker({ coordinates: toLngLat(pickup), zIndex: 100 }, pEl);
          map.addChild(pMarker);
          pickupMarkerRef.current = pMarker;
        } catch { /* skip */ }

        // ── Destination marker (red dot) ─────────────────────────────────────
        try {
          const dEl = createDestinationElement();
          const dMarker = new ymaps3.YMapMarker({ coordinates: toLngLat(destination), zIndex: 100 }, dEl);
          map.addChild(dMarker);
          destMarkerRef.current = dMarker;
        } catch { /* skip */ }

        // ── Courier arrow marker ─────────────────────────────────────────────
        if (courierPos) {
          try {
            const cEl = createCourierElement(heading ?? 0);
            courierElRef.current = cEl;
            const cMarker = new ymaps3.YMapMarker({ coordinates: toLngLat(courierPos), zIndex: 200 }, cEl);
            map.addChild(cMarker);
            courierMarkerRef.current = cMarker;
          } catch { /* skip */ }
        }

        mapRef.current = map;

        // ── Build initial route ───────────────────────────────────────────────
        const reqId = ++routeReqRef.current;
        if (!disposed) await buildRoute(ymaps3, map, activeFrom, activeTo, reqId);

        onMapReady?.(map);
      } catch (err) {
        console.error('[YandexRouteMap] initMap failed:', err);
        if (!disposed) setHasFallback(true);
      } finally {
        if (!disposed) setIsLoading(false);
      }
    }

    void initMap();

    return () => {
      disposed = true;
      routeReqRef.current += 1;
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      cleanupRef.current?.();
      try { mapRef.current?.destroy(); } catch { /* skip */ }
      mapRef.current       = null;
      ymaps3Ref.current    = null;
      routeFeatureRef.current  = null;
      pickupMarkerRef.current  = null;
      destMarkerRef.current    = null;
      courierMarkerRef.current = null;
      courierElRef.current     = null;
      hasNavZoomedRef.current  = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMapReady, ymaps3Expected]);

  // ── Rebuild route when endpoints change ──────────────────────────────────
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
    activeTo.lat,   activeTo.lng,
  ]);

  // ── GPS position update: move courier + camera ────────────────────────────
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

    // Create courier marker on first GPS fix
    if (!courierMarkerRef.current) {
      try {
        const cEl = createCourierElement(heading ?? 0);
        courierElRef.current = cEl;
        const cMarker = new ymaps3.YMapMarker({ coordinates: toLngLat(courierPos), zIndex: 200 }, cEl);
        map.addChild(cMarker);
        courierMarkerRef.current = cMarker;
      } catch { /* skip */ }
    } else {
      try { courierMarkerRef.current.update({ coordinates: toLngLat(courierPos) }); } catch { /* skip */ }
    }

    // Follow + camera
    if (followModeRef.current && !isManualRef.current) {
      if (!hasNavZoomedRef.current) {
        hasNavZoomedRef.current = true;
        updateCamera(courierPos, NAV_ZOOM); // first fix: zoom to street level
      } else {
        updateCamera(courierPos);           // subsequent: smooth pan
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierPos?.lat, courierPos?.lng]);

  // ── Heading update: rotate arrow icon + camera azimuth ───────────────────
  useEffect(() => {
    // Rotate the courier arrow element via CSS (instant, smooth)
    if (courierElRef.current && heading !== undefined) {
      courierElRef.current.style.transform =
        `translate(-50%,-50%) rotate(${heading}deg)`;
    }
    // Also update the map camera azimuth for heading-up navigation
    if (
      mapRef.current &&
      followModeRef.current &&
      !isManualRef.current &&
      heading !== undefined
    ) {
      try {
        mapRef.current.update({ camera: { azimuth: heading, tilt: NAV_TILT } });
      } catch { /* skip if camera not supported */ }
    }
  }, [heading]);

  // ── Fallback: no API key or permanent failure ────────────────────────────
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
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-full bg-slate-800 px-5 py-3 shadow-lg">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            <span className="text-sm font-bold text-white">Xarita yuklanmoqda...</span>
          </div>
        </div>
      )}
    </div>
  );
}
