import React from 'react';
import { ArrowLeft, Clock3, MapPin, MessageCircleMore, PackageCheck, Route } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { DeliveryMarkerLegend } from '../../components/customer/DeliveryExperience';
import { ErrorStateCard } from '../../components/ui/FeedbackStates';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import type { RouteInfo } from '../../features/maps/MapProvider';
import { getMapProvider } from '../../features/maps/provider';
import {
  createRouteInfo,
  createZeroRouteInfo,
  estimateRouteMetrics,
  formatArrivalTime,
  formatEtaMinutes,
} from '../../features/maps/route';
import { DEFAULT_RESTAURANT_LOCATION } from '../../features/maps/restaurant';
import { useEtaCountdown } from '../../features/maps/useEtaCountdown';
import { useSmoothedPin } from '../../features/maps/useSmoothedPin';
import {
  getCustomerTrackingDistanceFallbackKm,
  getCustomerTrackingEtaFallbackMinutes,
  getCustomerTrackingMeta,
} from '../../features/tracking/customerTracking';
import { ORDER_TRACKING_FEATURE_ENABLED } from '../../features/tracking/config';
import { useOrderDetails, useOrderTrackingStream } from '../../hooks/queries/useOrders';

const TrackingMapPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const mapProvider = React.useMemo(() => getMapProvider(), []);
  const RouteMap = mapProvider.RouteMap;
  const { language, formatText } = useCustomerLanguage();
  const { data: order, isLoading, isError, error, refetch } = useOrderDetails(orderId);
  const { connectionState, isConnected } = useOrderTrackingStream(orderId, Boolean(orderId));
  const [mapRouteInfo, setMapRouteInfo] = React.useState<RouteInfo | null>(null);

  const backPath = orderId ? `/customer/orders/${orderId}` : '/customer/orders';

  const pickupPin = React.useMemo(
    () => ({
      lat: order?.pickupLat ?? DEFAULT_RESTAURANT_LOCATION.pin.lat,
      lng: order?.pickupLng ?? DEFAULT_RESTAURANT_LOCATION.pin.lng,
    }),
    [order?.pickupLat, order?.pickupLng],
  );

  const destinationPin = React.useMemo(
    () => ({
      lat: order?.destinationLat ?? order?.customerAddress?.latitude ?? pickupPin.lat,
      lng: order?.destinationLng ?? order?.customerAddress?.longitude ?? pickupPin.lng,
    }),
    [
      order?.customerAddress?.latitude,
      order?.customerAddress?.longitude,
      order?.destinationLat,
      order?.destinationLng,
      pickupPin.lat,
      pickupPin.lng,
    ],
  );

  const courierPin = React.useMemo(
    () =>
      order?.tracking?.courierLocation
        ? {
            lat: order.tracking.courierLocation.latitude,
            lng: order.tracking.courierLocation.longitude,
          }
        : undefined,
    [order?.tracking?.courierLocation],
  );

  // Smoothly interpolate the marker between GPS updates instead of jumping
  const smoothedCourierPin = useSmoothedPin(courierPin);

  const trackingMeta = React.useMemo(
    () => (order ? getCustomerTrackingMeta(order, language) : null),
    [language, order],
  );

  const routeFrom = React.useMemo(() => {
    if (trackingMeta?.shouldUseCourierRouteOrigin && courierPin) {
      return courierPin;
    }

    return pickupPin;
  }, [courierPin, pickupPin, trackingMeta?.shouldUseCourierRouteOrigin]);

  const routeTo = React.useMemo(() => {
    if (trackingMeta?.shouldUseCourierRouteOrigin && courierPin) {
      return trackingMeta.currentTarget === 'restaurant' ? pickupPin : destinationPin;
    }

    return destinationPin;
  }, [courierPin, destinationPin, pickupPin, trackingMeta]);

  const fallbackRouteInfo = React.useMemo(() => {
    if (!order || !trackingMeta) {
      return createZeroRouteInfo();
    }

    if (trackingMeta.isDelivered || trackingMeta.isCancelled) {
      return createZeroRouteInfo();
    }

    const estimatedMetrics = estimateRouteMetrics(routeFrom, routeTo, {
      minimumDistanceKm: 0,
      minimumEtaMinutes: 0,
      roadFactor: 1.18,
      averageSpeedKmh: 26,
    });

    return createRouteInfo({
      distanceKm: getCustomerTrackingDistanceFallbackKm(order, estimatedMetrics.distanceKm),
      etaMinutes: getCustomerTrackingEtaFallbackMinutes(order, estimatedMetrics.etaMinutes),
      source: mapProvider.id === 'mock' ? 'mock' : 'estimate',
    });
  }, [mapProvider.id, order, routeFrom, routeTo, trackingMeta]);

  const displayRouteInfo = mapRouteInfo ?? fallbackRouteInfo;

  const heroIsConnected = Boolean(courierPin) || isConnected;

  const remainingEtaMinutes =
    order && trackingMeta && !trackingMeta.isDelivered && !trackingMeta.isCancelled
      ? typeof order.tracking?.courierLocation?.remainingEtaMinutes === 'number'
        ? order.tracking.courierLocation.remainingEtaMinutes
        : getCustomerTrackingEtaFallbackMinutes(order, fallbackRouteInfo.etaSeconds ? fallbackRouteInfo.etaSeconds / 60 : 0)
      : 0;

  const { countdownLabel, isExpired } = useEtaCountdown(
    remainingEtaMinutes,
    order?.tracking?.lastEventAt || order?.courierLastEventAt || order?.createdAt,
  );

  const etaValue =
    remainingEtaMinutes > 0
      ? countdownLabel || formatEtaMinutes(remainingEtaMinutes)
      : displayRouteInfo.eta;
  const arrivalTime =
    remainingEtaMinutes > 0 ? formatArrivalTime(remainingEtaMinutes) : null;

  const liveTrackingHint = trackingMeta?.isDelivered
    ? "Buyurtma topshirildi."
    : trackingMeta?.isCancelled
      ? "Buyurtma bekor qilingan."
      : courierPin
        ? "Kuryer joylashuvi kelishi bilan xarita shu yerda jonli yangilanadi."
        : ORDER_TRACKING_FEATURE_ENABLED
          ? "Kuryer joylashuvi kelishi bilan marker avtomatik paydo bo'ladi."
          : "Hozircha status va yo'nalish ko'rsatiladi. Jonli lokatsiya yoqilganda shu ekran avtomatik boyiydi.";

  const routeCaption =
    trackingMeta?.currentTarget === 'restaurant' && courierPin
      ? "Kuryer avval restoranga boradi, keyin sizning manzilingizga yo'l oladi."
      : "Marshrut restoran va sizning manzilingiz orasida hisoblandi.";
  const connectionLabel = heroIsConnected
    ? 'Jonli'
    : connectionState === 'reconnecting'
      ? 'Qayta ulanmoqda'
      : connectionState === 'connecting'
        ? 'Ulanmoqda'
        : 'Kutilyapti';

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-white">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-6 py-5 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-white/65">
            Tracking yuklanmoqda
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-10">
        <ErrorStateCard
          title="Buyurtma kuzatuvi"
          message={(error as Error).message}
          onRetry={() => {
            void refetch();
          }}
        />
      </div>
    );
  }

  if (!order || !trackingMeta) {
    return (
      <div className="px-4 py-10">
        <ErrorStateCard
          title="Buyurtma kuzatuvi"
          message="Buyurtma topilmadi yoki kuzatuv ma'lumoti tayyor emas."
          onRetry={() => {
            void refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#f8fafc_100%)] px-4 text-slate-900"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      }}
    >
      <div className="mx-auto max-w-[430px] space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
        <div className="flex items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-700 transition-transform active:scale-95"
            aria-label="Orqaga"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Buyurtma #{order.orderNumber}
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
          <div className="bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Buyurtma kuzatuvi</p>
                <h2 className="mt-2 text-[24px] font-black leading-tight tracking-tight text-slate-900">{trackingMeta.heroTitle}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{trackingMeta.statusLine}</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`absolute inline-flex h-full w-full rounded-full ${heroIsConnected ? 'animate-ping bg-emerald-400' : 'bg-amber-400'} opacity-75`} />
                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${heroIsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </span>
                  {connectionLabel}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <PackageCheck size={24} />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Holat</p>
                <p className="mt-2 text-base font-black text-slate-900">{trackingMeta.stageLabel}</p>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">To'lov</p>
                <p className="mt-2 text-base font-black text-slate-900">
                  {order.paymentStatus === 'COMPLETED'
                    ? 'Tasdiqlangan'
                    : order.paymentMethod === 'CASH'
                      ? 'Naqd'
                      : 'Tekshiruvda'}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Qolgan ETA</p>
                <p className="mt-2 text-base font-black text-slate-900">{etaValue}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {isExpired && remainingEtaMinutes > 0 ? 'Kuryer deyarli yetib keldi' : arrivalTime ? `Yetib kelishi: ${arrivalTime}` : liveTrackingHint}
                </p>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Qolgan masofa</p>
                <p className="mt-2 text-base font-black text-slate-900">{displayRouteInfo.distance}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{routeCaption}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
          <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 h-10 rounded-full bg-[linear-gradient(90deg,rgba(59,130,246,0.12),rgba(16,185,129,0.12))] blur-lg" />
          <RouteMap
            pickup={pickupPin}
            destination={destinationPin}
            courierPos={trackingMeta.showCourierMarker ? smoothedCourierPin : undefined}
            routeFrom={routeFrom}
            routeTo={routeTo}
            height="360px"
            className="rounded-none border-0 shadow-none"
            followMode={Boolean(courierPin)}
            heading={order.tracking?.courierLocation?.heading}
            onRouteInfoChange={setMapRouteInfo}
          />
        </section>

        <DeliveryMarkerLegend />

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              <Route size={14} />
              <span>Yo'nalish</span>
            </div>
            <p className="mt-3 text-lg font-black text-slate-900">{displayRouteInfo.distance}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{routeCaption}</p>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              <Clock3 size={14} />
              <span>Yetib kelish</span>
            </div>
            <p className="mt-3 text-lg font-black text-slate-900">{etaValue}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
              {arrivalTime ? `Taxminiy vaqt: ${arrivalTime}` : liveTrackingHint}
            </p>
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-slate-100 text-slate-600">
              <MapPin size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Yetkazish manzili
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                {formatText(order.customerAddress?.addressText || "Manzil ko'rsatilmagan")}
              </p>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                Xaritada faqat shu buyurtmaga tegishli manzil va tracking ma'lumoti ko'rsatiladi.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate(`/customer/orders/${order.id}`)}
            className="flex h-[54px] items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white text-sm font-black text-slate-900 shadow-sm transition-transform active:scale-[0.985]"
          >
            <PackageCheck size={18} />
            <span>Tafsilotlar</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/customer/support?orderId=${order.id}`)}
            className="flex h-[54px] items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_100%)] text-sm font-black text-white transition-transform active:scale-[0.985]"
          >
            <MessageCircleMore size={18} />
            <span>Support</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackingMapPage;
