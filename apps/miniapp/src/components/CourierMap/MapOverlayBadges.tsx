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