import React, { useEffect, useState } from 'react';
import { MapPin as PinIcon, Target, Store, Home, User } from 'lucide-react';
import { detectBrowserGeolocation, getUserGeolocationErrorMessage } from '../geolocation';
import type { MapPin, MapProviderProps } from '../MapProvider';
import { estimateRouteInfo } from '../route';

/**
 * MockMapComponent: a visual placeholder for local development and fallback mode.
 */
const MockMapComponent: React.FC<MapProviderProps> = ({
  initialCenter,
  onLocationSelect,
  onRouteInfoChange,
  onInteractionStart,
  onInteractionEnd,
  userLocationPin,
  restaurantLocationPin,
  markers = [],
  showRoute = false,
  height = '400px',
  className = '',
}) => {
  const [pin, setPin] = useState<MapPin>(initialCenter);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [detectedUserLocationPin, setDetectedUserLocationPin] = useState<MapPin | null>(null);
  const effectiveUserLocationPin = userLocationPin ?? detectedUserLocationPin;

  useEffect(() => {
    setPin(initialCenter);
  }, [initialCenter.lat, initialCenter.lng]);

  useEffect(() => {
    if (onLocationSelect) {
      onLocationSelect(pin);
    }
  }, [pin, onLocationSelect]);

  useEffect(() => {
    if (!restaurantLocationPin || !onRouteInfoChange || markers.length > 0) {
      return;
    }

    onRouteInfoChange(estimateRouteInfo(restaurantLocationPin, pin));
  }, [
    restaurantLocationPin?.lat,
    restaurantLocationPin?.lng,
    pin.lat,
    pin.lng,
    markers.length,
    onRouteInfoChange,
  ]);

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    void detectBrowserGeolocation()
      .then((location) => {
          setDetectedUserLocationPin(location.pin);
          setPin({
            lat: location.pin.lat,
            lng: location.pin.lng,
          });
      })
      .catch((error) => {
        console.error('Error getting location:', error);
        setLocationError(getUserGeolocationErrorMessage(error));
      })
      .finally(() => {
        setIsGettingLocation(false);
      });
  };

  const isSelectionMode = markers.length === 0;
  const getSelectionMarkerPosition = (markerPin: MapPin) => ({
    left: ((markerPin.lng - 69.19) / 0.1) * 100,
    top: ((41.36 - markerPin.lat) / 0.1) * 100,
  });
  const getMarkerPosition = (markerPin: MapPin) => ({
    left: ((markerPin.lng - 66) * 10) % 80 + 10,
    top: ((42 - markerPin.lat) * 10) % 80 + 10,
  });
  const restaurantMarkerPosition = restaurantLocationPin ? getSelectionMarkerPosition(restaurantLocationPin) : null;
  const userMarkerPosition = effectiveUserLocationPin ? getSelectionMarkerPosition(effectiveUserLocationPin) : null;
  const pickupMarker = markers.find((marker) => marker.type === 'PICKUP');
  const deliveryMarker = markers.find((marker) => marker.type === 'DELIVERY');
  const pickupMarkerPosition = pickupMarker ? getMarkerPosition(pickupMarker.position) : null;
  const deliveryMarkerPosition = deliveryMarker ? getMarkerPosition(deliveryMarker.position) : null;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl border-2 border-slate-200 bg-slate-100 shadow-inner ${className}`}
      style={{ height }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {showRoute && pickupMarkerPosition && deliveryMarkerPosition && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d={`M ${pickupMarkerPosition.left} ${pickupMarkerPosition.top} Q ${(pickupMarkerPosition.left + deliveryMarkerPosition.left) / 2} ${Math.min(pickupMarkerPosition.top, deliveryMarkerPosition.top) - 8} ${deliveryMarkerPosition.left} ${deliveryMarkerPosition.top}`}
            stroke="#6366f1"
            strokeWidth="4"
            fill="none"
            strokeDasharray="10,6"
            className="animate-[dash_2s_linear_infinite]"
            style={{ strokeDashoffset: '0' }}
          />
        </svg>
      )}

      {isSelectionMode && restaurantMarkerPosition && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d={`M ${restaurantMarkerPosition.left} ${restaurantMarkerPosition.top} Q ${(restaurantMarkerPosition.left + 50) / 2} ${Math.min(restaurantMarkerPosition.top, 50) - 8} 50 50`}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${restaurantMarkerPosition.left} ${restaurantMarkerPosition.top} Q ${(restaurantMarkerPosition.left + 50) / 2} ${Math.min(restaurantMarkerPosition.top, 50) - 8} 50 50`}
            stroke="#f59e0b"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="8,5"
            className="animate-[dash_2s_linear_infinite]"
          />
        </svg>
      )}

      {!isSelectionMode &&
        markers.map((marker) => (
          <div
            key={marker.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center transition-all duration-700 group"
            style={{
              left: `${getMarkerPosition(marker.position).left}%`,
              top: `${getMarkerPosition(marker.position).top}%`,
            }}
          >
            <div
              className={`rounded-2xl border-2 border-white p-3 shadow-xl transition-transform group-hover:scale-110
                ${
                  marker.type === 'PICKUP'
                    ? 'bg-emerald-500 text-white shadow-emerald-100'
                    : marker.type === 'DELIVERY'
                      ? 'bg-rose-500 text-white shadow-rose-100'
                      : 'bg-blue-500 text-white shadow-blue-100'
                }
              `}
            >
              {marker.type === 'PICKUP' ? (
                <Store size={24} />
              ) : marker.type === 'DELIVERY' ? (
                <Home size={24} />
              ) : (
                <User size={24} />
              )}
            </div>
            {marker.label && (
              <div className="mt-2 rounded-lg border border-slate-100 bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
                <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-tight text-slate-700">
                  {marker.label}
                </span>
              </div>
            )}
          </div>
        ))}

      {isSelectionMode && effectiveUserLocationPin && (
        <div
          className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center transition-all duration-700"
          style={{
            left: `${userMarkerPosition?.left ?? 50}%`,
            top: `${userMarkerPosition?.top ?? 50}%`,
          }}
        >
          <div className="rounded-2xl border-2 border-white bg-blue-500 p-3 text-white shadow-xl shadow-blue-100">
            <User size={24} />
          </div>
          <div className="mt-2 rounded-lg border border-slate-100 bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
            <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-tight text-slate-700">
              MENING JOYLASHUVIM
            </span>
          </div>
        </div>
      )}

      {isSelectionMode && restaurantLocationPin && (
        <div
          className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center transition-all duration-700"
          style={{
            left: `${restaurantMarkerPosition?.left ?? 50}%`,
            top: `${restaurantMarkerPosition?.top ?? 50}%`,
          }}
        >
          <div className="rounded-2xl border-2 border-white bg-emerald-500 p-3 text-white shadow-xl shadow-emerald-100">
            <Store size={24} />
          </div>
          <div className="mt-2 rounded-lg border border-slate-100 bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
            <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-tight text-slate-700">
              RESTORAN
            </span>
          </div>
        </div>
      )}

      {isSelectionMode && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-xl bg-amber-500 p-2 text-white shadow-xl animate-bounce">
              <PinIcon size={24} />
            </div>
            <div className="h-4 w-4 rounded-full border-2 border-amber-500 bg-white shadow-sm" />
          </div>
        </div>
      )}

      {isSelectionMode && (
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-sm backdrop-blur-md">
          <div>
            <p className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Tanlangan nuqta</p>
            <p className="text-[13px] font-bold text-slate-900">
              {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
            </p>
          </div>
          <button
            onClick={handleGetCurrentLocation}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
              isGettingLocation ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-600 active:scale-90'
            }`}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
            ) : (
              <Target size={20} />
            )}
          </button>
        </div>
      )}

      {isSelectionMode && (
        <div
          className="absolute inset-0 cursor-crosshair transition-colors active:bg-slate-200/20"
          onClick={(event) => {
            onInteractionStart?.();
            const rect = event.currentTarget.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;

            setPin({
              lat: 41.31 + (0.5 - y) * 0.1,
              lng: 69.24 + (x - 0.5) * 0.1,
            });
            window.setTimeout(() => {
              onInteractionEnd?.();
            }, 120);
          }}
        />
      )}

      {isSelectionMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-4 py-2 text-[12px] font-bold text-white backdrop-blur-sm">
          Pinni siljitish uchun xaritada bosing
        </div>
      )}

      {isSelectionMode && locationError && (
        <div className="absolute bottom-20 left-4 right-4 rounded-2xl border border-red-100 bg-white/95 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-tight text-red-500 shadow-sm backdrop-blur-sm">
          {locationError}
        </div>
      )}

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -16;
          }
        }
      `}</style>
    </div>
  );
};

export default MockMapComponent;
