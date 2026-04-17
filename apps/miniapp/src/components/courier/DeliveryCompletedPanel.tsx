import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, TrendingUp, Loader2 } from 'lucide-react';
import type { Order } from '../../data/types';
import { useToast } from '../ui/Toast';
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
  const { showToast } = useToast();
  const [showConfetti, setShowConfetti] = useState(true);

  // Hide confetti after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const deliveryFee = typeof order.deliveryFee === 'number' ? order.deliveryFee : 0;
  const deliveryTime = metrics?.etaMinutes ?? 0;
  const distanceKm = metrics?.distanceKm ?? 0;

  const handleNextOrder = () => {
    if (onNextOrder) {
      onNextOrder();
    }
  };

  const handleBackToList = () => {
    navigate('/courier/orders');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4 pt-20 pb-8 font-sans text-white">
      {/* Animated confetti background */}
      {showConfetti && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse opacity-40"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${2 + Math.random() * 2}s ease-in-out infinite`,
              }}
            >
              <span className="text-3xl">
                {['🎉', '✅', '🎊', '⭐', '🚀'][Math.floor(Math.random() * 5)]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Success icon with animation */}
        <div className="mb-6 animate-bounce">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl">
            <CheckCircle2 size={48} className="text-white" />
          </div>
        </div>

        {/* Main message */}
        <h1 className="mb-2 text-center text-3xl font-black tracking-tight">
          Buyurtma topshirildi!
        </h1>
        <p className="mb-8 text-center text-sm font-semibold text-white/60">
          Ajoyib ish, kuryer! Siz mijozni xursand qildingiz 😊
        </p>

        {/* Order details card */}
        <div className="mb-8 w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          {/* Order number and customer */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              Buyurtma raqami
            </p>
            <p className="mt-1 text-2xl font-black text-white">#{order.orderNumber}</p>
            <p className="mt-3 text-sm font-semibold text-white/70">
              Mijoz: <span className="text-white">{order.customerName}</span>
            </p>
          </div>

          {/* Stats grid */}
          <div className="space-y-4">
            {/* Distance */}
            {distanceKm > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                  <MapPin size={18} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/40">
                    Masofa
                  </p>
                  <p className="mt-0.5 text-sm font-black text-white">
                    {distanceKm.toFixed(1)} km
                  </p>
                </div>
              </div>
            )}

            {/* Time */}
            {deliveryTime > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                  <Clock size={18} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/40">
                    Vaqt
                  </p>
                  <p className="mt-0.5 text-sm font-black text-white">
                    {deliveryTime} min
                  </p>
                </div>
              </div>
            )}

            {/* Earnings */}
            {deliveryFee > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/30">
                  <TrendingUp size={18} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300/60">
                    Siz topasiz
                  </p>
                  <p className="mt-0.5 text-lg font-black text-emerald-300">
                    {deliveryFee.toLocaleString()} so'm
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full max-w-sm space-y-3">
          {/* Next order button */}
          <button
            type="button"
            onClick={handleNextOrder}
            disabled={isLoadingNext}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 font-black text-white shadow-lg transition-all hover:shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isLoadingNext ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Qidirilmoqda...</span>
              </>
            ) : (
              <>
                <span>🚀 Keyingi buyurtma</span>
              </>
            )}
          </button>

          {/* Back to list button */}
          <button
            type="button"
            onClick={handleBackToList}
            disabled={isLoadingNext}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 font-bold text-white transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50"
          >
            Buyurtmalar ro'yxatiga qaytish
          </button>
        </div>

        {/* Footer message */}
        <p className="mt-8 text-center text-xs font-semibold text-white/40">
          Shuning o'zida yangi buyurtma tegishi mumkin. 📲
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.4; }
          50% { transform: translateY(-20px) rotate(10deg); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
};
