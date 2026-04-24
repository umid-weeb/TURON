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
import { initiateCall } from '../../lib/callUtils';
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

function StageProgress({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex items-center gap-1">
      {DELIVERY_STAGE_FLOW.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-black transition-colors ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'courier-accent-pill ring-4 ring-[var(--courier-accent-soft)]'
                      : 'bg-black/6 text-[var(--courier-muted)] dark:bg-white/6'
                }`}
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              <p
                className={`text-center text-[10px] font-bold leading-tight ${
                  done
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : active
                      ? 'text-[var(--courier-accent-strong)]'
                      : 'text-[var(--courier-muted)]'
                }`}
                style={{ width: 56 }}
              >
                {step.title}
              </p>
            </div>
            {i < DELIVERY_STAGE_FLOW.length - 1 ? (
              <div className={`mb-5 h-0.5 flex-1 rounded-full ${i < currentIndex ? 'bg-emerald-400' : 'bg-black/8 dark:bg-white/8'}`} />
            ) : null}
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
          <Loader2 size={32} className="animate-spin text-[var(--courier-accent-strong)]" />
          <p className="text-[13px] font-bold text-[var(--courier-muted)]">Yuklanmoqda...</p>
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
      <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-[17px] font-black text-[var(--courier-text)]">Buyurtma topilmadi</p>
        <button type="button" onClick={() => navigate('/courier/orders')} className="mt-4 text-[13px] font-bold text-[var(--courier-accent-strong)]">
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
    if (isLastAction && !confirmingDelivered) {
      setConfirmingDelivered(true);
      return;
    }
    setConfirmingDelivered(false);
    updateStageMutation.mutate(
      { id: order.id, stage: primaryAction.next },
      {
        onSuccess: () => {
          window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
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
      setProblemError('Kamida 5 ta harf yozing');
      return;
    }
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
    <div className="courier-enter-up space-y-4 px-4 py-5 pb-32">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/courier/orders')}
          className="courier-topbar-button flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px]"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="text-[20px] font-black text-[var(--courier-text)]">#{order.orderNumber}</p>
          {order.customerName ? <p className="truncate text-[12px] text-[var(--courier-muted)]">{order.customerName}</p> : null}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/courier/map/${order.id}`)}
          className="courier-cta-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px]"
        >
          <Map size={18} className="text-[var(--courier-accent-contrast)]" />
        </button>
      </div>

      <div className="courier-card-strong rounded-[28px] px-4 pb-3 pt-4">
        <p className="courier-label mb-3">Holat</p>
        <StageProgress currentIndex={stageIndex} />
      </div>

      {!isDelivered ? (
        confirmingDelivered ? (
          <div className="courier-card-strong rounded-[28px] p-4 space-y-3">
            <div className="rounded-[18px] border border-[var(--courier-accent-soft)] bg-[var(--courier-accent-soft)] px-4 py-3.5">
              <p className="text-[15px] font-black text-[#7d5e00] dark:text-[var(--courier-accent)]">Haqiqatan topshirdingizmi?</p>
              <p className="mt-1 text-[12px] text-[#8a6b10] dark:text-[var(--courier-muted)]">Bu amaliyotni bekor qilib bo'lmaydi</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelivered(false)}
                className="courier-cta-secondary h-14 rounded-[18px] text-[14px] font-black active:scale-95"
              >
                Yo'q
              </button>
              <button
                type="button"
                onClick={handleStageAdvance}
                disabled={updateStageMutation.isPending}
                className="flex h-14 items-center justify-center gap-2 rounded-[18px] bg-emerald-500 text-[15px] font-black text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform disabled:opacity-50"
              >
                {updateStageMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <><CheckCircle2 size={19} /><span>Ha, topshirdim</span></>}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStageAdvance}
            disabled={updateStageMutation.isPending}
            className={`flex h-16 w-full items-center justify-center gap-3 rounded-[28px] text-[17px] font-black shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50 ${
              isLastAction
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'courier-cta-primary'
            }`}
          >
            {updateStageMutation.isPending ? <Loader2 size={22} className="animate-spin" /> : <><span>{primaryAction.label}</span><ChevronRight size={22} /></>}
          </button>
        )
      ) : (
        <div className="flex items-center gap-3 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/18 dark:bg-emerald-500/12">
          <CheckCircle2 size={28} className="shrink-0 text-emerald-600 dark:text-emerald-300" />
          <div>
            <p className="text-[16px] font-black text-emerald-900 dark:text-emerald-100">Buyurtma topshirildi</p>
            <p className="text-[13px] text-emerald-600 dark:text-emerald-200/80">Muvaffaqiyatli yakunlandi</p>
          </div>
        </div>
      )}

      <div className="courier-card-strong overflow-hidden rounded-[28px]">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="courier-label">Marshrut</p>
            <p className="mt-1 text-[14px] font-black text-[var(--courier-text)]">{routeMeta.title}</p>
            <p className="text-[12px] text-[var(--courier-muted)]">{routeInfo.distance} · ~{routeInfo.eta}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/courier/map/${order.id}`)}
            className="courier-cta-primary flex items-center gap-1.5 rounded-[14px] px-3 py-2 text-[12px] font-black"
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

      <div className="courier-card-strong rounded-[28px] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="courier-label mb-1">Mijoz</p>
            <p className="text-[16px] font-black text-[var(--courier-text)]">{order.customerName || 'Mijoz'}</p>
            {order.customerAddress?.addressText ? (
              <p className="mt-1 text-[12px] leading-snug text-[var(--courier-muted)]">{order.customerAddress.addressText}</p>
            ) : null}
          </div>
          {order.customerPhone ? (
            <button
              type="button"
              onClick={() => initiateCall(order.customerPhone)}
              title={`Mijozga qo'ng'iroq: ${order.customerPhone}`}
              className="courier-cta-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]"
            >
              <Phone size={20} className="text-[var(--courier-accent-contrast)]" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-[16px] bg-black/4 px-3.5 py-2.5 dark:bg-white/5">
          <p className="text-[12px] font-bold text-[var(--courier-muted)]">To'lov:</p>
          <p className="text-[13px] font-black text-[var(--courier-text)]">{getCourierPaymentLabel(order.paymentMethod)}</p>
          <p className="ml-auto text-[13px] font-black text-[var(--courier-text)]">{order.total.toLocaleString()} so'm</p>
        </div>

        {order.note ? (
          <div className="mt-2 rounded-[16px] border border-[var(--courier-accent-soft)] bg-[var(--courier-accent-soft)] px-3.5 py-2.5">
            <p className="text-[11px] font-bold text-[#7d5e00] dark:text-[var(--courier-accent)]">Izoh</p>
            <p className="text-[12px] leading-snug text-[#7d5e00] dark:text-[var(--courier-muted)]">{order.note}</p>
          </div>
        ) : null}
      </div>

      <div className="courier-card-strong rounded-[28px] p-4">
        <p className="courier-label mb-3">Buyurtma · {order.items.length} ta mahsulot</p>
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex items-center gap-3 rounded-[16px] bg-black/4 px-3.5 py-3 dark:bg-white/5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white shadow-sm dark:bg-white/10 dark:shadow-none">
                <Package size={15} className="text-[var(--courier-muted)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-black text-[var(--courier-text)]">{item.name}</p>
                <p className="text-[11px] text-[var(--courier-muted)]">{item.price.toLocaleString()} so'm</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-[var(--courier-muted)]">{item.quantity}x</p>
                <p className="text-[13px] font-black text-[var(--courier-text)]">{(item.price * item.quantity).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isDelivered ? (
        <div className="courier-card-strong rounded-[28px] p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-400" />
            <p className="text-[13px] font-black text-[var(--courier-text)]">Muammo bormi?</p>
          </div>
          <p className="mb-3 text-[12px] text-[var(--courier-muted)]">Manzil topilmasa yoki mijoz bilan aloqa bo'lmasa yozing</p>

          {problemSent ? (
            <div className="flex items-center gap-2 rounded-[16px] bg-emerald-50 px-4 py-3 dark:bg-emerald-500/12">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" />
              <p className="text-[13px] font-bold text-emerald-700 dark:text-emerald-200">Operatorga yuborildi</p>
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
                className="flex-1 rounded-[16px] border border-[var(--courier-line)] bg-black/4 px-4 py-3 text-[13px] text-[var(--courier-text)] outline-none placeholder:text-[var(--courier-muted)] focus:border-[var(--courier-accent-strong)] dark:bg-white/5"
              />
              <button
                type="button"
                onClick={handleProblemSubmit}
                disabled={reportProblemMutation.isPending || problemDraft.trim().length < 5}
                className="courier-cta-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] disabled:opacity-40"
              >
                {reportProblemMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          )}
          {problemError ? <p className="mt-2 text-[12px] text-red-500">{problemError}</p> : null}
        </div>
      ) : null}
    </div>
  );
};

export default CourierOrderDetailPage;
