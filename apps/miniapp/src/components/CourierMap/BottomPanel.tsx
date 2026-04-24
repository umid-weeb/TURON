import React, { useEffect, useRef, useState } from 'react';
import { DeliveryStage } from '../../data/types';
import { useAutoConfirmArrival } from '../../hooks/useAutoConfirmArrival';
import { useUpdateCourierOrderStage } from '../../hooks/queries/useOrders';
import { initiateCall } from '../../lib/callUtils';
import { useCourierStore } from '../../store/courierStore';
import { CallActionSheet } from './CallActionSheet';
import { InfoCards } from './InfoCards';
import { OrderDetailSheet } from './OrderDetailSheet';
import { StageTracker } from './StageTracker';
import { SwipeConfirmButton } from './SwipeConfirmButton';

// 56 px = 20 px drag-handle area (10 top + 4 handle + 6 bottom) + 36 px peek-row height
const COLLAPSED_PX    = 56;
const DRAG_THRESHOLD  = 60;
const ANIM_EASING     = 'transform 0.4s cubic-bezier(0.32,0.72,0,1)';

const PULSE_DOT_CSS = `
  @keyframes pulseDot {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:0.5; transform:scale(0.85); }
  }
  .bp-pulse-dot {
    width:8px; height:8px; border-radius:50%;
    background:#1d9e75;
    animation: pulseDot 2s ease-in-out infinite;
    flex-shrink:0;
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDist(m: number | null): string {
  if (m === null || Number.isNaN(m)) return '---';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function formatTime(s: number | null): string {
  if (s === null || Number.isNaN(s)) return '---';
  return `${Math.max(1, Math.ceil(s / 60))} daq`;
}

function fmtOrderId(orderNumber: string | null, orderId: string | null): string {
  const v = orderNumber || orderId;
  if (!v) return '#----';
  return v.startsWith('#') ? v : `#${v.slice(-6)}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SvgIcon({
  children,
  color,
  size = 18,
}: {
  children: React.ReactNode;
  color: string;
  size?: number;
}) {
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

function ActionBtn({
  label,
  color,
  onClick,
  children,
  last = false,
}: {
  label: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
  last?: boolean;
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
        gap: 4,
        padding: '10px 4px 12px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        borderRight: last ? 'none' : '1px solid rgba(255,255,255,0.07)',
        transition: 'background 0.15s',
      }}
    >
      <SvgIcon color={color}>{children}</SvgIcon>
      <span style={{ fontSize: 9, color: '#b8b1a5' }}>{label}</span>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface BottomPanelProps {
  onChat?: () => void;
  onProblem?: () => void;
}

export function BottomPanel({ onChat, onProblem }: BottomPanelProps) {
  // Activate GPS auto-confirm (stage 1 → 2 when leaving restaurant)
  useAutoConfirmArrival();

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
    isPanelExpanded,
    setPanelExpanded,
  } = useCourierStore();

  const updateStageMutation = useUpdateCourierOrderStage();
  const [isOrderSheetOpen, setOrderSheetOpen] = useState(false);
  const [isCallSheetOpen, setCallSheetOpen] = useState(false);

  // ── Panel DOM ref + animation ──────────────────────────────────────────────
  const panelRef    = useRef<HTMLDivElement>(null);
  const isMounted   = useRef(false);
  const dragStartY  = useRef(0);
  const isDragging  = useRef(false);

  // Position panel on mount (no animation) then animate on state changes
  useEffect(() => {
    if (!panelRef.current) return;
    const target = isPanelExpanded
      ? 'translateY(0)'
      : `translateY(calc(100% - ${COLLAPSED_PX}px))`;

    if (!isMounted.current) {
      isMounted.current = true;
      panelRef.current.style.transform = target;
    } else {
      panelRef.current.style.transition = ANIM_EASING;
      panelRef.current.style.transform  = target;
    }
  }, [isPanelExpanded]);

  // ── Drag gesture ────────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    if (panelRef.current) panelRef.current.style.transition = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !panelRef.current) return;
    const dy       = e.touches[0].clientY - dragStartY.current;
    const maxSlide = panelRef.current.offsetHeight - COLLAPSED_PX;

    if (isPanelExpanded && dy > 0) {
      // Dragging down from expanded — clamp so panel never hides more than collapsed pos
      panelRef.current.style.transform = `translateY(${Math.min(dy, maxSlide)}px)`;
    } else if (!isPanelExpanded && dy < 0) {
      // Dragging up from collapsed — maxSlide is the current offset, subtract drag
      const translate = Math.max(maxSlide + dy, 0);
      panelRef.current.style.transform = `translateY(${translate}px)`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current || !panelRef.current) return;
    isDragging.current = false;
    panelRef.current.style.transition = ANIM_EASING;

    const dy = e.changedTouches[0].clientY - dragStartY.current;

    if (isPanelExpanded && dy > DRAG_THRESHOLD) {
      setPanelExpanded(false);
    } else if (!isPanelExpanded && dy < -DRAG_THRESHOLD) {
      setPanelExpanded(true);
    } else {
      // Threshold not met → spring back to current state
      panelRef.current.style.transform = isPanelExpanded
        ? 'translateY(0)'
        : `translateY(calc(100% - ${COLLAPSED_PX}px))`;
    }
  };

  // ── Stage actions ────────────────────────────────────────────────────────────
  const handlePickedUp = async () => {
    if (orderId) {
      await updateStageMutation.mutateAsync({ id: orderId, stage: DeliveryStage.PICKED_UP });
    }
    setDeliveryStage(2);
    setPanelExpanded(true);
  };

  const handleDelivered = async () => {
    if (orderId) {
      await updateStageMutation.mutateAsync({ id: orderId, stage: DeliveryStage.DELIVERED });
    }
    setDeliveryStage(3);
  };

  // ── Derived display values ──────────────────────────────────────────────────
  const displayOrderId = fmtOrderId(orderNumber, orderId);
  const itemCount      = Math.max(orderItems.length, 0);
  const callPhone      = deliveryStage === 1 ? restaurantPhone : customerPhone;
  const callTarget     = deliveryStage === 1 ? 'restoran' : 'mijoz';

  const peekLabel =
    deliveryStage === 1 ? 'Restoranda' : deliveryStage === 2 ? 'Yetkazilmoqda' : 'Yakunlandi';

  const destinationRow = {
    1: {
      label: restaurantName || 'Turon Kafesi',
      address: restaurantAddress || "Yangi Sergeli ko'chasi, 11",
      badge: '→ olish',
      badgeColor: '#ffd84c',
      badgeBg: 'rgba(255,216,76,0.12)',
    },
    2: {
      label: customerName || 'Mijoz',
      address: customerAddress || "Manzil ko'rsatilmagan",
      badge: formatDist(distanceToDestination),
      badgeColor: '#ffd84c',
      badgeBg: 'rgba(255,216,76,0.12)',
    },
    3: {
      label: 'Buyurtma yakunlandi',
      address: `${displayOrderId} · ${itemCount} ta mahsulot`,
      badge: '✓ Topshirildi',
      badgeColor: '#1d9e75',
      badgeBg: 'rgba(29,158,117,0.15)',
    },
  }[deliveryStage];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{PULSE_DOT_CSS}</style>

      <div
        ref={panelRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          background: '#151517',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -6px 28px rgba(0,0,0,0.42)',
          paddingBottom: 'env(safe-area-inset-bottom,0px)',
          // transform is managed exclusively via DOM API — NOT set here
        }}
      >
        {/* ── Drag zone: handle + peek row ─────────────────────────────── */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => setPanelExpanded(!isPanelExpanded)}
          style={{ touchAction: 'none', cursor: 'pointer' }}
        >
          {/* Drag handle */}
          <div
            style={{
              width: 36,
              height: 4,
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 2,
              margin: '10px auto 6px',
            }}
          />

          {/* Peek row — exactly 36 px high */}
          <div
            style={{
              height: 36,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Left: pulse dot + stage label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {deliveryStage === 3 ? (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="#1d9e75" stroke="none">
                  <circle cx="12" cy="12" r="12" />
                </svg>
              ) : (
                <div className="bp-pulse-dot" />
              )}
              <span style={{ fontSize: 12, fontWeight: 500, color: '#ffd84c' }}>
                {peekLabel}
              </span>
            </div>

            {/* Right: distance · time + chevron */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {deliveryStage !== 3 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#ffcf33' }}>
                  {formatDist(distanceToDestination)} · {formatTime(timeToDestination)}
                </span>
              )}
              {/* Chevron: collapsed = rotate(180) = ∧, expanded = rotate(0) = ∨ */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{
                  transform: isPanelExpanded ? 'rotate(0deg)' : 'rotate(180deg)',
                  transition: 'transform 0.3s ease',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>
        {/* /Drag zone */}

        {/* ── Stage tracker ─────────────────────────────────────────────── */}
        <StageTracker stage={deliveryStage} />

        {/* ── Info cards ────────────────────────────────────────────────── */}
        <InfoCards
          stage={deliveryStage}
          distance={distanceToDestination}
          time={timeToDestination}
          orderId={displayOrderId}
          customerName={customerName}
          itemCount={itemCount}
        />

        {/* ── Destination row ───────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            minHeight: 48,
          }}
        >
          {/* Icon box */}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 14,
            }}
          >
            {deliveryStage === 1 ? (
              <SvgIcon color="#ffd84c" size={14}>
                <path d="M3 2h13l3 8H3L3 2z" />
                <path d="M3 10h16v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" />
                <line x1="9" y1="14" x2="9" y2="18" />
                <line x1="15" y1="14" x2="15" y2="18" />
              </SvgIcon>
            ) : deliveryStage === 2 ? (
              <SvgIcon color="#ffe27a" size={14}>
                <circle cx="12" cy="10" r="3" />
                <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" />
              </SvgIcon>
            ) : (
              <SvgIcon color="#1d9e75" size={14}>
                <polyline points="20 6 9 17 4 12" />
              </SvgIcon>
            )}
          </div>

          {/* Name + address */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#fff8eb',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {destinationRow.label}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#b8b1a5',
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {destinationRow.address}
            </div>
          </div>

          {/* Badge */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: destinationRow.badgeColor,
              background: destinationRow.badgeBg,
              padding: '3px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {destinationRow.badge}
          </div>
        </div>

        {/* ── Primary action ────────────────────────────────────────────── */}
        {deliveryStage === 1 ? (
          <SwipeConfirmButton
            label="Restoranda — buyurtmani oldim"
            sublabel="O'ngga suring →"
            onConfirm={() => void handlePickedUp()}
            disabled={updateStageMutation.isPending}
          />
        ) : deliveryStage === 2 ? (
          <div style={{ margin: '8px 16px' }}>
            <button
              type="button"
              onClick={() => void handleDelivered()}
              disabled={updateStageMutation.isPending}
              style={{
                width: '100%',
                height: 52,
                border: 'none',
                borderRadius: 14,
                background: updateStageMutation.isPending
                  ? 'rgba(255,216,76,0.35)'
                  : '#ffd84c',
                color: '#111111',
                fontSize: 13,
                fontWeight: 600,
                cursor: updateStageMutation.isPending ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity 0.15s',
                opacity: updateStageMutation.isPending ? 0.7 : 1,
              }}
            >
              <SvgIcon color="#111111" size={16}>
                <circle cx="12" cy="10" r="3" />
                <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" />
              </SvgIcon>
              {updateStageMutation.isPending ? 'Yangilanmoqda...' : 'Yetib keldim - topshirdim'}
            </button>
          </div>
        ) : (
          <div style={{ margin: '8px 16px' }}>
            <div
              style={{
                width: '100%',
                height: 52,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#b8b1a5',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <SvgIcon color="#1d9e75" size={16}>
                <polyline points="20 6 9 17 4 12" />
              </SvgIcon>
              Buyurtma yakunlandi
            </div>
          </div>
        )}

        {/* ── Actions row ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <ActionBtn
            label="Qo'ng'iroq"
            color="#ffcf33"
            onClick={() => {
              if (deliveryStage === 2) {
                setCallSheetOpen(true);
              } else if (!callPhone) {
                window.Telegram?.WebApp?.showAlert?.(
                  deliveryStage === 1
                    ? 'Restaurant telefon raqami admin sozlamalarida kiritilmagan.'
                    : "Mijoz telefon raqami topilmadi.",
                );
              } else {
                initiateCall(callPhone, callTarget);
              }
            }}
          >
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.18 2 2 0 014.1 2h3a2 2 0 012 1.72c.13.96.35 1.9.66 2.8a2 2 0 01-.45 2.11L8.1 9.84a16 16 0 006.06 6.06l1.21-1.21a2 2 0 012.11-.45c.9.31 1.84.53 2.8.66A2 2 0 0122 16.92z" />
          </ActionBtn>

          <ActionBtn
            label="Chat"
            color="#ffe27a"
            onClick={() => (onChat ? onChat() : window.Telegram?.WebApp?.showAlert?.('Chat mavjud emas'))}
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </ActionBtn>

          <ActionBtn
            label="Buyurtma"
            color="#ffd84c"
            onClick={() => setOrderSheetOpen(true)}
          >
            <path d="M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4a2 2 0 001-1.7z" />
          </ActionBtn>

          <ActionBtn
            label="Muammo"
            color="#f0706a"
            last
            onClick={() =>
              onProblem
                ? onProblem()
                : window.dispatchEvent(new CustomEvent('courier:open-problem'))
            }
          >
            <path d="M10.3 3.5L2.5 17a2 2 0 001.8 3h15.4a2 2 0 001.8-3L13.7 3.5a2 2 0 00-3.4 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </ActionBtn>
        </div>
      </div>

      <OrderDetailSheet
        isOpen={isOrderSheetOpen}
        onClose={() => setOrderSheetOpen(false)}
        orderId={displayOrderId}
        items={orderItems}
      />

      {isCallSheetOpen && orderId && (
        <CallActionSheet
          orderId={orderId}
          customerPhone={customerPhone}
          customerName={customerName || 'Mijoz'}
          onClose={() => setCallSheetOpen(false)}
        />
      )}
    </>
  );
}

