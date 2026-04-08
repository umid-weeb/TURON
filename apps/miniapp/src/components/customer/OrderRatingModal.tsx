import React, { useState } from 'react';
import { Star, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const RATING_LABELS = ['', 'Yomon', "Qoniqarsiz", "O'rtacha", 'Yaxshi', 'A\'lo!'];
const RATING_COLORS = ['', 'text-rose-400', 'text-orange-400', 'text-amber-400', 'text-lime-500', 'text-emerald-500'];

interface Props {
  orderId: string;
  orderNumber: string | number;
  onClose: () => void;
}

export const OrderRatingModal: React.FC<Props> = ({ orderId, orderNumber, onClose }) => {
  const queryClient = useQueryClient();
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const rateMutation = useMutation({
    mutationFn: ({ rating, note }: { rating: number; note?: string }) =>
      api.patch(`/orders/${orderId}/rating`, { rating, note: note || undefined }),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      window.setTimeout(onClose, 2200);
    },
  });

  const displayRating = hoveredStar || selectedRating;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0f172a] shadow-2xl"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          animation: 'slideUp 0.26s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {submitted ? (
          /* Success state */
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <p className="text-[18px] font-black text-white">Rahmat!</p>
            <p className="text-[13px] text-white/50">Fikringiz qabul qilindi</p>
          </div>
        ) : (
          <div className="px-5 pb-6 pt-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  Buyurtma #{orderNumber}
                </p>
                <p className="mt-1 text-[18px] font-black text-white">
                  Yetkazishni baholang
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/50 active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stars */}
            <div className="mt-6 flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform active:scale-90"
                  aria-label={`${star} yulduz`}
                >
                  <Star
                    size={40}
                    className={`transition-all duration-150 ${
                      star <= displayRating
                        ? 'fill-amber-400 text-amber-400 scale-110'
                        : 'fill-white/8 text-white/20'
                    }`}
                    style={{ transform: star <= displayRating ? 'scale(1.15)' : 'scale(1)' }}
                  />
                </button>
              ))}
            </div>

            {/* Rating label */}
            <p
              className={`mt-3 text-center text-[15px] font-black transition-all duration-200 ${
                displayRating ? RATING_COLORS[displayRating] : 'text-transparent'
              }`}
            >
              {displayRating ? RATING_LABELS[displayRating] : 'placeholder'}
            </p>

            {/* Note input — only shows when rating selected */}
            {selectedRating > 0 && (
              <div className="mt-4 animate-in slide-in-from-bottom-2 duration-200">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Izoh qoldiring (ixtiyoriy)..."
                  rows={2}
                  maxLength={300}
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/20 resize-none"
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={() => {
                if (!selectedRating || rateMutation.isPending) return;
                rateMutation.mutate({ rating: selectedRating, note });
              }}
              disabled={!selectedRating || rateMutation.isPending}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-amber-400 text-[15px] font-black text-slate-950 shadow-lg shadow-amber-900/30 transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              {rateMutation.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Star size={18} className="fill-slate-950" />
                  Baholash
                </>
              )}
            </button>

            {rateMutation.isError && (
              <p className="mt-2 text-center text-[12px] text-rose-400">
                {(rateMutation.error as Error)?.message || "Yuborib bo'lmadi"}
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full text-center text-[12px] text-white/30 transition-colors hover:text-white/50"
            >
              Keyinroq baholash
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};
