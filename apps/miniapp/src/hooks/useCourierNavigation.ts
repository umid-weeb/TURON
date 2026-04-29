import { useEffect, useRef } from 'react';
import { useCourierStore, type RouteStep } from '../store/courierStore';
import {
  haversineMeters,
  projectOntoPolyline,
  type LngLat,
} from '../lib/routeGeometry';

/**
 * Distance threshold (meters) at which the courier is considered "off route".
 * Above this we trigger a reroute via the multiRouter.
 */
const OFF_ROUTE_METERS = 80;

/**
 * Minimum interval between two reroute attempts. Prevents thrashing when
 * GPS bounces in and out of the corridor.
 */
const REROUTE_COOLDOWN_MS = 12_000;

/**
 * Find the route step the courier is currently inside by projecting onto the
 * full polyline, then walking the step list cumulatively.
 *
 * Returns null when the polyline / step list is empty.
 */
function findCurrentStep(
  coords: LngLat,
  routePoints: LngLat[],
  steps: RouteStep[],
): { index: number; distanceLeft: number } | null {
  if (routePoints.length < 2 || steps.length === 0) return null;

  const projection = projectOntoPolyline(coords, routePoints);
  if (!projection) return null;

  // Compute cumulative meters from polyline start up to the projection point.
  let metersAlong = 0;
  for (let i = 0; i < projection.segmentIndex; i++) {
    metersAlong += haversineMeters(routePoints[i], routePoints[i + 1]);
  }
  metersAlong +=
    haversineMeters(routePoints[projection.segmentIndex], projection.point);

  // Convert to "which step" by walking step lengths.
  let stepStart = 0;
  for (let i = 0; i < steps.length; i++) {
    const stepEnd = stepStart + steps[i].distanceMeters;
    if (metersAlong < stepEnd) {
      return { index: i, distanceLeft: Math.max(0, stepEnd - metersAlong) };
    }
    stepStart = stepEnd;
  }
  return { index: steps.length - 1, distanceLeft: 0 };
}

interface UseCourierNavigationOptions {
  /**
   * Called when the courier wanders > OFF_ROUTE_METERS off the polyline.
   * Implementation should re-fetch the multiRouter route from the new coords.
   */
  onReroute?: (lat: number, lng: number) => void;
  /** Disable voice prompts entirely (default: true on iOS until user gesture). */
  voiceEnabled?: boolean;
}

/**
 * Drives the live navigation panel: tracks the active step, detects when the
 * courier has gone off the polyline (and asks the caller to reroute), and
 * speaks Uzbek voice prompts at threshold distances.
 */
export function useCourierNavigation({
  onReroute,
  voiceEnabled = true,
}: UseCourierNavigationOptions = {}) {
  const coords = useCourierStore((s) => s.coords);
  const routePoints = useCourierStore((s) => s.routePoints);
  const routeSteps = useCourierStore((s) => s.routeSteps);
  const setCurrentStepIndex = useCourierStore((s) => s.setCurrentStepIndex);
  const setOffRoute = useCourierStore((s) => s.setOffRoute);

  // Off-route state
  const offSinceRef = useRef<number | null>(null);
  const lastRerouteAtRef = useRef<number>(0);

  // Voice state — track which (stepIndex × thresholdBucket) we already spoke.
  const lastSpokenRef = useRef<string>('');

  // ── Step tracking + off-route detection ──────────────────────────────────
  useEffect(() => {
    if (!coords || routePoints.length < 2 || routeSteps.length === 0) return;

    const projection = projectOntoPolyline(coords, routePoints);
    const dist = projection?.distanceMeters ?? Infinity;

    // Off-route detection — must be off for at least 3s to filter GPS noise.
    if (dist > OFF_ROUTE_METERS) {
      const now = Date.now();
      if (offSinceRef.current === null) {
        offSinceRef.current = now;
      } else if (
        now - offSinceRef.current > 3_000 &&
        now - lastRerouteAtRef.current > REROUTE_COOLDOWN_MS
      ) {
        setOffRoute(true);
        lastRerouteAtRef.current = now;
        offSinceRef.current = null;
        if (onReroute) onReroute(coords[1], coords[0]);
      }
    } else {
      offSinceRef.current = null;
      setOffRoute(false);
    }

    // Step pointer.
    const current = findCurrentStep(coords, routePoints, routeSteps);
    if (current) setCurrentStepIndex(current.index);
  }, [coords, routePoints, routeSteps, onReroute, setCurrentStepIndex, setOffRoute]);

  // ── Voice prompts ────────────────────────────────────────────────────────
  // Speaks at three buckets: 200m, 100m, 50m before a maneuver, plus an
  // immediate prompt when the courier enters the maneuver step. Uses Uzbek
  // phrasing because this is a single-restaurant Uzbek delivery app.
  useEffect(() => {
    if (!voiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!coords || routePoints.length < 2 || routeSteps.length === 0) return;

    const current = findCurrentStep(coords, routePoints, routeSteps);
    if (!current) return;

    const step = routeSteps[current.index];
    const bucket = pickBucket(current.distanceLeft);
    if (!bucket) return;

    const key = `${current.index}:${bucket}`;
    if (lastSpokenRef.current === key) return;
    lastSpokenRef.current = key;

    const phrase = buildPhrase(step, bucket);
    if (!phrase) return;
    speakUz(phrase);
  }, [coords, routePoints, routeSteps, voiceEnabled]);

  // Cancel any lingering speech on unmount so the voice doesn't follow the
  // courier outside the navigation screen.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* noop */
        }
      }
    };
  }, []);
}

// ── Voice helpers ─────────────────────────────────────────────────────────

type Bucket = '200m' | '100m' | '50m' | 'now';

function pickBucket(distanceLeft: number): Bucket | null {
  if (distanceLeft <= 15) return 'now';
  if (distanceLeft <= 50) return '50m';
  if (distanceLeft <= 100) return '100m';
  if (distanceLeft <= 200) return '200m';
  return null;
}

function buildPhrase(step: RouteStep, bucket: Bucket): string | null {
  const action = step.action;
  const onStreet = step.street ? ` ${step.street}` : '';

  if (bucket === 'now') {
    if (action === 'left') return `Hozir chapga buriling${onStreet}`;
    if (action === 'right') return `Hozir o'ngga buriling${onStreet}`;
    return null;
  }

  const distancePart =
    bucket === '200m' ? '200 metrdan keyin' : bucket === '100m' ? '100 metrdan keyin' : '50 metrdan keyin';

  if (action === 'left') return `${distancePart} chapga buriling${onStreet}`;
  if (action === 'right') return `${distancePart} o'ngga buriling${onStreet}`;
  // Don't announce straights — would be too chatty.
  return null;
}

function speakUz(phrase: string) {
  try {
    const synth = window.speechSynthesis;
    // Cancel any in-flight speech so we don't pile up.
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(phrase);
    utter.lang = 'uz-UZ';
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    // Try to pick an Uzbek voice if installed; otherwise fall back to ru-RU
    // (closest phonetic match for Uzbek-Cyrillic models).
    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => v.lang?.toLowerCase().startsWith('uz')) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith('ru')) ||
      voices[0];
    if (preferred) utter.voice = preferred;

    synth.speak(utter);
  } catch {
    /* speech unavailable, silently ignore */
  }
}
