import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type Phase = 'idle' | 'pulling' | 'refreshing' | 'done';

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
    try {
      await queryClient.invalidateQueries();
    } finally {
      setPhaseSync('done');
      window.setTimeout(() => {
        setPhaseSync('idle');
        setProgress(0);
        refreshingRef.current = false;
      }, 600);
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

  const clampedP = Math.min(progress, 1);
  const PILL_H = 42;
  const translateY = (phase === 'refreshing' || phase === 'done') ? 0 : -PILL_H + clampedP * PILL_H;
  const opacity = (phase === 'refreshing' || phase === 'done') ? 1 : Math.min(clampedP * 1.6, 1);
  const isRefreshing = phase === 'refreshing';
  const isDone = phase === 'done';

  // Spinner rotation based on progress while pulling
  const spinnerDeg = isRefreshing ? undefined : Math.round(clampedP * 270);

  return (
    <>
      <style>{`
        @keyframes ios-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 'var(--tg-header-safe, env(safe-area-inset-top, 0px))',
          left: 0, right: 0, zIndex: 9999,
          display: 'flex', justifyContent: 'center',
          transform: `translateY(${translateY}px)`,
          opacity,
          transition: isRefreshing || isDone
            ? 'transform 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s'
            : 'none',
          pointerEvents: 'none',
          willChange: 'transform, opacity',
        }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.97)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderTop: 'none',
          borderRadius: '0 0 20px 20px',
          padding: '8px 18px 10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}>
          {/* iOS-style circular spinner */}
          <div style={{
            width: 20, height: 20,
            borderRadius: '50%',
            border: '2.5px solid #E5E7EB',
            borderTopColor: '#C62020',
            transform: isRefreshing ? undefined : `rotate(${spinnerDeg}deg)`,
            animation: isRefreshing ? 'ios-spin 0.75s linear infinite' : 'none',
            transition: isRefreshing ? 'none' : 'transform 0.05s linear',
          }} />

          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
            color: isDone ? '#16A34A' : '#374151',
          }}>
            {isDone ? 'Yangilandi ✓' : isRefreshing ? 'Yangilanmoqda...' : ''}
          </span>
        </div>
      </div>
    </>
  );
};
