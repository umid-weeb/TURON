import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Package, ShoppingBag, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CourierOrderPreview, Order } from '../../data/types';
import { useDeclineCourierOrder } from '../../hooks/queries/useOrders';
import { api } from '../../lib/api';
import { useOrderInterruptStore } from '../../store/useOrderInterruptStore';
import { SlideToConfirmAction } from './CourierComponents';

const COUNTDOWN_SECONDS = 30;

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(seconds / total, 0);
  const dashOffset = circumference * (1 - progress);
  const color =
    seconds <= 8 ? '#f87171' : seconds <= 18 ? '#ffd84c' : '#7cf1be';

  return (
    <div className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full bg-black/12">
      <svg className="-rotate-90" width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.25s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-[20px] font-black leading-none text-[#fff8eb] tabular-nums">
          {seconds}
        </div>
        <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/38">
          soniya
        </div>
      </div>
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

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          dismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [dismiss]);

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
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
      try {
        const orders = await (api.get('/courier/orders') as Promise<Array<{ id: string; courierAssignmentStatus: string }>>);
        const accepted = orders.find((item) => item.id === order.id && item.courierAssignmentStatus === 'ACCEPTED');
        if (accepted) {
          queryClient.invalidateQueries({ queryKey: ['courier-orders'] });
          queryClient.invalidateQueries({ queryKey: ['courier-status'] });
          dismiss();
          navigate(`/courier/map/${order.id}`);
          return;
        }
      } catch {
        // Keep the original error below when verification fails.
      }

      setError(err instanceof Error ? err.message : 'Qabul qilishda xatolik');
      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) window.clearInterval(timerRef.current);
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
      // Silent: courier clearly wants to decline the assignment.
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

  const etaLabel =
    typeof order.etaToRestaurantMinutes === 'number'
      ? `${order.etaToRestaurantMinutes} daq`
      : null;

  const distanceLabel =
    typeof order.distanceToRestaurantMeters === 'number'
      ? order.distanceToRestaurantMeters < 1000
        ? `${order.distanceToRestaurantMeters} m`
        : `${(order.distanceToRestaurantMeters / 1000).toFixed(1)} km`
      : null;

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--courier-accent)]">
              <span className="h-2 w-2 rounded-full bg-[var(--courier-accent)] animate-pulse" />
              Yangi topshiriq
            </div>
            <p className="mt-3 text-[30px] font-black leading-none tracking-[-0.04em] text-[#fff8eb]">
              #{order.orderNumber}
            </p>
            <p className="mt-2 max-w-[220px] text-[13px] font-semibold leading-[1.5] text-white/58">
              Qabul qilsangiz navigatsiya darhol ishga tushadi va buyurtma sizga biriktiriladi.
            </p>
          </div>

          <CountdownRing seconds={seconds} total={COUNTDOWN_SECONDS} />
        </div>
      </div>

      <div className="mx-4 mb-3 rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[rgba(255,216,76,0.12)] text-[var(--courier-accent)]">
            <ShoppingBag size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">
              Olib ketish
            </p>
            <p className="mt-1 truncate text-[15px] font-black text-[#fff8eb]">
              {order.restaurantName}
            </p>
            <p className="mt-1 text-[12px] text-white/48">
              {[distanceLabel, etaLabel].filter(Boolean).join(' · ') || "Masofa aniqlanmoqda"}
            </p>
          </div>
        </div>

        <div className="ml-5 mt-3 h-4 w-px bg-white/10" />

        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-white/8 text-white/80">
            <MapPin size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">
              Yetkazish
            </p>
            <p className="mt-1 truncate text-[15px] font-black text-[#fff8eb]">
              {order.customerName}
            </p>
            <p className="mt-1 truncate text-[12px] text-white/48">
              {order.destinationAddress || order.destinationArea}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-3 text-center">
          <Package size={16} className="mx-auto text-[var(--courier-accent)]" />
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
            Mahsulot
          </p>
          <p className="mt-1 text-[15px] font-black text-[#fff8eb]">{order.itemCount} ta</p>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
            Summa
          </p>
          <p className="mt-4 text-[15px] font-black text-[#fff8eb]">
            {totalStr || '--'}
          </p>
        </div>

        <div className="rounded-[18px] border border-[rgba(255,216,76,0.18)] bg-[rgba(255,216,76,0.08)] px-3 py-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--courier-accent)]">
            Daromad
          </p>
          <p className="mt-4 text-[15px] font-black text-[#fff8eb]">
            {deliveryFeeStr || '--'}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mx-4 mb-3 rounded-[18px] border border-rose-400/25 bg-rose-500/10 px-4 py-3">
          <p className="text-[12px] font-semibold text-rose-200">{error}</p>
        </div>
      ) : null}

      <div className="mt-auto px-4 pb-5">
        <SlideToConfirmAction
          label="Qabul qilish"
          hint="O'ngga suring va xaritaga o'ting"
          onConfirm={() => void handleAccept()}
          isLoading={acceptMutation.isPending}
          disabled={declineMutation.isPending}
          theme="dark"
        />

        <button
          type="button"
          onClick={() => void handleDecline()}
          disabled={isLoading}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] text-[13px] font-black text-white/65 transition-all active:scale-95 disabled:opacity-40"
        >
          <X size={16} />
          <span>Rad etish</span>
        </button>
      </div>
    </div>
  );
}

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
        className="fixed bottom-0 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-1 rounded-t-[24px] border border-white/10 bg-[#151517] px-6 pb-4 pt-2 text-[#fff8eb] shadow-[0_-14px_36px_rgba(0,0,0,0.42)] active:scale-95"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="h-1 w-9 rounded-full bg-white/18" />
        <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,216,76,0.12)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--courier-accent)]">
          <span className="h-2 w-2 rounded-full bg-[var(--courier-accent)] animate-pulse" />
          Yangi topshiriq
        </span>
        <span className="text-[12px] font-black">
          Zakaz #{pendingOrder.orderNumber}
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/72 backdrop-blur-md"
    >
      <div
        ref={sheetRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="courier-dark-sheet w-full max-w-md overflow-hidden rounded-t-[30px] border border-white/10"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          animation: 'courierInterruptUp 0.28s cubic-bezier(0.34, 1.2, 0.64, 1)',
        }}
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-white/18" />
        </div>
        <OrderInterruptContent order={pendingOrder} />
      </div>

      <style>{`
        @keyframes courierInterruptUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
