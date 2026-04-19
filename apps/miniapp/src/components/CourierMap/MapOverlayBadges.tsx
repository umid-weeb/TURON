import { useCourierStore } from '../../store/courierStore';

function formatDistance(distance: number | null) {
  if (distance === null || Number.isNaN(distance)) {
    return '-- m';
  }

  return distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`;
}

export function MapOverlayBadges() {
  const { deliveryStage, distanceToDestination } = useCourierStore();
  const isDeliveryLeg = deliveryStage >= 2;
  const isDelivered = deliveryStage === 3;
  const badgeBg = isDeliveryLeg ? '#5b7fff' : '#f5a623';
  const badgeText = isDeliveryLeg ? '#ffffff' : '#1a0e00';
  const statusText = isDelivered ? 'Topshirildi' : isDeliveryLeg ? 'Yetkazilmoqda' : 'Navigatsiya yoqilgan';

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: badgeBg,
          borderRadius: 20,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 500,
          color: badgeText,
          boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          width="12"
          height="12"
          stroke={badgeText}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="5 12 12 5 19 12" />
          <line x1="12" y1="5" x2="12" y2="19" />
        </svg>
        {formatDistance(distanceToDestination)}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(30,32,48,0.9)',
          border: isDeliveryLeg ? '1px solid rgba(45,212,160,0.3)' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20,
          padding: '6px 12px',
          fontSize: 11,
          color: isDeliveryLeg ? '#2dd4a0' : '#a0a8c0',
          backdropFilter: 'blur(4px)',
        }}
      >
        {statusText}
      </div>
    </div>
  );
}
