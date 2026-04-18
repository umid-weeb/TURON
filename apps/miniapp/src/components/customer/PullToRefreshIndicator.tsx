import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type Phase = 'idle' | 'pulling' | 'refreshing' | 'done';

/* ── Classic iOS 12-spoke spinner ─────────────────────────────────────────── */
const IOSSpinner: React.FC<{ progress?: number; spin?: boolean; size?: number; color?: string }> = ({
  progress = 1,
  spin = false,
  size = 28,
  color = 'rgba(180,180,180,0.95)',
}) => {
  const spokes = 12;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      style={{
        animation: spin ? 'ios-activity-spin 0.9s steps(12,end) infinite' : 'none',
        display: 'block',
        flexShrink: 0,
      }}
    >
      {Array.from({ length: spokes }).map((_, i) => {
        // opacity: visible spokes = progress * 12
        const visibleCount = Math.round(progress * spokes);
        const opacity = i < visibleCount ? 1 - (i / spokes) * 0.75 : 0;
        const angle = (i / spokes) * 360;
        return (
          <line
            key={i}
            x1="14"
            y1="5"
            x2="14"
            y2="9"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ opacity, transformOrigin: '14px 14px', transform: `rotate(${angle}deg)` }}
          />
        );
      })}
    </svg>
  );
};

export const PullToRefreshIndicator: React.FC = () => {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const refreshingRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const rafRef = useRef<number | null>(null);
  const pendingProgressRef = useRef(0);

  const setPhaseSync = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const triggerRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setPhaseSync('refreshing');
    setProgress(1);

    // Haptic — like native iOS
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback?.notificationOccurred) {
        tg.HapticFeedback.notificationOccurred('success');
      } else if (tg?.HapticFeedback?.impactOccurred) {
        tg.HapticFeedback.impactOccurred('medium');
      } else if (navigator.vibrate) {
        navigator.vibrate([30, 20, 60]);
      }
    } catch { /* noop */ }

    try {
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setPhaseSync('done');
      window.setTimeout(() => {
        setPhaseSync('idle');
        setProgress(0);
        refreshingRef.current = false;
      }, 500);
    }
  }, [queryClient]);

  useEffect(() => {
    const onProgress = (e: Event) => {
      if (refreshingRef.current) return;
      pendingProgressRef.current = (e as CustomEvent<{ progress: number }>).detail.progress;
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const p = pendingProgressRef.current;
        setProgress(p);
        setPhaseSync(p > 0.04 ? 'pulling' : 'idle');
      });
    };
    const onRefresh = () => triggerRefresh();
    const onCancel = () => {
      if (!refreshingRef.current) { setPhaseSync('idle'); setProgress(0); }
    };
    window.addEventListener('turon:pull-progress', onProgress);
    window.addEventListener('turon:pull-refresh', onRefresh);
    window.addEventListener('turon:pull-cancel', onCancel);
    return () => {
      if (rafRef.current !== null) { window.cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      window.removeEventListener('turon:pull-progress', onProgress);
      window.removeEventListener('turon:pull-refresh', onRefresh);
      window.removeEventListener('turon:pull-cancel', onCancel);
    };
  }, [triggerRefresh]);

  if (phase === 'idle') return null;

  const isRefreshing = phase === 'refreshing' || phase === 'done';
  const clampedP = Math.min(progress, 1);

  // Slides down from top as user pulls
  const INDICATOR_H = 56;
  const translateY = isRefreshing ? 0 : -INDICATOR_H + clampedP * INDICATOR_H;
  const opacity = isRefreshing ? 1 : Math.min(clampedP * 2, 1);

  return (
    <>
      <style>{`
        @keyframes ios-activity-spin {
          0%   { transform: rotate(0deg);   }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 'var(--tg-header-safe, env(safe-area-inset-top, 0px))',
          left: 0, right: 0,
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          transform: `translateY(${translateY}px)`,
          opacity,
          transition: isRefreshing
            ? 'transform 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s'
            : 'none',
          pointerEvents: 'none',
          willChange: 'transform, opacity',
          height: INDICATOR_H,
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: INDICATOR_H,
        }}>
          <IOSSpinner
            spin={isRefreshing}
            progress={isRefreshing ? 1 : clampedP}
            size={32}
          />
        </div>
      </div>
    </>
  );
};
