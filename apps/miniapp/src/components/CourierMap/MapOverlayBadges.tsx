<<<<<<< HEAD
import React from 'react';
import { useCourierStore } from '../../store/courierStore';

export function MapOverlayBadges() {
  const { deliveryStage, distanceLeft } = useCourierStore();
  
  const isDelivering = deliveryStage === 3;
  
  // Colors per stage
  const distBg = isDelivering ? '#5b7fff' : '#f5a623';
  const distColor = isDelivering ? '#ffffff' : '#1a0e00';
  const statusBorder = isDelivering ? '1px solid rgba(45,212,160,0.3)' : '1px solid rgba(255,255,255,0.12)';
  const statusColor = isDelivering ? '#2dd4a0' : '#a0a8c0';
  const statusText = isDelivering ? "Yetkazilmoqda" : "Navigatsiya yoqilgan";
  
  const distanceText = distanceLeft != null ? `${distanceLeft} m` : '-- m';

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {/* Distance Badge */}
      <div style={{
        position: 'absolute', top: '12px', left: '12px',
        background: distBg, borderRadius: '20px', padding: '6px 14px',
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', fontWeight: 500, color: distColor,
        pointerEvents: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        <svg viewBox="0 0 24 24" fill="none" width="12" height="12" stroke={distColor} strokeWidth="2.5" strokeLinecap="round">
          <polyline points="5 12 12 5 19 12" />
          <line x1="12" y1="5" x2="12" y2="19" />
        </svg>
        {distanceText}
      </div>

      {/* Status Badge */}
      <div style={{
        position: 'absolute', top: '12px', right: '12px',
        background: 'rgba(30,32,48,0.9)', border: statusBorder,
        borderRadius: '20px', padding: '6px 12px',
        fontSize: '11px', color: statusColor, fontWeight: 500,
        pointerEvents: 'auto', backdropFilter: 'blur(4px)'
      }}>
        {statusText}
      </div>
    </div>
  );
}
=======
import { useCourierStore } from '../../store/courierStore';

function formatDistanceMeters(value: number | null) {
  if (value === null || Number.isNaN(value)) return "Masofa yo'q";
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
  return `${Math.round(value)} m`;
}

function formatTimeSeconds(value: number | null) {
  if (value === null || Number.isNaN(value)) return "Vaqt yo'q";
  const minutes = Math.max(1, Math.round(value / 60));
  return `${minutes} daqiqa`;
}

export function MapOverlayBadges() {
  const { distanceLeft, timeLeft } = useCourierStore();

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-center justify-between gap-2">
      <div className="rounded-xl border border-white/20 bg-slate-950/65 px-3 py-2 backdrop-blur-md">
        <p className="text-[10px] font-semibold tracking-wide text-slate-300">Masofa</p>
        <p className="mt-0.5 text-sm font-bold text-white">{formatDistanceMeters(distanceLeft)}</p>
      </div>
      <div className="rounded-xl border border-white/20 bg-slate-950/65 px-3 py-2 backdrop-blur-md">
        <p className="text-[10px] font-semibold tracking-wide text-slate-300">Vaqt</p>
        <p className="mt-0.5 text-sm font-bold text-white">{formatTimeSeconds(timeLeft)}</p>
      </div>
    </div>
  );
}

>>>>>>> 68c6313 (CourierMap update)
