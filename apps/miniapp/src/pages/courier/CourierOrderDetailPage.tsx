import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  Package,
  Phone,
  Send,
} from 'lucide-react';
import { DeliveryStage } from '../../data/types';
import { CourierMapView } from '../../components/courier/CourierMapView';
import { getCourierPaymentLabel } from '../../components/courier/CourierComponents';
import { ErrorStateCard } from '../../components/ui/FeedbackStates';
import {
  useCourierOrderDetails,
  useReportCourierProblem,
  useUpdateCourierOrderStage,
} from '../../hooks/queries/useOrders';
import { estimateRouteInfo } from '../../features/maps/route';
import { DEFAULT_RESTAURANT_LOCATION } from '../../features/maps/restaurant';
import {
  DELIVERY_STAGE_FLOW,
  getCourierStageProgressIndex,
  getDeliveryStageAction,
  getDeliveryRouteMeta,
} from '../../features/courier/deliveryStage';

// ─── Stage progress dots ──────────────────────────────────────────────────────
function StageProgress({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {DELIVERY_STAGE_FLOW.map((step, i) => {
        const done = i <= currentIndex;
        const active = i === currentIndex;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  done
                    ? active
                      ? 'bg-amber-500 ring-2 ring-amber-200'
                      : 'bg-emerald-500'
                    : 'bg-slate-200'
                }`}
              />
              <p className={`text-[9px] font-bold ${done ? 'text-slate-600' : 'text-slate-300'}`}>
                {step.title}
              </p>
            </div>
            {i < DELIVERY_STAGE_FLOW.length - 1 && (
              <div
                className={`mb-3 h-px flex-1 ${i < currentIndex ? 'bg-emerald-400' : 'bg-slate-200'}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const CourierOrderDetailPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError, error, refetch } = useCourierOrderDetails(orderId);
  const updateStageMutation = useUpdateCourierOrderStage();
  const reportProblemMutation = useReportCourierProblem();
  const [problemDraft, setProblemDraft] = React.useState('');
  const [problemSent, setProblemSent] = React.useState(false);
  const [problemError, setProblemError] = React.useState<string | null>(null);
  const [confirmingDelivered, setConfirmingDelivered] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <p className="text-[13px] font-bold text-slate-400">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorStateCard
        title="Buyurtma yuklanmadi"
        message={(error as Error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <p className="text-[17px] font-black text-slate-900">Buyurtma topilmadi</p>
        <button
          type="button"
          onClick={() => navigate('/courier/orders')}
          className="mt-4 text-[13px] font-bold text-indigo-600"
        >
          Ro'yxatga qaytish
        </button>
      </div>
    );
  }

  const currentStage = order.deliveryStage ?? DeliveryStage.IDLE;
  const primaryAction = getDeliveryStageAction(currentStage);
  const routeMeta = getDeliveryRouteMeta(currentStage);
  const stageIndex = getCourierStageProgressIndex(currentStage);
  const isDelivered = currentStage === DeliveryStage.DELIVERED;
  const isLastAction = primaryAction.next === DeliveryStage.DELIVERED;

  const pickup = {
    lat: order.pickupLat ?? DEFAULT_RESTAURANT_LOCATION.pin.lat,
    lng: order.pickupLng ?? DEFAULT_RESTAURANT_LOCATION.pin.lng,
  };
  const destination = {
    lat: order.destinationLat ?? order.customerAddress?.latitude ?? pickup.lat,
    lng: order.destinationLng ?? order.customerAddress?.longitude ?? pickup.lng,
  };
  const courierPin = order.tracking?.courierLocation
    ? {
        lat: order.tracking.courierLocation.latitude,
        lng: order.tracking.courierLocation.longitude,
      }
    : pickup;
  const routeTo =
    currentStage === DeliveryStage.IDLE ||
    currentStage === DeliveryStage.GOING_TO_RESTAURANT ||
    currentStage === DeliveryStage.ARRIVED_AT_RESTAURANT
      ? pickup
      : destination;
  const routeInfo = estimateRouteInfo(courierPin, routeTo, {
    minimumDistanceKm: 0.1,
    minimumEtaMinutes: 1,
  });

  const handleStageAdvance = () => {
    if (!primaryAction.next || updateStageMutation.isPending) return;

    // If delivering → delivered, require a second tap to confirm
    if (isLastAction && !confirmingDelivered) {
      setConfirmingDelivered(true);
      return;
    }

    setConfirmingDelivered(false);
    updateStageMutation.mutate(
      { id: order.id, stage: primaryAction.next },
      {
        onSuccess: () => {
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
          }
          if (primaryAction.next === DeliveryStage.DELIVERED) {
            window.setTimeout(() => navigate('/courier/orders'), 1200);
          }
        },
      },
    );
  };

  const handleProblemSubmit = () => {
    const text = problemDraft.trim();
    if (text.length < 5) {
      setProblemError("Kamida 5 ta harf yozing");
      return;
    }
    setProblemError(null);
    reportProblemMutation.mutate(
      { id: order.id, text },
      {
        onSuccess: () => {
          setProblemDraft('');
          setProblemSent(true);
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
        },
        onError: (err) => {
          setProblemError(err instanceof Error ? err.message : "Yuborib bo'lmadi");
        },
      },
    );
  };

  return (
    <div className="space-y-3 px-4 py-5 pb-32">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/courier/orders')}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="text-center">
          <p className="text-[19px] font-black text-slate-900">#{order.orderNumber}</p>
          <p className="text-[11px] font-bold text-slate-400">{order.customerName || 'Buyurtma'}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/courier/map/${order.id}`)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 shadow-md active:scale-95 transition-transform"
        >
          <MapPin size={19} className="text-slate-900" />
        </button>
      </div>

      {/* ── Stage progress ──────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-4">
        <StageProgress currentIndex={stageIndex} />
      </div>

      {/* ── Primary action button ───────────────────────────────────── */}
      {!isDelivered ? (
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Keyingi qadam
          </p>
          <p className="mb-3 text-[15px] font-bold text-slate-700 leading-snug">
            {routeMeta.description}
          </p>

          {confirmingDelivered ? (
            <div className="space-y-2">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-[14px] font-black text-amber-800">
                  Buyurtmani haqiqatan topshirdingizmi?
                </p>
                <p className="mt-1 text-[12px] text-amber-700">
                  Bu amaliyotni bekor qilib bo'lmaydi.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelivered(false)}
                  className="h-14 rounded-2xl border border-slate-200 bg-white text-[14px] font-black text-slate-700 active:scale-95 transition-transform"
                >
                  Yo'q
                </button>
                <button
                  type="button"
                  onClick={handleStageAdvance}
                  disabled={updateStageMutation.isPending}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[14px] font-black text-white shadow-lg shadow-emerald-200 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {updateStageMutation.isPending ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      <span>Ha, topshirdim</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStageAdvance}
              disabled={updateStageMutation.isPending}
              className={`flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-[16px] font-black shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50 ${
                isLastAction
                  ? 'bg-emerald-500 text-white shadow-emerald-200'
                  : 'bg-amber-400 text-slate-900 shadow-amber-200'
              }`}
            >
              {updateStageMutation.isPending ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <>
                  <span>{primaryAction.label}</span>
                  <ChevronRight size={22} />
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={28} className="shrink-0 text-emerald-600" />
            <div>
              <p className="text-[16px] font-black text-emerald-900">Buyurtma topshirildi</p>
              <p className="text-[13px] text-emerald-700">Muvaffaqiyatli yakunlandi</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Map + route info ────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-black text-slate-900">{routeMeta.title}</p>
            <p className="text-[11px] text-slate-400">
              {routeInfo.distance} · ~{routeInfo.eta}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/courier/map/${order.id}`)}
            className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[12px] font-black text-amber-700 active:scale-95 transition-transform"
          >
            <MapPin size={13} />
            Xarita
          </button>
        </div>
        <CourierMapView
          pickup={pickup}
          destination={destination}
          courierPos={courierPin}
          routeFrom={courierPin}
          routeTo={routeTo}
          height="200px"
          className="rounded-none border-0 shadow-none"
        />
      </div>

      {/* ── Customer info ───────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Mijoz
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[17px] font-black text-slate-900">{order.customerName || 'Mijoz'}</p>
            {order.customerAddress?.addressText && (
              <div className="mt-1.5 flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <p className="text-[13px] leading-snug text-slate-500">
                  {order.customerAddress.addressText}
                </p>
              </div>
            )}
          </div>
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 active:scale-95 transition-transform"
            >
              <Phone size={20} />
            </a>
          )}
        </div>

        {order.note && (
          <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600">Izoh</p>
            <p className="mt-1 text-[13px] leading-snug text-amber-800">{order.note}</p>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5">
          <p className="text-[12px] font-bold text-slate-500">To'lov:</p>
          <p className="text-[13px] font-black text-slate-900">
            {getCourierPaymentLabel(order.paymentMethod)}
          </p>
          <p className="ml-auto text-[13px] font-black text-slate-900">
            {order.total.toLocaleString()} so'm
          </p>
        </div>
      </div>

      {/* ── Order items ─────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Buyurtma tarkibi · {order.items.length} ta
        </p>
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[12px] font-black text-slate-600 shadow-sm">
                <Package size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-black text-slate-900">{item.name}</p>
                <p className="text-[11px] text-slate-400">{item.price.toLocaleString()} so'm</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-400">{item.quantity}x</p>
                <p className="text-[13px] font-black text-slate-900">
                  {(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem report ──────────────────────────────────────────── */}
      {!isDelivered && (
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <p className="text-[13px] font-black text-slate-700">Muammo bormi?</p>
          </div>
          <p className="mb-3 text-[12px] text-slate-400">
            Manzil topilmasa yoki mijoz bilan aloqa bo'lmasa yozing.
          </p>

          {problemSent ? (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <p className="text-[13px] font-bold text-emerald-700">Muammo operatorga yuborildi</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={problemDraft}
                onChange={(e) => {
                  setProblemDraft(e.target.value);
                  if (problemError) setProblemError(null);
                }}
                placeholder="Muammoni yozing..."
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleProblemSubmit}
                disabled={reportProblemMutation.isPending || problemDraft.trim().length < 5}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white active:scale-95 transition-transform disabled:opacity-40"
              >
                {reportProblemMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          )}

          {problemError && (
            <p className="mt-2 text-[12px] text-red-500">{problemError}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CourierOrderDetailPage;
