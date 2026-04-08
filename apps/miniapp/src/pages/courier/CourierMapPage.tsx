import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crosshair, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { DeliveryStage } from '../../data/types';
import { CourierMapView } from '../../components/courier/CourierMapView';
import {
  CourierProblemReporter,
  DeliveryBottomPanel,
  RouteInfoPanel,
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
import { getDeliveryRouteMeta, getDeliveryStageMeta, getDeliveryStateKey } from '../../features/courier/deliveryStage';

/** Haversine distance in meters between two GPS points */
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

function getHeadingDegrees(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const latDelta = to.lat - from.lat;
  const lngDelta = to.lng - from.lng;

  if (Math.abs(latDelta) < 0.000001 && Math.abs(lngDelta) < 0.000001) {
    return undefined;
  }

  const degrees = (Math.atan2(lngDelta, latDelta) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

function getCourierSpeed(currentState: ReturnType<typeof getDeliveryStateKey>) {
  switch (currentState) {
    case 'ACCEPTED':
      return 18;
    case 'PICKED_UP':
      return 24;
    case 'DELIVERING':
      return 28;
    default:
      return 0;
  }
}

function getRemainingRouteMetrics(
  currentState: ReturnType<typeof getDeliveryStateKey>,
  courierPos: { lat: number; lng: number },
  activeTarget: { lat: number; lng: number },
): RouteMetrics {
  if (currentState === 'ARRIVED' || currentState === 'DELIVERED') {
    return {
      distanceKm: 0,
      etaMinutes: 0,
    };
  }

  const metrics = estimateRouteMetrics(courierPos, activeTarget, {
    minimumDistanceKm: 0,
    minimumEtaMinutes: 0,
  });

  if (metrics.distanceKm < 0.05) {
    return {
      distanceKm: 0,
      etaMinutes: 0,
    };
  }

  return {
    distanceKm: metrics.distanceKm,
    etaMinutes: Math.max(metrics.etaMinutes, 1),
  };
}

// Contextual toast message per stage
function getStagToastMessage(stage: DeliveryStage): { text: string; type: 'success' | 'info' } {
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

const CourierMapPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: order, isLoading, isError, error, refetch } = useCourierOrderDetails(orderId);
  const updateStageMutation = useUpdateCourierOrderStage();
  const reportProblemMutation = useReportCourierProblem();
  const updateLocationMutation = useUpdateCourierLocation();
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [liveCourierPos, setLiveCourierPos] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; eta: string } | null>(null);
  const [followMode, setFollowMode] = useState(true);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [problemDraft, setProblemDraft] = useState('');
  const [problemFeedback, setProblemFeedback] = useState<{
    text: string;
    tone: 'success' | 'error' | 'neutral';
  } | null>(null);
  const lastHeartbeatRef = useRef('');
  const previousCourierPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const approachingNotifiedRef = useRef(false); // prevent duplicate 500m notifications

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

  const trackedCourierPos = order?.tracking?.courierLocation
    ? {
        lat: order.tracking.courierLocation.latitude,
        lng: order.tracking.courierLocation.longitude,
      }
    : null;

  const currentStage = order?.deliveryStage ?? DeliveryStage.IDLE;
  const currentState = getDeliveryStateKey(currentStage);
  const stageMeta = getDeliveryStageMeta(currentStage);
  const routeMeta = getDeliveryRouteMeta(currentStage);
  const canPublishLiveLocation =
    currentStage !== DeliveryStage.IDLE && currentStage !== DeliveryStage.DELIVERED;
  const courierPos = liveCourierPos ?? trackedCourierPos ?? restaurantPos;
  const currentTarget =
    currentState === 'ACCEPTED' || currentState === 'ARRIVED' ? restaurantPos : customerPos;
  const remainingMetrics = getRemainingRouteMetrics(currentState, courierPos, currentTarget);
  const metricsRouteInfo = createRouteInfo(remainingMetrics);
  const displayRouteInfo = routeInfo ?? metricsRouteInfo;

  useEffect(() => {
    if (!order?.id) {
      return;
    }

    const watchId = watchBrowserGeolocation(
      (location) => {
        setGeolocationError(null);
        setLiveCourierPos(location.pin);
      },
      (watchError) => {
        setGeolocationError(getUserGeolocationErrorMessage(watchError));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 3000,
      },
    );

    return () => {
      stopWatchingBrowserGeolocation(watchId);
    };
  }, [order?.id]);

  useEffect(() => {
    if (!order?.id || !liveCourierPos || !canPublishLiveLocation) {
      return;
    }

    const previousCourierPos = previousCourierPosRef.current;
    const latitude = Number(liveCourierPos.lat.toFixed(6));
    const longitude = Number(liveCourierPos.lng.toFixed(6));
    const remainingDistanceKm = Number(remainingMetrics.distanceKm.toFixed(2));
    const remainingEtaMinutes = remainingMetrics.etaMinutes;
    const heading = previousCourierPos ? getHeadingDegrees(previousCourierPos, liveCourierPos) : undefined;
    const speedKmh = getCourierSpeed(currentState);
    const heartbeatSignature = [
      order.id,
      currentStage,
      latitude,
      longitude,
      remainingDistanceKm,
      remainingEtaMinutes,
    ].join(':');

    previousCourierPosRef.current = liveCourierPos;

    if (lastHeartbeatRef.current === heartbeatSignature) {
      return;
    }

    lastHeartbeatRef.current = heartbeatSignature;
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
    updateLocationMutation,
    canPublishLiveLocation,
  ]);

  // ── Proximity calculations — only fire when we have real GPS ────────────
  // Without this guard, fallback to restaurantPos would make nearRestaurant=true
  // even when GPS is off, causing the action button to appear incorrectly.
  const hasLivePos = liveCourierPos !== null;
  const distToRestaurant = distanceMeters(courierPos, restaurantPos);
  const distToCustomer   = distanceMeters(courierPos, customerPos);

  const nearRestaurant =
    hasLivePos &&
    distToRestaurant <= 50 &&
    (currentStage === DeliveryStage.GOING_TO_RESTAURANT || currentStage === DeliveryStage.IDLE);

  const nearCustomer =
    hasLivePos &&
    distToCustomer <= 50 &&
    (currentStage === DeliveryStage.DELIVERING || currentStage === DeliveryStage.ARRIVED_AT_DESTINATION);

  const approachingCustomer =
    hasLivePos &&
    distToCustomer <= 500 &&
    distToCustomer > 50 &&
    currentStage === DeliveryStage.DELIVERING;

  // ── Send "almost there" notification once when within 500m ────────────────
  useEffect(() => {
    if (!approachingCustomer || approachingNotifiedRef.current || !order?.id) return;
    approachingNotifiedRef.current = true;
    // Fire-and-forget — best effort, no UI feedback needed
    void api.post(`/courier/order/${order.id}/approaching`).catch(() => {});
  }, [approachingCustomer, order?.id]);

  // Reset notification flag when stage changes away from DELIVERING
  useEffect(() => {
    if (currentStage !== DeliveryStage.DELIVERING) {
      approachingNotifiedRef.current = false;
    }
  }, [currentStage]);

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
          onRetry={() => {
            void refetch();
          }}
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

  const handleStageAction = (nextStage: DeliveryStage) => {
    if (updateStageMutation.isPending) {
      return;
    }

    updateStageMutation.mutate(
      { id: order.id, stage: nextStage },
      {
        onSuccess: () => {
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
          const { text, type } = getStagToastMessage(nextStage);
          showToast(text, type);
          // Auto-navigate after delivery — 3s gives time to see success state
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
      setProblemFeedback({
        text: "Muammoni kamida 5 ta belgi bilan yozing.",
        tone: 'error',
      });
      return;
    }

    reportProblemMutation.mutate(
      { id: order.id, text },
      {
        onSuccess: () => {
          setProblemDraft('');
          setProblemFeedback({
            text: 'Muammo operatorga yuborildi.',
            tone: 'success',
          });

          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
        },
        onError: (mutationError) => {
          setProblemFeedback({
            text: mutationError instanceof Error ? mutationError.message : "Muammoni yuborib bo'lmadi",
            tone: 'error',
          });
        },
      },
    );
  };

  const isEtaLive = currentState === 'ACCEPTED' || currentState === 'PICKED_UP' || currentState === 'DELIVERING';

  // Disable follow mode when user manually pans the map
  const handleMapInteraction = useCallback(() => {
    setFollowMode(false);
  }, []);

  // Open the active destination in Yandex Maps (redirects to Yandex Navigator app if installed)
  const openExternalNavigation = () => {
    const target = currentTarget;
    const label = currentState === 'ACCEPTED' || currentState === 'ARRIVED'
      ? 'Restoran'
      : order?.customerAddress?.label || 'Mijoz manzili';
    const url = `https://yandex.uz/maps/?rtext=~${target.lat},${target.lng}&rtt=auto&text=${encodeURIComponent(label)}`;
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950 font-sans text-white">
      <div className="absolute inset-0 z-0">
        <CourierMapView
          pickup={restaurantPos}
          destination={customerPos}
          courierPos={courierPos}
          routeFrom={courierPos}
          routeTo={currentTarget}
          height="100%"
          className="rounded-none border-0 shadow-none"
          followMode={followMode}
          onMapInteraction={handleMapInteraction}
          onRouteInfoChange={setRouteInfo}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.1),transparent_25%),linear-gradient(180deg,rgba(2,6,23,0.14)_0%,rgba(2,6,23,0.28)_35%,rgba(2,6,23,0.76)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-slate-950/24" />
      </div>

      {/* ── Top overlay: back + order info card ──────────────────────── */}
      <div
        className="absolute left-0 right-0 top-0 z-40 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        {/* GPS error banner — prominent, not buried in description */}
        {geolocationError && (
          <div className="mb-2 flex items-center gap-2 rounded-[18px] border border-red-400/30 bg-red-500/20 px-4 py-2.5 backdrop-blur-xl animate-in slide-in-from-top duration-300">
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-400 animate-pulse" />
            <p className="text-[12px] font-bold text-red-200">{geolocationError}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Back → orders list */}
          <button
            onClick={() => navigate('/courier/orders')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/72 text-white shadow-[0_12px_32px_rgba(2,6,23,0.5)] backdrop-blur-xl transition-transform active:scale-95"
          >
            <ArrowLeft size={19} />
          </button>

          {/* Compact order info */}
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-slate-950/72 px-4 py-3 shadow-[0_12px_32px_rgba(2,6,23,0.5)] backdrop-blur-xl">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                {routeMeta.title}
              </p>
              <p className="mt-0.5 truncate text-[15px] font-black text-white">
                #{order.orderNumber} · {order.customerName || 'Mijoz'}
              </p>
            </div>
            <div className={`shrink-0 rounded-[14px] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${stageMeta.badgeClassDark}`}>
              {stageMeta.label}
            </div>
          </div>
        </div>

        {/* ── Map action row: re-center + external navigator ─────────── */}
        <div className="mt-3 flex items-center justify-end gap-2">
          {/* Re-center button — only shown when user has panned away */}
          {!followMode && liveCourierPos && (
            <button
              type="button"
              onClick={() => setFollowMode(true)}
              className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-slate-950/72 px-3.5 text-[11px] font-black text-white shadow-[0_12px_32px_rgba(2,6,23,0.5)] backdrop-blur-xl transition-transform active:scale-95 animate-in fade-in duration-200"
            >
              <Crosshair size={15} className="text-amber-300" />
              <span>Mening joylashuvim</span>
            </button>
          )}

          {/* Open in Yandex Maps / Navigator */}
          <button
            type="button"
            onClick={openExternalNavigation}
            className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-slate-950/72 px-3.5 text-[11px] font-black text-white shadow-[0_12px_32px_rgba(2,6,23,0.5)] backdrop-blur-xl transition-transform active:scale-95"
          >
            <ExternalLink size={15} className="text-sky-300" />
            <span>Navigatorda</span>
          </button>
        </div>
      </div>

      {/* ── Route info panel (only when bottom panel collapsed) ───────── */}
      {!isPanelExpanded && (
        <div className="animate-in slide-in-from-top duration-700">
          <RouteInfoPanel
            title={routeMeta.title}
            subtitle={routeMeta.description}
            fromLabel={routeMeta.fromLabel}
            toLabel={routeMeta.toLabel}
            stageLabel={stageMeta.label}
            distance={displayRouteInfo.distance || formatRouteDistance(remainingMetrics.distanceKm)}
            eta={displayRouteInfo.eta || formatEtaMinutes(remainingMetrics.etaMinutes)}
            distanceLabel="Qolgan masofa"
            etaLabel="Qolgan ETA"
            isEtaLive={isEtaLive}
          />
        </div>
      )}

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
                if (problemFeedback) {
                  setProblemFeedback(null);
                }
              }}
              onSubmit={handleProblemSubmit}
              isSubmitting={reportProblemMutation.isPending}
              theme="dark"
              helperText="Mijoz bilan bog'lana olmasangiz yoki manzil topilmasa shu yerdan yozing."
              feedbackText={problemFeedback?.text || null}
              feedbackTone={problemFeedback?.tone || 'neutral'}
            />
          ) : null
        }
        onExpandedChange={setIsPanelExpanded}
        isUpdating={updateStageMutation.isPending}
        canCall={Boolean(order.customerPhone)}
        routeTitle={routeMeta.title}
        routeDescription={geolocationError ? geolocationError : routeMeta.description}
        pickupLabel={DEFAULT_RESTAURANT_LOCATION.name}
        destinationLabel={order.customerAddress?.label || 'Mijoz manzili'}
        distance={displayRouteInfo.distance || formatRouteDistance(remainingMetrics.distanceKm)}
        eta={displayRouteInfo.eta || formatEtaMinutes(remainingMetrics.etaMinutes)}
        distanceLabel="Qolgan masofa"
        etaLabel="Qolgan ETA"
        isEtaLive={isEtaLive}
      />
    </div>
  );
};

export default CourierMapPage;
