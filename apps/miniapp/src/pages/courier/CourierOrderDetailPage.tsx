import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Map,
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

// ─── Stage progress bar ───────────────────────────────────────────────────────
function StageProgress({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex items-center">
      {DELIVERY_STAGE_FLOW.map((step, i) => {
        const done    = i < currentIndex;
        const active  = i === currentIndex;
        const future  = i > currentIndex;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5">
              {/* Circle */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-black transition-colors ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-amber-400 text-slate-900 ring-4 ring-amber-100'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              {/* Label */}
              <p
                className={`text-center text-[10px] font-bold leading-tight ${
                  done ? 'text-emerald-600' : active ? 'text-amber-600' : 'text-slate-300'
                }`}
                style={{ width: 52 }}
              >
                {step.title}
              </p>
            </div>

            {/* Connector line */}
            {i < DELIVERY_STAGE_FLOW.length - 1 && (
              <div
                className={`mb-5 h-0.5 flex-1 rounded-full transition-colors ${
                  i < currentIndex ? 'bg-emerald-400' : 'bg-slate-100'
                }`}
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

  const currentStage  = order.deliveryStage ?? DeliveryStage.IDLE;
  const primaryAction = getDeliveryStageAction(currentStage);
  const routeMeta     = getDeliveryRouteMeta(currentStage);
  const stageIndex    = getCourierStageProgressIndex(currentStage);
  const isDelivered   = currentStage === DeliveryStage.DELIVERED;
  const isLastAction  = primaryAction.next === DeliveryStage.DELIVERED;

  const pickup = {
    lat: order.pickupLat ?? DEFAULT_RESTAURANT_LOCATION.pin.lat,
    lng: order.pickupLng ?? DEFAULT_RESTAURANT_LOCATION.pin.lng,
  };
  const destination = {
    lat: order.destinationLat ?? order.customerAddress?.latitude ?? pickup.lat,
    lng: order.destinationLng ?? order.customerAddress?.longitude ?? pickup.lng,
  };
  const courierPin = order.tracking?.courierLocation
    ? { lat: order.tracking.courierLocation.latitude, lng: order.tracking.courierLocation.longitude }
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
    if (isLastAction && !confirmingDelivered) { setConfirmingDelivered(true); return; }
    setConfirmingDelivered(false);
    updateStageMutation.mutate(
      { id: order.id, stage: primaryAction.next },
      {
        onSuccess: () => {
          window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
          if (primaryAction.next === DeliveryStage.DELIVERED)
            window.setTimeout(() => navigate('/courier/orders'), 1200);
        },
      },
    );
  };

  const handleProblemSubmit = () => {
    const text = problemDraft.trim();
    if (text.length < 5) { setProblemError("Kamida 5 ta harf yozing"); return; }
    setProblemError(null);
    reportProblemMutation.mutate(
      { id: order.id, text },
      {
        onSuccess: () => {
          setProblemDraft('');
          setProblemSent(true);
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        },
        onError: (err) => setProblemError(err instanceof Error ? err.message : "Yuborib bo'lmadi"),
      },
    );
  };

  return (
    <div className="space-y-3 px-4 py-5 pb-32">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/courier/orders')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-slate-200 bg-white shadow-sm active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="text-[20px] font-black text-slate-900">#{order.orderNumber}</p>
          {order.customerName && (
            <p className="text-[12px] text-slate-400 truncate">{order.customerName}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/courier/map/${order.id}`)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-amber-400 shadow-sm active:scale-95 transition-transform"
        >
          <Map size={18} className="text-slate-900" />
        </button>
      </div>

      {/* ── Stage progress ──────────────────────────────────────────── */}
      <div className="rounded-[26px] bg-white border border-slate-100 shadow-sm px-4 pt-4 pb-3">
        <StageProgress currentIndex={stageIndex} />
      </div>

      {/* ── Primary action ──────────────────────────────────────────── */}
      {!isDelivered ? (
        confirmingDelivered ? (
          /* Confirm delivery */
          <div className="rounded-[26px] bg-white border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3.5">
              <p className="text-[15px] font-black text-amber-900">Haqiqatan topshirdingizmi?</p>
              <p className="mt-1 text-[12px] text-amber-700">Bu amaliyotni bekor qilib bo'lmaydi</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelivered(false)}
                className="h-14 rounded-[18px] border border-slate-200 bg-white text-[14px] font-black text-slate-700 active:scale-95 transition-transform"
              >
                Yo'q
              </button>
              <button
                type="button"
                onClick={handleStageAdvance}
                disabled={updateStageMutation.isPending}
                className="flex h-14 items-center justify-center gap-2 rounded-[18px] bg-emerald-500 text-[15px] font-black text-white shadow-lg shadow-emerald-100 active:scale-95 transition-transform disabled:opacity-50"
              >
                {updateStageMutation.isPending
                  ? <Loader2 size={20} className="animate-spin" />
                  : <><CheckCircle2 size={19} /><span>Ha, topshirdim</span></>
                }
              </button>
            </div>
          </div>
        ) : (
          /* Normal advance button */
          <button
            type="button"
            onClick={handleStageAdvance}
            disabled={updateStageMutation.isPending}
            className={`flex h-16 w-full items-center justify-center gap-3 rounded-[26px] text-[17px] font-black shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50 ${
              isLastAction
                ? 'bg-emerald-500 text-white shadow-emerald-100'
                : 'bg-amber-400 text-slate-900 shadow-amber-100'
            }`}
          >
            {updateStageMutation.isPending
              ? <Loader2 size={22} className="animate-spin" />
              : <><span>{primaryAction.label}</span><ChevronRight size={22} /></>
            }
          </button>
        )
      ) : (
        <div className="flex items-center gap-3 rounded-[26px] bg-emerald-50 border border-emerald-200 p-5">
          <CheckCircle2 size={28} className="shrink-0 text-emerald-600" />
          <div>
            <p className="text-[16px] font-black text-emerald-900">Buyurtma topshirildi</p>
            <p className="text-[13px] text-emerald-600">Muvaffaqiyatli yakunlandi</p>
          </div>
        </div>
      )}

      {/* ── Map preview ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-sm">
        {/* Map header */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-[14px] font-black text-slate-900">{routeMeta.title}</p>
            <p className="text-[12px] text-slate-400">{routeInfo.distance} · ~{routeInfo.eta}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/courier/map/${order.id}`)}
            className="flex items-center gap-1.5 rounded-[14px] bg-amber-50 px-3 py-2 text-[12px] font-black text-amber-700 active:scale-95 transition-transform"
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
          height="190px"
          className="rounded-none border-0 shadow-none"
        />
      </div>

      {/* ── Customer card ───────────────────────────────────────────── */}
      <div className="rounded-[26px] bg-white border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Mijoz</p>
            <p className="text-[16px] font-black text-slate-900">{order.customerName || 'Mijoz'}</p>
            {order.customerAddress?.addressText && (
              <p className="mt-1 text-[12px] leading-snug text-slate-500">
                {order.customerAddress.addressText}
              </p>
            )}
          </div>
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-600 active:scale-95 transition-transform"
            >
              <Phone size={20} />
            </a>
          )}
        </div>

        {/* Payment + note row */}
        <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-slate-50 px-3.5 py-2.5">
          <p className="text-[12px] font-bold text-slate-400">To'lov:</p>
          <p className="text-[13px] font-black text-slate-900">{getCourierPaymentLabel(order.paymentMethod)}</p>
          <p className="ml-auto text-[13px] font-black text-slate-900">{order.total.toLocaleString()} so'm</p>
        </div>

        {order.note && (
          <div className="mt-2 rounded-[14px] border border-amber-100 bg-amber-50 px-3.5 py-2.5">
            <p className="text-[11px] font-bold text-amber-600 mb-0.5">Izoh</p>
            <p className="text-[12px] leading-snug text-amber-800">{order.note}</p>
          </div>
        )}
      </div>

      {/* ── Order items ─────────────────────────────────────────────── */}
      <div className="rounded-[26px] bg-white border border-slate-100 shadow-sm p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Buyurtma · {order.items.length} ta mahsulot
        </p>
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="flex items-center gap-3 rounded-[14px] bg-slate-50 px-3.5 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white shadow-sm">
                <Package size={15} className="text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-black text-slate-900">{item.name}</p>
                <p className="text-[11px] text-slate-400">{item.price.toLocaleString()} so'm</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-400">{item.quantity}×</p>
                <p className="text-[13px] font-black text-slate-700">
                  {(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem report ──────────────────────────────────────────── */}
      {!isDelivered && (
        <div className="rounded-[26px] bg-white border border-slate-100 shadow-sm p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-400" />
            <p className="text-[13px] font-black text-slate-700">Muammo bormi?</p>
          </div>
          <p className="mb-3 text-[12px] text-slate-400">
            Manzil topilmasa yoki mijoz bilan aloqa bo'lmasa yozing
          </p>

          {problemSent ? (
            <div className="flex items-center gap-2 rounded-[14px] bg-emerald-50 px-4 py-3">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <p className="text-[13px] font-bold text-emerald-700">Operatorga yuborildi</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={problemDraft}
                onChange={(e) => { setProblemDraft(e.target.value); if (problemError) setProblemError(null); }}
                placeholder="Muammoni yozing..."
                className="flex-1 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleProblemSubmit}
                disabled={reportProblemMutation.isPending || problemDraft.trim().length < 5}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-slate-900 text-white active:scale-95 transition-transform disabled:opacity-40"
              >
                {reportProblemMutation.isPending
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Send size={15} />
                }
              </button>
            </div>
          )}
          {problemError && <p className="mt-2 text-[12px] text-red-500">{problemError}</p>}
        </div>
      )}
    </div>
  );
};

export default CourierOrderDetailPage;
