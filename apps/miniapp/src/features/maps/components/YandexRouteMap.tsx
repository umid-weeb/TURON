import React, { useEffect, useRef, useState } from 'react';
import type { MapPin, RouteInfo, RouteMapProps } from '../MapProvider';
import { LiveMultiRouteTracker } from '../yandex-routing';
import { isYandexMaps3Enabled, loadYandexMaps3, toLngLat } from '../yandex3';
import MockMapComponent from './MockMapComponent';

const FALLBACK_MESSAGE = 'Demo xarita ishlatilmoqda. Yandex uchun `VITE_MAP_API_KEY` ni sozlang.';
const NAV_ZOOM = 17;
const DEFAULT_NAV_TILT = 50; // degrees: 0 = flat overhead, 50 = 3D like Yandex Maps app

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

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
  tilt,
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
  const mapListenerRef   = useRef<any>(null);
  const courierElRef     = useRef<HTMLDivElement | null>(null);
  // Live route tracker — ymaps2.1 multiRouter feeds polyline into ymaps3 renderer
  const trackerRef       = useRef<LiveMultiRouteTracker | null>(null);
  const lastRouteKeyRef  = useRef<string | null>(null);
  const followModeRef    = useRef(followMode);
  const courierPosRef    = useRef(courierPos);
  const headingRef       = useRef(heading ?? 0);
  const tiltRef          = useRef(tilt ?? DEFAULT_NAV_TILT);
  const cameraAzimuthRef = useRef(0);
  const cameraTiltRef    = useRef(tilt ?? DEFAULT_NAV_TILT);
  const hasNavZoomedRef  = useRef(false);
  const isManualRef      = useRef(false);
  const snapTimerRef     = useRef<number | null>(null);
  const cleanupRef       = useRef<(() => void) | null>(null);

  // Stable refs for callbacks that may change between renders
  const onRouteInfoRef   = useRef(onRouteInfoChange);
  const onNextStepRef    = useRef(onNextStepChange);
  useEffect(() => { onRouteInfoRef.current  = onRouteInfoChange; }, [onRouteInfoChange]);
  useEffect(() => { onNextStepRef.current   = onNextStepChange;  }, [onNextStepChange]);

  // Only show loading/fallback if ymaps3 is expected to work
  const ymaps3Expected = isYandexMaps3Enabled();
  const [isLoading,   setIsLoading]   = useState(ymaps3Expected);
  const [hasFallback, setHasFallback] = useState(false);

  const activeFrom = routeFrom ?? pickup;
  const activeTo   = routeTo   ?? destination;

  useEffect(() => { followModeRef.current = followMode; }, [followMode]);
  useEffect(() => { courierPosRef.current = courierPos; }, [courierPos]);
  useEffect(() => { headingRef.current    = heading ?? 0; }, [heading]);
  useEffect(() => { tiltRef.current       = tilt ?? DEFAULT_NAV_TILT; }, [tilt]);

  function syncCourierRotation(
    courierHeading = headingRef.current,
    cameraAzimuth = cameraAzimuthRef.current,
  ) {
    if (!courierElRef.current) return;
    const relativeRotation = normalizeDegrees(courierHeading - cameraAzimuth);
    courierElRef.current.style.transform =
      `translate(-50%,-50%) rotate(${relativeRotation}deg)`;
  }

  // ── Emit route info (dedup) ──────────────────────────────────────────────
  function emitRouteInfo(info: RouteInfo) {
    const key = [
      info.distance,
      info.eta,
      info.steps?.[0]?.instruction ?? '',
      info.steps?.length ?? 0,
    ].join('|');
    if (lastRouteKeyRef.current === key) return;
    lastRouteKeyRef.current = key;
    onRouteInfoRef.current?.(info);
  }

  // ── Camera update (rotation + tilt + pan) ───────────────────────────────
  function updateCamera(pos: { lat: number; lng: number }, zoom?: number) {
    const map = mapRef.current;
    if (!map) return;

    cameraAzimuthRef.current = headingRef.current;
    cameraTiltRef.current = tiltRef.current;
    syncCourierRotation(headingRef.current, cameraAzimuthRef.current);

    try {
      map.update({
        location: {
          center: toLngLat(pos),
          ...(zoom !== undefined ? { zoom } : {}),
          duration: 600,
        },
        camera: {
          azimuth: cameraAzimuthRef.current,
          tilt: cameraTiltRef.current,
        },
      });
    } catch {
      try { map.setLocation?.({ center: toLngLat(pos), duration: 600 }); } catch { /* skip */ }
    }
  }

  // ── Route polyline update ────────────────────────────────────────────────
  // Called from the LiveMultiRouteTracker callback every time the multiRouter
  // returns a new route. Tries an in-place geometry update first (no flicker)
  // and falls back to remove + add if YMapFeature.update() isn't supported.
  function updateRoutePolyline(coords: [number, number][]) {
    if (coords.length < 2) return;
    const ymaps3 = ymaps3Ref.current;
    const map    = mapRef.current;
    if (!ymaps3 || !map) return;

    if (routeFeatureRef.current) {
      try {
        routeFeatureRef.current.update({
          geometry: { type: 'LineString', coordinates: coords },
        });
        return;
      } catch {
        // YMapFeature.update() not available — fall through to recreate
      }
    }

    if (routeFeatureRef.current) {
      try { map.removeChild(routeFeatureRef.current); } catch { /* skip */ }
      routeFeatureRef.current = null;
    }

    try {
      const feature = new ymaps3.YMapFeature({
        id: 'courier-route',
        geometry: { type: 'LineString', coordinates: coords },
        style: { stroke: [{ color: '#00E676', width: 7, opacity: 0.95 }] },
      });
      map.addChild(feature);
      routeFeatureRef.current = feature;
    } catch (err) {
      console.warn('[YandexRouteMap] YMapFeature draw error:', err);
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

        // ── Create map ───────────────────────────────────────────────────────
        const map = new ymaps3.YMap(mapContainerRef.current, {
          location: { center: toLngLat(pickup), zoom: 14 },
          behaviors: [
            'drag',
            'pinchZoom',
            'pinchRotate',
            'oneFingerZoom',
            'dblClick',
            'scrollZoom',
            'mouseRotate',
            'mouseTilt',
          ],
        });

        // Dark scheme layer for night-navigation look
        map.addChild(new ymaps3.YMapDefaultSchemeLayer({ theme: 'dark' }));

        // Features layer — required for YMapFeature (route polyline) to render
        if (ymaps3.YMapDefaultFeaturesLayer) {
          map.addChild(new ymaps3.YMapDefaultFeaturesLayer({}));
        }

        // 3D camera (set after init to avoid constructor issues)
        try {
          map.update({ camera: { azimuth: 0, tilt: DEFAULT_NAV_TILT } });
          cameraAzimuthRef.current = 0;
          cameraTiltRef.current = DEFAULT_NAV_TILT;
        } catch { /* non-fatal */ }

        // Zoom control
        try {
          if (ymaps3.YMapControls && ymaps3.YMapZoomControl) {
            const controls = new ymaps3.YMapControls({ position: 'right' });
            controls.addChild(new ymaps3.YMapZoomControl({}));
            map.addChild(controls);
          }
        } catch { /* optional */ }

        // Camera listener (sync rotation state)
        try {
          const mapListener = new ymaps3.YMapListener({
            onUpdate: ({ camera }: { camera?: { azimuth?: number; tilt?: number } }) => {
              cameraAzimuthRef.current = camera?.azimuth ?? map.azimuth ?? cameraAzimuthRef.current;
              cameraTiltRef.current = camera?.tilt ?? cameraTiltRef.current;
              syncCourierRotation();
            },
          });
          map.addChild(mapListener);
          mapListenerRef.current = mapListener;
        } catch {
          mapListenerRef.current = null;
        }

        // Snap-back after manual pan: 3 s of no touch → resume follow mode
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

        // ── Markers ──────────────────────────────────────────────────────────
        try {
          const pEl = createPickupElement();
          const pMarker = new ymaps3.YMapMarker({ coordinates: toLngLat(pickup), zIndex: 100 }, pEl);
          map.addChild(pMarker);
          pickupMarkerRef.current = pMarker;
        } catch { /* skip */ }

        try {
          const dEl = createDestinationElement();
          const dMarker = new ymaps3.YMapMarker({ coordinates: toLngLat(destination), zIndex: 100 }, dEl);
          map.addChild(dMarker);
          destMarkerRef.current = dMarker;
        } catch { /* skip */ }

        if (courierPos) {
          try {
            const cEl = createCourierElement(0);
            courierElRef.current = cEl;
            const cMarker = new ymaps3.YMapMarker({ coordinates: toLngLat(courierPos), zIndex: 200 }, cEl);
            map.addChild(cMarker);
            courierMarkerRef.current = cMarker;
            syncCourierRotation(heading ?? 0, cameraAzimuthRef.current);
          } catch { /* skip */ }
        }

        mapRef.current = map;

        // ── Live route tracker ───────────────────────────────────────────────
        // ymaps2.1 multiRouter (pedestrian mode) → ymaps3 polyline renderer.
        // GPS updates call tracker.updateOrigin() which calls setReferencePoints()
        // on the existing model — no map reinit, no flicker.
        const tracker = new LiveMultiRouteTracker((info, polyline) => {
          if (disposed) return;
          updateRoutePolyline(polyline.map((p) => toLngLat(p)));
          emitRouteInfo(info);
          onNextStepRef.current?.(info.steps?.[0] ?? null);
        });
        trackerRef.current = tracker;
        void tracker.init(activeFrom, activeTo);

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
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      cleanupRef.current?.();
      trackerRef.current?.destroy();
      trackerRef.current = null;
      try { mapRef.current?.destroy(); } catch { /* skip */ }
      mapRef.current         = null;
      ymaps3Ref.current      = null;
      mapListenerRef.current = null;
      routeFeatureRef.current  = null;
      pickupMarkerRef.current  = null;
      destMarkerRef.current    = null;
      courierMarkerRef.current = null;
      courierElRef.current     = null;
      hasNavZoomedRef.current  = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMapReady, ymaps3Expected]);

  // ── Re-route when pickup / destination change ────────────────────────────
  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;

    try { pickupMarkerRef.current?.update({ coordinates: toLngLat(pickup) }); }     catch { /* skip */ }
    try { destMarkerRef.current?.update({ coordinates: toLngLat(destination) }); } catch { /* skip */ }

    // Re-init the multiRoute model with new endpoints (old model is cleanly destroyed inside)
    void tracker.init(activeFrom, activeTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickup.lat, pickup.lng,
    destination.lat, destination.lng,
    activeFrom.lat, activeFrom.lng,
    activeTo.lat,   activeTo.lng,
  ]);

  // ── GPS position update: move marker + camera + update route origin ──────
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
        const cEl = createCourierElement(0);
        courierElRef.current = cEl;
        const cMarker = new ymaps3.YMapMarker({ coordinates: toLngLat(courierPos), zIndex: 200 }, cEl);
        map.addChild(cMarker);
        courierMarkerRef.current = cMarker;
        syncCourierRotation(headingRef.current, cameraAzimuthRef.current);
      } catch { /* skip */ }
    } else {
      try { courierMarkerRef.current.update({ coordinates: toLngLat(courierPos) }); } catch { /* skip */ }
    }

    // Follow mode camera
    if (followModeRef.current && !isManualRef.current) {
      if (!hasNavZoomedRef.current) {
        hasNavZoomedRef.current = true;
        updateCamera(courierPos, NAV_ZOOM); // first fix: zoom to street level
      } else {
        updateCamera(courierPos);           // subsequent: smooth pan only
      }
    }

    // Push new origin to multiRouter — recalculates only what changed,
    // fires requestsuccess → updateRoutePolyline() → polyline refreshed
    trackerRef.current?.updateOrigin(courierPos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierPos?.lat, courierPos?.lng]);

  // ── Heading + Tilt: rotate arrow icon + camera azimuth ───────────────────
  useEffect(() => {
    syncCourierRotation(heading ?? headingRef.current, cameraAzimuthRef.current);

    if (
      mapRef.current &&
      followModeRef.current &&
      !isManualRef.current &&
      heading !== undefined
    ) {
      try {
        cameraAzimuthRef.current = heading;
        cameraTiltRef.current = tiltRef.current;
        syncCourierRotation(heading, cameraAzimuthRef.current);
        mapRef.current.update({
          camera: {
            azimuth: cameraAzimuthRef.current,
            tilt: cameraTiltRef.current,
          },
        });
      } catch { /* skip if camera not supported */ }
    }
  }, [heading, tilt]);

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
