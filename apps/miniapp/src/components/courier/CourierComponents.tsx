import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Route,
  ShieldCheck,
  Store,
  TimerReset,
  TriangleAlert,
  User,
} from 'lucide-react';
import { DeliveryStage, PaymentMethod } from '../../data/types';
import type { CourierOrderPreview, Order } from '../../data/types';
import {
  COURIER_STAGE_BUTTONS,
  DELIVERY_STAGE_FLOW,
  getCourierStageProgressIndex,
  getDeliveryStageAction,
  getDeliveryStageIndex,
  getDeliveryStageMeta,
  getNextCourierStage,
} from '../../features/courier/deliveryStage';

export function getCourierPaymentLabel(paymentMethod: PaymentMethod) {
  switch (paymentMethod) {
    case PaymentMethod.CASH:
      return 'Naqd pul';
    case PaymentMethod.EXTERNAL_PAYMENT:
      return 'Click / Payme';
    default:
      return "Qo'lda o'tkazma";
  }
}

function formatDistanceMeters(distanceMeters?: number | null) {
  if (typeof distanceMeters !== 'number' || Number.isNaN(distanceMeters)) {
    return "Masofa yo'q";
  }

  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatOrderClock(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOrderCardAccent(stage: DeliveryStage = DeliveryStage.IDLE) {
  const currentIndex = getCourierStageProgressIndex(stage);

  if (currentIndex >= 3) {
    return 'from-violet-500 via-indigo-600 to-slate-900';
  }

  if (currentIndex >= 1) {
    return 'from-amber-400 via-orange-500 to-slate-900';
  }

  return 'from-sky-500 via-indigo-600 to-slate-900';
}

function getStageSurfaceClasses(
  state: 'completed' | 'current' | 'available' | 'upcoming',
  theme: 'light' | 'dark',
) {
  if (theme === 'dark') {
    switch (state) {
      case 'completed':
        return 'border-emerald-300/25 bg-emerald-400/12 text-emerald-100';
      case 'current':
        return 'border-sky-300/28 bg-sky-400/12 text-sky-100';
      case 'available':
        return 'border-amber-300/25 bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 shadow-lg shadow-orange-900/20';
      case 'upcoming':
      default:
        return 'border-white/8 bg-white/[0.05] text-white/38';
    }
  }

  switch (state) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'current':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'available':
      return 'border-amber-200 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-100';
    case 'upcoming':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-400';
  }
}

export function CourierStageButtons({
  currentStage,
  onStageSelect,
  isUpdating = false,
  theme = 'dark',
  interactive = true,
}: {
  currentStage: DeliveryStage;
  onStageSelect: (nextStage: DeliveryStage) => void;
  isUpdating?: boolean;
  theme?: 'light' | 'dark';
  interactive?: boolean;
}) {
  const currentIndex = getCourierStageProgressIndex(currentStage);
  const nextStage = getNextCourierStage(currentStage);
  const isDark = theme === 'dark';

  return (
    <div className="grid grid-cols-2 gap-2">
      {COURIER_STAGE_BUTTONS.map((button, index) => {
        const isCompleted = currentIndex > index;
        const isCurrent   = currentIndex === index;
        const isAvailable = nextStage === button.target;
        const isLast      = index === COURIER_STAGE_BUTTONS.length - 1;
        const canClick    = interactive && isAvailable && !isUpdating;

        // ── Surface styles per state ──────────────────────────────────
        let cardCls = '';
        let badgeCls = '';
        let labelCls = '';
        let statusCls = '';

        if (isCompleted) {
          cardCls   = isDark
            ? 'border-emerald-400/30 bg-emerald-500/12'
            : 'border-emerald-200 bg-emerald-50';
          badgeCls  = 'bg-emerald-500 text-white';
          labelCls  = isDark ? 'text-emerald-200' : 'text-emerald-700';
          statusCls = isDark ? 'text-emerald-400/70' : 'text-emerald-500';
        } else if (isAvailable && interactive) {
          cardCls   = isDark
            ? 'border-amber-400/40 bg-gradient-to-br from-amber-400/20 to-orange-500/10 shadow-lg shadow-amber-900/20 ring-1 ring-amber-400/20'
            : 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md shadow-amber-100 ring-1 ring-amber-200/60';
          badgeCls  = 'bg-amber-400 text-slate-900';
          labelCls  = isDark ? 'text-amber-100' : 'text-amber-900';
          statusCls = isDark ? 'text-amber-300/80' : 'text-amber-600';
        } else if (isCurrent) {
          cardCls   = isDark
            ? 'border-sky-400/25 bg-sky-500/10'
            : 'border-sky-200 bg-sky-50';
          badgeCls  = 'bg-sky-500 text-white';
          labelCls  = isDark ? 'text-sky-200' : 'text-sky-700';
          statusCls = isDark ? 'text-sky-400/70' : 'text-sky-500';
        } else {
          cardCls   = isDark
            ? 'border-white/8 bg-white/[0.04]'
            : 'border-slate-100 bg-slate-50/80';
          badgeCls  = isDark ? 'bg-white/10 text-white/40' : 'bg-slate-100 text-slate-400';
          labelCls  = isDark ? 'text-white/35' : 'text-slate-400';
          statusCls = isDark ? 'text-white/25' : 'text-slate-300';
        }

        return (
          <button
            key={button.key}
            type="button"
            onClick={() => { if (canClick) onStageSelect(button.target); }}
            disabled={!canClick}
            aria-pressed={isCurrent}
            className={`
              relative overflow-hidden rounded-[22px] border p-3.5 text-left
              transition-all duration-200
              ${canClick ? 'cursor-pointer active:scale-[0.95] hover:brightness-105' : 'cursor-default'}
              ${isLast ? 'col-span-2' : ''}
              ${cardCls}
            `}
          >
            {/* Glow pulse for available button */}
            {isAvailable && interactive && (
              <span className="pointer-events-none absolute inset-0 rounded-[22px] animate-pulse opacity-30 bg-amber-400/20" />
            )}

            <div className="relative flex items-center justify-between gap-2">
              {/* Step badge circle */}
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${badgeCls}`}>
                {isCompleted ? (
                  <CheckCircle2 size={14} strokeWidth={2.5} />
                ) : isUpdating && isAvailable ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Status label */}
              <span className={`text-[10px] font-black uppercase tracking-[0.16em] ${statusCls}`}>
                {isCompleted
                  ? 'Tayyor ✓'
                  : isAvailable && interactive
                    ? 'Navbatdagi'
                    : isCurrent
                      ? 'Joriy'
                      : 'Keyin'}
              </span>
            </div>

            <p className={`mt-2.5 text-[13px] font-black leading-snug ${labelCls}`}>
              {button.label}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export function SlideToConfirmAction({
  label,
  hint,
  onConfirm,
  isLoading = false,
  disabled = false,
  theme = 'light',
}: {
  label: string;
  hint?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}) {
  const trackRef   = React.useRef<HTMLDivElement | null>(null);
  const offsetRef  = React.useRef(0);
  const [offset, setOffset]       = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [confirmed, setConfirmed]  = React.useState(false);
  const knobSize = 52;
  const threshold = 0.80;

  const setSliderOffset = (v: number) => { offsetRef.current = v; setOffset(v); };

  // Reset when label changes (new action)
  React.useEffect(() => {
    setConfirmed(false);
    setSliderOffset(0);
  }, [label]);

  // Snap back when not dragging and not confirmed/loading
  React.useEffect(() => {
    if (!isDragging && !isLoading && !confirmed) setSliderOffset(0);
  }, [isDragging, isLoading, confirmed]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || isLoading || confirmed || !trackRef.current) return;
    event.preventDefault();
    const trackRect = trackRef.current.getBoundingClientRect();
    const maxOffset = Math.max(trackRect.width - knobSize - 8, 0);
    const startX = event.clientX;
    const startOffset = offsetRef.current;
    setIsDragging(true);

    const handleMove = (e: PointerEvent) => {
      const next = Math.min(maxOffset, Math.max(0, startOffset + e.clientX - startX));
      setSliderOffset(next);
    };

    const handleUp = () => {
      const progress = maxOffset > 0 ? offsetRef.current / maxOffset : 0;
      const shouldConfirm = progress >= threshold;
      setIsDragging(false);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);

      if (shouldConfirm) {
        setSliderOffset(maxOffset);
        setConfirmed(true);
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        window.setTimeout(() => { onConfirm(); }, 380);
        return;
      }
      setSliderOffset(0);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  const isDark = theme === 'dark';

  // ── Track base ──────────────────────────────────────────────────────────────
  const trackBase = isDark
    ? 'border-white/12 bg-white/[0.07] text-white'
    : 'border-slate-200 bg-slate-100 text-slate-900';

  // ── Fill gradient (confirmed = emerald, normal = amber) ──────────────────
  const fillGradient = confirmed
    ? 'from-emerald-400 to-emerald-500'
    : isDark
      ? 'from-amber-300 via-orange-400 to-orange-500'
      : 'from-amber-400 to-orange-500';

  // ── Knob ───────────────────────────────────────────────────────────────────
  const knobBase = confirmed
    ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_8px_24px_rgba(16,185,129,0.45)]'
    : isDark
      ? 'bg-white text-slate-950 border-white/20 shadow-[0_8px_24px_rgba(255,255,255,0.18)]'
      : 'bg-white text-amber-600 border-amber-200 shadow-[0_8px_24px_rgba(249,115,22,0.20)]';

  const progressWidth = offset + knobSize + 8;

  // ── Center text ────────────────────────────────────────────────────────────
  const centerLabel = confirmed
    ? 'Tasdiqlandi'
    : isLoading
      ? 'Bajarilmoqda...'
      : label;
  const centerSub = confirmed ? null : "O'ngga suring →";

  return (
    <div>
      <div
        ref={trackRef}
        className={`relative overflow-hidden rounded-full border p-1 transition-colors duration-300 ${trackBase} ${disabled ? 'opacity-50' : ''}`}
      >
        {/* Fill bar */}
        <div
          className={`pointer-events-none absolute inset-y-1 left-1 rounded-full bg-gradient-to-r transition-[width] duration-200 ${fillGradient}`}
          style={{ width: `${progressWidth}px` }}
        />

        {/* Center text */}
        <div className="pointer-events-none relative z-10 flex h-14 items-center justify-center px-16 text-center">
          <div>
            <p className={`text-[13px] font-black transition-colors duration-300 ${confirmed ? (isDark ? 'text-white' : 'text-white') : ''}`}>
              {centerLabel}
            </p>
            {centerSub && !confirmed && (
              <p className={`text-[10px] font-semibold opacity-60 mt-0.5 ${isDark ? 'text-white' : 'text-slate-600'}`}>
                {centerSub}
              </p>
            )}
          </div>
        </div>

        {/* Knob — fully circular */}
        <button
          type="button"
          onPointerDown={handlePointerDown}
          disabled={disabled || isLoading || confirmed}
          className={`absolute left-1 top-1 z-20 flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 transition-all duration-300 active:scale-95 ${knobBase}`}
          style={{ transform: `translateX(${offset}px)` }}
          aria-label={label}
        >
          {isLoading ? (
            <Loader2 size={19} className="animate-spin" />
          ) : confirmed ? (
            <CheckCircle2 size={22} strokeWidth={2.5} />
          ) : (
            <ChevronRight size={22} strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Hint — hidden after confirm */}
      {hint && !confirmed && (
        <p className={`mt-2.5 text-center text-[11px] font-semibold ${isDark ? 'text-white/45' : 'text-slate-400'}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

export const CourierProblemReporter: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  theme?: 'light' | 'dark';
  helperText?: string;
  feedbackText?: string | null;
  feedbackTone?: 'success' | 'error' | 'neutral';
}> = ({
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
  disabled = false,
  theme = 'light',
  helperText,
  feedbackText,
  feedbackTone = 'neutral',
}) => {
  const isDark = theme === 'dark';
  const isReady = value.trim().length >= 5 && !disabled && !isSubmitting;
  const wrapperClass = isDark
    ? 'border-white/8 bg-white/[0.05]'
    : 'border-slate-200 bg-slate-50';
  const textareaClass = isDark
    ? 'border-white/8 bg-slate-950/50 text-white placeholder:text-white/35'
    : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400';
  const helperClass = isDark ? 'text-white/55' : 'text-slate-500';
  const feedbackClass =
    feedbackTone === 'success'
      ? isDark
        ? 'text-emerald-200'
        : 'text-emerald-700'
      : feedbackTone === 'error'
        ? isDark
          ? 'text-rose-200'
          : 'text-rose-700'
        : helperClass;

  return (
    <div className={`rounded-[24px] border p-4 ${wrapperClass}`}>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            isDark ? 'bg-rose-400/12 text-rose-200' : 'bg-rose-50 text-rose-600'
          }`}
        >
          <TriangleAlert size={18} />
        </div>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${helperClass}`}>Muammo haqida</p>
          <p className={`mt-1 text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Operatorga qisqa va aniq izoh yuboring
          </p>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Masalan: mijoz javob bermayapti yoki manzil topilmadi"
        rows={3}
        maxLength={500}
        disabled={disabled || isSubmitting}
        className={`mt-4 w-full rounded-[20px] border px-4 py-3 text-sm font-semibold outline-none transition focus:border-amber-400 ${textareaClass}`}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className={`min-w-0 text-xs font-semibold ${feedbackClass}`}>
          {feedbackText || helperText || "Kamida 5 ta belgi bilan yozing."}
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isReady}
          className={`inline-flex h-11 shrink-0 items-center justify-center rounded-full px-4 text-[11px] font-black uppercase tracking-[0.18em] transition-transform active:scale-[0.98] ${
            isReady
              ? 'bg-amber-400 text-slate-950'
              : isDark
                ? 'bg-white/10 text-white/35'
                : 'bg-slate-200 text-slate-400'
          }`}
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Yuborish'}
        </button>
      </div>
    </div>
  );
};

export const CourierOrderCard: React.FC<{
  order: CourierOrderPreview;
  onClick: () => void;
}> = ({ order, onClick }) => {
  const stageMeta = getDeliveryStageMeta(order.deliveryStage);
  const createdAt = formatOrderClock(order.createdAt);
  const accentGradient = getOrderCardAccent(order.deliveryStage);
  const assignmentTone =
    order.courierAssignmentStatus === 'ASSIGNED'
      ? 'Yangi topshiriq'
      : order.courierAssignmentStatus === 'DELIVERED'
        ? 'Tugatilgan'
        : 'Faol topshiriq';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-[32px] border border-slate-200 bg-white p-5 text-left shadow-[0_20px_48px_rgba(15,23,42,0.08)] transition-transform active:scale-[0.985]"
    >
      <div className={`rounded-[28px] bg-gradient-to-br ${accentGradient} p-4 text-white shadow-xl`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
              {assignmentTone}
            </p>
            <h4 className="mt-2 text-2xl font-black tracking-tight">#{order.orderNumber}</h4>
            <p className="mt-2 truncate text-sm font-semibold text-white/78">{order.restaurantName}</p>
          </div>
          <div className={`shrink-0 rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${stageMeta.badgeClass}`}>
            {stageMeta.label}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <Navigation size={16} className="mt-0.5 shrink-0 text-sky-200" />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Restorangacha</p>
                <p className="mt-1 truncate text-sm font-semibold leading-relaxed text-white/82">
                  {formatDistanceMeters(order.distanceToRestaurantMeters)}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <MapPin size={16} className="mt-0.5 shrink-0 text-amber-200" />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Hudud</p>
                <p className="mt-1 truncate text-sm font-semibold leading-relaxed text-white/82">
                  {order.destinationArea || "Manzil ko'rsatilmagan"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-white/65">
          <span>{createdAt}</span>
          <span>{order.itemCount} ta mahsulot</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[20px] border border-slate-100 bg-slate-50 px-3 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">To'lov</p>
          <p className="mt-2 text-[12px] font-black text-slate-900">
            {order.paymentMethod === PaymentMethod.CASH ? 'Naqd' : 'Onlayn'}
          </p>
        </div>
        <div className="rounded-[20px] border border-slate-100 bg-slate-50 px-3 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Yetkazish</p>
          <p className="mt-2 text-[12px] font-black text-slate-900">{order.deliveryFee.toLocaleString()} so'm</p>
        </div>
        <div className="rounded-[20px] border border-slate-100 bg-slate-50 px-3 py-3 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Jami</p>
          <p className="mt-2 text-[12px] font-black text-slate-900">{order.total.toLocaleString()} so'm</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          <Navigation size={14} className="text-sky-500" />
          <span>Operatsion ko'rinish</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-900">
          <span>Batafsil</span>
          <ChevronRight size={16} className="transition-transform group-active:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
};

export const DeliveryBottomPanel: React.FC<{
  order: Order;
  currentStage: DeliveryStage;
  onAction: (nextStage: DeliveryStage) => void;
  onCall: () => void;
  onOpenDetails: () => void;
  problemPanel?: React.ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
  isUpdating?: boolean;
  canCall?: boolean;
  routeTitle: string;
  routeDescription: string;
  pickupLabel: string;
  destinationLabel: string;
  distance: string;
  eta: string;
  distanceLabel?: string;
  etaLabel?: string;
  isEtaLive?: boolean;
}> = ({
  order,
  currentStage,
  onAction,
  onCall,
  onOpenDetails,
  problemPanel,
  onExpandedChange,
  isUpdating = false,
  canCall = true,
  routeTitle,
  routeDescription,
  pickupLabel,
  destinationLabel,
  distance,
  eta,
  distanceLabel = 'Qolgan masofa',
  etaLabel = 'Qolgan ETA',
  isEtaLive = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isProblemOpen, setIsProblemOpen] = React.useState(false);
  const stageMeta = getDeliveryStageMeta(currentStage);
  const primaryAction = getDeliveryStageAction(currentStage);
  const stageIndex = getDeliveryStageIndex(currentStage);
  const hasProblemPanel = Boolean(problemPanel);

  React.useEffect(() => {
    if (currentStage === DeliveryStage.DELIVERED) {
      setIsExpanded(true);
    }
  }, [currentStage]);

  React.useEffect(() => {
    if (currentStage === DeliveryStage.DELIVERED) {
      setIsProblemOpen(false);
    }
  }, [currentStage]);

  React.useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50">
      <div className="pointer-events-auto mx-auto w-full max-w-[430px] px-4 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        <div className="overflow-hidden rounded-[36px] border border-white/10 bg-slate-950/88 shadow-[0_36px_90px_rgba(2,6,23,0.6)] backdrop-blur-2xl">
          <div className="px-5 pt-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="h-1.5 w-12 shrink-0 rounded-full bg-white/12" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
                    Courier ops
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-white/86">{routeTitle}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.06] text-white/72 transition-transform active:scale-95"
                aria-label={isExpanded ? 'Panelni yig\'ish' : 'Panelni kengaytirish'}
              >
                {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>

            <div className="rounded-[28px] border border-white/8 bg-white/[0.05] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                    Yetib borish vaqti
                  </p>
                  <p className="mt-3 text-[34px] font-black leading-none tracking-[-0.05em] text-white">
                    {eta}
                  </p>
                </div>

                <div className={`rounded-[20px] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${stageMeta.badgeClass}`}>
                  {stageMeta.label}
                </div>
              </div>

              <p className="mt-4 max-w-[320px] text-sm font-semibold leading-relaxed text-white/72">
                {routeDescription}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[20px] border border-white/8 bg-slate-950/50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                    <TimerReset size={14} className="text-amber-300" />
                    <span>{etaLabel}</span>
                    {isEtaLive ? <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" /> : null}
                  </div>
                  <p className="mt-3 text-lg font-black text-white">{eta}</p>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-slate-950/50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                    <Route size={14} className="text-sky-300" />
                    <span>{distanceLabel}</span>
                  </div>
                  <p className="mt-3 text-lg font-black text-white">{distance}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-white/8 bg-white/[0.04] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-200">
                    <Store size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Restoran</p>
                    <p className="truncate text-sm font-black text-white/88">{pickupLabel}</p>
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-white/35" />
                <div className="flex min-w-0 items-center gap-3">
                  <div className="min-w-0 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Mijoz</p>
                    <p className="truncate text-sm font-black text-white/88">{destinationLabel}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-400/12 text-rose-200">
                    <MapPin size={18} />
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-4 grid gap-3 ${hasProblemPanel ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <button
                type="button"
                onClick={onCall}
                disabled={!canCall}
                className="flex h-14 items-center justify-center gap-2 rounded-[22px] border border-white/8 bg-white/[0.06] text-[11px] font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98] disabled:opacity-45"
              >
                <Phone size={16} />
                <span>Qo'ng'iroq</span>
              </button>
              <button
                type="button"
                onClick={onOpenDetails}
                className="flex h-14 items-center justify-center gap-2 rounded-[22px] border border-white/8 bg-white/[0.06] text-[11px] font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98]"
              >
                <Package size={16} />
                <span>Tafsilot</span>
              </button>
              {hasProblemPanel ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(true);
                    setIsProblemOpen((prev) => !prev);
                  }}
                  className="flex h-14 items-center justify-center gap-2 rounded-[22px] border border-white/8 bg-white/[0.06] text-[11px] font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98]"
                >
                  <TriangleAlert size={16} />
                  <span>Muammo</span>
                </button>
              ) : null}
            </div>

            {primaryAction.next ? (
              <div className="mt-4 rounded-[24px] border border-amber-300/12 bg-amber-400/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/75">
                  Hozirgi vazifa
                </p>
                <p className="mt-2 text-sm font-black text-white">{primaryAction.slideLabel}</p>
              </div>
            ) : null}

            <div className="mt-4">
              {primaryAction.next ? (
                <SlideToConfirmAction
                  label={primaryAction.slideLabel}
                  hint={primaryAction.hint}
                  onConfirm={() => onAction(primaryAction.next!)}
                  isLoading={isUpdating}
                  theme="dark"
                />
              ) : (
                <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-400/12 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/75">
                    Holat
                  </p>
                  <p className="mt-2 text-sm font-black text-white">Buyurtma muvaffaqiyatli yakunlandi.</p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <CourierStageButtons
                currentStage={currentStage}
                onStageSelect={onAction}
                isUpdating={isUpdating}
                theme="dark"
                interactive={false}
              />
            </div>
          </div>

          {isExpanded ? (
            <div className="mt-5 border-t border-white/8 bg-slate-950/70 px-5 pb-5 pt-4">
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {DELIVERY_STAGE_FLOW.map((step, index) => {
                  const isCompleted = index <= stageIndex;
                  const isCurrent = index === stageIndex;

                  return (
                    <div
                      key={step.key}
                      className={`min-w-[92px] rounded-[20px] border px-3 py-3 text-center ${
                        isCompleted
                          ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
                          : 'border-white/8 bg-white/[0.04] text-white/45'
                      }`}
                    >
                      <div
                        className={`mx-auto mb-2 h-2.5 w-2.5 rounded-full ${
                          isCurrent ? 'bg-amber-300' : isCompleted ? 'bg-emerald-300' : 'bg-white/15'
                        }`}
                      />
                      <p className="text-[10px] font-black uppercase tracking-[0.18em]">{step.title}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-3">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.05] p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-white/80">
                      <User size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                        Mijoz
                      </p>
                      <p className="truncate text-sm font-black text-white">{order.customerName || 'Mijoz'}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold leading-relaxed text-white/72">
                    {order.customerAddress?.addressText || "Manzil ko'rsatilmagan"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.05] p-4">
                    <div className="mb-2 flex items-center gap-2 text-white/45">
                      <CreditCard size={15} className="text-amber-300" />
                      <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                        To'lov
                      </span>
                    </div>
                    <p className="text-sm font-black text-white">{getCourierPaymentLabel(order.paymentMethod)}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.05] p-4">
                    <div className="mb-2 flex items-center gap-2 text-white/45">
                      <ShieldCheck size={15} className="text-emerald-300" />
                      <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                        Jami
                      </span>
                    </div>
                    <p className="text-sm font-black text-white">{order.total.toLocaleString()} so'm</p>
                  </div>
                </div>

                {order.note ? (
                  <div className="rounded-[22px] border border-amber-300/20 bg-amber-400/10 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/75">
                      Kuryer uchun izoh
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-white/82">{order.note}</p>
                  </div>
                ) : null}

                {hasProblemPanel && isProblemOpen ? problemPanel : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const RouteInfoPanel: React.FC<{
  title: string;
  subtitle: string;
  fromLabel: string;
  toLabel: string;
  stageLabel: string;
  distance: string;
  eta: string;
  distanceLabel?: string;
  etaLabel?: string;
  isEtaLive?: boolean;
}> = ({
  title,
  subtitle,
  fromLabel,
  toLabel,
  stageLabel,
  distance,
  eta,
  distanceLabel = 'Masofa',
  etaLabel = 'ETA',
  isEtaLive = false,
}) => (
  <div className="absolute left-4 right-4 top-24 z-40 rounded-[30px] border border-white/10 bg-slate-950/80 p-4 text-white shadow-[0_24px_64px_rgba(2,6,23,0.5)] backdrop-blur-xl">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Faol marshrut</p>
        <p className="mt-2 text-lg font-black text-white">{title}</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-white/68">{subtitle}</p>
      </div>
      <div className="rounded-[18px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
        {stageLabel}
      </div>
    </div>

    <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-3">
      <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        <span>Yo'nalish</span>
        <span className="text-white/72">
          {fromLabel} <ArrowRight size={12} className="inline" /> {toLabel}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-[18px] bg-slate-950/50 px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
            <Route size={13} className="text-sky-300" />
            <span>{distanceLabel}</span>
          </div>
          <p className="mt-2 text-base font-black text-white">{distance}</p>
        </div>
        <div className="rounded-[18px] bg-slate-950/50 px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
            <TimerReset size={13} className="text-amber-300" />
            <span>{etaLabel}</span>
            {isEtaLive ? <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" /> : null}
          </div>
          <p className="mt-2 text-base font-black text-white">{eta}</p>
        </div>
      </div>
    </div>
  </div>
);
