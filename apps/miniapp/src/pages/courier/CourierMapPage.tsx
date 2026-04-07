import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, Navigation, Store } from 'lucide-react';
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

const CourierMapPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError, error, refetch } = useCourierOrderDetails(orderId);
  const updateStageMutation = useUpdateCourierOrderStage();
  const reportProblemMutation = useReportCourierProblem();
  const updateLocationMutation = useUpdateCourierLocation();
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [liveCourierPos, setLiveCourierPos] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; eta: string } | null>(null);
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

  // ── Proximity calculations (derived, no extra state) ──────────────────────
  const distToRestaurant = distanceMeters(courierPos, restaurantPos);
  const distToCustomer   = distanceMeters(courierPos, customerPos);

  const nearRestaurant =
    distToRestaurant <= 50 &&
    (currentStage === DeliveryStage.GOING_TO_RESTAURANT || currentStage === DeliveryStage.IDLE);

  const nearCustomer =
    distToCustomer <= 50 &&
    (currentStage === DeliveryStage.DELIVERING || currentStage === DeliveryStage.ARRIVED_AT_DESTINATION);

  const approachingCustomer =
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
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
          }

          if (nextStage === DeliveryStage.DELIVERED) {
            window.setTimeout(() => navigate('/courier/orders'), 1400);
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
          onRouteInfoChange={setRouteInfo}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.1),transparent_25%),linear-gradient(180deg,rgba(2,6,23,0.14)_0%,rgba(2,6,23,0.28)_35%,rgba(2,6,23,0.76)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-slate-950/24" />
      </div>

      <div
        className="absolute left-0 right-0 top-0 z-40 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={() => navigate(`/courier/order/${order.id}`)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/72 text-white shadow-[0_18px_44px_rgba(2,6,23,0.45)] backdrop-blur-xl transition-transform active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0 flex-1 rounded-[28px] border border-white/10 bg-slate-950/72 px-5 py-4 shadow-[0_22px_54px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">
                  Courier route
                </p>
                <p className="mt-2 truncate text-lg font-black text-white">#{order.orderNumber}</p>
                <p className="mt-2 truncate text-sm font-semibold text-white/72">
                  {order.customerName || 'Mijoz'}
                </p>
              </div>
              <div className={`shrink-0 rounded-[18px] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${stageMeta.badgeClass}`}>
                {stageMeta.label}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/12 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
                <Store size={12} />
                <span>Restoran</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/12 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-100">
                <Navigation size={12} />
                <span>Kuryer</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-400/12 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-rose-100">
                <MapPin size={12} />
                <span>Mijoz</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isPanelExpanded && (
        <div className="animate-in slide-in-from-top duration-700">
          <RouteInfoPanel
            title={routeMeta.title}
            subtitle={
              geolocationError
                ? `${routeMeta.description} ${geolocationError}`
                : routeMeta.description
            }
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
