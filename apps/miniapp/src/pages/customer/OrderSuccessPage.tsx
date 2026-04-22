import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Loader2,
  MapPin,
  MapPinned,
} from 'lucide-react';
import { PaymentMethod, PaymentStatus } from '../../data/types';
import type { Order } from '../../data/types';
import { useOrderDetails } from '../../hooks/queries/useOrders';
import { ErrorStateCard } from '../../components/ui/FeedbackStates';
import { useToast } from '../../components/ui/Toast';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { getCustomerTrackingMeta } from '../../features/tracking/customerTracking';
import { useCountdown } from '../../hooks/useCountdown';

const COURIER_ACCEPTANCE_LIMIT_MS = 2 * 60 * 60 * 1000;
const COURIER_ACCEPTANCE_ADMIN_WARNING_MS = 90 * 60 * 1000;

async function safeCopyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy copy method
  }

  try {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(input);
    return ok;
  } catch {
    return false;
  }
}

function getCourierAcceptanceDeadlineIso(order: Order | undefined, isAwaitingCourierAcceptance: boolean) {
  if (!order || !isAwaitingCourierAcceptance) return null;

  const startedAt =
    order.assignedAt ||
    (order.courierLastEventType === 'ASSIGNED' ? order.courierLastEventAt : null) ||
    order.createdAt;
  const startedMs = startedAt ? new Date(startedAt).getTime() : Number.NaN;

  if (!Number.isFinite(startedMs)) return null;

  return new Date(startedMs + COURIER_ACCEPTANCE_LIMIT_MS).toISOString();
}

const OrderSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { tr, formatText, language, intlLocale } = useCustomerLanguage();
  const { showToast } = useToast();
  const preloadedOrder = location.state?.order as Order | undefined;
  const orderId = preloadedOrder?.id || searchParams.get('orderId') || '';
  const { data: fetchedOrder, isLoading, isError, error, refetch } = useOrderDetails(orderId);
  const order = fetchedOrder || preloadedOrder;

  const trackingMeta = order ? getCustomerTrackingMeta(order, language) : null;
  const isAwaitingCourierAcceptance = Boolean(trackingMeta?.isAwaitingCourierAcceptance);
  const acceptanceDeadlineIso = getCourierAcceptanceDeadlineIso(order, isAwaitingCourierAcceptance);
  const acceptanceCountdown = useCountdown(
    acceptanceDeadlineIso,
    COURIER_ACCEPTANCE_ADMIN_WARNING_MS,
    30 * 60 * 1000,
  );

  if (isLoading && !order) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={36} className="animate-spin text-amber-500" />
      </div>
    );
  }

  if (isError && !order) {
    return (
      <ErrorStateCard
        title={tr('title.confirmation')}
        message={(error as Error).message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!order || !trackingMeta) {
    return (
      <div
        className="min-h-[100dvh] bg-[var(--app-bg)] text-[var(--app-text)]"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        }}
      >
        <div className="mx-auto flex w-full max-w-[430px] flex-col px-4 pt-20 text-center animate-in zoom-in duration-500">
          <h2 className="mb-2 text-xl font-black">{tr('title.confirmation')}</h2>
          <button
            type="button"
            onClick={() => navigate('/customer')}
            className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-[24px] bg-amber-500 font-black text-white shadow-lg shadow-amber-200 transition-transform active:scale-[0.985]"
          >
            <span>{tr('success.homeButton')}</span>
          </button>
        </div>
      </div>
    );
  }

  const paymentLabel =
    order.paymentMethod === PaymentMethod.CASH
      ? tr('order.payment.cash')
      : order.paymentMethod === PaymentMethod.EXTERNAL_PAYMENT
        ? tr('order.payment.external')
        : tr('order.payment.manual');
  const paymentStatusLabel =
    order.paymentStatus === PaymentStatus.COMPLETED
      ? tr('order.payment.completed')
      : order.paymentMethod === PaymentMethod.CASH
        ? tr('order.payment.cash')
        : tr('order.payment.pending');
  const addressText = formatText(
    order.customerAddress?.addressText || (language === 'ru' ? 'Адрес не указан' : "Manzil ko'rsatilmagan"),
  );
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const orderNumberText = `#${order.orderNumber}`;
  const currencyLabel = language === 'ru' ? 'сум' : language === 'uz-cyrl' ? 'сўм' : "so'm";
  const totalLabel = `${order.total.toLocaleString(intlLocale)} ${currencyLabel}`;
  const totalItemsLabel = tr('common.itemsCount', { count: totalItems });
  const lineItemsLabel = language === 'ru' ? 'поз.' : language === 'uz-cyrl' ? 'тур' : 'tur';

  const handleCopyOrderNumber = async () => {
    const ok = await safeCopyText(orderNumberText);
    if (ok) {
      showToast(tr('order.copySuccess'), 'success');
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
      return;
    }

    showToast(tr('order.copyFail'), 'error');
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
  };

  return (
    <div
      className="relative min-h-[100dvh] overflow-x-hidden bg-[var(--app-bg)] text-[var(--app-text)] animate-in fade-in duration-400"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,rgba(198,32,32,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute -top-28 right-[-130px] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18),transparent_62%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 left-[-120px] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.14),transparent_60%)] blur-2xl" />

      <div
        className="mx-auto flex w-full max-w-[430px] flex-col px-4"
        style={{
          height:
            'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 24px)',
        }}
      >
        <div className="rounded-[24px] bg-[var(--app-surface)] px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--app-section-label)]">
                {tr('success.eyebrow')}
              </p>

              <div className="mt-2 flex items-center gap-2">
                <h1 className="min-w-0 truncate font-display text-[26px] font-black tracking-tight text-[var(--app-text)]">
                  {orderNumberText}
                </h1>
                <button
                  type="button"
                  onClick={() => void handleCopyOrderNumber()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--app-bg)] text-[var(--app-muted)] transition-transform active:scale-[0.97]"
                  aria-label={tr('order.copyAction')}
                >
                  <Copy size={16} />
                </button>
              </div>

              <p className="mt-2 text-[15px] font-black tracking-tight text-[var(--app-text)]">
                {trackingMeta.heroTitle}
              </p>
              <p className="mt-1.5 text-[13px] font-semibold leading-5 text-[var(--app-muted)]">
                {trackingMeta.statusLine}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/12">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[16px] bg-[var(--app-bg)] px-3 py-3 ring-1 ring-slate-900/[0.04]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--app-section-label)]">
                {tr('success.total')}
              </p>
              <p className="mt-2 text-[18px] font-black tracking-tight text-[var(--app-text)]">
                {totalLabel}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--app-muted)]">
                {paymentLabel} • {paymentStatusLabel}
              </p>
            </div>

            <div className="rounded-[16px] bg-[var(--app-bg)] px-3 py-3 ring-1 ring-slate-900/[0.04]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--app-section-label)]">
                {tr('success.liveStatus')}
              </p>
              <p className="mt-2 text-[18px] font-black tracking-tight text-[var(--app-text)]">
                {isAwaitingCourierAcceptance ? (acceptanceCountdown.label || '...') : trackingMeta.stageLabel}
              </p>
              <p
                className={`mt-1 text-[11px] font-semibold ${
                  isAwaitingCourierAcceptance && acceptanceCountdown.isExpired ? 'text-amber-700' : 'text-[var(--app-muted)]'
                }`}
              >
                {isAwaitingCourierAcceptance
                  ? acceptanceCountdown.isExpired
                    ? language === 'ru'
                      ? 'Админ проверяет'
                      : language === 'uz-cyrl'
                        ? 'Админ текширяпти'
                        : "Admin ko'rib chiqadi"
                    : language === 'ru'
                      ? 'Курьер примет'
                      : language === 'uz-cyrl'
                        ? 'Курьер қабул қилади'
                        : 'Kuryer qabul qiladi'
                  : trackingMeta.statusLine}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex-1 overflow-hidden rounded-[24px] bg-[var(--app-surface)] px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--app-icon-bg)] text-[#C62020] ring-1 ring-black/5">
              <MapPin size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--app-section-label)]">
                {tr('success.address')}
              </p>
              <p className="mt-2 line-clamp-3 text-[14px] font-semibold leading-6 text-[var(--app-text)]">
                {addressText}
              </p>
              <p className="mt-2 text-[11px] font-semibold text-[var(--app-muted)]">
                {totalItemsLabel} • {order.items.length} {lineItemsLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={() => navigate(`/customer/orders/${order.id}`)}
            className="flex h-[54px] w-full items-center justify-center gap-3 rounded-[18px] bg-[linear-gradient(135deg,#0f172a_0%,#C62020_120%)] text-[15px] font-black text-white shadow-[0_14px_28px_rgba(198,32,32,0.22)] transition-transform active:scale-[0.985]"
          >
            <MapPinned size={18} />
            <span>{tr('success.trackButton')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/customer')}
            className="flex h-[54px] w-full items-center justify-center gap-3 rounded-[18px] bg-[var(--app-surface)] text-[15px] font-black text-[var(--app-text)] ring-1 ring-slate-900/[0.06] transition-transform active:scale-[0.985]"
          >
            <span>{tr('success.homeButton')}</span>
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] font-semibold text-[var(--app-muted)]">
          {tr('success.footer')}
        </p>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
