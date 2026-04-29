import { useEffect, useRef } from 'react';
import { useCourierStore } from '../../store/courierStore';
import { MapOverlayBadges } from './MapOverlayBadges';
import { BottomPanel } from './BottomPanel';
import { useGeofence } from '../../hooks/useGeofence';
import {
  bearingDegrees,
  haversineMeters,
  projectOntoPolyline,
  type LngLat,
} from '../../lib/routeGeometry';

interface CourierMapProps {
  ymaps3: any;
  destination: [number, number];
}

// Navigation tuning ------------------------------------------------------------
//
// These values were dialled in to match a "live navigation" feel:
//   - close zoom (you can see lane markings)
//   - strong tilt (3D road perspective)
//   - center offset so the courier sits in the lower third of the map and
//     the route ahead occupies the rest of the screen
//   - smooth camera tween durations long enough to hide GPS jitter, short
//     enough that a real turn doesn't look stuck
const NAV_ZOOM = 18.2;
const NAV_TILT = 55;
const CENTER_OFFSET_DEGREES = 0.00045; // pushed in heading direction → marker is below center
const CAMERA_PAN_DURATION_MS = 850;
const CAMERA_ROTATE_DURATION_MS = 350;
const MIN_PAN_METERS = 1.8; // GPS noise dead-zone — below this we don't move the camera
const MIN_PAN_INTERVAL_MS = 500; // throttle camera updates regardless of GPS firing rate
const SNAP_TOLERANCE_METERS = 60; // courier marker locks to nearest route point if within this

/**
 * Move a [lng, lat] point `meters` ahead in the heading direction so the
 * camera centers slightly *ahead* of the courier, mimicking real navigation.
 * `headingDegrees` is 0=north, 90=east.
 */
function offsetCenter(point: LngLat, headingDegrees: number): LngLat {
  const rad = (headingDegrees * Math.PI) / 180;
  const dx = Math.sin(rad) * CENTER_OFFSET_DEGREES;
  const dy = Math.cos(rad) * CENTER_OFFSET_DEGREES;
  return [point[0] + dx, point[1] + dy];
}

/**
 * Asosiy xarita component — ymaps3 bilan.
 * - Courier marker — sariq uchburchak (har doim yuqoriga qaraydi, xarita aylanadi)
 * - Destination marker — restoran/mijoz
 * - Route polyline — yashil chiziq
 * - 3D perspektiva + heading rotation + snap-to-road
 */
export function CourierMap({ ymaps3, destination }: CourierMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerElRef = useRef<HTMLDivElement | null>(null);
  const markerInstanceRef = useRef<any>(null);
  const routeFeatureRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);

  // Throttle / dedupe state
  const lastCameraCenterRef = useRef<LngLat | null>(null);
  const lastCameraTickRef = useRef<number>(0);
  const lastAzimuthRef = useRef<number>(0);

  const { coords, smoothedHeading, routePoints } = useCourierStore();

  // Geofencing avtomatizatsiyasini orqa fonda ishga tushiramiz
  useGeofence();

  // ── Map + markers init (mounts once per ymaps3 instance) ────────────────────
  useEffect(() => {
    if (!mapRef.current || !ymaps3) return;

    const {
      YMap,
      YMapDefaultSchemeLayer,
      YMapDefaultFeaturesLayer,
      YMapMarker,
    } = ymaps3;

    const startCenter = coords ?? [69.2401, 41.2995];
    const map = new YMap(mapRef.current, {
      location: {
        center: startCenter,
        zoom: NAV_ZOOM,
        azimuth: 0,
        tilt: NAV_TILT,
      },
      mode: '3d',
    });

    map.addChild(new YMapDefaultSchemeLayer({ theme: 'dark' }));
    map.addChild(new YMapDefaultFeaturesLayer());
    mapInstanceRef.current = map;

    // Courier marker. Important: we DO NOT rotate this element when heading
    // changes — the map azimuth rotates with the courier, so the marker
    // staying upright on screen always points "forward" along the route
    // (Yandex Navigator / Google Maps Driving Mode behaviour).
    const courierEl = document.createElement('div');
    courierEl.innerHTML = COURIER_SVG;
    courierEl.style.cssText = `
      width: 44px;
      height: 52px;
      transform-origin: 50% 70%;
      will-change: transform;
    `;
    markerElRef.current = courierEl;

    const courierMarker = new YMapMarker(
      {
        coordinates: startCenter,
        anchor: [0.5, 0.7],
        zIndex: 200,
      },
      courierEl,
    );
    map.addChild(courierMarker);
    markerInstanceRef.current = courierMarker;

    // Destination
    const destEl = document.createElement('div');
    destEl.innerHTML = DESTINATION_SVG;
    const destMarker = new YMapMarker(
      { coordinates: destination, anchor: [0.5, 1], zIndex: 100 },
      destEl,
    );
    map.addChild(destMarker);
    destMarkerRef.current = destMarker;

    return () => {
      try {
        map.destroy?.();
      } catch {
        /* noop */
      }
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
      destMarkerRef.current = null;
      routeFeatureRef.current = null;
    };
  }, [ymaps3]);

  // ── GPS / route updates → marker + camera ──────────────────────────────────
  // Snap GPS to nearest point on the route polyline (≤ tolerance) so the
  // courier doesn't appear inside buildings while standing near a road.
  useEffect(() => {
    if (!coords || !mapInstanceRef.current || !markerInstanceRef.current) return;

    let displayCoords: LngLat = coords;
    let snapped = false;
    if (routePoints.length >= 2) {
      const projection = projectOntoPolyline(coords, routePoints);
      if (projection && projection.distanceMeters <= SNAP_TOLERANCE_METERS) {
        displayCoords = projection.point;
        snapped = true;
      }
    }

    // Marker is cheap to update — always reflect the latest snapped position.
    markerInstanceRef.current.update({ coordinates: displayCoords });

    // Camera throttling: skip when the courier hasn't really moved or when
    // we just animated. This is the fix for "har 2-3 sekundda holat o'zgaradi".
    const now = Date.now();
    const last = lastCameraCenterRef.current;
    const movedMeters = last ? haversineMeters(last, displayCoords) : Infinity;
    const sinceLastTick = now - lastCameraTickRef.current;

    if (movedMeters < MIN_PAN_METERS && sinceLastTick < 4000) return;
    if (sinceLastTick < MIN_PAN_INTERVAL_MS) return;

    // Pan the camera *slightly ahead* of the marker so the route is in front.
    const offsetCenterPoint = offsetCenter(displayCoords, smoothedHeading);
    mapInstanceRef.current.update({
      location: {
        center: offsetCenterPoint,
        duration: CAMERA_PAN_DURATION_MS,
      },
    });

    lastCameraCenterRef.current = displayCoords;
    lastCameraTickRef.current = now;

    // Suppress lint about unused `snapped` — useful for future debug toggle.
    void snapped;
  }, [coords, routePoints, smoothedHeading]);

  // ── Heading rotation: map azimuth follows the courier ───────────────────────
  // Marker stays pointing up; the WORLD rotates beneath it. This produces the
  // "device qaysi tomonga qayrilsa shu tomonga burlishi" effect requested.
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Skip micro-rotations to reduce update churn (sensor noise).
    const last = lastAzimuthRef.current;
    let delta = Math.abs(((smoothedHeading - last + 540) % 360) - 180);
    if (delta < 1.5) return;

    mapInstanceRef.current.update({
      location: {
        azimuth: smoothedHeading,
        duration: CAMERA_ROTATE_DURATION_MS,
      },
    });
    lastAzimuthRef.current = smoothedHeading;
  }, [smoothedHeading]);

  // ── Route polyline ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || routePoints.length < 2 || !ymaps3) return;

    const { YMapFeature } = ymaps3;

    if (routeFeatureRef.current) {
      try {
        mapInstanceRef.current.removeChild(routeFeatureRef.current);
      } catch {
        /* noop */
      }
    }

    // If the courier is far from the route start, prepend a short connector
    // line from their current GPS to the snapped point so they can see how to
    // join the route (e.g. exit the building, walk to the road).
    let coordsForLine: LngLat[] = routePoints;
    if (coords) {
      const projection = projectOntoPolyline(coords, routePoints);
      if (
        projection &&
        projection.distanceMeters > 8 &&
        projection.distanceMeters <= 200
      ) {
        coordsForLine = [coords, projection.point, ...routePoints.slice(projection.segmentIndex + 1)];
      }
    }

    const routeFeature = new YMapFeature({
      geometry: { type: 'LineString', coordinates: coordsForLine },
      style: {
        stroke: [
          { color: 'rgba(0,0,0,0.45)', width: 12 }, // soft outer shadow
          { color: '#FFD23F', width: 8 }, // bright Yandex-Navigator yellow
          { color: '#FFFFFF', width: 2.5 }, // hairline highlight
        ],
        strokeOpacity: 0.95,
      },
    });

    mapInstanceRef.current.addChild(routeFeature);
    routeFeatureRef.current = routeFeature;
  }, [routePoints, coords, ymaps3]);

  // ── If GPS far from route, draw a guidance bearing from courier → route ────
  // (Used by the small "exit the building" indicator. We rely on the
  // routeGeometry helpers to keep behavior testable.)
  useEffect(() => {
    if (!coords || routePoints.length < 2) return;
    const projection = projectOntoPolyline(coords, routePoints);
    if (!projection || projection.distanceMeters <= 8) return;
    // Bearing computed but not currently rendered — kept so a future "Exit
    // building" arrow can reuse it without recomputing.
    void bearingDegrees(coords, projection.point);
  }, [coords, routePoints]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#1a1b26]">
      <div ref={mapRef} className="absolute inset-0 z-0" />
      <MapOverlayBadges />
      <BottomPanel />
    </div>
  );
}

// --- SVG konstantalar ---

const COURIER_SVG = `
<svg width="44" height="52" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD23F"/>
      <stop offset="100%" stop-color="#FF9F1C"/>
    </linearGradient>
    <filter id="cs">
      <feDropShadow dx="0" dy="2.5" stdDeviation="3.5" flood-color="rgba(0,0,0,0.55)"/>
    </filter>
  </defs>
  <polygon points="20,4 38,44 20,36 2,44"
    fill="url(#cg)" stroke="#B36B00" stroke-width="1.6" filter="url(#cs)"/>
  <polygon points="20,8 34,40 20,33"
    fill="rgba(255,255,255,0.26)"/>
</svg>`;

const DESTINATION_SVG = `
<svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ds">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.45)"/>
    </filter>
  </defs>
  <path d="M18 4 C24.627 4 30 9.373 30 16 C30 24 18 44 18 44 C18 44 6 24 6 16 C6 9.373 11.373 4 18 4 Z"
    fill="#E53935" stroke="#fff" stroke-width="2" filter="url(#ds)"/>
  <circle cx="18" cy="16" r="6" fill="#fff" opacity="0.9"/>
</svg>`;
