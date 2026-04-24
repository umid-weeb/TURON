import React, { useRef } from 'react';

interface SwipeConfirmProps {
  onConfirm: () => void;
  label: string;
  sublabel: string;
  disabled?: boolean;
}

export function SwipeConfirmButton({ onConfirm, label, sublabel, disabled }: SwipeConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const isDragging = useRef(false);
  const isConfirmed = useRef(false);

  const THUMB_W = 48;
  const THUMB_MARGIN = 4;
  const CONFIRM_THRESHOLD = 0.82;

  const getMaxTranslate = () => {
    if (!trackRef.current) return 0;
    return trackRef.current.offsetWidth - THUMB_W - THUMB_MARGIN * 2;
  };

  const setThumbX = (x: number) => {
    if (thumbRef.current) {
      thumbRef.current.style.transform = `translateX(${x}px)`;
    }
  };

  const triggerConfirm = () => {
    if (isConfirmed.current) return;
    isConfirmed.current = true;

    if (thumbRef.current) {
      thumbRef.current.style.transition = 'transform 0.15s ease-out';
      setThumbX(getMaxTranslate());
    }

    setTimeout(() => {
      if (successRef.current) {
        successRef.current.style.opacity = '1';
        successRef.current.style.pointerEvents = 'auto';
      }
      onConfirm();
    }, 150);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || isConfirmed.current) return;
    e.stopPropagation();
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
    if (thumbRef.current) thumbRef.current.style.transition = 'none';
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || isConfirmed.current) return;
    e.stopPropagation();
    const dx = Math.max(0, Math.min(e.touches[0].clientX - startX.current, getMaxTranslate()));
    setThumbX(dx);

    if (dx / getMaxTranslate() >= CONFIRM_THRESHOLD) {
      isDragging.current = false;
      triggerConfirm();
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current || isConfirmed.current) return;
    e.stopPropagation();
    isDragging.current = false;
    if (thumbRef.current) {
      thumbRef.current.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
    }
    setThumbX(0);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (disabled || isConfirmed.current) return;
    startX.current = e.clientX;
    isDragging.current = true;
    if (thumbRef.current) thumbRef.current.style.transition = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = Math.max(0, Math.min(ev.clientX - startX.current, getMaxTranslate()));
      setThumbX(dx);
      if (dx / getMaxTranslate() >= CONFIRM_THRESHOLD) {
        isDragging.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        triggerConfirm();
      }
    };

    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        if (thumbRef.current) {
          thumbRef.current.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
        }
        setThumbX(0);
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      ref={trackRef}
      style={{
        margin: '10px 16px',
        height: 56,
        background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,216,76,0.12)',
        borderRadius: 18,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,216,76,0.18)'}`,
        touchAction: 'pan-y',
        flexShrink: 0,
        boxShadow: disabled ? 'none' : '0 16px 34px rgba(255,216,76,0.12)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: disabled ? '#8d877d' : '#ffe58a' }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: disabled ? '#7a766d' : '#b8b1a5', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {sublabel}
        </span>
      </div>

      <div
        ref={thumbRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute',
          left: THUMB_MARGIN,
          top: THUMB_MARGIN,
          width: THUMB_W,
          height: THUMB_W,
          borderRadius: 16,
          background: disabled ? '#3a3f55' : '#ffd84c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'grab',
          touchAction: 'none',
          zIndex: 2,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          boxShadow: disabled ? 'none' : '0 12px 26px rgba(255,216,76,0.28)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={disabled ? '#8d877d' : '#111111'} strokeWidth="2.5" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      <div
        ref={successRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: '#1d9e75',
          borderRadius: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Tasdiqlandi!</span>
      </div>
    </div>
  );
}
