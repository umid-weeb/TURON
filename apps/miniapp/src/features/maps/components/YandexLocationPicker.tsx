import React, { useEffect, useRef, useState } from 'react';
import type { LocationPickerProps } from '../MapProvider';
import { getMapAnimationDuration, getRouteSyncDelay } from '../performance';
import { fetchRouteDetails } from '../api';
import { estimateRouteInfo } from '../route';
import MockMapComponent from './MockMapComponent';
import { isYandexMapsEnabled, loadYandexMaps, toYandexCoords } from '../yandex';

export default function YandexLocationPicker({
  initialCenter,
  onLocationSelect,
  onRouteInfoChange,
  onInteractionStart,
  onInteractionEnd,
  userLocationPin,
  restaurantLocationPin,
  height = '400px',
  className = '',
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const routeRef = useRef<any>(null);
  const userPlacemarkRef = useRef<any>(null);
  const userAccuracyCircleRef = useRef<any>(null);
  const restaurantPlacemarkRef = useRef<any>(null);
  const routeSyncTimeoutRef = useRef<number | null>(null);
  const routeRequestIdRef = useRef(0);
  const skipNextViewportSyncRef = useRef(false);
  const lastRouteInfoRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(isYandexMapsEnabled());
  const [hasFallback, setHasFallback] = useState(!isYandexMapsEnabled());
  const handlersRef = useRef({ onInteractionStart, onInteractionEnd, onLocationSelect });

  // Keep handlers stable via ref
  useEffect(() => {
    handlersRef.current = { onInteractionStart, onInteractionEnd, onLocationSelect };
  }, [onInteractionStart, onInteractionEnd, onLocationSelect]);

  const focusSelectedCenter = () => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.setCenter(toYandexCoords(initialCenter), 17, {
      duration: getMapAnimationDuration(220),
    });
  };

  const emitRouteInfo = (distance: string, eta: string) => {
    const nextKey = `${distance}|${eta}`;
    if (lastRouteInfoRef.current === nextKey) {
      return;
    }

    lastRouteInfoRef.current = nextKey;
    onRouteInfoChange?.({ distance, eta });
  };

  const clearRoute = () => {
    if (!mapRef.current || !routeRef.current) {
      return;
    }

    mapRef.current.geoObjects.remove(routeRef.current);
    routeRef.current = null;
  };

  const renderRoutePolyline = (coordinates: number[][]) => {
    const ymaps = window.ymaps;
    const map = mapRef.current;

    if (!ymaps?.Polyline || !map) {
      return;
    }

    if (routeRef.current) {
      map.geoObjects.remove(routeRef.current);
      routeRef.current = null;
    }

    routeRef.current = new ymaps.Polyline(coordinates, {}, {
      strokeColor: '#f59e0b',
      strokeOpacity: 0.95,
      strokeWidth: 5,
    });

    map.geoObjects.add(routeRef.current);
  };

  const syncRoute = async () => {
    const ymaps = window.ymaps;
    const map = mapRef.current;

    if (!ymaps || !map) {
      return;
    }

    if (!restaurantLocationPin) {
      clearRoute();
      return;
    }

    const referencePoints = [toYandexCoords(restaurantLocationPin), toYandexCoords(initialCenter)];
    const requestId = ++routeRequestIdRef.current;

    try {
      const routeDetails = await fetchRouteDetails(restaurantLocationPin, initialCenter);

      if (requestId !== routeRequestIdRef.current) {
        return;
      }

      emitRouteInfo(routeDetails.distance, routeDetails.eta);
      renderRoutePolyline(
        routeDetails.polyline?.length
          ? routeDetails.polyline.map(toYandexCoords)
          : referencePoints,
      );
    } catch {
      if (requestId !== routeRequestIdRef.current) {
        return;
      }

      const estimatedRouteInfo = estimateRouteInfo(restaurantLocationPin, initialCenter);
      emitRouteInfo(estimatedRouteInfo.distance, estimatedRouteInfo.eta);
      renderRoutePolyline(referencePoints);
    }
  };

  const scheduleRouteSync = () => {
    if (routeSyncTimeoutRef.current) {
      window.clearTimeout(routeSyncTimeoutRef.current);
      routeSyncTimeoutRef.current = null;
    }

    const delay = getRouteSyncDelay();
    if (delay === 0) {
      syncRoute();
      return;
    }

    routeSyncTimeoutRef.current = window.setTimeout(() => {
      routeSyncTimeoutRef.current = null;
      syncRoute();
    }, delay);
  };

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

        if (isDisposed || !mapContainerRef.current) {
          return;
        }

        const map = new ymaps.Map(
          mapContainerRef.current,
          {
            center: toYandexCoords(initialCenter),
            zoom: 17,
            controls: [
              new ymaps.control.ZoomControl({
                options: {
                  size: 'large',
                  position: { left: 10, top: 108 }, // Align with the left slider location
                },
              }),
            ],
          },
          {
            suppressMapOpenBlock: true,
          },
        );

        map.behaviors.enable([
          'scrollZoom',
          'dblClickZoom',
          'multiTouchZoom',
          'drag',
          'leftMouseButtonMagnifier',
        ]);

        const userPlacemark = userLocationPin
          ? new ymaps.Placemark(
              toYandexCoords(userLocationPin),
              {
                hintContent: 'Sizning joylashuvingiz',
                balloonContent: 'Sizning joriy joylashuvingiz',
              },
              {
                preset: 'islands#blueCircleDotIcon',
                draggable: false,
              },
            )
          : null;
        const restaurantPlacemark = restaurantLocationPin
          ? new ymaps.Placemark(
              toYandexCoords(restaurantLocationPin),
              {
                hintContent: 'Restoran',
                balloonContent: 'Restoranning joylashuvi',
              },
              {
                preset: 'islands#greenDotIcon',
                draggable: false,
              },
            )
          : null;

        const emitLocation = (coords: number[]) => {
          onLocationSelect?.({ lat: coords[0], lng: coords[1] });
        };

        mapRef.current = map;
        scheduleRouteSync();

        if (userPlacemark) {
          map.geoObjects.add(userPlacemark);
        }
        if (restaurantPlacemark) {
          map.geoObjects.add(restaurantPlacemark);
        }

        map.events.add('actionend', () => {
          const coords = map.getCenter() as number[] | undefined;
          if (coords) {
            skipNextViewportSyncRef.current = true;
            handlersRef.current.onLocationSelect?.({ lat: coords[0], lng: coords[1] });
          }
          handlersRef.current.onInteractionEnd?.();
        });

        map.events.add('actionbegin', () => {
          handlersRef.current.onInteractionStart?.();
        });

        userPlacemarkRef.current = userPlacemark;
        restaurantPlacemarkRef.current = restaurantPlacemark;
        focusSelectedCenter();
      } catch {
        setHasFallback(true);
      } finally {
        if (!isDisposed) {
          setIsLoading(false);
        }
      }
    }

    initMap();

    return () => {
      isDisposed = true;
      routeRequestIdRef.current += 1;

      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }

      if (routeSyncTimeoutRef.current) {
        window.clearTimeout(routeSyncTimeoutRef.current);
        routeSyncTimeoutRef.current = null;
      }

      routeRef.current = null;
      userPlacemarkRef.current = null;
      restaurantPlacemarkRef.current = null;
    };
  }, [onInteractionEnd, onInteractionStart, onLocationSelect, onRouteInfoChange]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    scheduleRouteSync();

    if (skipNextViewportSyncRef.current) {
      skipNextViewportSyncRef.current = false;
      return;
    }

    focusSelectedCenter();
  }, [initialCenter.lat, initialCenter.lng]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const map = mapRef.current;
    const ymaps = window.ymaps;
    if (!ymaps) return;

    if (userLocationPin) {
      const coords = toYandexCoords(userLocationPin);
      
      // Update or create accuracy circle (10-meter radius as requested)
      if (!userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current = new ymaps.Circle(
          [coords, 10],
          {
            hintContent: 'Sizning aniq joylashuvingiz',
          },
          {
            fillColor: 'rgba(56, 189, 248, 0.15)',
            strokeColor: 'rgba(56, 189, 248, 0.45)',
            strokeOpacity: 0.8,
            strokeWidth: 2,
          }
        );
        map.geoObjects.add(userAccuracyCircleRef.current);
      } else {
        userAccuracyCircleRef.current.geometry.setCoordinates(coords);
      }

      // Update or create placemark
      if (!userPlacemarkRef.current) {
        userPlacemarkRef.current = new ymaps.Placemark(
          coords,
          {
            hintContent: 'Sizning joylashuvingiz',
          },
          {
            preset: 'islands#blueCircleDotIconWithOutline',
            iconColor: '#0ea5e9',
            draggable: false,
          },
        );
        map.geoObjects.add(userPlacemarkRef.current);
      } else {
        userPlacemarkRef.current.geometry?.setCoordinates(coords);
      }
    } else {
      if (userAccuracyCircleRef.current) {
        map.geoObjects.remove(userAccuracyCircleRef.current);
        userAccuracyCircleRef.current = null;
      }
      if (userPlacemarkRef.current) {
        map.geoObjects.remove(userPlacemarkRef.current);
        userPlacemarkRef.current = null;
      }
    }
  }, [userLocationPin?.lat, userLocationPin?.lng]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (restaurantLocationPin) {
      if (!restaurantPlacemarkRef.current) {
        const ymaps = window.ymaps;
        if (!ymaps) {
          return;
        }

        restaurantPlacemarkRef.current = new ymaps.Placemark(
          toYandexCoords(restaurantLocationPin),
          {
            hintContent: 'Restoran',
            balloonContent: 'Restoranning joylashuvi',
          },
          {
            preset: 'islands#greenDotIcon',
            draggable: false,
          },
        );

        mapRef.current.geoObjects.add(restaurantPlacemarkRef.current);
      } else {
        restaurantPlacemarkRef.current.geometry?.setCoordinates(toYandexCoords(restaurantLocationPin));
      }
    } else if (restaurantPlacemarkRef.current) {
      mapRef.current.geoObjects.remove(restaurantPlacemarkRef.current);
      restaurantPlacemarkRef.current = null;
    }

    scheduleRouteSync();
  }, [restaurantLocationPin?.lat, restaurantLocationPin?.lng]);

  if (hasFallback) {
    return (
      <div className="relative" style={{ height }}>
        <MockMapComponent
          initialCenter={initialCenter}
          onLocationSelect={onLocationSelect}
          onRouteInfoChange={onRouteInfoChange}
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
          userLocationPin={userLocationPin}
          restaurantLocationPin={restaurantLocationPin}
          height={height}
          className={className}
        />
        <div className="pointer-events-none absolute left-4 right-4 top-4 rounded-2xl bg-slate-900/85 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white shadow-xl">
          Demo xarita ishlatilmoqda. Yandex uchun `VITE_MAP_API_KEY` ni sozlang.
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[40px] ${className}`} style={{ height }}>
      <div ref={mapContainerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute -top-14 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <div className="rounded-full bg-[#ffd600] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_16px_28px_rgba(255,214,0,0.32)]">
              Pin
            </div>
            <div className="h-3 w-[2px] bg-[#ffd600]" />
          </div>
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-white bg-red-500 shadow-lg">
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-lg">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <span className="text-sm font-bold text-slate-700">Xarita yuklanmoqda...</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
