import { useCourierStore } from '../../store/courierStore';
import { formatDistance, formatTime } from '../../lib/headingUtils';

interface BottomPanelProps {
  routeLoading?: boolean;
  onCall?: () => void;
  onArrived?: () => void;
  onProblem?: () => void;
}

/**
 * Pastki panel — masofa, vaqt, tugmalar
 */
export function BottomPanel({
  routeLoading = false,
  onCall,
  onArrived,
  onProblem,
}: BottomPanelProps) {
  const { distanceLeft, timeLeft } = useCourierStore();

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto
        bg-[rgba(20,20,32,0.92)] rounded-t-3xl px-4 pt-4 pb-6 backdrop-blur-sm
        border-t border-white/10"
    >
      {/* Marshrut statistikasi */}
      <div className="flex justify-between items-center mb-4">
        {/* Masofa */}
        <div className="text-center flex-1">
          <div className="text-white font-bold text-2xl">
            {distanceLeft != null ? formatDistance(distanceLeft) : '—'}
          </div>
          <div className="text-gray-400 text-xs mt-1">masofa</div>
        </div>

        {/* Status */}
        <div className="text-center flex-1">
          <div className="text-green-400 font-bold text-lg">
            {routeLoading ? '🔄 Yangilanmoqda…' : '✓ Marshrutda'}
          </div>
          <div className="text-gray-400 text-xs mt-1">holat</div>
        </div>

        {/* Vaqt */}
        <div className="text-center flex-1">
          <div className="text-white font-bold text-2xl">
            {timeLeft != null ? formatTime(timeLeft) : '—'}
          </div>
          <div className="text-gray-400 text-xs mt-1">vaqt</div>
        </div>
      </div>

      {/* Tugmalar */}
      <div className="flex gap-3">
        <button
          onClick={onCall}
          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold
            rounded-2xl py-3 text-sm transition-all active:scale-95 shadow-lg
            flex items-center justify-center gap-2"
        >
          <span>📞</span>
          <span>Qo'ng'iroq</span>
        </button>

        <button
          onClick={onArrived}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold
            rounded-2xl py-3 text-sm transition-all active:scale-95 shadow-lg
            flex items-center justify-center gap-2"
        >
          <span>✓</span>
          <span>Yetib keldim</span>
        </button>

        <button
          onClick={onProblem}
          className="bg-red-600 hover:bg-red-700 text-white font-bold
            rounded-2xl px-4 py-3 text-sm transition-all active:scale-95 shadow-lg
            flex items-center justify-center"
        >
          <span>⚠️</span>
        </button>
      </div>

      {/* Qo'shimcha info — faqat debugging uchun */}
      <div className="text-xs text-gray-500 mt-3 text-center">
        {distanceLeft != null && timeLeft != null
          ? `${(distanceLeft / 1000).toFixed(1)} km · ${Math.round(timeLeft / 60)} min`
          : 'Marshrut yuklanmoqda…'}
      </div>
    </div>
  );
}
