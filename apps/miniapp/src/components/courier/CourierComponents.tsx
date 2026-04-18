import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCopy,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Route,
  Store,
  Timer,
  TimerReset,
  TriangleAlert,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';
import { OrderChatPanel } from '../chat/OrderChatPanel';
import { useOrderChatUnread } from '../../hooks/queries/useOrderChat';
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
// Note: DELIVERY_STAGE_FLOW, getCourierStageProgressIndex, getDeliveryStageIndex, getNextCourierStage used by CourierStageButtons below

// ── Navigation helpers ────────────────────────────────────────────────────────

/**
 * Opens a navigation app via deep link. If the app is installed the OS handles
 * it; if the page loses visibility we cancel the web fallback timer.
 */
function openNavApp(deepLink: string, webFallback: string) {
  const t = window.setTimeout(() => {
    window.open(webFallback, '_blank');
  }, 1200);

  window.addEventListener(
    'visibilitychange',
    function onHide() {
      window.clearTimeout(t);
      window.removeEventListener('visibilitychange', onHide);
    },
    { once: true },
  );

  window.location.href = deepLink;
}

function openYandexNavigator(lat: number, lng: number, label: string) {
  openNavApp(
    `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lng}&desc=${encodeURIComponent(label)}`,
    `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`,
  );
}

function open2GIS(lat: number, lng: number) {
  openNavApp(
    `dgis://2gis.ru/routeSearch/rsType/car/to/${lng},${lat}`,
    `https://2gis.uz/tashkent/routeSearch/rsType/car/to/${lng},${lat}`,
  );
}

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
        const isCurrent = currentIndex === index;
        const isAvailable = nextStage === button.target;
        const isLast = index === COURIER_STAGE_BUTTONS.length - 1;
        const canClick = interactive && isAvailable && !isUpdating;

        // ── Surface styles per state ──────────────────────────────────
        let cardCls = '';
        let badgeCls = '';
        let labelCls = '';
        let statusCls = '';

        if (isCompleted) {
          cardCls = isDark
            ? 'border-emerald-400/30 bg-emerald-500/12'
            : 'border-emerald-200 bg-emerald-50';
          badgeCls = 'bg-emerald-500 text-white';
          labelCls = isDark ? 'text-emerald-200' : 'text-emerald-700';
          statusCls = isDark ? 'text-emerald-400/70' : 'text-emerald-500';
        } else if (isAvailable && interactive) {
          cardCls = isDark
            ? 'border-amber-400/40 bg-gradient-to-br from-amber-400/20 to-orange-500/10 shadow-lg shadow-amber-900/20 ring-1 ring-amber-400/20'
            : 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md shadow-amber-100 ring-1 ring-amber-200/60';
          badgeCls = 'bg-amber-400 text-slate-900';
          labelCls = isDark ? 'text-amber-100' : 'text-amber-900';
          statusCls = isDark ? 'text-amber-300/80' : 'text-amber-600';
        } else if (isCurrent) {
          cardCls = isDark
            ? 'border-sky-400/25 bg-sky-500/10'
            : 'border-sky-200 bg-sky-50';
          badgeCls = 'bg-sky-500 text-white';
          labelCls = isDark ? 'text-sky-200' : 'text-sky-700';
          statusCls = isDark ? 'text-sky-400/70' : 'text-sky-500';
        } else {
          cardCls = isDark
            ? 'border-white/8 bg-white/[0.04]'
            : 'border-slate-100 bg-slate-50/80';
          badgeCls = isDark ? 'bg-white/10 text-white/40' : 'bg-slate-100 text-slate-400';
          labelCls = isDark ? 'text-white/35' : 'text-slate-400';
          statusCls = isDark ? 'text-white/25' : 'text-slate-300';
        }

        const inner = (
          <>
            {/* Glow pulse for available interactive button */}
            {isAvailable && interactive && (
              <span className="pointer-events-none absolute inset-0 rounded-[22px] animate-pulse opacity-30 bg-amber-400/20" />
            )}
            <div className="relative flex items-center justify-between gap-2">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${badgeCls}`}>
                {isCompleted ? (
                  <CheckCircle2 size={14} strokeWidth={2.5} />
                ) : isUpdating && isAvailable ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  index + 1
                )}
              </div>
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
            {isCurrent && (
              <div className="mt-2 flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                <span className={`text-[9px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-sky-400/70' : 'text-sky-500'}`}>
                  Siz hozir shu yerda
                </span>
              </div>
            )}
            {/* "You are here" indicator on current stage */}
            {isCurrent && !isCompleted && (
              <div className={`mt-2 flex items-center gap-1.5 ${isDark ? 'text-sky-300/70' : 'text-sky-600/80'}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full animate-pulse ${isDark ? 'bg-sky-400' : 'bg-sky-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-[0.14em]">Siz hozir shu yerda</span>
              </div>
            )}
          </>
        );

        const sharedCls = `
          relative overflow-hidden rounded-[22px] border p-3.5 text-left
          transition-all duration-200
          ${isLast ? 'col-span-2' : ''}
          ${cardCls}
        `;

        // Non-interactive: render as div so it never looks tappable
        if (!interactive) {
          return (
            <div key={button.key} className={sharedCls}>
              {inner}
            </div>
          );
        }

        return (
          <button
            key={button.key}
            type="button"
            onClick={() => { if (canClick) onStageSelect(button.target); }}
            disabled={!canClick}
            aria-pressed={isCurrent}
            className={`${sharedCls} ${canClick ? 'cursor-pointer active:scale-[0.95]' : 'cursor-default'}`}
          >
            {inner}
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
  const KNOB_SIZE = 52;
  const THRESHOLD = 0.82;
  const SNAP_DURATION = '0.35s cubic-bezier(0.34,1.56,0.64,1)';
  const CONFIRM_DURATION = '0.25s ease-out';

  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const knobRef = React.useRef<HTMLButtonElement | null>(null);
  const fillRef = React.useRef<HTMLDivElement | null>(null);
  const maxOffsetRef = React.useRef(0);
  const dragging = React.useRef(false);

  const [confirmed, setConfirmed] = React.useState(false);

  // ── Direct DOM helpers (zero React re-renders during drag) ───────────────
  const applyOffset = React.useCallback((px: number, animate: boolean) => {
    const knob = knobRef.current;
    const fill = fillRef.current;
    if (!knob || !fill) return;
    const t = animate ? SNAP_DURATION : 'none';
    knob.style.transition = t;
    fill.style.transition = t;
    knob.style.transform = `translateX(${px}px)`;
    fill.style.width = `${px + KNOB_SIZE + 8}px`;
  }, []);

  // Reset when label changes or loading ends
  React.useEffect(() => {
    if (!confirmed) applyOffset(0, false);
  }, [label, confirmed, applyOffset]);

  React.useEffect(() => {
    if (!isLoading && !confirmed) applyOffset(0, true);
  }, [isLoading, confirmed, applyOffset]);

  const handlePointerDown = React.useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || isLoading || confirmed || !trackRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const trackWidth = trackRef.current.getBoundingClientRect().width;
    maxOffsetRef.current = Math.max(trackWidth - KNOB_SIZE - 8, 0);
    const startX = e.clientX;
    dragging.current = true;

    // Remove any transition while dragging for zero-latency tracking
    applyOffset(0, false);

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const next = Math.min(maxOffsetRef.current, Math.max(0, ev.clientX - startX));
      applyOffset(next, false);
    };

    const onUp = (ev: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      const knob = knobRef.current;
      const fill = fillRef.current;
      const max = maxOffsetRef.current;
      const current = knob ? parseFloat(knob.style.transform.replace('translateX(', '')) || 0 : 0;
      const progress = max > 0 ? current / max : 0;

      if (progress >= THRESHOLD) {
        // Snap to end then confirm
        if (knob) knob.style.transition = CONFIRM_DURATION;
        if (fill) fill.style.transition = CONFIRM_DURATION;
        applyOffset(max, false);
        if (knob) knob.style.transition = CONFIRM_DURATION;
        if (fill) fill.style.transition = CONFIRM_DURATION;
        setConfirmed(true);
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        window.setTimeout(() => { onConfirm(); }, 200);
      } else {
        // Snap back with spring
        applyOffset(0, true);
      }
      void ev; // satisfy linter
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [disabled, isLoading, confirmed, applyOffset, onConfirm]);

  const isDark = theme === 'dark';

  const trackBase = isDark
    ? 'border-white/12 bg-white/[0.07] text-white'
    : 'border-slate-200 bg-slate-100 text-slate-900';

  const fillGradient = confirmed
    ? 'from-emerald-400 to-emerald-500'
    : isDark
      ? 'from-amber-300 via-orange-400 to-orange-500'
      : 'from-amber-400 to-orange-500';

  const knobBase = confirmed
    ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_8px_24px_rgba(16,185,129,0.45)]'
    : isDark
      ? 'bg-white text-slate-950 border-white/20 shadow-[0_8px_24px_rgba(255,255,255,0.18)]'
      : 'bg-white text-amber-600 border-amber-200 shadow-[0_8px_24px_rgba(249,115,22,0.20)]';

  const centerLabel = confirmed ? 'Tasdiqlandi' : isLoading ? 'Bajarilmoqda...' : label;

  return (
    <div>
      <div
        ref={trackRef}
        className={`relative overflow-hidden rounded-full border p-1 transition-colors duration-300 ${trackBase} ${disabled ? 'opacity-50' : ''}`}
      >
        {/* Fill bar — width driven by direct DOM writes during drag */}
        <div
          ref={fillRef}
          className={`pointer-events-none absolute inset-y-1 left-1 rounded-full bg-gradient-to-r ${fillGradient}`}
          style={{ width: `${KNOB_SIZE + 8}px` }}
        />

        {/* Center text */}
        <div className="pointer-events-none relative z-10 flex h-14 items-center justify-center px-16 text-center select-none">
          <div>
            <p className="text-[13px] font-black">{centerLabel}</p>
            {!confirmed && (
              <p className={`mt-0.5 text-[10px] font-semibold opacity-55 ${isDark ? 'text-white' : 'text-slate-600'}`}>
                O'ngga suring →
              </p>
            )}
          </div>
        </div>

        {/* Knob — position driven by direct DOM writes during drag */}
        <button
          ref={knobRef}
          type="button"
          onPointerDown={handlePointerDown}
          disabled={disabled || isLoading || confirmed}
          className={`absolute left-1 top-1 z-20 flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 ${knobBase} ${confirmed ? 'transition-colors duration-200' : ''}`}
          style={{ transform: 'translateX(0px)', touchAction: 'none' }}
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
            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isDark ? 'bg-rose-400/12 text-rose-200' : 'bg-rose-50 text-rose-600'
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

        {/* Quick-chip shortcuts */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['Mijoz javob bermayapti', 'Manzil topilmadi', 'Restoran tayyor emas', 'Boshqa muammo'].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChange(chip)}
              disabled={disabled || isSubmitting}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black transition-all active:scale-95 disabled:opacity-40 ${value === chip
                  ? isDark
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-amber-400 text-slate-950'
                  : isDark
                    ? 'border border-white/10 bg-white/[0.06] text-white/60 hover:bg-white/10'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
            >
              {chip}
            </button>
          ))}
        </div>

        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Masalan: mijoz javob bermayapti yoki manzil topilmadi"
          rows={3}
          maxLength={500}
          disabled={disabled || isSubmitting}
          className={`mt-3 w-full rounded-[20px] border px-4 py-3 text-sm font-semibold outline-none transition focus:border-amber-400 ${textareaClass}`}
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className={`min-w-0 text-xs font-semibold ${feedbackClass}`}>
            {feedbackText || helperText || "Kamida 5 ta belgi bilan yozing."}
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!isReady}
            className={`inline-flex h-11 shrink-0 items-center justify-center rounded-full px-4 text-[11px] font-black uppercase tracking-[0.18em] transition-transform active:scale-[0.98] ${isReady
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

// ── Countdown badge ──────────────────────────────────────────────────────────

const ACCEPT_LIMIT_MS = 5 * 60 * 60 * 1000; // 5 h — matches backend expiry
const DELIVERY_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 h — matches backend expiry

function CountdownBadge({ deadlineIso, label }: { deadlineIso: string; label: string }) {
  const { label: timeLabel, status } = useCountdown(deadlineIso);

  const colors =
    status === 'expired'
      ? 'bg-slate-900/70 text-white/40'
      : status === 'critical'
        ? 'bg-rose-500/90 text-white animate-pulse'
        : status === 'warning'
          ? 'bg-amber-400/90 text-slate-950'
          : 'bg-white/15 text-white';

  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ${colors}`}>
      <Timer size={11} strokeWidth={2.5} />
      <span>{label}: {timeLabel}</span>
    </div>
  );
}

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

  // Deadline ISO strings for countdowns
  const acceptDeadline =
    order.courierAssignmentStatus === 'ASSIGNED' && order.createdAt
      ? new Date(new Date(order.createdAt).getTime() + ACCEPT_LIMIT_MS).toISOString()
      : null;

  const deliveryDeadline =
    ['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(order.courierAssignmentStatus ?? '') &&
      order.acceptedAt
      ? new Date(new Date(order.acceptedAt).getTime() + DELIVERY_LIMIT_MS).toISOString()
      : null;

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

        {/* Countdown timer row */}
        {(acceptDeadline || deliveryDeadline) && (
          <div className="mt-3">
            {acceptDeadline && (
              <CountdownBadge deadlineIso={acceptDeadline} label="Qabul qilish muddati" />
            )}
            {deliveryDeadline && (
              <CountdownBadge deadlineIso={deliveryDeadline} label="Yetkazish muddati" />
            )}
          </div>
        )}

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
  nearRestaurant?: boolean;
  nearCustomer?: boolean;
  approachingCustomer?: boolean;
  onDeliveredNavigate?: () => void;
  arrivalTime?: string | null;
  onCopyAddress?: () => void;
  copySuccess?: boolean;
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
  routeTitle: _routeTitle,
  routeDescription: _routeDescription,
  pickupLabel: _pickupLabel,
  destinationLabel: _destinationLabel,
  distance,
  eta,
  distanceLabel: _distanceLabel,
  etaLabel: _etaLabel,
  isEtaLive = false,
  nearRestaurant = false,
  nearCustomer = false,
  approachingCustomer = false,
  onDeliveredNavigate,
  arrivalTime,
  onCopyAddress,
  copySuccess = false,
}) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const [isProblemOpen, setIsProblemOpen] = React.useState(false);
    const [isChatOpen, setIsChatOpen] = React.useState(false);
    const { data: unreadCount = 0 } = useOrderChatUnread(order.id, 'courier');
    const stageMeta = getDeliveryStageMeta(currentStage);
    const primaryAction = getDeliveryStageAction(currentStage);
    const hasProblemPanel = Boolean(problemPanel);
    const isDelivered = currentStage === DeliveryStage.DELIVERED;
    const prevStageRef = React.useRef(currentStage);

    const goingToRestaurant =
      currentStage === DeliveryStage.GOING_TO_RESTAURANT ||
      currentStage === DeliveryStage.ARRIVED_AT_RESTAURANT;
    const navLat = goingToRestaurant ? order.pickupLat : order.destinationLat;
    const navLng = goingToRestaurant ? order.pickupLng : order.destinationLng;
    const navLabel = goingToRestaurant ? 'Restoran' : 'Mijoz manzili';
    const hasNavTarget = typeof navLat === 'number' && typeof navLng === 'number';

    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white p-4 rounded-t-3xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-lg">{stageMeta.label}</span>
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, index) => (
                <span
                  key={index}
                  className={`h-2 w-2 rounded-full ${index < stageMeta.progress ? 'bg-emerald-400' : 'bg-slate-600'}`}
                ></span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">{distance} km</p>
            <p className="text-xs text-slate-400">{eta} daq</p>
          </div>
        </div>

        <div className="flex justify-around items-center">
          <button
            onClick={onCall}
            className="flex flex-col items-center justify-center text-yellow-400 hover:text-yellow-500 transition-colors"
          >
            <Phone size={24} />
            <span className="text-xs">Qo'ng'iroq</span>
          </button>
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex flex-col items-center justify-center text-blue-400 hover:text-blue-500 transition-colors"
          >
            <Send size={24} />
            <span className="text-xs">Chat</span>
          </button>
          <button
            onClick={onOpenDetails}
            className="flex flex-col items-center justify-center text-green-400 hover:text-green-500 transition-colors"
          >
            <Package size={24} />
            <span className="text-xs">Buyurtma</span>
          </button>
          <button
            onClick={() => setIsProblemOpen(true)}
            className="flex flex-col items-center justify-center text-red-400 hover:text-red-500 transition-colors"
          >
            <AlertTriangle size={24} />
            <span className="text-xs">Muammo</span>
          </button>
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
