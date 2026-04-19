import React from 'react';
import { CourierDeliveryStage } from '../../store/courierStore';

interface Props {
  stage: CourierDeliveryStage;
  distance: number | null;
  time: number | null;
  orderId: string | null;
  customerName: string;
  itemCount: number;
}

export function InfoCards({ stage, distance, time, orderId, customerName, itemCount }: Props) {
  
  const formatDist = (d: number | null) => d != null ? `${d} m` : '-- m';
  const formatTime = (t: number | null) => t != null ? `${Math.ceil(t / 60)} daq` : '-- daq';
  const orderIdText = orderId ? `#${orderId.slice(-6)}` : '#----';

  let card1, card2, card3;

  if (stage === 1) {
    card1 = { label: "Masofa", value: formatDist(distance), color: '#f5a623', sub: "route bo'yicha" };
    card2 = { label: "Vaqt", value: formatTime(time), color: '#2dd4a0', sub: "taxminiy" };
    card3 = { label: "Buyurtma", value: orderIdText, color: '#e8ecff', sub: `${itemCount} ta mahsulot` };
  } else if (stage === 2) {
    card1 = { label: "Qoldi", value: formatDist(distance), color: '#2dd4a0', sub: "route bo'yicha" };
    card2 = { label: "Vaqt", value: formatTime(time), color: '#f5a623', sub: "taxminiy" };
    card3 = { label: "Mijoz", value: customerName, color: '#e8ecff', sub: `${itemCount} ta mahsulot`, isName: true };
  } else {
    card1 = { label: "Masofa", value: "0 m", color: '#2dd4a0', sub: "yetkazildi" };
    card2 = { label: "Vaqt", value: "✓", color: '#2dd4a0', sub: "topshirildi" };
    card3 = { label: "Buyurtma", value: orderIdText, color: '#e8ecff', sub: "yakunlandi" };
  }

  const cards = [card1, card2, card3];

  return (
    <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
          padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: '3px'
        }}>
          <div style={{ fontSize: '10px', color: '#6b7080', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {c.label}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: c.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.value}
          </div>
          <div style={{ fontSize: c.isName ? '12px' : '10px', color: '#6b7080', fontWeight: 500 }}>
            {c.sub}
          </div>
        </div>
      ))}
    </div>
  );
}