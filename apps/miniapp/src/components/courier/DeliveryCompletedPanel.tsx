import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Loader2, MapPin, TrendingUp } from 'lucide-react';
import type { Order } from '../../data/types';
import type { RouteMetrics } from '../../features/maps/route';

interface DeliveryCompletedPanelProps {
  order: Order;
  metrics?: RouteMetrics;
  onNextOrder?: () => void;
  isLoadingNext?: boolean;
}

export const DeliveryCompletedPanel: React.FC<DeliveryCompletedPanelProps> = ({
  order,
  metrics,
  onNextOrder,
  isLoadingNext = false,
}) => {
  const navigate = useNavigate();

  const deliveryFee = typeof order.deliveryFee === 'number' ? order.deliveryFee : 0;
  const deliveryTime = metrics?.etaMinutes ?? 0;
  const distanceKm = metrics?.distanceKm ?? 0;

  const handleNextOrder = () => {
    if (onNextOrder) onNextOrder();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#101012] px-4 pb-8 pt-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,216,76,0.18),transparent_32%),radial-gradient(circle_at_bottom,rgba(124,241,190,0.12),transparent_24%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center">
        <div className="courier-accent-pill flex h-24 w-24 items-center justify-center rounded-[28px] shadow-[0_28px_60px_rgba(255,216,76,0.18)]">
          <CheckCircle2 size={52} className="text-[var(--courier-accent-contrast)]" />
        </div>

        <div className="mt-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--courier-accent)]">
            Yetkazish yakunlandi
          </p>
          <h1 className="mt-3 text-[32px] font-black leading-none tracking-[-0.05em] text-[#fff8eb]">
            Buyurtma topshirildi
          </h1>
          <p className="mt-3 text-[13px] font-semibold leading-[1.55] text-white/56">
            Siz buyurtmani muvaffaqiyatli yakunladingiz. Endi keyingi topshiriqqa o'tish mumkin.
          </p>
        </div>

        <div className="courier-dark-sheet mt-6 w-full rounded-[30px] border border-white/10 p-5">
          <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
                Buyurtma
              </p>
              <p className="mt-2 text-[28px] font-black leading-none tracking-[-0.04em] text-[#fff8eb]">
                #{order.orderNumber}
              </p>
              <p className="mt-3 text-[13px] font-semibold text-white/58">
                Mijoz: <span className="text-[#fff8eb]">{order.customerName}</span>
              </p>
            </div>

            <div className="rounded-full bg-[rgba(124,241,190,0.12)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#7cf1be]">
              OK
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {distanceKm > 0 ? (
              <div className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[rgba(255,216,76,0.12)] text-[var(--courier-accent)]">
                  <MapPin size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">
                    Masofa
                  </p>
                  <p className="mt-1 text-[15px] font-black text-[#fff8eb]">
                    {distanceKm.toFixed(1)} km
                  </p>
                </div>
              </div>
            ) : null}

            {deliveryTime > 0 ? (
              <div className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/8 text-white/80">
                  <Clock3 size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">
                    Vaqt
                  </p>
                  <p className="mt-1 text-[15px] font-black text-[#fff8eb]">
                    {deliveryTime} daqiqa
                  </p>
                </div>
              </div>
            ) : null}

            {deliveryFee > 0 ? (
              <div className="flex items-center gap-3 rounded-[20px] border border-[rgba(255,216,76,0.18)] bg-[rgba(255,216,76,0.08)] px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[rgba(255,216,76,0.14)] text-[var(--courier-accent)]">
                  <TrendingUp size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--courier-accent)]">
                    Daromad
                  </p>
                  <p className="mt-1 text-[18px] font-black text-[#fff8eb]">
                    {deliveryFee.toLocaleString()} so'm
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 w-full max-w-sm space-y-3">
          <button
            type="button"
            onClick={handleNextOrder}
            disabled={isLoadingNext}
            className="courier-cta-primary flex h-14 w-full items-center justify-center gap-2 rounded-[20px] text-[15px] font-black disabled:opacity-50"
          >
            {isLoadingNext ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Qidirilmoqda...</span>
              </>
            ) : (
              <>
                <span>Keyingi buyurtma</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/courier/orders')}
            disabled={isLoadingNext}
            className="flex h-12 w-full items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] text-[14px] font-black text-[#fff8eb] transition-all active:scale-95 disabled:opacity-50"
          >
            Buyurtmalar ro'yxatiga qaytish
          </button>
        </div>

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/36">
          Kuryer oqimi faol holatda qoladi
        </p>
      </div>
    </div>
  );
};
