import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { DeliveryStage } from '../../data/types';
import { CourierMapView } from '../../components/courier/CourierMapView';
import CourierNavigationPanel, { type RouteAlternative } from '../../components/courier/CourierNavigationPanel';
import { DeliveryCompletedPanel } from '../../components/courier/DeliveryCompletedPanel';
import type { RouteInfo, RouteStep } from '../../features/maps/MapProvider';
import {
  CourierProblemReporter,
  DeliveryBottomPanel,
} from '../../components/courier/CourierComponents';
import { ErrorStateCard } from '../../components/ui/FeedbackStates';
import { useNextAvailableOrder } from '../../hooks/queries/useNextAvailableOrder';
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
import { useDeviceHeading } from '../../features/maps/deviceHeading';
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
  const nextOrderMutation = useNextAvailableOrder({
    onSuccess: (nextOrder) => {
      showToast(`Yangi buyurtma #${nextOrder.orderNumber}!`, 'success');
      navigate(`/courier/map/${nextOrder.id}`);
    },
    onError: (error) => {
      showToast(error.message || 'Keyingi buyurtma topilmadi', 'error');
    },
  });

  // ── UI state — ALL hooks before any conditional return ─────────────────────
  const [liveCourierPos, setLiveCourierPos]     = useState<{ lat: number; lng: number } | null>(null);
  const [movementHeading, setMovementHeading]   = useState<number | undefined>(undefined);
  const tilt                                    = 40; // 0-60 degrees, closer view
  const [followMode, setFollowMode]             = useState(false); // Auto-enable after 4s
  const [routeInfo, setRouteInfo]               = useState<RouteInfo | null>(null);
  const [currentStep, setCurrentStep]           = useState<RouteStep | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [problemDraft, setProblemDraft]         = useState('');
  const [problemFeedback, setProblemFeedback]   = useState<{
    text: string;
    tone: 'success' | 'error' | 'neutral';
  } | null>(null);
  const [copied, setCopied]                     = useState(false);
  const [selectedRouteId, setSelectedRouteId]   = useState<string | undefined>(undefined);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const lastHeartbeatRef        = useRef('');
  const previousCourierPosRef   = useRef<{ lat: number; lng: number } | null>(null);
  const approachingNotifiedRef  = useRef(false);
  const copiedTimerRef          = useRef<number | null>(null);
  const followModeTimerRef      = useRef<number | null>(null);
  const sensorHeading = useDeviceHeading(Boolean(order?.id));

  // ── Auto-enable follow mode after 4 seconds ────────────────────────────────
  useEffect(() => {
    if (!order?.id || followMode) return; // Already enabled or no order
    
    // Enable follow mode after 4 seconds for safer driving
    followModeTimerRef.current = window.setTimeout(() => {
      setFollowMode(true);
    }, 4000);

    return () => {
      if (followModeTimerRef.current) {
        window.clearTimeout(followModeTimerRef.current);
        followModeTimerRef.current = null;
      }
    };
  }, [order?.id, followMode]);

  // ── Reset follow mode when order changes ───────────────────────────────────
  useEffect(() => {
    setFollowMode(false);
  }, [order?.id]);

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
  const heading       = sensorHeading ?? movementHeading;
  const currentTarget =
    currentState === 'ACCEPTED' || currentState === 'ARRIVED' ? restaurantPos : customerPos;

  const remainingMetrics = useMemo(
    () => computeRemainingMetrics(currentState, courierPos, currentTarget),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentState, courierPos.lat, courierPos.lng, currentTarget.lat, currentTarget.lng],
  );

  const metricsRouteInfo = useMemo(() => createRouteInfo(remainingMetrics), [remainingMetrics]);
  const displayRouteInfo = routeInfo ?? metricsRouteInfo;
  const routeSteps = routeInfo?.steps ?? [];
  const activeStep = currentStep ?? routeSteps[0] ?? null;
  const routes = useMemo<RouteAlternative[]>(() => {
    if (!displayRouteInfo.distance || !displayRouteInfo.eta) {
      return [];
    }

    return [
      {
        id: 'primary',
        distance: displayRouteInfo.distance,
        eta: displayRouteInfo.eta,
        instruction: routeSteps[0]?.instruction || routeMeta.title,
        routeIndex: 0,
        isRecommended: true,
      },
    ];
  }, [displayRouteInfo.distance, displayRouteInfo.eta, routeMeta.title, routeSteps]);

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
    let lastPos: { lat: number; lng: number } | null = null;
    const watchId = watchBrowserGeolocation(
      (location) => {
        setGeolocationError(null);
        if (typeof location.heading === 'number' && Number.isFinite(location.heading)) {
          setMovementHeading(location.heading);
        } else if (lastPos) {
          const derivedHeading = getHeadingDegrees(lastPos, location.pin);
          if (derivedHeading !== undefined) {
            setMovementHeading(derivedHeading);
          }
        }
        lastPos = location.pin;
        setLiveCourierPos(location.pin);
      },
      (watchError) => setGeolocationError(getUserGeolocationErrorMessage(watchError)),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 },
    );
    return () => stopWatchingBrowserGeolocation(watchId);
  }, [order?.id]);

  // ── Auto-fetch and select routes ────────────────────────────────────────────
  useEffect(() => {
    if (routes.length === 0) {
      if (selectedRouteId) {
        setSelectedRouteId(undefined);
    
      }
      return;
      /*
      { id: '1', distance: displayRouteInfo.distance || '5 km', eta: displayRouteInfo.eta || '12 min', instruction: 'Tez marshrutи', routeIndex: 0, isRecommended: true },
      */
    }
    if (!selectedRouteId) {
      setSelectedRouteId(routes[0].id);
      return;
    
    }
    if (!routes.some((route) => route.id === selectedRouteId)) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  // ── Location heartbeat to server ───────────────────────────────────────────
  useEffect(() => {
    if (!order?.id || !liveCourierPos || !canPublishLiveLocation) return;

    const latitude            = Number(liveCourierPos.lat.toFixed(6));
    const longitude           = Number(liveCourierPos.lng.toFixed(6));
    const remainingDistanceKm = Number(remainingMetrics.distanceKm.toFixed(2));
    const remainingEtaMinutes = remainingMetrics.etaMinutes;
    const reportedHeading     =
      heading ??
      (previousCourierPosRef.current
        ? getHeadingDegrees(previousCourierPosRef.current, liveCourierPos)
        : undefined);
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
      heading: reportedHeading,
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
    heading,
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
      if (followModeTimerRef.current) window.clearTimeout(followModeTimerRef.current);
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
          // Delivery completed panel will show automatically via state change
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
  
  // Show delivery completed panel when order is delivered
  if (currentStage === DeliveryStage.DELIVERED) {
    return (
      <DeliveryCompletedPanel
        order={order}
        metrics={remainingMetrics}
        onNextOrder={() => nextOrderMutation.mutate()}
        isLoadingNext={nextOrderMutation.isPending}
      />
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950 font-sans text-white">

      {/* ── Full-screen map (gesture-enabled) ────────────────────────────── */}
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
          heading={heading}
          tilt={tilt}
          onRouteInfoChange={setRouteInfo}
          onNextStepChange={setCurrentStep}
          onMapInteraction={() => {
            setFollowMode(false);
          }}
          onFollowModeChange={setFollowMode}
        />
        {/* Subtle bottom gradient for panel legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-950/70 to-transparent" />
      </div>

      {/* ── Floating back button (top-left only) ────────────────────────── */}
      <div
        className="absolute left-0 top-0 z-40 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/courier/orders')}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-950/72 text-white shadow-[0_8px_24px_rgba(2,6,23,0.5)] backdrop-blur-xl transition-transform active:scale-95"
        >
          <ArrowLeft size={19} />
        </button>
      </div>

      {/* ── Bottom action panel ──────────────────────────────────────────── */}
      {activeStep || routes.length > 1 ? (
        <div
          className="pointer-events-none absolute left-4 top-0 z-30 px-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 68px)' }}
        >
          <div className="pointer-events-auto w-fit">
            <CourierNavigationPanel
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              currentStep={activeStep}
              allSteps={routeSteps}
              currentStepIndex={0}
              distance={displayRouteInfo.distance}
              eta={displayRouteInfo.eta}
            />
          </div>
        </div>
      ) : null}

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
          // After early return check, currentStage can't be DELIVERED
          (
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
          )
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
