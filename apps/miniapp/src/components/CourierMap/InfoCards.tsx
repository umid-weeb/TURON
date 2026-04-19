import { CourierDeliveryStage } from '../../store/courierStore';

interface Props {
  stage: CourierDeliveryStage;
  distance: number | null;
  time: number | null;
  orderId: string | null;
  customerName: string;
  itemCount: number;
}

function formatDistance(distance: number | null) {
  if (distance === null || Number.isNaN(distance)) {
    return '-- m';
  }

  return distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`;
}

function formatTime(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) {
    return '-- daq';
  }

  return `${Math.max(1, Math.ceil(seconds / 60))} daq`;
}

function formatOrderId(orderId: string | null) {
  if (!orderId) {
    return '#----';
  }

  return orderId.startsWith('#') ? orderId : `#${orderId.slice(-6)}`;
}

export function InfoCards({ stage, distance, time, orderId, customerName, itemCount }: Props) {
  const orderIdText = formatOrderId(orderId);
  const cards =
    stage === 1
      ? [
          { label: 'Masofa', value: formatDistance(distance), color: '#f5a623', sub: "route bo'yicha" },
          { label: 'Vaqt', value: formatTime(time), color: '#2dd4a0', sub: 'taxminiy' },
          { label: 'Buyurtma', value: orderIdText, color: '#e8ecff', sub: `${itemCount} ta mahsulot` },
        ]
      : stage === 2
        ? [
            { label: 'Qoldi', value: formatDistance(distance), color: '#2dd4a0', sub: "route bo'yicha" },
            { label: 'Vaqt', value: formatTime(time), color: '#f5a623', sub: 'taxminiy' },
            {
              label: 'Mijoz',
              value: customerName || 'Mijoz',
              color: '#e8ecff',
              sub: `${itemCount} ta mahsulot`,
              valueSize: 12,
            },
          ]
        : [
            { label: 'Masofa', value: '0 m', color: '#2dd4a0', sub: 'yetkazildi' },
            { label: 'Vaqt', value: '✓', color: '#2dd4a0', sub: 'topshirildi' },
            { label: 'Buyurtma', value: orderIdText, color: '#e8ecff', sub: 'yakunlandi' },
          ];

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
            padding: '9px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: '#6b7080',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {card.label}
          </div>
          <div
            style={{
              fontSize: card.valueSize ?? 15,
              fontWeight: 500,
              color: card.color,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {card.value}
          </div>
          <div style={{ fontSize: 10, color: '#6b7080' }}>{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
