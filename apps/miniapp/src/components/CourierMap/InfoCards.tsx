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
          { label: 'Masofa', value: formatDistance(distance), color: '#ffd84c', sub: "route bo'yicha" },
          { label: 'Vaqt', value: formatTime(time), color: '#fff8eb', sub: 'taxminiy' },
          { label: 'Buyurtma', value: orderIdText, color: '#fff8eb', sub: `${itemCount} ta mahsulot` },
        ]
      : stage === 2
        ? [
            { label: 'Qoldi', value: formatDistance(distance), color: '#ffd84c', sub: "route bo'yicha" },
            { label: 'Vaqt', value: formatTime(time), color: '#fff8eb', sub: 'taxminiy' },
            {
              label: 'Mijoz',
              value: customerName || 'Mijoz',
              color: '#fff8eb',
              sub: `${itemCount} ta mahsulot`,
              valueSize: 12,
            },
          ]
        : [
            { label: 'Masofa', value: '0 m', color: '#7cf1be', sub: 'yetkazildi' },
            { label: 'Vaqt', value: 'OK', color: '#7cf1be', sub: 'topshirildi' },
            { label: 'Buyurtma', value: orderIdText, color: '#fff8eb', sub: 'yakunlandi' },
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
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 14,
            padding: '10px 11px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 0,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: '#9b9486',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 800,
            }}
          >
            {card.label}
          </div>
          <div
            style={{
              fontSize: card.valueSize ?? 15,
              fontWeight: 700,
              color: card.color,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {card.value}
          </div>
          <div style={{ fontSize: 10, color: '#b8b1a5' }}>{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
