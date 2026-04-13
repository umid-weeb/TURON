import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Home,
  Loader2,
  MapPin,
  ShoppingBag,
} from 'lucide-react';
import { PaymentMethod, PaymentStatus } from '../../data/types';
import type { Order } from '../../data/types';
import { useOrderDetails } from '../../hooks/queries/useOrders';
import { ErrorStateCard } from '../../components/ui/FeedbackStates';
import { DeliveryHeroCard } from '../../components/customer/DeliveryExperience';
import { formatEtaMinutes, formatRouteDistance } from '../../features/maps/route';
import { useEtaCountdown } from '../../features/maps/useEtaCountdown';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { getCustomerTrackingMeta } from '../../features/tracking/customerTracking';

const OrderSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { tr, formatText, language } = useCustomerLanguage();
  const preloadedOrder = location.state?.order as Order | undefined;
  const orderId = preloadedOrder?.id || searchParams.get('orderId') || '';
  const { data: fetchedOrder, isLoading, isError, error, refetch } = useOrderDetails(orderId);
  const order = fetchedOrder || preloadedOrder;

  const trackingMeta = order ? getCustomerTrackingMeta(order, language) : null;
  const rawRemainingDistanceKm =
    typeof order?.tracking?.courierLocation?.remainingDistanceKm === 'number'
      ? order.tracking.courierLocation.remainingDistanceKm
      : typeof order?.deliveryDistanceMeters === 'number' && order.deliveryDistanceMeters > 0
        ? order.deliveryDistanceMeters / 1000
        : null;
  const remainingDistance =
    typeof rawRemainingDistanceKm === 'number'
      ? formatRouteDistance(rawRemainingDistanceKm)
      : null;

  const rawRemainingEtaMinutes =
    typeof order?.tracking?.courierLocation?.remainingEtaMinutes === 'number'
      ? order.tracking.courierLocation.remainingEtaMinutes
      : typeof order?.deliveryEtaMinutes === 'number' && order.deliveryEtaMinutes > 0
        ? order.deliveryEtaMinutes
        : null;
  const remainingEta =
    typeof rawRemainingEtaMinutes === 'number' ? formatEtaMinutes(rawRemainingEtaMinutes) : null;

  const { countdownLabel: etaCountdownLabel, isExpired: isEtaExpired } = useEtaCountdown(
    rawRemainingEtaMinutes ?? undefined,
    order?.tracking?.lastEventAt || order?.courierLastEventAt || undefined,
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
      <div className="flex flex-col items-center justify-center px-8 pt-20 text-center animate-in zoom-in duration-500">
        <h2 className="mb-2 text-xl font-black text-gray-900">{tr('title.confirmation')}</h2>
        <button
          onClick={() => navigate('/customer')}
          className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-[24px] bg-amber-500 font-black text-white shadow-lg shadow-amber-200"
        >
          <span>{tr('success.homeButton')}</span>
        </button>
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

  return (
    <div
      className="px-6 pt-8 animate-in fade-in duration-700"
      style={{ paddingBottom: 'calc(var(--customer-nav-top-edge, 88px) + 24px)' }}
    >
      <DeliveryHeroCard
        tone={remainingEta ? 'live' : trackingMeta.isDelivered ? 'success' : 'warm'}
        eyebrow={tr('success.eyebrow')}
        statusLabel={trackingMeta.stageLabel}
        title={trackingMeta.heroTitle}
        subtitle={trackingMeta.statusLine}
        connectionState="idle"
        isConnected={false}
        etaValue={remainingEta ? etaCountdownLabel || remainingEta : null}
        etaHint={
          remainingEta
            ? isEtaExpired
              ? language === 'ru'
                ? 'Курьер почти у вас'
                : language === 'uz-cyrl'
                  ? 'Курьер деярли етиб келди'
                  : 'Kuryer deyarli yetib keldi'
              : `ETA: ${remainingEta}`
            : tr('success.footer')
        }
        distanceValue={remainingDistance}
        distanceHint={
          remainingDistance
            ? language === 'ru'
              ? 'Оставшаяся дистанция'
              : language === 'uz-cyrl'
                ? 'Қолган масофа'
                : 'Qolgan masofa'
            : tr('success.footer')
        }
      >
        <div className="rounded-[28px] border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/10">
                <CheckCircle2 size={34} className="text-emerald-300" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Buyurtma raqami
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-white">
                  #{order.orderNumber}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                {tr('success.liveStatus')}
              </p>
              <p className="mt-2 text-sm font-black text-white">{trackingMeta.stageLabel}</p>
            </div>
          </div>
        </div>
      </DeliveryHeroCard>

      <div className="mt-6 grid gap-3">
        {/* Total + Payment status */}
        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
                {tr('success.total')}
              </p>
              <p className="mt-2 text-[2rem] font-black tracking-[-0.04em] text-white">
                {order.total.toLocaleString()} so'm
              </p>
            </div>
            <div className="rounded-[12px] border border-amber-400/18 bg-amber-400/10 px-3 py-2 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-300/70">
                {tr('success.liveStatus')}
              </p>
              <p className="mt-1 text-sm font-black text-amber-200">{paymentStatusLabel}</p>
            </div>
          </div>
        </div>

        {/* Payment + Courier + Address + Next step */}
        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.07] text-white/65">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">
                {tr('success.payment')}
              </p>
              <p className="mt-0.5 text-sm font-bold text-white/82">{paymentLabel}</p>
            </div>
          </div>

          {trackingMeta.courierLabel ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-sky-300/12 bg-sky-400/10 text-sky-300">
                <ShoppingBag size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">
                  {language === 'ru' ? 'Курьер' : language === 'uz-cyrl' ? 'Курьер' : 'Kuryer'}
                </p>
                <p className="mt-0.5 text-sm font-bold text-white/82">{trackingMeta.courierLabel}</p>
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.07] text-white/65">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">
                {tr('success.address')}
              </p>
              <p className="mt-0.5 text-sm font-semibold leading-relaxed text-white/76">
                {formatText(order.customerAddress?.addressText || (language === 'ru' ? "Адрес не указан" : "Manzil ko'rsatilmagan"))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.07] text-white/65">
              <Clock3 size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">
                {tr('success.nextStep')}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white/76">{trackingMeta.statusLine}</p>
            </div>
          </div>
        </div>

        {/* Order items */}
        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-5">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
            {tr('success.contents')}
          </p>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/8 bg-white/[0.07] text-[10px] font-black text-white/60">
                    {item.quantity}x
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white/82">{formatText(item.name)}</p>
                    <p className="mt-0.5 text-[11px] text-white/38">
                      {item.price.toLocaleString()} so'm / dona
                    </p>
                  </div>
                </div>
                <p className="text-sm font-black text-white">
                  {(item.price * item.quantity).toLocaleString()} so'm
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={() => navigate(`/customer/orders/${order.id}`)}
          className="flex h-[56px] w-full items-center justify-center gap-3 rounded-[16px] bg-white text-base font-black text-slate-950 shadow-[0_8px_24px_rgba(255,255,255,0.12)] transition-all active:scale-[0.98]"
        >
          <ShoppingBag size={20} />
          <span>Buyurtma tafsilotlari</span>
        </button>

        <button
          onClick={() => navigate('/customer')}
          className="flex h-[56px] w-full items-center justify-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.05] text-base font-black text-white/75 transition-all active:scale-[0.98]"
        >
          <Home size={20} />
          <span>{tr('success.homeButton')}</span>
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/24">
        <span>{tr('success.footer')}</span>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
