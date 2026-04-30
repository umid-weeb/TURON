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

// ── Yandex-Maps-style turn icon ──────────────────────────────────────────────
//
// Reference: the user-supplied screenshots from Yandex Maps. Each icon shows
// a path from the bottom of the tile that bends in the maneuver direction
// and ends in a chevron arrowhead. Designed to match the "↗ 35 m" pill the
// reference shows in the upper-left.
function TurnIcon({
  action,
  size = 28,
  color = 'white',
}: {
  action?: NavigationStep['action'];
  size?: number;
  color?: string;
}) {
  const stroke = {
    stroke: color,
    strokeWidth: 4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  if (action === 'right') {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <path d="M14 42 L14 24 Q14 12 26 12 L38 12" {...stroke} />
        <path d="M30 6 L38 12 L30 18" {...stroke} />
      </svg>
    );
  }

  if (action === 'left') {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <path d="M34 42 L34 24 Q34 12 22 12 L10 12" {...stroke} />
        <path d="M18 6 L10 12 L18 18" {...stroke} />
      </svg>
    );
  }

  // straight / unknown
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path d="M24 42 L24 10" {...stroke} />
      <path d="M13 21 L24 10 L35 21" {...stroke} />
    </svg>
  );
}

// Parse a ymaps distance label like "35 m", "1.85 km", "1,2 km" into meters.
const parseDistance = (distanceText: string | undefined | null): number | null => {
  if (!distanceText) return null;
  const cleaned = distanceText.replace(',', '.').toLowerCase();
  if (cleaned.includes('km')) {
    const km = parseFloat(cleaned.replace('km', '').trim());
    return Number.isFinite(km) ? km * 1000 : null;
  }
  const meters = parseInt(cleaned.replace('m', '').trim(), 10);
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

  // Hide the panel for sub-5m maneuvers (we're already mid-turn) — matches
  // Yandex Maps' "swallow" behaviour at the maneuver point.
  const distanceMeters = parseDistance(currentStep.distanceText);
  const shouldShowNavigation = distanceMeters === null || distanceMeters >= 5;
  if (!shouldShowNavigation) return null;

  // Resolve the next non-straight maneuver so we can show a dim "Keyin"
  // hint card under the primary one.
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
  const shouldShowNextTurn =
    Boolean(nextStep) && (nextDistanceMeters === null || nextDistanceMeters >= 5);

  const selectedRoute =
    routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null;
  const tripMeta = selectedRoute
    ? `${selectedRoute.distance} • ${selectedRoute.eta}`
    : [distance, eta].filter(Boolean).join(' • ');

  // Distance label trimmed for the pill (e.g. "35 m" not "35 m  ").
  const primaryDistance = currentStep.distanceText?.trim() || '';

  return (
    <div className="courier-enter-soft flex w-fit max-w-[min(280px,calc(100vw-32px))] flex-col gap-2">
      {/* ── Primary maneuver card — Yandex Maps blue ────────────────────── */}
      <div
        className="flex items-center gap-3 rounded-[20px] px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, #2D7CFF 0%, #1E66E0 100%)',
          boxShadow:
            '0 14px 32px rgba(30, 102, 224, 0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center">
          <TurnIcon action={currentStep.action} size={30} color="white" />
        </div>
        <div className="min-w-0">
          <p className="text-[24px] font-black leading-none tracking-tight text-white">
            {primaryDistance}
          </p>
          {currentStep.street ? (
            <p className="mt-1 truncate text-[11px] font-semibold text-white/80">
              {currentStep.street}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Secondary "next turn" hint, dim ──────────────────────────────── */}
      {shouldShowNextTurn && nextStep ? (
        <div
          className="flex items-center gap-2 rounded-[14px] px-3 py-2 backdrop-blur-md"
          style={{
            background: 'rgba(15, 23, 42, 0.62)',
            boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
          }}
        >
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
            Keyin
          </span>
          <span className="flex h-6 w-6 items-center justify-center">
            <TurnIcon action={nextStep.action} size={18} color="white" />
          </span>
          <span className="truncate text-[12px] font-bold text-white">
            {nextTurnDistance}
          </span>
        </div>
      ) : null}

      {/* ── Trip meta (distance + ETA) ───────────────────────────────────── */}
      {tripMeta ? (
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-md"
          style={{
            background: 'rgba(15, 23, 42, 0.55)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-white">
            {tripMeta}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default CourierNavigationPanel;
