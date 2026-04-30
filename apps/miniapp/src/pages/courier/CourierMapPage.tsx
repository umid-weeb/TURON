import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { DeliveryStage } from '../../data/types';
import { CourierMapView } from '../../components/courier/CourierMapView';
import CourierNavigationPanel, { type RouteAlternative } from '../../components/courier/CourierNavigationPanel';
import { DeliveryCompletedPanel } from '../../components/courier/DeliveryCompletedPanel';
import { BottomPanel as CourierMapBottomPanel } from '../../components/CourierMap/BottomPanel';
import { OrderChatPanel } from '../../components/chat/OrderChatPanel';
import type { RouteInfo, RouteStep } from '../../features/maps/MapProvider';
import {
  CourierProblemReporter,
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
import { DEFAULT_RESTAURANT_LOCATION } from '../../features/maps/restaurant';
import { useGPS } from '../../hooks/useGPS';
import { useCompass } from '../../hooks/useCompass';
import { useCourierNavigation } from '../../hooks/useCourierNavigation';
import { useCourierStore } from '../../store/courierStore';
import { api } from '../../lib/api';
import { initiateCall } from '../../lib/callUtils';
import {
  getDeliveryRouteMeta,
  getDeliveryStageMeta,
  getDeliveryStateKey,
} from '../../features/courier/deliveryStage';
import {
  getOptimalCameraConfig,
  type CameraConfig,
} from '../../features/maps/mapCameraStrategy';
import {
  getAdvancedCameraConfig,
  create3DCourierIcon,
} from '../../features/courier/courierHeadingTracking';

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

function mapServerStageToCourierPanelStage(stage: DeliveryStage): 1 | 2 | 3 {
  switch (stage) {
    case DeliveryStage.PICKED_UP:
    case DeliveryStage.DELIVERING:
    case DeliveryStage.ARRIVED_AT_DESTINATION:
      return 2;
    case DeliveryStage.DELIVERED:
      return 3;
    default:
      return 1;
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

  // ── New hooks: GPS + Compass → courierStore ───────────────────────────────
  const { error: geolocationError } = useGPS();
  const { requestPermission: requestCompassPermission, compassPermission } = useCompass();

  // ── Zustand store reads ────────────────────────────────────────────────────
  const storeCoords     = useCourierStore((s) => s.coords);
  const smoothedHeading = useCourierStore((s) => s.smoothedHeading);
  const panelStage      = useCourierStore((s) => s.deliveryStage);
  const setPanelStage   = useCourierStore((s) => s.setDeliveryStage);
  const setStoreOrderInfo = useCourierStore((s) => s.setOrderInfo);
  const setStoreRouteInfo = useCourierStore((s) => s.setRouteInfo);
  const setStoreRouteSteps = useCourierStore((s) => s.setRouteSteps);
  const storeCurrentStepIndex = useCourierStore((s) => s.currentStepIndex);
  const isOffRoute = useCourierStore((s) => s.isOffRoute);

  // Convert [lon, lat] → {lat, lng} for business logic (haversine, heartbeat, etc.)
  const liveCourierPos: { lat: number; lng: number } | null = storeCoords
    ? { lat: storeCoords[1], lng: storeCoords[0] }
    : null;

  // ── UI state — ALL hooks before any conditional return ─────────────────────
  const [courierIconSvg, setCourierIconSvg]    = useState<string>(''); // 3D pyramid SVG
  const [cameraConfig, setCameraConfig]         = useState<CameraConfig>({ tilt: 0, zoom: 15, updateFreqMs: 5000 });
  const [followMode, setFollowMode]             = useState(false);
  const [mapReady, setMapReady]                 = useState(false);
  const [routeInfo, setRouteInfo]               = useState<RouteInfo | null>(null);
  const [currentStep, setCurrentStep]           = useState<RouteStep | null>(null);
  const [isProblemSheetOpen, setProblemSheetOpen] = useState(false);
  const [problemDraft, setProblemDraft]         = useState('');
  const [problemFeedback, setProblemFeedback]   = useState<{
    text: string;
    tone: 'success' | 'error' | 'neutral';
  } | null>(null);
  const [isChatOpen, setIsChatOpen]             = useState(false);
  const [copied, setCopied]                     = useState(false);
  const [selectedRouteId, setSelectedRouteId]   = useState<string | undefined>(undefined);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const lastHeartbeatRef        = useRef('');
  const previousCourierPosRef   = useRef<{ lat: number; lng: number } | null>(null);
  const approachingNotifiedRef  = useRef(false);
  const copiedTimerRef          = useRef<number | null>(null);
  const followModeTimerRef      = useRef<number | null>(null);
  const warmupStartedAtRef      = useRef<number | null>(null);
  const autoFollowDisarmedRef   = useRef(false);
  // headingAnimationRef kept for cleanup safety (interval no longer started here)

  // ── Reset follow mode + warmup state when order changes ────────────────────
  useEffect(() => {
    setFollowMode(false);
    setMapReady(false);
    warmupStartedAtRef.current = Date.now(); // screen opened for this order
    autoFollowDisarmedRef.current = false;
    if (followModeTimerRef.current) {
      window.clearTimeout(followModeTimerRef.current);
      followModeTimerRef.current = null;
    }
  }, [order?.id]);

  // ── Auto-enable follow mode after 3s warmup, once map is ready ─────────────
  useEffect(() => {
    if (!order?.id) return;
    if (!mapReady) return;
    if (followMode) return;
    if (autoFollowDisarmedRef.current) return;

    const startedAt = warmupStartedAtRef.current ?? Date.now();
    warmupStartedAtRef.current = startedAt;
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, 3000 - elapsed);

    if (followModeTimerRef.current) {
      window.clearTimeout(followModeTimerRef.current);
      followModeTimerRef.current = null;
    }

    followModeTimerRef.current = window.setTimeout(() => {
      // Re-check guards at fire time
      if (!autoFollowDisarmedRef.current) setFollowMode(true);
    }, remaining);

    return () => {
      if (followModeTimerRef.current) {
        window.clearTimeout(followModeTimerRef.current);
        followModeTimerRef.current = null;
      }
    };
  }, [order?.id, mapReady, followMode]);

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

  useEffect(() => {
    setPanelStage(mapServerStageToCourierPanelStage(currentStage));
  }, [currentStage, setPanelStage]);

  useEffect(() => {
    if (!order) return;

    setStoreOrderInfo({
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderItems: order.items.map((item) => ({
        id: item.id || item.menuItemId || item.name,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
      })),
      restaurantName: order.restaurantName || DEFAULT_RESTAURANT_LOCATION.name,
      restaurantAddress: order.restaurantAddress || "Yangi Sergeli ko'chasi, 11",
      restaurantPhone: order.restaurantPhone || '',
      customerName: order.customerName || 'Mijoz',
      customerAddress: order.customerAddress?.addressText || "Manzil ko'rsatilmagan",
      customerPhone: order.customerPhone || '',
      restaurantCoords: [restaurantPos.lng, restaurantPos.lat],
      customerCoords: [customerPos.lng, customerPos.lat],
    });
  }, [customerPos.lat, customerPos.lng, order, restaurantPos.lat, restaurantPos.lng, setStoreOrderInfo]);

  useEffect(() => {
    if (!routeInfo?.distanceMeters || !routeInfo?.etaSeconds) return;

    setStoreRouteInfo(
      routeInfo.distanceMeters,
      routeInfo.etaSeconds,
      (routeInfo.polyline || []).map((point) => [point.lng, point.lat]),
    );
    setStoreRouteSteps(
      (routeInfo.steps ?? []).map((step) => ({
        instruction: step.instruction,
        distanceMeters: step.distanceMeters,
        distanceText: step.distanceText,
        action: step.action ?? 'straight',
        street: step.street,
        // The provider doesn't surface per-step start coords, so we estimate
        // by indexing into the polyline. Good enough for the navigation
        // tracker — it only uses these for distance fall-back math.
        startCoords: [
          routeInfo.polyline?.[0]?.lng ?? 0,
          routeInfo.polyline?.[0]?.lat ?? 0,
        ],
      })),
    );
  }, [routeInfo, setStoreRouteInfo, setStoreRouteSteps]);

  // Track the active maneuver, detect off-route, and speak Uzbek voice
  // prompts. The hook reads coords + steps from the courier store and writes
  // back currentStepIndex / isOffRoute so the UI panel can react.
  useCourierNavigation({ voiceEnabled: true });

  const courierPos    = liveCourierPos ?? trackedCourierPos ?? restaurantPos;
  // heading = smoothedHeading from Zustand (compass primary, GPS fallback — filtered in store)
  const heading       = smoothedHeading > 0 || liveCourierPos ? smoothedHeading : undefined;
  const currentTarget =
    panelStage === 1 ? restaurantPos : customerPos;

  const remainingMetrics = useMemo(
    () => computeRemainingMetrics(currentState, courierPos, currentTarget),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentState, courierPos.lat, courierPos.lng, currentTarget.lat, currentTarget.lng],
  );

  const metricsRouteInfo = useMemo(() => createRouteInfo(remainingMetrics), [remainingMetrics]);
  const displayRouteInfo = routeInfo ?? metricsRouteInfo;
  const routeSteps = routeInfo?.steps ?? [];
  // currentStepIndex is driven by useCourierNavigation (projection of GPS
  // onto polyline). Fall back to the YandexRouteMap-emitted first step so
  // the panel still renders before the first projection completes.
  const currentStepIndex = (() => {
    if (typeof storeCurrentStepIndex === 'number' && storeCurrentStepIndex >= 0) {
      return Math.min(storeCurrentStepIndex, Math.max(routeSteps.length - 1, 0));
    }
    if (currentStep) {
      const idx = routeSteps.findIndex(
        (step) =>
          step.instruction === currentStep.instruction &&
          step.distanceText === currentStep.distanceText &&
          step.action === currentStep.action,
      );
      return idx >= 0 ? idx : 0;
    }
    return 0;
  })();
  const activeStep = routeSteps[currentStepIndex] ?? currentStep ?? routeSteps[0] ?? null;
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

  // Smart camera config should react to route changes, not repaint on a timer.
  useEffect(() => {
    const distanceMeters = remainingMetrics.distanceKm * 1000;
    const optimalConfig = getOptimalCameraConfig({
      distanceMeters,
      speedKmh: liveCourierPos ? 28 : 0,
    });
    setCameraConfig(optimalConfig);
  }, [remainingMetrics.distanceKm, liveCourierPos]);

  // ── 3D courier icon: smoothedHeading (from Zustand) + distance-based scaling ──
  // smoothedHeading already filtered inside courierStore.setCompassHeading /
  // setGpsHeading — no extra animation interval needed here.
  useEffect(() => {
    const distanceMeters = remainingMetrics.distanceKm * 1000;
    const advancedConfig = getAdvancedCameraConfig(
      {
        heading: smoothedHeading,
        lat: liveCourierPos?.lat ?? 0,
        lng: liveCourierPos?.lng ?? 0,
        speed: 20,
      },
      distanceMeters,
    );

    // SVG rotation is handled by the container CSS in YandexRouteMap — pass 0 here
    const svg = create3DCourierIcon(0, advancedConfig.courierIconScale, advancedConfig.courierIconColor);
    setCourierIconSvg(svg);

    setCameraConfig((prev) => ({ ...prev, tilt: advancedConfig.tilt }));
  }, [smoothedHeading, remainingMetrics.distanceKm, liveCourierPos]);

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

  const handleFollowModeChange = useCallback((enabled: boolean) => {
    setFollowMode(enabled);
    if (!enabled) {
      // If the user explicitly turns follow off, do not auto-reenable it.
      autoFollowDisarmedRef.current = true;
      if (followModeTimerRef.current) {
        window.clearTimeout(followModeTimerRef.current);
        followModeTimerRef.current = null;
      }
      return;
    }
    // User turned follow on — re-arm so auto-follow logic can resume if needed.
    autoFollowDisarmedRef.current = false;
  }, []);

  // GPS and compass are now managed by useGPS() and useCompass() hooks above.
  // They write directly to courierStore — no local GPS useEffect needed here.

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
    initiateCall(order.customerPhone, order.customerName || 'mijoz');
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
          setProblemSheetOpen(false);
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

  // ── Reroute handling ───────────────────────────────────────────────────────
  const [rerouteRequestedAt, setRerouteRequestedAt] = useState<number | null>(null);

  useEffect(() => {
    // Re-routing is handled by LiveMultiRouteTracker.updateOrigin() on every
    // GPS tick (see YandexRouteMap), so the React side only needs to push
    // the location to the server for live tracking — no store mutations.
    if (isOffRoute && (!rerouteRequestedAt || Date.now() - rerouteRequestedAt > 12_000)) {
      setRerouteRequestedAt(Date.now());
      if (liveCourierPos) {
        updateLocationMutation.mutate({
          id: orderId,
          latitude: liveCourierPos.lat,
          longitude: liveCourierPos.lng,
        });
      }
    }
  }, [isOffRoute, rerouteRequestedAt, liveCourierPos, orderId, updateLocationMutation]);

  // ── Render ─────────────────────────────────────────────────────────────────
  
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
          tilt={cameraConfig.tilt}
          courierIconSvg={courierIconSvg}
          onMapReady={() => setMapReady(true)}
          onRouteInfoChange={setRouteInfo}
          onNextStepChange={setCurrentStep}
          onMapInteraction={() => {
            setFollowMode(false);
            autoFollowDisarmedRef.current = true;
            if (followModeTimerRef.current) {
              window.clearTimeout(followModeTimerRef.current);
              followModeTimerRef.current = null;
            }
          }}
          onFollowModeChange={handleFollowModeChange}
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
          className="courier-map-fab flex h-12 w-12 items-center justify-center rounded-[18px] transition-transform active:scale-95"
        >
          <ArrowLeft size={19} />
        </button>
      </div>

      {/* ── iOS compass permission button ───────────────────────────────── */}
      {compassPermission === 'unknown' && (
        <div className="pointer-events-auto absolute bottom-44 left-1/2 z-50 -translate-x-1/2">
          <button
            type="button"
            onClick={() => {
              void requestCompassPermission();
              // iOS requires a user gesture before speechSynthesis can speak.
              // Fire a silent priming utterance inside the click handler so
              // the voice navigation hook can actually announce later.
              try {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  const primer = new SpeechSynthesisUtterance(' ');
                  primer.volume = 0;
                  window.speechSynthesis.speak(primer);
                }
              } catch {
                /* ignore */
              }
            }}
            className="courier-map-fab courier-map-fab--accent flex items-center gap-2 rounded-[20px] px-5 py-3 text-sm font-black transition-transform active:scale-95"
          >
            <span>Navigatsiyani boshlash</span>
          </button>
        </div>
      )}


      {/* ── Bottom action panel ──────────────────────────────────────────── */}
      {activeStep || routes.length > 1 ? (
        <div
          className="pointer-events-none absolute left-4 top-0 z-30 px-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 76px)' }}
        >
          <div className="pointer-events-auto flex w-fit flex-col gap-2">
            {isOffRoute ? (
              <div className="flex items-center gap-2 rounded-full bg-amber-500/95 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950 shadow-lg">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-900" />
                Yo'l qayta hisoblanmoqda
              </div>
            ) : null}
            <CourierNavigationPanel
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              currentStep={activeStep}
              allSteps={routeSteps}
              currentStepIndex={currentStepIndex}
              distance={displayRouteInfo.distance}
              eta={displayRouteInfo.eta}
            />
          </div>
        </div>
      ) : null}

      <CourierMapBottomPanel
        onChat={() => setIsChatOpen(true)}
        onProblem={() => setProblemSheetOpen(true)}
      />

      {isProblemSheetOpen ? (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/55">
          <button
            type="button"
            aria-label="Muammo oynasini yopish"
            className="flex-1"
            onClick={() => setProblemSheetOpen(false)}
          />
          <div className="courier-dark-sheet rounded-t-[24px] p-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            <div className="mx-auto mb-4 h-1 w-9 rounded-sm bg-white/15" />
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
          </div>
        </div>
      ) : null}

      {isChatOpen && orderId ? (
        <OrderChatPanel
          orderId={orderId}
          role="courier"
          otherPartyPhone={order?.customerPhone ?? null}
          onClose={() => setIsChatOpen(false)}
          theme="dark"
        />
      ) : null}
    </div>
  );
};

export default CourierMapPage;
