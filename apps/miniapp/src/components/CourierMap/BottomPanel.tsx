import React, { useState } from 'react';
import { DeliveryStage } from '../../data/types';
import { useUpdateCourierOrderStage } from '../../hooks/queries/useOrders';
import { useCourierStore } from '../../store/courierStore';
import { InfoCards } from './InfoCards';
import { OrderDetailSheet } from './OrderDetailSheet';
import { StageTracker } from './StageTracker';

interface BottomPanelProps {
  onChat?: () => void;
  onProblem?: () => void;
}

function formatDistance(distance: number | null) {
  if (distance === null || Number.isNaN(distance)) {
    return '-- m';
  }

  return distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`;
}

function formatOrderId(orderNumber: string | null, orderId: string | null) {
  const value = orderNumber || orderId;
  if (!value) return '#----';
  return value.startsWith('#') ? value : `#${value.slice(-6)}`;
}

function Icon({ children, color, size = 20 }: { children: React.ReactNode; color: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function ActionButton({
  label,
  color,
  onClick,
  children,
  withDivider = true,
}: {
  label: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
  withDivider?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        padding: '12px 6px 14px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        borderRight: withDivider ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition: 'background 0.15s',
      }}
    >
      <Icon color={color}>{children}</Icon>
      <span style={{ fontSize: 10, color: '#6b7080' }}>{label}</span>
    </button>
  );
}

export function BottomPanel({ onChat, onProblem }: BottomPanelProps) {
  const {
    deliveryStage,
    distanceToDestination,
    timeToDestination,
    orderId,
    orderNumber,
    orderItems,
    restaurantName,
    restaurantAddress,
    restaurantPhone,
    customerName,
    customerAddress,
    customerPhone,
    setDeliveryStage,
  } = useCourierStore();
  const updateStageMutation = useUpdateCourierOrderStage();
  const [isOrderSheetOpen, setOrderSheetOpen] = useState(false);

  const itemCount = Math.max(orderItems.length, 0);
  const displayOrderId = formatOrderId(orderNumber, orderId);

  const handlePickedUp = async () => {
    if (orderId) {
      await updateStageMutation.mutateAsync({ id: orderId, stage: DeliveryStage.PICKED_UP });
    }
    setDeliveryStage(2);
  };

  const handleDelivered = async () => {
    if (orderId) {
      await updateStageMutation.mutateAsync({ id: orderId, stage: DeliveryStage.DELIVERED });
    }
    setDeliveryStage(3);
  };

  const handlePrimaryAction = async () => {
    if (deliveryStage === 1) await handlePickedUp();
    if (deliveryStage === 2) await handleDelivered();
  };

  const primaryButtonConfig = {
    1: {
      bg: '#1d9e75',
      text: 'Restoranda - buyurtmani oldim',
      disabled: false,
      icon: <polyline points="20 6 9 17 4 12" />,
    },
    2: {
      bg: '#185fa5',
      text: 'Yetib keldim - topshirdim',
      disabled: false,
      icon: (
        <>
          <circle cx="12" cy="10" r="3" />
          <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" />
        </>
      ),
    },
    3: {
      bg: '#444441',
      text: 'Buyurtma yakunlandi',
      disabled: true,
      icon: <polyline points="20 6 9 17 4 12" />,
    },
  }[deliveryStage];

  const destinationRow = {
    1: {
      icon: '🍽️',
      name: restaurantName || 'Turon Kafesi',
      address: restaurantAddress || "Yangi Sergeli ko'chasi, 11",
      badge: '→ olish',
      badgeColor: '#2dd4a0',
      badgeBg: 'rgba(29,158,117,0.12)',
    },
    2: {
      icon: '📍',
      name: customerName || 'Mijoz',
      address: customerAddress || "Manzil ko'rsatilmagan",
      badge: formatDistance(distanceToDestination),
      badgeColor: '#2dd4a0',
      badgeBg: 'rgba(29,158,117,0.12)',
    },
    3: {
      icon: '✅',
      name: 'Buyurtma yakunlandi',
      address: `${displayOrderId} · ${itemCount} ta mahsulot`,
      badge: '✓ Topshirildi',
      badgeColor: '#1d9e75',
      badgeBg: 'rgba(29,158,117,0.15)',
    },
  }[deliveryStage];

  const callPhone = deliveryStage === 1 ? restaurantPhone : customerPhone;
  const callTarget = deliveryStage === 1 ? 'restoran' : 'mijoz';

  const handleCall = () => {
    if (!callPhone) {
      window.Telegram?.WebApp?.showAlert?.(`${callTarget} telefoni mavjud emas`);
      return;
    }
    window.location.href = `tel:${callPhone}`;
  };

  const handleChat = () => {
    if (onChat) {
      onChat();
      return;
    }
    window.Telegram?.WebApp?.showAlert?.('Mijoz chat havolasi mavjud emas');
  };

  const handleProblem = () => {
    if (onProblem) {
      onProblem();
      return;
    }
    window.dispatchEvent(new CustomEvent('courier:open-problem'));
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          background: '#1a1b26',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -6px 28px rgba(0,0,0,0.42)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
            margin: '10px auto 0',
          }}
        />

        <StageTracker stage={deliveryStage} />
        <InfoCards
          stage={deliveryStage}
          distance={distanceToDestination}
          time={timeToDestination}
          orderId={displayOrderId}
          customerName={customerName}
          itemCount={itemCount}
        />

        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {destinationRow.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#e8ecff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {destinationRow.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#6b7080',
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {destinationRow.address}
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              padding: '3px 8px',
              color: destinationRow.badgeColor,
              background: destinationRow.badgeBg,
              flexShrink: 0,
            }}
          >
            {destinationRow.badge}
          </div>
        </div>

        <div style={{ margin: '10px 16px 14px', width: 'calc(100% - 32px)' }}>
          <button
            type="button"
            onClick={() => void handlePrimaryAction()}
            disabled={primaryButtonConfig.disabled || updateStageMutation.isPending}
            style={{
              border: 'none',
              borderRadius: 12,
              padding: 13,
              width: '100%',
              fontSize: 14,
              fontWeight: 500,
              color: '#ffffff',
              cursor: primaryButtonConfig.disabled ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.15s, transform 0.15s',
              background: primaryButtonConfig.bg,
              opacity: updateStageMutation.isPending ? 0.72 : 1,
            }}
          >
            <Icon color="#fff" size={18}>{primaryButtonConfig.icon}</Icon>
            {updateStageMutation.isPending ? 'Yangilanmoqda...' : primaryButtonConfig.text}
          </button>
        </div>

        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <ActionButton label="Qo'ng'iroq" color="#f5a623" onClick={handleCall}>
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.18 2 2 0 014.1 2h3a2 2 0 012 1.72c.13.96.35 1.9.66 2.8a2 2 0 01-.45 2.11L8.1 9.84a16 16 0 006.06 6.06l1.21-1.21a2 2 0 012.11-.45c.9.31 1.84.53 2.8.66A2 2 0 0122 16.92z" />
          </ActionButton>
          <ActionButton label="Chat" color="#5b7fff" onClick={handleChat}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </ActionButton>
          <ActionButton label="Buyurtma" color="#2dd4a0" onClick={() => setOrderSheetOpen(true)}>
            <path d="M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4a2 2 0 001-1.7z" />
          </ActionButton>
          <ActionButton label="Muammo" color="#f0706a" onClick={handleProblem} withDivider={false}>
            <path d="M10.3 3.5L2.5 17a2 2 0 001.8 3h15.4a2 2 0 001.8-3L13.7 3.5a2 2 0 00-3.4 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </ActionButton>
        </div>
      </div>

      <OrderDetailSheet
        isOpen={isOrderSheetOpen}
        onClose={() => setOrderSheetOpen(false)}
        orderId={displayOrderId}
        items={orderItems}
      />
    </>
  );
}
