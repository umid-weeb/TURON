import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { DeliveryStage } from '../../data/types';
import { CourierMapView } from '../../components/courier/CourierMapView';
import {
  CourierProblemReporter,
  DeliveryBottomPanel,
} from '../../components/courier/CourierComponents';
import { ErrorStateCard } from '../../components/ui/FeedbackStates';
import {
  useCourierOrderDetails,
  useReportCourierProblem,
  useUpdateCourierLocation,
  useUpdateCourierOrderStage,
} from '../../hooks/queries/useOrders';
import {
  createRouteInfo,
  estimateRouteMetrics,
  formatArrivalTime,
  formatEtaMinutes,
  formatRouteDistance,
  type RouteMetrics,
} from '../../features/maps/route';
import {
  getUserGeolocationErrorMessage,
  stopWatchingBrowserGeolocation,
  watchBrowserGeolocation,
} from '../../features/maps/geolocation';
import { DEFAULT_RESTAURANT_LOCATION } from '../../features/maps/restaurant';
import { api } from '../../lib/api';
import {
  getDeliveryRouteMeta,
  getDeliveryStageMeta,
  getDeliveryStateKey,
} from '../../features/courier/deliveryStage';

// ─── Pure helpers (no hooks) ──────────────────────────────────────────────────

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

function getHeadingDegrees(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number | undefined {
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  if (Math.abs(dLat) < 1e-6 && Math.abs(dLng) < 1e-6) return undefined;
  return ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
}

function getCourierSpeedKmh(state: ReturnType<typeof getDeliveryStateKey>): number {
  switch (state) {
    case 'ACCEPTED':   return 18;
    case 'PICKED_UP':  return 24;
    case 'DELIVERING': return 28;
    default:           return 0;
  }
}

function computeRemainingMetrics(
  state: ReturnType<typeof getDeliveryStateKey>,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): RouteMetrics {
  if (state === 'ARRIVED' || state === 'DELIVERED') {
    return { distanceKm: 0, etaMinutes: 0 };
  }
  const m = estimateRouteMetrics(from, to, { minimumDistanceKm: 0, minimumEtaMinutes: 0 });
  if (m.distanceKm < 0.05) return { distanceKm: 0, etaMinutes: 0 };
  return { distanceKm: m.distanceKm, etaMinutes: Math.max(m.etaMinutes, 1) };
}

function stageToast(stage: DeliveryStage): { text: string; type: 'success' | 'info' } {
  switch (stage) {
    case DeliveryStage.ARRIVED_AT_RESTAURANT:
      return { text: 'Restoranda — Taomni oling', type: 'info' };
    case DeliveryStage.PICKED_UP:
      return { text: "Olingdi — Mijozga yo'l oling", type: 'success' };
    case DeliveryStage.DELIVERING:
      return { text: "Yo'lda — Mijozga yetkazing", type: 'info' };
    case DeliveryStage.ARRIVED_AT_DESTINATION:
      return { text: 'Manzilga yetdingiz — Topshiring', type: 'info' };
    case DeliveryStage.DELIVERED:
      return { text: 'Buyurtma topshirildi! Ajoyib ish', type: 'success' };
    default:
      return { text: 'Bosqich yangilandi', type: 'info' };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const CourierMapPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // ── Server data ────────────────────────────────────────────────────────────
  const { data: order, isLoading, isError, error, refetch } = useCourierOrderDetails(orderId);
  const updateStageMutation   = useUpdateCourierOrderStage();
  const reportProblemMutation = useReportCourierProblem();
  const updateLocationMutation = useUpdateCourierLocation();

  // ── UI state — ALL hooks before any conditional return ─────────────────────
  const [liveCourierPos, setLiveCourierPos]     = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo]               = useState<{ distance: string; eta: string } | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [problemDraft, setProblemDraft]         = useState('');
  const [problemFeedback, setProblemFeedback]   = useState<{
    text: string;
    tone: 'success' | 'error' | 'neutral';
  } | null>(null);
  const [copied, setCopied]                     = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const lastHeartbeatRef        = useRef('');
  const previousCourierPosRef   = useRef<{ lat: number; lng: number } | null>(null);
  const approachingNotifiedRef  = useRef(false);
  const copiedTimerRef          = useRef<number | null>(null);

  // ── Derived positions (memoised) ───────────────────────────────────────────
  const restaurantPos = useMemo(
    () => ({
      lat: order?.pickupLat ?? DEFAULT_RESTAURANT_LOCATION.pin.lat,
      lng: order?.pickupLng ?? DEFAULT_RESTAURANT_LOCATION.pin.lng,
    }),
    [order?.pickupLat, order?.pickupLng],
  );

  const customerPos = useMemo(
    () => ({
      lat: order?.destinationLat ?? order?.customerAddress?.latitude ?? restaurantPos.lat,
      lng: order?.destinationLng ?? order?.customerAddress?.longitude ?? restaurantPos.lng,
    }),
    [
      order?.destinationLat,
      order?.destinationLng,
      order?.customerAddress?.latitude,
      order?.customerAddress?.longitude,
      restaurantPos.lat,
      restaurantPos.lng,
    ],
  );

  const trackedCourierPos = useMemo(
    () =>
      order?.tracking?.courierLocation
        ? {
            lat: order.tracking.courierLocation.latitude,
            lng: order.tracking.courierLocation.longitude,
          }
        : null,
    [order?.tracking?.courierLocation],
  );

  // ── Stage / route derived values ───────────────────────────────────────────
  const currentStage = order?.deliveryStage ?? DeliveryStage.IDLE;
  const currentState = getDeliveryStateKey(currentStage);
  const stageMeta    = getDeliveryStageMeta(currentStage);
  const routeMeta    = getDeliveryRouteMeta(currentStage);

  const canPublishLiveLocation =
    currentStage !== DeliveryStage.IDLE && currentStage !== DeliveryStage.DELIVERED;

  const courierPos    = liveCourierPos ?? trackedCourierPos ?? restaurantPos;
  const currentTarget =
    currentState === 'ACCEPTED' || currentState === 'ARRIVED' ? restaurantPos : customerPos;

  const remainingMetrics = useMemo(
    () => computeRemainingMetrics(currentState, courierPos, currentTarget),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentState, courierPos.lat, courierPos.lng, currentTarget.lat, currentTarget.lng],
  );

  const metricsRouteInfo = useMemo(() => createRouteInfo(remainingMetrics), [remainingMetrics]);
  const displayRouteInfo = routeInfo ?? metricsRouteInfo;

  const isEtaLive =
    currentState === 'ACCEPTED' || currentState === 'PICKED_UP' || currentState === 'DELIVERING';

  const arrivalTime = useMemo(
    () => formatArrivalTime(remainingMetrics.etaMinutes),
    [remainingMetrics.etaMinutes],
  );

  const hasLivePos       = liveCourierPos !== null;
  const distToRestaurant = haversineMeters(courierPos, restaurantPos);
  const distToCustomer   = haversineMeters(courierPos, customerPos);

  const nearRestaurant = useMemo(
    () =>
      hasLivePos &&
      distToRestaurant <= 50 &&
      (currentStage === DeliveryStage.GOING_TO_RESTAURANT || currentStage === DeliveryStage.IDLE),
    [hasLivePos, distToRestaurant, currentStage],
  );

  const nearCustomer = useMemo(
    () =>
      hasLivePos &&
      distToCustomer <= 50 &&
      (currentStage === DeliveryStage.DELIVERING ||
        currentStage === DeliveryStage.ARRIVED_AT_DESTINATION),
    [hasLivePos, distToCustomer, currentStage],
  );

  const approachingCustomer = useMemo(
    () =>
      hasLivePos &&
      distToCustomer <= 500 &&
      distToCustomer > 50 &&
      currentStage === DeliveryStage.DELIVERING,
    [hasLivePos, distToCustomer, currentStage],
  );

  // ── Stable callbacks ────────────────────────────────────────────────────────

  // Copy destination address to clipboard
  const handleCopyAddress = useCallback(() => {
    const address = order?.customerAddress?.addressText;
    if (!address) return;
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    });
  }, [order?.customerAddress?.addressText]);

  // ── GPS watch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!order?.id) return;
    const watchId = watchBrowserGeolocation(
      (location) => {
        setGeolocationError(null);
        setLiveCourierPos(location.pin);
      },
      (watchError) => setGeolocationError(getUserGeolocationErrorMessage(watchError)),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 },
    );
    return () => stopWatchingBrowserGeolocation(watchId);
  }, [order?.id]);

  // ── Location heartbeat to server ───────────────────────────────────────────
  useEffect(() => {
    if (!order?.id || !liveCourierPos || !canPublishLiveLocation) return;

    const latitude            = Number(liveCourierPos.lat.toFixed(6));
    const longitude           = Number(liveCourierPos.lng.toFixed(6));
    const remainingDistanceKm = Number(remainingMetrics.distanceKm.toFixed(2));
    const remainingEtaMinutes = remainingMetrics.etaMinutes;
    const heading             = previousCourierPosRef.current
      ? getHeadingDegrees(previousCourierPosRef.current, liveCourierPos)
      : undefined;
    const speedKmh = getCourierSpeedKmh(currentState);

    const sig = [
      order.id, currentStage, latitude, longitude, remainingDistanceKm, remainingEtaMinutes,
    ].join(':');

    previousCourierPosRef.current = liveCourierPos;
    if (lastHeartbeatRef.current === sig) return;
    lastHeartbeatRef.current = sig;

    updateLocationMutation.mutate({
      id: order.id,
      latitude,
      longitude,
      heading,
      speedKmh,
      remainingDistanceKm,
      remainingEtaMinutes,
    });
  }, [
    liveCourierPos,
    currentStage,
    currentState,
    order?.id,
    remainingMetrics.distanceKm,
    remainingMetrics.etaMinutes,
    canPublishLiveLocation,
    updateLocationMutation,
  ]);

  // ── "Approaching customer" notification ────────────────────────────────────
  useEffect(() => {
    if (!approachingCustomer || approachingNotifiedRef.current || !order?.id) return;
    approachingNotifiedRef.current = true;
    showToast('Mijozga 500m qoldi — xabar yuborildi', 'info');
    void api.post(`/courier/order/${order.id}/approaching`).catch(() => {});
  }, [approachingCustomer, order?.id, showToast]);

  useEffect(() => {
    if (currentStage !== DeliveryStage.DELIVERING) {
      approachingNotifiedRef.current = false;
    }
  }, [currentStage]);

  // ── Cleanup timer on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // ── Loading / error screens ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-5 text-center shadow-2xl backdrop-blur-xl">
          <Loader2 size={28} className="mx-auto animate-spin text-amber-300" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-white/65">
            Marshrut yuklanmoqda
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <ErrorStateCard
          title="Xarita yuklanmadi"
          message={(error as Error).message}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
        <h3 className="text-xl font-black tracking-tight">Buyurtma topilmadi</h3>
        <button
          type="button"
          onClick={() => navigate('/courier/orders')}
          className="mt-6 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-slate-950"
        >
          Ro'yxatga qaytish
        </button>
      </div>
    );
  }

  // ── Event handlers (after null-guard: order is guaranteed non-null) ─────────

  const handleStageAction = (nextStage: DeliveryStage) => {
    if (updateStageMutation.isPending) return;
    updateStageMutation.mutate(
      { id: order.id, stage: nextStage },
      {
        onSuccess: () => {
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
          const { text, type } = stageToast(nextStage);
          showToast(text, type);
          if (nextStage === DeliveryStage.DELIVERED) {
            window.setTimeout(() => navigate('/courier/orders'), 3000);
          }
        },
      },
    );
  };

  const handleCall = () => {
    if (!order.customerPhone) {
      window.alert('Mijozning telefon raqami mavjud emas');
      return;
    }
    window.location.href = `tel:${order.customerPhone}`;
  };

  const handleProblemSubmit = () => {
    const text = problemDraft.trim();
    if (text.length < 5) {
      setProblemFeedback({ text: 'Muammoni kamida 5 ta belgi bilan yozing.', tone: 'error' });
      return;
    }
    reportProblemMutation.mutate(
      { id: order.id, text },
      {
        onSuccess: () => {
          setProblemDraft('');
          setProblemFeedback({ text: 'Muammo operatorga yuborildi.', tone: 'success' });
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        },
        onError: (err) => {
          setProblemFeedback({
            text: err instanceof Error ? err.message : "Muammoni yuborib bo'lmadi",
            tone: 'error',
          });
        },
      },
    );
  };

  const showCopyButton =
    Boolean(order.customerAddress?.addressText) &&
    currentState !== 'ACCEPTED' &&
    currentState !== 'ARRIVED';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950 font-sans text-white">

      {/* ── Full-screen map ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <CourierMapView
          pickup={restaurantPos}
          destination={customerPos}
          courierPos={courierPos}
          routeFrom={courierPos}
          routeTo={currentTarget}
          height="100%"
          className="rounded-none border-0 shadow-none"
          followMode={true}
          onRouteInfoChange={setRouteInfo}
        />
        {/* Gradient overlays for UI legibility */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.1),transparent_25%),linear-gradient(180deg,rgba(2,6,23,0.14)_0%,rgba(2,6,23,0.28)_35%,rgba(2,6,23,0.76)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-slate-950/20" />
      </div>

      {/* ── Top overlay ─────────────────────────────────────────────────── */}
      <div
        className="absolute left-0 right-0 top-0 z-40 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        {/* GPS error banner */}
        {geolocationError && (
          <div className="mb-2 flex items-center gap-2 rounded-[18px] border border-red-400/30 bg-red-500/20 px-4 py-2.5 backdrop-blur-xl animate-in slide-in-from-top duration-300">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-400" />
            <p className="text-[12px] font-bold text-red-200">{geolocationError}</p>
          </div>
        )}

        {/* Back + order pill */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/courier/orders')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/72 text-white shadow-[0_12px_32px_rgba(2,6,23,0.5)] backdrop-blur-xl transition-transform active:scale-95"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-slate-950/72 px-4 py-3 shadow-[0_12px_32px_rgba(2,6,23,0.5)] backdrop-blur-xl">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                {routeMeta.title}
              </p>
              <p className="mt-0.5 truncate text-[15px] font-black text-white">
                #{order.orderNumber} · {order.customerName || 'Mijoz'}
              </p>
            </div>
            <div
              className={`shrink-0 rounded-[14px] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${stageMeta.badgeClassDark}`}
            >
              {stageMeta.label}
            </div>
          </div>
        </div>

      </div>

      {/* ── Bottom action panel ──────────────────────────────────────────── */}
      <DeliveryBottomPanel
        order={order}
        currentStage={currentStage}
        onAction={handleStageAction}
        onCall={handleCall}
        onOpenDetails={() => navigate(`/courier/order/${order.id}`)}
        onDeliveredNavigate={() => navigate('/courier/orders')}
        nearRestaurant={nearRestaurant}
        nearCustomer={nearCustomer}
        approachingCustomer={approachingCustomer}
        problemPanel={
          currentStage !== DeliveryStage.DELIVERED ? (
            <CourierProblemReporter
              value={problemDraft}
              onChange={(value) => {
                setProblemDraft(value);
                if (problemFeedback) setProblemFeedback(null);
              }}
              onSubmit={handleProblemSubmit}
              isSubmitting={reportProblemMutation.isPending}
              theme="dark"
              helperText="Mijoz bilan bog'lana olmasangiz yoki manzil topilmasa shu yerdan yozing."
              feedbackText={problemFeedback?.text ?? null}
              feedbackTone={problemFeedback?.tone ?? 'neutral'}
            />
          ) : null
        }
        isUpdating={updateStageMutation.isPending}
        canCall={Boolean(order.customerPhone)}
        routeTitle={routeMeta.title}
        routeDescription={geolocationError ?? routeMeta.description}
        pickupLabel={DEFAULT_RESTAURANT_LOCATION.name}
        destinationLabel={order.customerAddress?.label || 'Mijoz manzili'}
        distance={displayRouteInfo.distance || formatRouteDistance(remainingMetrics.distanceKm)}
        eta={displayRouteInfo.eta || formatEtaMinutes(remainingMetrics.etaMinutes)}
        distanceLabel="Qolgan masofa"
        etaLabel="Qolgan ETA"
        isEtaLive={isEtaLive}
        arrivalTime={remainingMetrics.etaMinutes > 0 ? arrivalTime : null}
        onCopyAddress={showCopyButton ? handleCopyAddress : undefined}
        copySuccess={copied}
      />
    </div>
  );
};

export default CourierMapPage;
