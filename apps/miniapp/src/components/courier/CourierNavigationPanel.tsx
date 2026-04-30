import React from 'react';
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
  distance?: string;
  eta?: string;
}

function DirectionArrow({
  action,
  distance,
  color = '#111111',
}: {
  action?: NavigationStep['action'];
  distance?: string;
  color?: string;
}) {
  const distanceNum = distance?.match(/\d+/)?.[0] || '';
  if (distanceNum && parseInt(distanceNum, 10) < 5) {
    return null;
  }

  const strokeStyle = {
    stroke: color,
    strokeWidth: 4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  if (action === 'right') {
    return (
      <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden="true">
        <path d="M13 40 L13 22 Q13 10 25 10 L37 10" {...strokeStyle} />
        <path d="M29 4 L37 10 L29 16" {...strokeStyle} />
      </svg>
    );
  }

  if (action === 'left') {
    return (
      <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden="true">
        <path d="M35 40 L35 22 Q35 10 23 10 L11 10" {...strokeStyle} />
        <path d="M19 4 L11 10 L19 16" {...strokeStyle} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden="true">
      <path d="M24 40 L24 10" {...strokeStyle} />
      <path d="M13 21 L24 10 L35 21" {...strokeStyle} />
    </svg>
  );
}

const parseDistance = (distanceText: string | undefined | null): number | null => {
  if (!distanceText) return null;
  if (distanceText.includes('km')) {
    return parseFloat(distanceText.replace('km', '').trim()) * 1000;
  }
  const meters = parseInt(distanceText.replace('m', '').trim(), 10);
  return Number.isFinite(meters) ? meters : null;
};

const CourierNavigationPanel: React.FC<CourierNavigationPanelProps> = ({
  routes = [],
  selectedRouteId,
  currentStep,
  allSteps = [],
  currentStepIndex,
  distance,
  eta,
}) => {
  if (!currentStep) return null;

  const distanceMeters = parseDistance(currentStep.distanceText);
  const shouldShowNavigation = distanceMeters === null || distanceMeters >= 5;
  if (!shouldShowNavigation) return null;

  const derivedIndex =
    typeof currentStepIndex === 'number' && currentStepIndex >= 0
      ? currentStepIndex
      : allSteps.findIndex(
          (step) =>
            step.instruction === currentStep.instruction &&
            step.distanceText === currentStep.distanceText &&
            step.action === currentStep.action,
        );

  const nextStep = allSteps
    .slice(Math.max(derivedIndex + 1, 0))
    .find((step) => step.action && step.action !== 'straight');
  const nextTurnDistance = nextStep?.distanceText || '';
  const nextDistanceMeters = parseDistance(nextTurnDistance);
  const shouldShowNextTurn = Boolean(nextStep) && (nextDistanceMeters === null || nextDistanceMeters >= 5);

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null;

  return (
    <div className="courier-enter-soft flex w-fit max-w-[min(320px,calc(100vw-32px))] flex-col gap-2">
      <div className="courier-map-fab overflow-hidden rounded-[26px] px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Navigatsiya</span>
          {selectedRoute ? (
            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--courier-accent)]">
              {selectedRoute.distance} • {selectedRoute.eta}
            </span>
          ) : distance || eta ? (
            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--courier-accent)]">
              {[distance, eta].filter(Boolean).join(' • ')}
            </span>
          ) : null}
        </div>

        <div className="courier-cta-primary flex items-center gap-2 rounded-[22px] px-3 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-black/8">
            <DirectionArrow action={currentStep.action} distance={currentStep.distanceText} color="#111111" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-black/55">Hozirgi qadam</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-[22px] font-black leading-none text-[var(--courier-accent-contrast)]">{currentStep.distanceText}</span>
              {currentStep.street ? (
                <span className="truncate pb-0.5 text-[11px] font-bold text-black/62">{currentStep.street}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {shouldShowNextTurn && nextStep ? (
        <div className="courier-map-fab flex items-center gap-3 rounded-[22px] px-3 py-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/8">
            <DirectionArrow action={nextStep.action} distance={nextTurnDistance} color="var(--courier-accent)" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Keyingi burilish</p>
            <p className="mt-1 truncate text-[15px] font-black text-white">{nextTurnDistance}</p>
          </div>
        </div>
      ) : null}

      {routes.length > 1 ? (
        <div className="courier-map-fab flex items-center gap-2 rounded-[20px] px-3 py-2 text-[11px] font-bold text-white/70">
          <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/52">
            {routes.length} yo'l
          </span>
          <span className="truncate">
            {selectedRoute?.instruction || "Tavsiya qilingan yo'l tanlangan"}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default CourierNavigationPanel;

