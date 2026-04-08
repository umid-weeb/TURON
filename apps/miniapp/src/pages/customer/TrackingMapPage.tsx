import React from 'react';
import { ArrowLeft, Loader2, Navigation, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { CourierMapView } from '../../components/courier/CourierMapView';
import { ErrorStateCard } from '../../components/ui/FeedbackStates';
import { OrderChatPanel } from '../../components/chat/OrderChatPanel';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { DEFAULT_RESTAURANT_LOCATION } from '../../features/maps/restaurant';
import { estimateRouteMetrics, formatEtaMinutes, formatRouteDistance } from '../../features/maps/route';
import { useEtaCountdown } from '../../features/maps/useEtaCountdown';
import {
  getCustomerTrackingDistanceFallbackKm,
  getCustomerTrackingEtaFallbackMinutes,
  getCustomerTrackingMeta,
} from '../../features/tracking/customerTracking';
import { useRouteDetails } from '../../hooks/queries/useMaps';
import { useOrderDetails, useOrderTrackingStream } from '../../hooks/queries/useOrders';
import { useOrderChatUnread } from '../../hooks/queries/useOrderChat';

const TrackingMapPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError, error, refetch } = useOrderDetails(orderId);
  const { isConnected, connectionState } = useOrderTrackingStream(orderId, Boolean(orderId));
  const { language, intlLocale } = useCustomerLanguage();
  const [routeInfo, setRouteInfo] = React.useState<{ distance: string; eta: string } | null>(null);
  const [chatOpen, setChatOpen] = React.useState(false);
  const { data: unreadCount = 0 } = useOrderChatUnread(orderId, 'customer');

  const restaurantPin = React.useMemo(
    () => ({
      lat: order?.pickupLat ?? DEFAULT_RESTAURANT_LOCATION.pin.lat,
      lng: order?.pickupLng ?? DEFAULT_RESTAURANT_LOCATION.pin.lng,
    }),
    [order?.pickupLat, order?.pickupLng],
  );

  const destinationPin = React.useMemo(
    () => ({
      lat: order?.destinationLat ?? order?.customerAddress?.latitude ?? restaurantPin.lat,
      lng: order?.destinationLng ?? order?.customerAddress?.longitude ?? restaurantPin.lng,
    }),
    [
      order?.destinationLat,
      order?.destinationLng,
      order?.customerAddress?.latitude,
      order?.customerAddress?.longitude,
      restaurantPin.lat,
      restaurantPin.lng,
    ],
  );

  const trackingMeta = order ? getCustomerTrackingMeta(order, language) : null;
  const liveCourierPin = order?.tracking?.courierLocation
    ? {
        lat: order.tracking.courierLocation.latitude,
        lng: order.tracking.courierLocation.longitude,
      }
    : undefined;

  const courierPin = trackingMeta?.showCourierMarker
    ? liveCourierPin ?? restaurantPin
    : undefined;

  const currentTargetPin =
    trackingMeta?.currentTarget === 'customer' ? destinationPin : restaurantPin;

  const routeOrigin =
    trackingMeta?.shouldUseCourierRouteOrigin && courierPin ? courierPin : restaurantPin;

  const routeDetailsQuery = useRouteDetails(
    routeOrigin,
    currentTargetPin,
    Boolean(orderId && order && !trackingMeta?.isDelivered && !trackingMeta?.isCancelled),
  );

  const estimatedMetrics = React.useMemo(
    () =>
      estimateRouteMetrics(routeOrigin, currentTargetPin, {
        minimumDistanceKm: 0.3,
        minimumEtaMinutes: 3,
      }),
    [currentTargetPin, routeOrigin],
  );

  const liveEtaMinutes = order?.tracking?.courierLocation?.remainingEtaMinutes;
  const liveDistanceKm = order?.tracking?.courierLocation?.remainingDistanceKm;
  const { countdownLabel } = useEtaCountdown(
    liveEtaMinutes,
    order?.tracking?.lastEventAt || order?.courierLastEventAt || undefined,
  );

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <Loader2 size={28} className="animate-spin text-amber-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="fixed inset-0 bg-slate-950 px-4 py-10">
        <ErrorStateCard
          title="Tracking"
          message={(error as Error).message}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!order || !trackingMeta) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 text-white">
        <button
          type="button"
          onClick={() => navigate('/customer/orders')}
          className="rounded-[12px] bg-white px-6 py-3 text-sm font-black text-slate-950"
        >
          Orqaga
        </button>
      </div>
    );
  }

  // ─── Data ────────────────────────────────────────────────────────────────────
  const realRouteInfo = routeDetailsQuery.data ?? routeInfo;
  const fallbackEtaMinutes = getCustomerTrackingEtaFallbackMinutes(order, estimatedMetrics.etaMinutes);
  const fallbackDistanceKm = getCustomerTrackingDistanceFallbackKm(order, estimatedMetrics.distanceKm);

  const etaDisplay =
    trackingMeta.isDelivered
      ? language === 'ru' ? 'Доставлено' : 'Yetkazildi'
      : trackingMeta.isCancelled
        ? language === 'ru' ? 'Отменено' : 'Bekor qilindi'
        : countdownLabel ||
          (typeof liveEtaMinutes === 'number' ? formatEtaMinutes(liveEtaMinutes) : null) ||
          realRouteInfo?.eta ||
          formatEtaMinutes(fallbackEtaMinutes);

  const distanceDisplay =
    typeof liveDistanceKm === 'number'
      ? formatRouteDistance(liveDistanceKm)
      : realRouteInfo?.distance || formatRouteDistance(fallbackDistanceKm);

  const updatedAt = order.tracking?.lastEventAt || order.courierLastEventAt;
  const updatedAtLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const isOnline = isConnected;
  const isReconnecting = connectionState === 'reconnecting' || connectionState === 'connecting';

  const canChat = Boolean(trackingMeta.showCourierMarker && !trackingMeta.isDelivered && !trackingMeta.isCancelled);

  return (
    <div className="fixed inset-0 bg-slate-950 text-white">
      {/* ─── Full-screen Map ─────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <CourierMapView
          pickup={restaurantPin}
          destination={destinationPin}
          courierPos={courierPin}
          routeFrom={routeOrigin}
          routeTo={currentTargetPin}
          height="100dvh"
          className="rounded-none border-0 shadow-none"
          onRouteInfoChange={setRouteInfo}
        />
      </div>

      {/* ─── Top bar: back + status ──────────────────────────────────── */}
      <div
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 10px)' }}
      >
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(`/customer/orders/${order.id}`)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-slate-950/72 text-white shadow-lg backdrop-blur-xl"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Stage label */}
        <div className="min-w-0 flex-1 rounded-[12px] border border-white/10 bg-slate-950/72 px-3 py-2 text-center shadow-lg backdrop-blur-xl">
          <p className="truncate text-[12px] font-black tracking-tight text-white">
            {trackingMeta.stageLabel}
          </p>
        </div>

        {/* Live badge */}
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 shadow-lg backdrop-blur-xl ${
            isOnline
              ? 'border-emerald-400/20 bg-emerald-400/12'
              : isReconnecting
                ? 'border-amber-400/20 bg-amber-400/12'
                : 'border-white/10 bg-slate-950/72'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOnline
                ? 'animate-pulse bg-emerald-400'
                : isReconnecting
                  ? 'animate-pulse bg-amber-400'
                  : 'bg-white/30'
            }`}
          />
          <span
            className={`text-[10px] font-black uppercase tracking-[0.14em] ${
              isOnline ? 'text-emerald-200' : isReconnecting ? 'text-amber-200' : 'text-white/45'
            }`}
          >
            {isOnline
              ? language === 'ru' ? 'Онлайн' : 'Jonli'
              : isReconnecting
                ? '...'
                : updatedAtLabel}
          </span>
        </div>
      </div>

      {/* ─── Bottom area ─────────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-0 z-20"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 10px)' }}
      >
        {/* Gradient fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-950/90 to-transparent" />

        <div className="relative px-4 flex flex-col gap-2">

          {/* ─── In-app courier↔customer chat overlay ─── */}
          {chatOpen && canChat && (
            <OrderChatPanel
              orderId={orderId}
              role="customer"
              theme="dark"
              onClose={() => setChatOpen(false)}
            />
          )}

          {/* ─── ETA / distance strip ─── */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/82 px-4 py-3 shadow-2xl backdrop-blur-2xl">
            {/* ETA */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Navigation size={16} className="shrink-0 text-amber-400" />
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
                  {trackingMeta.isDelivered
                    ? language === 'ru' ? 'Статус' : 'Holat'
                    : language === 'ru' ? 'Прибытие' : 'Yetib kelish'}
                </p>
                <p className="text-[17px] font-black leading-tight tracking-[-0.03em] text-white">
                  {etaDisplay}
                </p>
              </div>
            </div>

            {/* Distance */}
            {!trackingMeta.isDelivered && !trackingMeta.isCancelled && (
              <div className="shrink-0 rounded-[10px] border border-white/8 bg-white/[0.06] px-3 py-2 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                  {language === 'ru' ? 'Расстояние' : 'Masofa'}
                </p>
                <p className="text-[14px] font-black text-white">{distanceDisplay}</p>
              </div>
            )}

            {/* Chat toggle button with unread badge */}
            {canChat && (
              <button
                type="button"
                onClick={() => setChatOpen((v) => !v)}
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
                  chatOpen
                    ? 'border-amber-400/40 bg-amber-400/20 text-amber-300'
                    : 'border-sky-400/24 bg-sky-400/14 text-sky-300'
                }`}
                title={language === 'ru' ? 'Написать курьеру' : 'Kuryerga yozish'}
              >
                {chatOpen ? <X size={18} /> : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                )}
                {unreadCount > 0 && !chatOpen && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingMapPage;
