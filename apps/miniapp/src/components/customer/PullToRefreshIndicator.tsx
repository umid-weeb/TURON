import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type Phase = 'idle' | 'pulling' | 'refreshing' | 'done';

export const PullToRefreshIndicator: React.FC = () => {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0); // 0–1.15
  const refreshingRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const rafRef = useRef<number | null>(null);
  const pendingProgressRef = useRef(0);

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const triggerRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setPhaseSync('refreshing');
    setProgress(1);

    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['menu'] }),
        queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['addresses'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    } finally {
      setPhaseSync('done');
      // Small pause so the user sees the "done" state before hiding.
      window.setTimeout(() => {
        setPhaseSync('idle');
        setProgress(0);
        refreshingRef.current = false;
      }, 520);
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
        setPhaseSync(p > 0.05 ? 'pulling' : 'idle');
      });
    };

    const onRefresh = () => {
      triggerRefresh();
    };

    const onCancel = () => {
      if (!refreshingRef.current) {
        setPhaseSync('idle');
        setProgress(0);
      }
    };

    window.addEventListener('turon:pull-progress', onProgress);
    window.addEventListener('turon:pull-refresh', onRefresh);
    window.addEventListener('turon:pull-cancel', onCancel);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      window.removeEventListener('turon:pull-progress', onProgress);
      window.removeEventListener('turon:pull-refresh', onRefresh);
      window.removeEventListener('turon:pull-cancel', onCancel);
    };
  }, [triggerRefresh]);

  if (phase === 'idle') return null;

  // Pill slides down from above the safe-area inset.
  // At progress=0 it's fully hidden; at progress=1 it's fully visible.
  const clampedP = Math.min(progress, 1);
  const PILL_HEIGHT = 44; // approximate pill height in px
  const translateY = phase === 'refreshing' || phase === 'done'
    ? 0
    : -PILL_HEIGHT + clampedP * PILL_HEIGHT;
  const opacity = phase === 'refreshing' || phase === 'done'
    ? 1
    : Math.min(clampedP * 1.6, 1);

  // Burger rotates/scales as user pulls deeper.
  const burgerRotate = phase === 'pulling' ? (clampedP - 0.5) * 24 : 0;
  const burgerScale = phase === 'pulling' ? 0.65 + clampedP * 0.5 : 1;

  const isRefreshing = phase === 'refreshing';
  const isDone = phase === 'done';

  return (
    <div
      style={{
        position: 'fixed',
        top: 'var(--tg-header-safe, env(safe-area-inset-top, 0px))',
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        transform: `translateY(${translateY}px)`,
        opacity,
        transition:
          isRefreshing || isDone
            ? 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s'
            : 'none',
        pointerEvents: 'none',
        willChange: 'transform, opacity',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(11, 18, 32, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderTop: 'none',
          borderRadius: '0 0 20px 20px',
          padding: '7px 18px 9px',
          boxShadow: '0 8px 32px rgba(2,6,23,0.55)',
        }}
      >
        {/* Burger emoji */}
        <span
          style={{
            fontSize: 22,
            display: 'block',
            lineHeight: 1,
            transform: isRefreshing
              ? undefined
              : `scale(${burgerScale}) rotate(${burgerRotate}deg)`,
            animation: isRefreshing ? 'burgerBounce 0.75s cubic-bezier(.36,.07,.19,.97) infinite' : 'none',
            filter: 'drop-shadow(0 2px 8px rgba(251,146,60,0.5))',
            transition: isRefreshing ? 'none' : 'transform 0.08s linear',
            userSelect: 'none',
          }}
        >
          🍔
        </span>

        {/* Label */}
        {isRefreshing ? (
          <span
            style={{
              color: 'rgba(255,255,255,0.52)',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Yangilanmoqda
          </span>
        ) : isDone ? (
          <span
            style={{
              color: 'rgba(134,239,172,0.8)',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            Yangilandi ✓
          </span>
        ) : (
          /* Pulling: show three bouncing dots to hint "release to refresh" */
          clampedP >= 0.85 ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#f59e0b',
                    animation: 'pullDotPop 0.9s ease-in-out infinite',
                    animationDelay: `${i * 0.16}s`,
                  }}
                />
              ))}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
};
