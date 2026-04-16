import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Compass, Eye, Navigation, AlertCircle } from 'lucide-react';

export interface RouteAlternative {
  id: string;
  instruction: string;
  distance: string;
  eta: string;
  isRecommended?: boolean;
  routeIndex: number;
}

export interface NavigationStep {
  instruction: string;
  distanceMeters: number;
  distanceText: string;
}

interface CourierNavigationPanelProps {
  // Route selection
  routes?: RouteAlternative[];
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;

  // Navigation instructions
  currentStep?: NavigationStep | null;
  allSteps?: NavigationStep[];
  currentStepIndex?: number;

  // Camera control
  heading?: number;
  onHeadingChange?: (heading: number) => void;
  tilt?: number;
  onTiltChange?: (tilt: number) => void;
  followMode?: boolean;
  onFollowModeToggle?: (enabled: boolean) => void;

  // Route info
  distance?: string;
  eta?: string;
  isEtaLive?: boolean;
}

/**
 * Courier Navigation Panel
 * Displays multiple route options, turn-by-turn instructions,
 * and camera controls for 360° navigation viewing.
 */
const CourierNavigationPanel: React.FC<CourierNavigationPanelProps> = ({
  routes = [],
  selectedRouteId,
  onSelectRoute,
  currentStep,
  allSteps = [],
  currentStepIndex = 0,
  heading = 0,
  onHeadingChange,
  tilt = 50,
  onTiltChange,
  followMode = true,
  onFollowModeToggle,
  distance,
  eta,
  isEtaLive = false,
}) => {
  const [showRoutes, setShowRoutes] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showCameraControls, setShowCameraControls] = useState(false);
  const headingInputRef = useRef<HTMLInputElement>(null);

  // Auto-close route selector when a route is selected
  useEffect(() => {
    if (selectedRouteId) {
      setShowRoutes(false);
    }
  }, [selectedRouteId]);

  const handleHeadingChange = (value: string) => {
    const heading = parseFloat(value);
    onHeadingChange?.(heading);
  };

  const handleTiltChange = (delta: number) => {
    const newTilt = Math.max(0, Math.min(60, (tilt ?? 50) + delta));
    onTiltChange?.(newTilt);
  };

  const rotateLeft = () => onHeadingChange?.((heading - 15 + 360) % 360);
  const rotateRight = () => onHeadingChange?.((heading + 15) % 360);

  const totalSteps = allSteps.length;
  const hasMoreSteps = currentStepIndex + 1 < totalSteps;

  return (
    <div className="space-y-2">
      {/* ── ROUTE SELECTION ───────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Collapsed view */}
        {!showRoutes && (
          <button
            onClick={() => setShowRoutes(true)}
            className="w-full rounded-[16px] bg-white/95 backdrop-blur px-4 py-3 shadow-lg border border-slate-100 transition-all active:scale-95"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation size={18} className="text-indigo-600" />
                <div className="text-left">
                  {distance && (
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {distance} — {eta}
                    </p>
                  )}
                  <p className="text-[13px] font-black text-slate-900 mt-0.5">
                    Marshrut tanlangan
                  </p>
                </div>
              </div>
              {routes.length > 1 && (
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  {routes.length} ta
                </span>
              )}
            </div>
          </button>
        )}

        {/* Expanded route selection */}
        {showRoutes && (
          <div className="absolute top-0 left-0 right-0 z-50 rounded-[16px] bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-black text-slate-900">Yo'l tanlash</h3>
                <button
                  onClick={() => setShowRoutes(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-2 p-3 max-h-[300px] overflow-y-auto">
              {routes.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  <AlertCircle size={20} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-sm">Marshrutlar yo'q</p>
                </div>
              ) : (
                routes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => {
                      onSelectRoute?.(route.id);
                      setShowRoutes(false);
                    }}
                    className={`w-full rounded-[12px] p-3 text-left transition-all ${
                      selectedRouteId === route.id
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p
                          className={`text-[12px] font-bold uppercase tracking-wider mb-1 ${
                            selectedRouteId === route.id ? 'text-indigo-200' : 'text-slate-500'
                          }`}
                        >
                          {route.distance} • {route.eta}
                          {route.isRecommended && ' ⭐'}
                        </p>
                        <p className={`text-[13px] font-semibold line-clamp-2 ${
                          selectedRouteId === route.id ? 'text-white' : 'text-slate-900'
                        }`}>
                          {route.instruction}
                        </p>
                      </div>
                      {selectedRouteId === route.id && (
                        <div className="text-green-300 mt-1">✓</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── NAVIGATION INSTRUCTIONS ──────────────────────────────────────────── */}
      {currentStep && (
        <div className="rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg overflow-hidden">
          {/* Instruction card */}
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="w-full p-4 text-left transition-opacity active:opacity-70"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 font-bold text-sm">
                  ↗
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100 mb-1">
                  Keyingi bosqich
                </p>
                <p className="text-[15px] font-black leading-tight line-clamp-2">
                  {currentStep.instruction}
                </p>
                <p className="text-[12px] font-semibold text-blue-200 mt-2">
                  {currentStep.distanceText}
                </p>
              </div>
              {hasMoreSteps && (
                <div className="flex-shrink-0 text-blue-200 text-sm">+{totalSteps - currentStepIndex - 1}</div>
              )}
            </div>
          </button>

          {/* All steps list */}
          {showSteps && totalSteps > 0 && (
            <div className="border-t border-blue-500/40 bg-blue-700/30 p-3">
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {allSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`text-[12px] rounded-[8px] p-2 transition-colors ${
                      idx === currentStepIndex
                        ? 'bg-white/20 font-semibold'
                        : 'bg-white/5 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 font-bold">{idx + 1}.</span>
                      <div className="flex-1">
                        <p className="font-semibold line-clamp-2">{step.instruction}</p>
                        <p className="text-blue-200 mt-1">{step.distanceText}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CAMERA CONTROLS ────────────────────────────────────────────────────── */}
      <div className="rounded-[16px] bg-white/95 backdrop-blur shadow-lg border border-slate-100 p-3 space-y-3">
        {/* Follow mode toggle */}
        <button
          onClick={() => onFollowModeToggle?.(!followMode)}
          className={`w-full rounded-[12px] px-3 py-2.5 font-semibold text-[13px] transition-all active:scale-95 ${
            followMode
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Eye size={16} />
            <span>{followMode ? 'Avtomatik ko\'rsatish' : 'Erkin ko\'rsatish'}</span>
          </div>
        </button>

        {/* Camera rotation (heading) - 360° compass */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Yo'nalish: {Math.round(heading)}°
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={rotateLeft}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors active:scale-95"
              title="Chapga aylantirish"
            >
              ←
            </button>
            <input
              ref={headingInputRef}
              type="range"
              min="0"
              max="359"
              value={Math.round(heading)}
              onChange={(e) => handleHeadingChange(e.target.value)}
              disabled={followMode}
              className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, rgb(129, 140, 248) 0%, rgb(129, 140, 248) ${Math.round(
                  (heading / 360) * 100,
                )}%, rgb(226, 232, 240) ${Math.round((heading / 360) * 100)}%, rgb(226, 232, 240) 100%)`,
              }}
            />
            <button
              onClick={rotateRight}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors active:scale-95"
              title="Oʻngga aylantirish"
            >
              →
            </button>
          </div>
          {followMode && (
            <p className="text-[11px] text-slate-400 text-center">
              Yo'nalishni boshqarish uchun erkin koʻrsatishga oʻtish
            </p>
          )}
        </div>

        {/* Tilt control - 3D perspective */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Perspektiva: {Math.round(tilt ?? 50)}°
          </label>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleTiltChange(-5)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors active:scale-95"
              title="Yuqoridan ko'rish"
            >
              <ChevronUp size={18} />
            </button>
            <div className="flex-1 text-center">
              <p className="text-[11px] text-slate-400">
                {(tilt ?? 50) < 20 ? 'Ustun ko\'rish' : (tilt ?? 50) > 40 ? 'Yon ko\'rish' : 'O\'rtacha'}
              </p>
            </div>
            <button
              onClick={() => handleTiltChange(5)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors active:scale-95"
              title="Yon tomondan ko'rish"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {/* Compass indicator */}
        <div className="flex items-center justify-center pt-2">
          <div className="relative w-16 h-16 rounded-full border-2 border-slate-200 bg-slate-50 flex items-center justify-center">
            <div
              className="absolute w-1 h-6 bg-indigo-600 rounded-full transition-transform duration-300"
              style={{ transform: `rotate(${heading}deg)` }}
            />
            <div className="text-[10px] font-bold text-slate-400 absolute bottom-1">N</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierNavigationPanel;
