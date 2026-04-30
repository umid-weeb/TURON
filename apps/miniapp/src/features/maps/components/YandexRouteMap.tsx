import React, { useEffect, useRef, useState } from 'react';
import type { MapPin, RouteInfo, RouteMapProps } from '../MapProvider';
import { LiveMultiRouteTracker } from '../yandex-routing';
import { isYandexMaps3Enabled, loadYandexMaps3, toLngLat } from '../yandex3';
import MockMapComponent from './MockMapComponent';
import { useCourierStore } from '../../../store/courierStore';
import {
  arrowSpotsAlongPolyline,
  haversineMeters,
  projectOntoPolyline,
  type LngLat,
} from '../../../lib/routeGeometry';

const FALLBACK_MESSAGE = 'Demo xarita ishlatilmoqda. Yandex uchun `VITE_MAP_API_KEY` ni sozlang.';

// Navigation camera tuning — these values drive the "real navigator" feel.
// They were chosen to match Yandex Navigator / Uber Driver:
//   - close zoom (lane-level)
//   - strong tilt (3D road perspective)
//   - center pushed ~85m ahead of the courier so the arrow sits in the
//     lower third of the screen and the route ahead fills the rest.
const NAV_ZOOM = 17.6;
const DEFAULT_NAV_TILT = 55;
const FORWARD_OFFSET_DEGREES = 0.00075; // ≈ 85m at Tashkent latitude
const CAMERA_PAN_DURATION_MS = 800;
const CAMERA_AZIMUTH_DURATION_MS = 320;
const MIN_PAN_METERS = 1.6;
const MIN_PAN_INTERVAL_MS = 350;

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

/**
 * Push the camera target ~85m forward from the courier in the heading
 * direction. The result drops the courier marker into the lower third of
 * the viewport so the road ahead fills most of the screen — Yandex
 * Navigator's classic camera framing.
 */
function forwardOffset(
  pos: { lat: number; lng: number },
  headingDeg: number,
): { lat: number; lng: number } {
  const rad = (headingDeg * Math.PI) / 180;
  return {
    lng: pos.lng + Math.sin(rad) * FORWARD_OFFSET_DEGREES,
    lat: pos.lat + Math.cos(rad) * FORWARD_OFFSET_DEGREES,
  };
}

// ── DOM marker factories ──────────────────────────────────────────────────────
// ymaps3 places the element's top-left at the coordinate — translate(-50%,-50%)
// centers it. Rotation is layered on top for the courier arrow.

function createCourierElement(initialHeading = 0): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText =
    'width:60px;height:60px;transform-origin:center center;will-change:transform;' +
    `transform:translate(-50%,-50%) rotate(${initialHeading}deg);` +
    'pointer-events:none;';
  // 3D red navigation arrow:
  //  - vertical linear gradient gives the body a lit-from-above 3D feel
  //  - radial halo behind it pulses to draw attention without being noisy
  //  - white stroke + drop shadow + glossy highlight stripe lift it off the map
  el.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="60" height="60">
  <defs>
    <linearGradient id="navArrowFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FF6A6A"/>
      <stop offset="55%" stop-color="#E83535"/>
      <stop offset="100%" stop-color="#9C0000"/>
    </linearGradient>
    <linearGradient id="navArrowHi" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.95)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <radialGradient id="navHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(232,53,53,0.32)"/>
      <stop offset="60%" stop-color="rgba(232,53,53,0.14)"/>
      <stop offset="100%" stop-color="rgba(232,53,53,0)"/>
    </radialGradient>
    <filter id="navShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="3" stdDeviation="3.2" flood-color="rgba(0,0,0,0.55)"/>
    </filter>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#navHalo)">
    <animate attributeName="opacity" values="0.45;0.85;0.45" dur="2s" repeatCount="indefinite"/>
  </circle>
  <path d="M32 8 L52 52 L32 42 L12 52 Z"
    fill="url(#navArrowFill)" stroke="white" stroke-width="2.6"
    stroke-linejoin="round" filter="url(#navShadow)"/>
  <path d="M32 12 L46 46 L32 38 Z" fill="url(#navArrowHi)" opacity="0.55"/>
  <line x1="32" y1="14" x2="32" y2="36" stroke="rgba(255,255,255,0.55)"
    stroke-width="1.4" stroke-linecap="round"/>
</svg>`;
  return el;
}

/**
 * White chevron used as a repeating "this way" indicator on the green
 * polyline. Designed to read clearly on the bright-green stroke at zoom
 * 17–18 (Yandex Maps reference). Rotates per spot bearing so it always
 * points down the route in the direction of travel.
 */
function createDirectionArrowElement(bearingDeg: number): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText =
    'width:26px;height:26px;transform-origin:center center;pointer-events:none;' +
    `transform:translate(-50%,-50%) rotate(${bearingDeg}deg);`;
  // Outer chevron has a thin dark stroke so it stays readable when it sits
  // on the lighter green core; inner chevron is pure white.
  el.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26">
  <path d="M12 2 L20 21 L12 16.5 L4 21 Z"
    fill="white" stroke="rgba(0,0,0,0.35)" stroke-width="1.4"
    stroke-linejoin="round"/>
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
  courierIconSvg = '',
  onMapInteraction,
  onMapReady,
  onRouteInfoChange,
  onNextStepChange,
}: RouteMapProps) {
  // ── Zustand: heading pipeline (compass → smoothedHeading → camera + marker) ──
  // Spec: heading must flow through Zustand so marker rotation and map azimuth
  // always use the same smoothed value regardless of prop changes.
  const smoothedHeading = useCourierStore((s) => s.smoothedHeading);
  const hasValidHeading = useCourierStore(
    (s) => s.compassHeading !== null || s.gpsHeading !== null,
  );

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
  const trackerRef            = useRef<LiveMultiRouteTracker | null>(null);
  // Last polyline coords from multiRouter (road-snapped). Used to instantly move
  // the polyline head on GPS tick before the full re-route response arrives.
  const lastPolylineCoordsRef = useRef<[number, number][]>([]);
  // Direction-arrow markers placed along the polyline. We rebuild the array
  // each time the route changes; refs let us detach the old markers cleanly.
  const arrowMarkersRef       = useRef<any[]>([]);
  const lastRouteKeyRef       = useRef<string | null>(null);
  const followModeRef    = useRef(followMode);
  const courierPosRef    = useRef(courierPos);
  // headingRef now mirrors smoothedHeading from store (not the `heading` prop)
  const headingRef       = useRef(smoothedHeading);
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
  // headingRef tracks smoothedHeading from store (single source of truth)
  useEffect(() => { headingRef.current = smoothedHeading; }, [smoothedHeading]);
  useEffect(() => { tiltRef.current    = tilt ?? DEFAULT_NAV_TILT; }, [tilt]);

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

  // Throttle / dedupe state for the navigation camera.
  const lastPanCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastPanTickRef   = useRef<number>(0);

  // ── Camera update (rotation + tilt + pan) ───────────────────────────────
  // Always pass `zoom` and `tilt` explicitly — some ymaps3 builds reset them
  // when the property is omitted from a subsequent location.update(). This
  // is the fix for the "goh zoom 17, goh 19, goh 16" jumping observed on
  // device.
  function updateCamera(pos: { lat: number; lng: number }, opts?: { force?: boolean }) {
    const map = mapRef.current;
    if (!map) return;

    // Dead-zone + throttle: skip nano-moves and back-to-back updates so the
    // camera doesn't jitter when GPS reports identical coords twice or only
    // wobbles by a meter or two due to multipath.
    const now = Date.now();
    const last = lastPanCenterRef.current;
    if (!opts?.force && last) {
      const moved = haversineMeters([last.lng, last.lat], [pos.lng, pos.lat]);
      const sinceLast = now - lastPanTickRef.current;
      if (moved < MIN_PAN_METERS && sinceLast < 4000) return;
      if (sinceLast < MIN_PAN_INTERVAL_MS) return;
    }

    const heading = headingRef.current;
    cameraAzimuthRef.current = heading;
    cameraTiltRef.current = tiltRef.current;
    syncCourierRotation(heading, cameraAzimuthRef.current);

    // Forward-bias: drop the courier into the lower third of the viewport.
    const target = forwardOffset(pos, heading);

    try {
      map.update({
        location: {
          center: toLngLat(target),
          zoom: NAV_ZOOM,
          azimuth: heading,
          tilt: cameraTiltRef.current,
          duration: CAMERA_PAN_DURATION_MS,
        },
      });
    } catch {
      try { map.setLocation?.({ center: toLngLat(target), duration: CAMERA_PAN_DURATION_MS }); } catch { /* skip */ }
    }

    lastPanCenterRef.current = { lat: pos.lat, lng: pos.lng };
    lastPanTickRef.current = now;
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
        style: {
          stroke: [
            // soft outer shadow so the polyline reads on dark tiles
            { color: 'rgba(0,0,0,0.55)', width: 14, opacity: 0.6 },
            // dark green outer ring (Yandex Maps reference green)
            { color: '#0A8F3A', width: 11, opacity: 1 },
            // primary bright green core
            { color: '#16C95C', width: 8, opacity: 1 },
            // soft white centerline highlight for readability
            { color: 'rgba(255,255,255,0.4)', width: 2, opacity: 0.85 },
          ],
        },
      });
      map.addChild(feature);
      routeFeatureRef.current = feature;
    } catch (err) {
      console.warn('[YandexRouteMap] YMapFeature draw error:', err);
    }
  }

  // ── Direction-of-travel arrows along the polyline ─────────────────────────
  // Replaces ymaps3's missing dash/pattern primitives with explicit white
  // chevron markers placed every ~110m and at every clear bearing change.
  function refreshDirectionArrows(coords: [number, number][]) {
    const ymaps3 = ymaps3Ref.current;
    const map    = mapRef.current;
    if (!ymaps3 || !map) return;

    // Remove existing arrows so we can rebuild for the new geometry.
    for (const marker of arrowMarkersRef.current) {
      try { map.removeChild(marker); } catch { /* skip */ }
    }
    arrowMarkersRef.current = [];

    if (coords.length < 2) return;

    const polyline = coords.map((c) => [c[0], c[1]] as LngLat);
    const spots = arrowSpotsAlongPolyline(polyline, {
      intervalMeters: 110,
      vertexAngleDeg: 25,
      skipStartMeters: 35,
      skipEndMeters: 25,
    });

    for (const spot of spots) {
      try {
        const el = createDirectionArrowElement(spot.bearingDeg);
        const marker = new ymaps3.YMapMarker(
          { coordinates: spot.point, zIndex: 150 },
          el,
        );
        map.addChild(marker);
        arrowMarkersRef.current.push(marker);
      } catch {
        /* skip individual arrow on error */
      }
    }
  }

  // ── Init map ─────────────────────────────────────────────────────────────
  const onMapReadyRef = useRef(onMapReady);
  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    if (!ymaps3Expected || !mapContainerRef.current) {
      setHasFallback(true);
      setIsLoading(false);
      return;
    }

    let cleanup: (() => void) | null = null;
    let disposed = false;
    loadYandexMaps3()
      .then((ymaps3) => {
        if (disposed || !mapContainerRef.current) return;
        ymaps3Ref.current = ymaps3;
        const map = new ymaps3.YMap(mapContainerRef.current, {
          location: {
            center: toLngLat(pickup || { lat: 0, lng: 0 }),
            zoom: NAV_ZOOM,
            azimuth: 0,
            tilt: DEFAULT_NAV_TILT,
          },
          camera: { tilt: DEFAULT_NAV_TILT, azimuth: 0 },
          mode: 'vector',
          behaviors: ['drag', 'pinchZoom', 'pinchRotate', 'oneFingerZoom', 'scrollZoom'],
        });
        cameraAzimuthRef.current = 0;
        cameraTiltRef.current = DEFAULT_NAV_TILT;

        // Layers
        try { map.addChild(new ymaps3.YMapDefaultSchemeLayer({ theme: 'dark' })); }
        catch { /* skip */ }
        try {
          if (ymaps3.YMapDefaultFeaturesLayer) {
            map.addChild(new ymaps3.YMapDefaultFeaturesLayer({}));
          }
        } catch { /* skip */ }

        // Endpoint markers
        try {
          const pEl = createPickupElement();
          const pMarker = new ymaps3.YMapMarker(
            { coordinates: toLngLat(pickup), zIndex: 100 },
            pEl,
          );
          map.addChild(pMarker);
          pickupMarkerRef.current = pMarker;
        } catch { /* skip */ }

        try {
          const dEl = createDestinationElement();
          const dMarker = new ymaps3.YMapMarker(
            { coordinates: toLngLat(destination), zIndex: 100 },
            dEl,
          );
          map.addChild(dMarker);
          destMarkerRef.current = dMarker;
        } catch { /* skip */ }

        // Live route tracker — feeds polyline + steps, refreshes arrows.
        const tracker = new LiveMultiRouteTracker((info, polyline) => {
          if (disposed) return;
          const coords = polyline.map((p) => toLngLat(p));
          lastPolylineCoordsRef.current = coords;
          updateRoutePolyline(coords);
          refreshDirectionArrows(coords);
          if (polyline[0]) {
            try { courierMarkerRef.current?.update({ coordinates: coords[0] }); }
            catch { /* skip */ }
          }
          emitRouteInfo(info);
          onNextStepRef.current?.(info.steps?.[0] ?? null);
        });
        trackerRef.current = tracker;
        void tracker.init(activeFrom, activeTo);

        mapRef.current = map;
        onMapReadyRef.current?.(map);

        cleanup = () => {
          for (const arrow of arrowMarkersRef.current) {
            try { map.removeChild(arrow); } catch { /* skip */ }
          }
          arrowMarkersRef.current = [];
          try { trackerRef.current?.destroy(); } catch { /* skip */ }
          trackerRef.current = null;
          try { map.destroy(); } catch { /* skip */ }
          mapRef.current = null;
          ymaps3Ref.current = null;
        };
      })
      .catch(() => {
        if (!disposed) setHasFallback(true);
      })
      .finally(() => {
        if (!disposed) setIsLoading(false);
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-route when pickup / destination change ────────────────────────────
  // CRITICAL: deps must NOT include the courier's position (`activeFrom` /
  // `pickup`). Otherwise every GPS tick destroys the multiRoute model and
  // recreates it, which wipes the polyline and resets the camera — exactly
  // the "tinmay o'zgarmoqda" behaviour reported on device.
  //
  // Position updates flow through `tracker.updateOrigin()` in the GPS
  // effect below. This effect only fires when the pickup or destination
  // *target* changes (e.g. stage transition: PICKED_UP → DELIVERING swaps
  // the `currentTarget` from restaurant to customer).
  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;

    try { pickupMarkerRef.current?.update({ coordinates: toLngLat(pickup) }); }     catch { /* skip */ }
    try { destMarkerRef.current?.update({ coordinates: toLngLat(destination) }); } catch { /* skip */ }

    lastPolylineCoordsRef.current = [];
    void tracker.init(activeFrom, activeTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickup.lat, pickup.lng,
    destination.lat, destination.lng,
    activeTo.lat, activeTo.lng,
    // activeFrom intentionally OMITTED — we don't want a tick-by-tick re-init.
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

    // Snap GPS to nearest point on the active polyline so the marker visually
    // sits on the road even when the raw GPS lands inside a building. We
    // accept up to 60m of drift between GPS and route — beyond that the
    // courier is genuinely off-route and we keep the raw GPS so they can see
    // where they actually are.
    let displayCoord: [number, number] = toLngLat(courierPos);
    const polyCoords = lastPolylineCoordsRef.current;
    if (polyCoords.length >= 2) {
      const projection = projectOntoPolyline(
        displayCoord as LngLat,
        polyCoords as LngLat[],
      );
      if (projection && projection.distanceMeters <= 60) {
        displayCoord = projection.point;
      }
    }

    // Create courier marker on first GPS fix
    if (!courierMarkerRef.current) {
      try {
        const cEl = createCourierElement(0);
        courierElRef.current = cEl;
        const cMarker = new ymaps3.YMapMarker(
          { coordinates: displayCoord, zIndex: 200 },
          cEl,
        );
        map.addChild(cMarker);
        courierMarkerRef.current = cMarker;
        syncCourierRotation(smoothedHeading, cameraAzimuthRef.current);
      } catch { /* skip */ }
    } else {
      try { courierMarkerRef.current.update({ coordinates: displayCoord }); } catch { /* skip */ }
    }

    // Follow mode camera. First fix is forced (skips throttle so the
    // courier sees a "snap-to-me" zoom-in even if the GPS was stationary).
    if (followModeRef.current && !isManualRef.current) {
      if (!hasNavZoomedRef.current) {
        hasNavZoomedRef.current = true;
        updateCamera(courierPos, { force: true });
      } else {
        updateCamera(courierPos);
      }
    }

    // ── Polyline head snap (instant, before multiRouter responds) ────────────
    // Move only the first coord of the stored polyline to the new courier
    // position. This keeps the line visually connected to the marker during
    // the ~1 s gap while the re-route is being calculated in background.
    const prevCoords = lastPolylineCoordsRef.current;
    if (prevCoords.length >= 2) {
      updateRoutePolyline([toLngLat(courierPos), ...prevCoords.slice(1)]);
    }

    // Push new origin to multiRouter — recalculates only what changed,
    // fires requestsuccess → updates full polyline + snaps marker to road
    trackerRef.current?.updateOrigin(courierPos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierPos?.lat, courierPos?.lng]);

  // ── Courier icon SVG update (custom 3D SVG from heading tracking system) ─────
  useEffect(() => {
    if (!courierElRef.current) return;
    if (courierIconSvg) {
      courierElRef.current.innerHTML = courierIconSvg;
    }
    // Rotation comes from the smoothedHeading effect below — do not duplicate here
  }, [courierIconSvg]);

  // ── Heading pipeline: smoothedHeading (Zustand) → marker rotation + camera azimuth
  //
  // Azimuth (kompas aylanishi) DOIM yangilanadi — followMode yoki isManual holatidan
  // qat'i nazar. Faqat camera pan (markaz siljishi) followMode ga bog'liq.
  // location: { azimuth, tilt } ishlatiladi — ba'zi ymaps3 versiyalarida
  // camera: {} obyekti bilan update() tilt ni reset qilishi kuzatilgan.
  // Track the last azimuth we pushed so we can skip sub-degree micro-updates.
  const lastAzimuthRef = useRef<number>(0);
  useEffect(() => {
    if (!mapRef.current) return;

    cameraAzimuthRef.current = smoothedHeading;
    cameraTiltRef.current = tiltRef.current;
    syncCourierRotation(smoothedHeading, cameraAzimuthRef.current);
    if (courierElRef.current) {
      courierElRef.current.style.transform = `translate(-50%,-50%) rotate(0deg)`;
    }

    // Skip imperceptible rotations to keep the map from twitching with sensor
    // noise. 1.5° matches the human "did the road turn?" threshold.
    const delta = Math.abs(((smoothedHeading - lastAzimuthRef.current + 540) % 360) - 180);
    if (delta < 1.5) return;
    lastAzimuthRef.current = smoothedHeading;

    try {
      mapRef.current.update({
        location: {
          azimuth: smoothedHeading,
          tilt: tiltRef.current,
          duration: CAMERA_AZIMUTH_DURATION_MS,
        },
      });
    } catch { /* skip if map not ready */ }
  }, [smoothedHeading, tilt]);

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
