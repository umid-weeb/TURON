import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Eye, Navigation } from 'lucide-react';
import type { RouteStep } from '../../features/maps/MapProvider';

export interface RouteAlternative {
  id: string;
  instruction: string;
  distance: string;
  eta: string;
  isRecommended?: boolean;
  routeIndex: number;
}

export type NavigationStep = RouteStep;

interface CourierNavigationPanelProps {
  routes?: RouteAlternative[];
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
  currentStep?: NavigationStep | null;
  allSteps?: NavigationStep[];
  currentStepIndex?: number;
  heading?: number;
  onHeadingChange?: (heading: number) => void;
  tilt?: number;
  onTiltChange?: (tilt: number) => void;
  followMode?: boolean;
  onFollowModeToggle?: (enabled: boolean) => void;
  distance?: string;
  eta?: string;
  isEtaLive?: boolean;
}

function getDirectionGlyph(action?: NavigationStep['action']) {
  if (action === 'left') {
    return '<-';
  }

  if (action === 'right') {
    return '->';
  }

  return '^';
}

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
}) => {
  const [showRoutes, setShowRoutes] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const headingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedRouteId && routes.length > 0) {
      const timer = window.setTimeout(() => setShowRoutes(false), 300);
      return () => window.clearTimeout(timer);
    }
  }, [selectedRouteId, routes.length]);

  useEffect(() => {
    if (routes.length > 1 && !hintShown) {
      setHintShown(true);
      setShowRoutes(true);
      const timer = window.setTimeout(() => setShowRoutes(false), 4000);
      return () => window.clearTimeout(timer);
    }
  }, [routes.length, hintShown]);

  const handleHeadingChange = (value: string) => {
    onHeadingChange?.(Number.parseFloat(value));
  };

  const handleTiltChange = (delta: number) => {
    const nextTilt = Math.max(0, Math.min(60, tilt + delta));
    onTiltChange?.(nextTilt);
  };

  const rotateLeft = () => onHeadingChange?.((heading - 15 + 360) % 360);
  const rotateRight = () => onHeadingChange?.((heading + 15) % 360);
  const hasMoreSteps = currentStepIndex + 1 < allSteps.length;
  const directionGlyph = getDirectionGlyph(currentStep?.action);

  return (
    <div className="space-y-2">
      {routes.length > 1 ? (
        <div className="relative">
          {!showRoutes ? (
            <button
              type="button"
              onClick={() => setShowRoutes(true)}
              className="w-full rounded-[16px] border border-slate-100 bg-white/95 px-4 py-3 text-left shadow-lg backdrop-blur transition-all active:scale-95"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Navigation size={18} className="text-indigo-600" />
                  <div>
                    {distance && eta ? (
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {distance} - {eta}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[13px] font-black text-slate-900">
                      Marshrut tanlangan
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                  {routes.length} ta
                </span>
              </div>
            </button>
          ) : null}

          {showRoutes ? (
            <div className="absolute left-0 right-0 top-0 z-50 overflow-hidden rounded-[16px] border border-slate-100 bg-white shadow-2xl">
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-black text-slate-900">Yo'l tanlash</h3>
                  <button
                    type="button"
                    onClick={() => setShowRoutes(false)}
                    className="text-slate-400 transition-colors hover:text-slate-600"
                  >
                    x
                  </button>
                </div>
              </div>

              <div className="max-h-[300px] space-y-2 overflow-y-auto p-3">
                {routes.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    <AlertCircle size={20} className="mx-auto mb-2 text-slate-400" />
                    <p className="text-sm">Marshrutlar yuklanmoqda...</p>
                  </div>
                ) : (
                  routes.map((route) => (
                    <button
                      key={route.id}
                      type="button"
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
                            className={`mb-1 text-[12px] font-bold uppercase tracking-wider ${
                              selectedRouteId === route.id ? 'text-indigo-200' : 'text-slate-500'
                            }`}
                          >
                            {route.distance} * {route.eta}
                            {route.isRecommended ? ' Recommended' : ''}
                          </p>
                          <p
                            className={`text-[13px] font-semibold line-clamp-2 ${
                              selectedRouteId === route.id ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {route.instruction}
                          </p>
                        </div>
                        {selectedRouteId === route.id ? (
                          <div className="mt-1 text-green-300">OK</div>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {currentStep ? (
        <div className="overflow-hidden rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
          <button
            type="button"
            onClick={() => setShowSteps((value) => !value)}
            className="w-full p-4 text-left transition-opacity active:opacity-70"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 font-bold text-sm">
                  {directionGlyph}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-blue-100">
                  Keyingi bosqich
                </p>
                <p className="line-clamp-2 text-[15px] font-black leading-tight">
                  {currentStep.instruction}
                </p>
                {currentStep.street ? (
                  <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-blue-100/90">
                    {currentStep.street}
                  </p>
                ) : null}
                <p className="mt-2 text-[12px] font-semibold text-blue-200">
                  {currentStep.distanceText}
                </p>
              </div>
              {hasMoreSteps ? (
                <div className="flex-shrink-0 text-sm text-blue-200">
                  +{allSteps.length - currentStepIndex - 1}
                </div>
              ) : null}
            </div>
          </button>

          {showSteps && allSteps.length > 0 ? (
            <div className="border-t border-blue-500/40 bg-blue-700/30 p-3">
              <div className="max-h-[200px] space-y-2 overflow-y-auto">
                {allSteps.map((step, index) => (
                  <div
                    key={`${step.instruction}-${index}`}
                    className={`rounded-[8px] p-2 text-[12px] transition-colors ${
                      index === currentStepIndex
                        ? 'bg-white/20 font-semibold'
                        : 'bg-white/5 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 font-bold">{index + 1}.</span>
                      <div className="flex-1">
                        <p className="line-clamp-2 font-semibold">{step.instruction}</p>
                        {step.street ? (
                          <p className="mt-1 line-clamp-1 text-blue-100/80">{step.street}</p>
                        ) : null}
                        <p className="mt-1 text-blue-200">{step.distanceText}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3 rounded-[16px] border border-slate-100 bg-white/95 p-3 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => onFollowModeToggle?.(!followMode)}
          className={`w-full rounded-[12px] px-3 py-2.5 text-[13px] font-semibold transition-all active:scale-95 ${
            followMode
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Eye size={16} />
            <span>{followMode ? "Avtomatik ko'rsatish" : "Erkin ko'rsatish"}</span>
          </div>
        </button>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Yo'nalish: {Math.round(heading)} deg
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={rotateLeft}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 active:scale-95"
              title="Chapga aylantirish"
            >
              <span>{'<'}</span>
            </button>
            <input
              ref={headingInputRef}
              type="range"
              min="0"
              max="359"
              value={Math.round(heading)}
              onChange={(event) => handleHeadingChange(event.target.value)}
              disabled={followMode}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, rgb(129, 140, 248) 0%, rgb(129, 140, 248) ${Math.round(
                  (heading / 360) * 100,
                )}%, rgb(226, 232, 240) ${Math.round((heading / 360) * 100)}%, rgb(226, 232, 240) 100%)`,
              }}
            />
            <button
              type="button"
              onClick={rotateRight}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 active:scale-95"
              title="O'ngga aylantirish"
            >
              <span>{'>'}</span>
            </button>
          </div>
          {followMode ? (
            <p className="text-center text-[11px] text-slate-400">
              Yo'nalishni qo'lda boshqarish uchun erkin ko'rsatishga o'ting
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Perspektiva: {Math.round(tilt)} deg
          </label>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleTiltChange(-5)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 active:scale-95"
              title="Yuqoridan ko'rish"
            >
              <ChevronUp size={18} />
            </button>
            <div className="flex-1 text-center">
              <p className="text-[11px] text-slate-400">
                {tilt < 20 ? "Ustdan ko'rish" : tilt > 40 ? "Yon ko'rish" : "O'rtacha"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTiltChange(5)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 active:scale-95"
              title="Yon tomondan ko'rish"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierNavigationPanel;
