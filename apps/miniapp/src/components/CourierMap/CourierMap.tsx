import { useEffect, useRef } from 'react';
import { useCourierStore } from '../../store/courierStore';
import { MapOverlayBadges } from './MapOverlayBadges';
import { BottomPanel } from './BottomPanel';

interface CourierMapProps {
  ymaps3: any;
  destination: [number, number];
}

/**
 * Asosiy xarita component — ymaps3 bilan.
 * - Courier marker — sariq uchburchak
 * - Destination marker — restoran
 * - Route polyline — yashil chiziq
 * - 3D perspektiva + heading rotation
 */
export function CourierMap({ ymaps3, destination }: CourierMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerElRef = useRef<HTMLDivElement | null>(null);
  const markerInstanceRef = useRef<any>(null);
  const routeFeatureRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);

  const { coords, smoothedHeading, routePoints } = useCourierStore();

  // --- Xarita va marker yaratish ---
  useEffect(() => {
    if (!mapRef.current || !ymaps3) return;

    const {
      YMap,
      YMapDefaultSchemeLayer,
      YMapDefaultFeaturesLayer,
      YMapMarker,
    } = ymaps3;

    // Xarita — 3D perspektiva, qorong'i tema, Yandex Navigator style
    const map = new YMap(mapRef.current, {
      location: {
        center: coords ?? [69.2401, 41.2995],
        zoom: 17,
        azimuth: 0,
        tilt: 45,          // 3D perspektiva
      },
      mode: '3d',
    });

    map.addChild(new YMapDefaultSchemeLayer({ theme: 'dark' }));
    map.addChild(new YMapDefaultFeaturesLayer());
    mapInstanceRef.current = map;

    // Courier markeri — sariq uchburchak
    const courierEl = document.createElement('div');
    courierEl.innerHTML = COURIER_SVG;
    courierEl.style.cssText = `
      width: 40px;
      height: 48px;
      transform-origin: 50% 75%;
      transition: transform 0.25s ease-out;
    `;
    markerElRef.current = courierEl;

    const courierMarker = new YMapMarker(
      {
        coordinates: coords ?? [69.2401, 41.2995],
        anchor: [0.5, 0.75],
        zIndex: 200,
      },
      courierEl,
    );
    map.addChild(courierMarker);
    markerInstanceRef.current = courierMarker;

    // Destination marker — restoran (qizil
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
        // Skip
      }
    };
  }, [ymaps3]);

  // --- GPS yangilanishi: marker va xarita markazi ---
  useEffect(() => {
    if (!coords || !mapInstanceRef.current || !markerInstanceRef.current) return;

    markerInstanceRef.current.update({ coordinates: coords });

    mapInstanceRef.current.update({
      location: {
        center: coords,
        duration: 300,
      },
    });
  }, [coords]);

  // --- Heading yangilanishi: marker burish + xarita azimuth ---
  useEffect(() => {
    if (!mapInstanceRef.current || !markerElRef.current) return;

    // Marker SVG burish
    markerElRef.current.style.transform = `rotate(${smoothedHeading}deg)`;

    // Xaritani courier qarayotgan tomonga burish — ASOSIY EFFEKT
    mapInstanceRef.current.update({
      location: {
        azimuth: smoothedHeading,
        duration: 150,
      },
    });
  }, [smoothedHeading]);

  // --- Route polyline yangilash ---
  useEffect(() => {
    if (!mapInstanceRef.current || routePoints.length < 2 || !ymaps3) return;

    const { YMapFeature } = ymaps3;

    // Eski route ni o'chirish
    if (routeFeatureRef.current) {
      try {
        mapInstanceRef.current.removeChild(routeFeatureRef.current);
      } catch {
        // Skip
      }
    }

    // Yangi yashil route chizish
    const routeFeature = new YMapFeature({
      geometry: {
        type: 'LineString',
        coordinates: routePoints,
      },
      style: {
        stroke: [{ color: '#4CAF50', width: 6 }],
        strokeOpacity: 0.9,
      },
    });

    mapInstanceRef.current.addChild(routeFeature);
    routeFeatureRef.current = routeFeature;
  }, [routePoints, ymaps3]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#1a1b26]">
      {/* Asosiy xarita qatlami */}
      <div ref={mapRef} className="absolute inset-0 z-0" />
      
      {/* Tepa burchaklardagi status va masofa nishonlari */}
      <MapOverlayBadges />
      
      {/* Pastki boshqaruv paneli (Bottom Sheet UI) */}
      <BottomPanel />
    </div>
  );
}

// --- SVG konstantalar ---

const COURIER_SVG = `
<svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#FFA500"/>
    </linearGradient>
    <filter id="cs">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.45)"/>
    </filter>
  </defs>
  <polygon points="20,4 38,44 20,36 2,44"
    fill="url(#cg)" stroke="#CC8800" stroke-width="1.5" filter="url(#cs)"/>
  <polygon points="20,8 34,40 20,33"
    fill="rgba(255,255,255,0.22)"/>
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
