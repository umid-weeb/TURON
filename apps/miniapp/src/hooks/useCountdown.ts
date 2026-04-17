import { useEffect, useRef, useState } from 'react';

export type CountdownStatus = 'normal' | 'warning' | 'critical' | 'expired';

export interface CountdownResult {
  /** Milliseconds remaining (0 when expired). */
  msLeft: number;
  /** Human-readable label, e.g. "01:47:23" */
  label: string;
  status: CountdownStatus;
  isExpired: boolean;
}

function msToLabel(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

function deriveStatus(ms: number, warningMs: number, criticalMs: number): CountdownStatus {
  if (ms <= 0) return 'expired';
  if (ms <= criticalMs) return 'critical';
  if (ms <= warningMs) return 'warning';
  return 'normal';
}

/**
 * Counts down to `deadlineIso` (ISO string).
 *
 * @param warningMs  Yellow threshold  (default 30 min)
 * @param criticalMs Red threshold     (default 10 min)
 */
export function useCountdown(
  deadlineIso: string | null | undefined,
  warningMs = 30 * 60 * 1000,
  criticalMs = 10 * 60 * 1000,
): CountdownResult {
  const deadlineMs = deadlineIso ? new Date(deadlineIso).getTime() : null;

  const calc = (): CountdownResult => {
    if (!deadlineMs) return { msLeft: 0, label: '--:--', status: 'normal', isExpired: false };
    const ms = Math.max(0, deadlineMs - Date.now());
    return {
      msLeft: ms,
      label: msToLabel(ms),
      status: deriveStatus(ms, warningMs, criticalMs),
      isExpired: ms === 0,
    };
  };

  const [result, setResult] = useState<CountdownResult>(calc);
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!deadlineMs) return;

    const tick = () => {
      setResult(calc());
      const msLeft = Math.max(0, deadlineMs - Date.now());
      // After expiry, stop ticking
      if (msLeft > 0) {
        rafRef.current = setTimeout(tick, 1000);
      }
    };

    tick();
    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);

  return result;
}
