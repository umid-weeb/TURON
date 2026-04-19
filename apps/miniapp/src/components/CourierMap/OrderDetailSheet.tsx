import React from 'react';
import { OrderItem } from '../../store/courierStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  items: OrderItem[];
}

export function OrderDetailSheet({ isOpen, onClose, orderId, items }: Props) {
  if (!isOpen) return null;
  
  const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const orderIdText = orderId ? `#${orderId.slice(-6)}` : '';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ flex: 1 }} onClick={onClose} />
      <div style={{ background: '#1a1b26', borderRadius: '20px 20px 0 0', padding: '16px', paddingBottom: '32px', animation: 'slideUp 0.3s ease-out' }}>
        
        {/* Drag handle */}
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '0 auto 16px' }} />
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#e8ecff' }}>Buyurtma {orderIdText}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#6b7080', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
        </div>
        
        {/* Items */}
        <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🍽️</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#e8ecff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ fontSize: '12px', color: '#6b7080', marginTop: '2px' }}>× {item.quantity} ta</div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#2dd4a0' }}>
                {item.price.toLocaleString()} so'm
              </div>
            </div>
          ))}
        </div>
        
        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', marginTop: '8px' }}>
          <div style={{ fontSize: '14px', color: '#6b7080', fontWeight: 500 }}>Jami:</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#e8ecff' }}>{totalAmount.toLocaleString()} so'm</div>
        </div>

      </div>
    </div>
  );
}