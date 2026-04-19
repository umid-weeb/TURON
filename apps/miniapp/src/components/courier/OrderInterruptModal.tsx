import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Package, ShoppingBag, X } from 'lucide-react';
import type { CourierOrderPreview } from '../../data/types';
import { useDeclineCourierOrder } from '../../hooks/queries/useOrders';
import { useOrderInterruptStore } from '../../store/useOrderInterruptStore';
import { api } from '../../lib/api';
import type { Order } from '../../data/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SlideToConfirmAction } from './CourierComponents';

const COUNTDOWN_SECONDS = 30;

// Circular countdown ring
function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const dashOffset = circumference * (1 - progress);
  const color = seconds <= 10 ? '#ef4444' : seconds <= 20 ? '#f59e0b' : '#10b981';

  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg className="-rotate-90" width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#1e293b" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <span
        className="absolute text-[18px] font-black tabular-nums"
        style={{ color }}
      >
        {seconds}
      </span>
    </div>
  );
}

interface Props {
  order: CourierOrderPreview;
}

function OrderInterruptContent({ order }: Props) {
  const navigate = useNavigate();
  const dismiss = useOrderInterruptStore((s) => s.dismissInterrupt);
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const queryClient = useQueryClient();
  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.post(`/courier/order/${id}/accept`) as Promise<Order>,
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(['courier-order', updatedOrder.id], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ['courier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['courier-status'] });
    },
  });
  const declineMutation = useDeclineCourierOrder();

  const isLoading = acceptMutation.isPending || declineMutation.isPending;

  // Countdown timer
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          dismiss(); // Auto-dismiss on timeout — courier missed it
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dismiss]);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handleAccept() {
    stopTimer();
    setError(null);

    try {
      await acceptMutation.mutateAsync(order.id);
      dismiss();
      navigate(`/courier/map/${order.id}`);
    } catch (err) {
      // Network timeout or intermittent error — verify whether accept actually landed on server
      try {
        const orders = await (api.get('/courier/orders') as Promise<Array<{ id: string; courierAssignmentStatus: string }>>);
        const accepted = orders.find((o) => o.id === order.id && o.courierAssignmentStatus === 'ACCEPTED');
        if (accepted) {
          // Accept succeeded on server despite client-side error — go to map
          queryClient.invalidateQueries({ queryKey: ['courier-orders'] });
          queryClient.invalidateQueries({ queryKey: ['courier-status'] });
          dismiss();
          navigate(`/courier/map/${order.id}`);
          return;
        }
      } catch {
        // Can't verify — show original error
      }
      const msg = err instanceof Error ? err.message : 'Qabul qilishda xatolik';
      setError(msg);
      // Restart timer so courier can still decline
      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            dismiss();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }

  async function handleDecline() {
    stopTimer();
    setError(null);

    try {
      await declineMutation.mutateAsync({ id: order.id });
    } catch {
      // Silently dismiss even on error — courier clearly wants to decline
    } finally {
      dismiss();
    }
  }

  const deliveryFeeStr =
    typeof order.deliveryFee === 'number'
      ? `${order.deliveryFee.toLocaleString()} so'm`
      : null;

  const totalStr =
    typeof order.total === 'number'
      ? `${order.total.toLocaleString()} so'm`
      : null;

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          {/* Pulsing alert dot */}
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              Yangi topshiriq
            </p>
            <p className="text-[18px] font-black leading-none text-white">
              #{order.orderNumber}
            </p>
          </div>
        </div>
        <CountdownRing seconds={seconds} total={COUNTDOWN_SECONDS} />
      </div>

      {/* ── Route info ── */}
      <div className="mx-4 mb-3 flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/5 p-4">
        {/* Pickup */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
            <ShoppingBag size={14} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
              Olib ketish
            </p>
            <p className="truncate text-[14px] font-bold text-white">
              {order.restaurantName}
            </p>
            {typeof order.distanceToRestaurantMeters === 'number' && (
              <p className="text-[11px] text-white/40">
                {order.distanceToRestaurantMeters < 1000
                  ? `${order.distanceToRestaurantMeters} m`
                  : `${(order.distanceToRestaurantMeters / 1000).toFixed(1)} km`}
                {typeof order.etaToRestaurantMinutes === 'number' &&
                  ` · ~${order.etaToRestaurantMinutes} daq`}
              </p>
            )}
          </div>
        </div>

        {/* Connector line */}
        <div className="ml-3.5 h-4 w-px bg-white/10" />

        {/* Destination */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/20">
            <MapPin size={14} className="text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
              Yetkazish
            </p>
            <p className="truncate text-[14px] font-bold text-white">
              {order.customerName}
            </p>
            <p className="truncate text-[11px] text-white/40">
              {order.destinationAddress || order.destinationArea}
            </p>
          </div>
        </div>
      </div>

      {/* ── Order summary ── */}
      <div className="mx-4 mb-4 flex gap-2">
        <div className="flex flex-1 flex-col items-center gap-0.5 rounded-[14px] border border-white/8 bg-white/5 py-3">
          <Package size={14} className="text-amber-400" />
          <p className="text-[11px] font-black text-white/50">Mahsulotlar</p>
          <p className="text-[15px] font-black text-white">{order.itemCount} ta</p>
        </div>

        {totalStr && (
          <div className="flex flex-1 flex-col items-center gap-0.5 rounded-[14px] border border-white/8 bg-white/5 py-3">
            <p className="text-[11px] font-black text-white/50">Summa</p>
            <p className="text-[15px] font-black text-white">{totalStr}</p>
          </div>
        )}

        {deliveryFeeStr && (
          <div className="flex flex-1 flex-col items-center gap-1 rounded-[14px] border border-emerald-400/30 bg-emerald-500/12 py-3 shadow-[0_0_16px_rgba(52,211,153,0.12)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400/60">Siz topasiz</p>
            <p className="text-[18px] font-black leading-none text-emerald-300">{deliveryFeeStr}</p>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-4 mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5">
          <p className="text-[12px] text-red-300">{error}</p>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="mt-auto px-4 pb-5">
        <SlideToConfirmAction
          label="O'ngga torting — qabul qilish"
          hint="Xaritaga o'tib navigatsiya boshlanadi"
          onConfirm={() => void handleAccept()}
          isLoading={acceptMutation.isPending}
          disabled={declineMutation.isPending}
          theme="dark"
        />
        <button
          type="button"
          onClick={() => void handleDecline()}
          disabled={isLoading}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-[13px] font-black text-white/50 transition-all active:scale-95 disabled:opacity-40"
        >
          <X size={16} />
          <span>Rad etish</span>
        </button>
      </div>
    </div>
  );
}

// The global interrupt overlay — renders above everything via fixed positioning
export function OrderInterruptModal() {
  const pendingOrder = useOrderInterruptStore((s) => s.pendingOrder);
  const isVisible = useOrderInterruptStore((s) => s.isVisible);
  const setInterruptVisible = useOrderInterruptStore((s) => s.setInterruptVisible);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);

  if (!pendingOrder) return null;

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    startYRef.current = event.touches[0].clientY;
    isDraggingRef.current = true;
    if (sheetRef.current) {
      sheetRef.current.style.transition = '';
    }
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !sheetRef.current) return;
    const deltaY = event.touches[0].clientY - startYRef.current;
    if (deltaY > 0) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const deltaY = event.changedTouches[0].clientY - startYRef.current;
    isDraggingRef.current = false;

    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
      sheetRef.current.style.transition = 'transform 0.28s ease';
    }

    if (deltaY > 100) {
      setInterruptVisible(false);
    }
  };

  if (!isVisible) {
    return (
      <button
        type="button"
        onClick={() => setInterruptVisible(true)}
        className="fixed bottom-0 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-1 rounded-t-2xl bg-emerald-600 px-6 pb-4 pt-2 text-white shadow-[0_-8px_30px_rgba(16,185,129,0.35)] active:scale-95"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
          <polyline points="2 10 10 2 18 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="text-[12px] font-black">
          Yangi zakaz #{pendingOrder.orderNumber} - ko'rish
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      {/* Sheet-style panel from bottom */}
      <div
        ref={sheetRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="w-full max-w-md overflow-hidden rounded-t-[28px] border border-white/10 bg-slate-900 shadow-2xl"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          animation: 'slideUp 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        <OrderInterruptContent order={pendingOrder} />
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
