import React, { useState } from 'react';
import { useCourierStore } from '../../store/courierStore';
import { StageTracker } from './StageTracker';
import { InfoCards } from './InfoCards';
import { OrderDetailSheet } from './OrderDetailSheet';

export function BottomPanel() {
  const {
    deliveryStage,
    distanceLeft,
    timeLeft,
    orderInfo,
    setDeliveryStage,
  } = useCourierStore();
  
  const [isOrderModalOpen, setOrderModalOpen] = useState(false);

  // Mock data fallback if orderInfo is not set yet
  const safeOrderInfo = orderInfo || {
    orderId: '100059',
    orderItems: [{ id: '1', name: 'Tandir Somsa', quantity: 2, price: 12500 }],
    restaurantName: 'Turon Kafesi',
    restaurantAddress: "Yangi Sergeli ko'chasi, 11",
    restaurantPhone: '+998901234567',
    customerName: 'Sardor S.',
    customerAddress: "Uzumzor 16-berk ko'chasi, 3",
    customerPhone: '+998901112233',
    customerCoords: null,
    restaurantCoords: null
  };

  const itemCount = safeOrderInfo.orderItems.length;

  const handlePrimaryAction = async () => {
    if (deliveryStage === 1) {
      setDeliveryStage(2);
    } else if (deliveryStage === 2) {
      setDeliveryStage(3);
    }
  };

  const destRowConfig = {
    1: { icon: '🍽️', name: safeOrderInfo.restaurantName, addr: safeOrderInfo.restaurantAddress, badge: '→ olish', badgeColor: '#2dd4a0', badgeBg: 'rgba(29,158,117,0.12)' },
    2: { icon: '📍', name: safeOrderInfo.customerName, addr: safeOrderInfo.customerAddress, badge: `${distanceLeft ?? '--'} m`, badgeColor: '#2dd4a0', badgeBg: 'rgba(29,158,117,0.12)' },
    3: { icon: '✅', name: 'Buyurtma yakunlandi', addr: `#${safeOrderInfo.orderId.slice(-6)} · ${itemCount} ta mahsulot`, badge: '✓ Topshirildi', badgeColor: '#1d9e75', badgeBg: 'rgba(29,158,117,0.15)' }
  }[deliveryStage];

  const primaryButtonConfig = {
    1: { bg: '#1d9e75', text: 'Restoranda — buyurtmani oldim', disabled: false, icon: <polyline points="20 6 9 17 4 12" /> },
    2: { bg: '#185fa5', text: 'Yetib keldim — topshirdim', disabled: false, icon: <><circle cx="12" cy="10" r="3" /><path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" /></> },
    3: { bg: '#444441', text: 'Buyurtma yakunlandi', disabled: true, icon: <polyline points="20 6 9 17 4 12" /> }
  }[deliveryStage];

  const handleCall = () => {
    const phone = deliveryStage === 1 ? safeOrderInfo.restaurantPhone : safeOrderInfo.customerPhone;
    window.location.href = `tel:${phone}`;
  };
  
  const handleChat = () => {
    alert("Telegram chat ochilmoqda...");
  };

  const handleProblem = () => {
    alert("Muammo xabar qilish oynasi ochilmoqda...");
  };

  return (
    <>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#1a1b26', borderRadius: '16px 16px 0 0',
        zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.5)'
      }}>
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '10px auto 0' }} />

        <StageTracker stage={deliveryStage} />
        
        <InfoCards 
          stage={deliveryStage} 
          distance={distanceLeft} 
          time={timeLeft} 
          orderId={safeOrderInfo.orderId} 
          customerName={safeOrderInfo.customerName} 
          itemCount={itemCount} 
        />

        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
            {destRowConfig.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#e8ecff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{destRowConfig.name}</div>
            <div style={{ fontSize: '11px', color: '#6b7080', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{destRowConfig.addr}</div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 500, borderRadius: '6px', padding: '3px 8px', flexShrink: 0, color: destRowConfig.badgeColor, background: destRowConfig.badgeBg }}>
            {destRowConfig.badge}
          </div>
        </div>

        <div style={{ margin: '10px 16px 14px', width: 'calc(100% - 32px)' }}>
          <button onClick={handlePrimaryAction} disabled={primaryButtonConfig.disabled} style={{
            border: 'none', borderRadius: '12px', padding: '13px', width: '100%',
            fontSize: '14px', fontWeight: 500, color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: primaryButtonConfig.bg, cursor: primaryButtonConfig.disabled ? 'default' : 'pointer',
            opacity: primaryButtonConfig.disabled ? 0.8 : 1, transition: 'all 0.15s ease'
          }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {primaryButtonConfig.icon}
            </svg>
            {primaryButtonConfig.text}
          </button>
        </div>

        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={handleCall} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '12px 6px 14px', border: 'none', background: 'transparent', cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1A19.5 19.5 0 013.1 11 a19.8 19.8 0 01-3-8.6A2 2 0 012 .2h3a2 2 0 012 1.7c.1 1.2.4 2.4.7 3.5 a2 2 0 01-.5 2L6 8.9a16 16 0 006.1 6l1.5-1.5a2 2 0 012-.5 c1.1 .3 2.3 .6 3.5 .7a2 2 0 011.9 2z"/></svg>
            <span style={{ fontSize: '10px', color: '#6b7080' }}>Qo'ng'iroq</span>
          </button>
          <button onClick={handleChat} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '12px 6px 14px', border: 'none', background: 'transparent', cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5b7fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span style={{ fontSize: '10px', color: '#6b7080' }}>Chat</span>
          </button>
          <button onClick={() => setOrderModalOpen(true)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '12px 6px 14px', border: 'none', background: 'transparent', cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2dd4a0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8 a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4a2 2 0 001-1.7z"/></svg>
            <span style={{ fontSize: '10px', color: '#6b7080' }}>Buyurtma</span>
          </button>
          <button onClick={handleProblem} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '12px 6px 14px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f0706a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.5L2.5 17a2 2 0 001.8 3h15.4a2 2 0 001.8-3L13.7 3.5a2 2 0 00-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ fontSize: '10px', color: '#6b7080' }}>Muammo</span>
          </button>
        </div>
      </div>

      <OrderDetailSheet 
        isOpen={isOrderModalOpen} 
        onClose={() => setOrderModalOpen(false)} 
        orderId={safeOrderInfo.orderId}
        items={safeOrderInfo.orderItems}
      />
    </>
  );
}
