import React, { useState, useEffect } from 'react';
import { MapPin, MapProviderProps } from '../MapProvider';
import { MapPin as PinIcon, Navigation, Target, Store, Home, User } from 'lucide-react';

/**
 * MockMapComponent: A visual placeholder that simulates a map.
 * User can "drag" crosshair or click to change location coordinates visually.
 */
const MockMapComponent: React.FC<MapProviderProps> = ({ 
  initialCenter, 
  onLocationSelect, 
  markers = [],
  showRoute = false,
  height = '400px',
  className = ''
}) => {
  const [pin, setPin] = useState<MapPin>(initialCenter);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    if (onLocationSelect) {
      onLocationSelect(pin);
    }
  }, [pin, onLocationSelect]);

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPin = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setPin(newPin);
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsGettingLocation(false);
        }
      );
    } else {
      setIsGettingLocation(false);
    }
  };

  const isSelectionMode = markers.length === 0;

  return (
    <div 
      className={`relative w-full bg-slate-100 rounded-3xl overflow-hidden shadow-inner border-2 border-slate-200 ${className}`}
      style={{ height }}
    >
      {/* Visual Map Grid Placeholder */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
          backgroundSize: '20px 20px' 
        }} 
      />
      
      {/* Route Visualization */}
      {showRoute && markers.length >= 2 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <path 
            d="M 50 250 L 350 150" 
            stroke="#6366f1" 
            strokeWidth="4" 
            fill="none" 
            strokeDasharray="10,6"
            className="animate-[dash_2s_linear_infinite]"
            style={{ 
              strokeDashoffset: '0',
            }}
          />
        </svg>
      )}

      {/* Render Markers for Delivery Mode */}
      {!isSelectionMode && markers.map(marker => (
        <div 
          key={marker.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-all duration-700"
          style={{ 
            left: `${((marker.position.lng - 66) * 10) % 80 + 10}%`, 
            top: `${((42 - marker.position.lat) * 10) % 80 + 10}%` 
          }}
        >
          <div className={`p-3 rounded-2xl shadow-xl border-2 border-white transition-transform group-hover:scale-110 
            ${marker.type === 'PICKUP' ? 'bg-emerald-500 text-white shadow-emerald-100' : 
              marker.type === 'DELIVERY' ? 'bg-rose-500 text-white shadow-rose-100' : 
              'bg-blue-500 text-white shadow-blue-100'}
          `}>
             {marker.type === 'PICKUP' ? <Store size={24} /> : 
              marker.type === 'DELIVERY' ? <Home size={24} /> : 
              <User size={24} />}
          </div>
          {marker.label && (
            <div className="mt-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-100">
               <span className="text-[10px] font-black uppercase tracking-tight text-slate-700 whitespace-nowrap">{marker.label}</span>
            </div>
          )}
        </div>
      ))}

      {/* Center Marker for Selection Mode */}
      {isSelectionMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-amber-500 text-white p-2 rounded-xl shadow-xl animate-bounce">
              <PinIcon size={24} />
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-amber-500 bg-white shadow-sm" />
          </div>
        </div>
      )}

      {/* Coordinate Info Box (Selection Mode Only) */}
      {isSelectionMode && (
        <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-0.5">Tanlangan nuqta</p>
            <p className="text-[13px] font-bold text-slate-900">
              {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
            </p>
          </div>
          <button 
            onClick={handleGetCurrentLocation}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isGettingLocation ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-600 active:scale-90'
            }`}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Target size={20} />
            )}
          </button>
        </div>
      )}

      {/* Interaction Layer (Selection Mode Only) */}
      {isSelectionMode && (
        <div 
          className="absolute inset-0 cursor-crosshair active:bg-slate-200/20 transition-colors"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            setPin({
              lat: 41.31 + (0.5 - y) * 0.1,
              lng: 69.24 + (x - 0.5) * 0.1
            });
          }}
        />
      )}

      {/* Map Helper Prompt (Selection Mode Only) */}
      {isSelectionMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-[12px] font-bold">
          📍 Pinni siljitish uchun xaritada bosing
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
