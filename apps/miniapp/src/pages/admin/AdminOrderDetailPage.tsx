import { OrderDistanceDisplay } from '../../components/OrderDistanceDisplay';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Radio,
  Route,
  TimerReset,
  Truck,
  User,
} from 'lucide-react';
import { initiateCall, openTelegramProfile } from '../../lib/callUtils';
import { useOrdersStore } from '../../store/useOrdersStore';
import {
  useAdminCouriers,
  useApproveOrderPayment,
  useAssignCourierToOrder,
  useOrderDetails,
  useRejectOrderPayment,
  useOrderTrackingStream,
  useUpdateOrderStatus,
} from '../../hooks/queries/useOrders';
import {
  CourierAssignModal,
  PaymentVerificationCard,
  StatusActionButtons,
} from '../../components/admin/AdminComponents';
import { getStatusColor, getStatusLabel } from '../../lib/orderStatusUtils';
import { AdminCourierOption, Order, OrderStatus } from '../../data/types';
import { CourierMapView } from '../../components/courier/CourierMapView';
import { DEFAULT_RESTAURANT_LOCATION } from '../../features/maps/restaurant';
import { estimateRouteMetrics, formatEtaMinutes, formatRouteDistance } from '../../features/maps/route';
import { AdminModificationRequestsCard } from '../../components/admin/AdminModificationRequestsCard';

const STATUS_STYLES: Record<
  string,
  { surface: string; border: string; icon: string; label: string }
> = {
  slate: {
    surface: 'bg-[rgba(255,250,238,0.88)]',
    border: 'border-[rgba(118,90,35,0.12)]',
    icon: 'bg-[#2b2418] text-[#ffe39b]',
    label: 'text-[#7a5600]',
  },
  amber: {
    surface: 'bg-[rgba(255,212,59,0.14)]',
    border: 'border-[rgba(255,190,11,0.18)]',
    icon: 'bg-[var(--admin-pro-primary)] text-[var(--admin-pro-primary-contrast)]',
    label: 'text-[#7a5600]',
  },
  orange: {
    surface: 'bg-[rgba(255,212,59,0.18)]',
    border: 'border-[rgba(255,190,11,0.18)]',
    icon: 'bg-[#1f1a12] text-[#ffe39b]',
    label: 'text-[#7a5600]',
  },
  violet: {
    surface: 'bg-[#1f1a12]',
    border: 'border-[#3d2f12]',
    icon: 'bg-[var(--admin-pro-primary)] text-[var(--admin-pro-primary-contrast)]',
    label: 'text-[#ffe39b]',
  },
  emerald: {
    surface: 'bg-emerald-50',
    border: 'border-emerald-100',
    icon: 'bg-emerald-500 text-white',
    label: 'text-emerald-700',
  },
  red: {
    surface: 'bg-rose-50',
    border: 'border-rose-100',
    icon: 'bg-rose-500 text-white',
    label: 'text-rose-700',
  },
};

const sectionClassName = 'admin-pro-card rounded-[32px] p-6';

function formatTrackingTime(timestamp?: string) {
  if (!timestamp) {
    return 'Hali yangilanmagan';
  }

  return new Date(timestamp).toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const AlertBanner: React.FC<{
  title: string;
  message: string;
  tone?: 'danger' | 'warning' | 'info';
}> = ({ title, message, tone = 'danger' }) => {
  const toneClasses =
    tone === 'warning'
      ? 'border-amber-100 bg-amber-50 text-amber-900'
      : tone === 'info'
        ? 'border-[rgba(255,190,11,0.18)] bg-[rgba(255,212,59,0.14)] text-[#6f5200]'
        : 'border-rose-100 bg-rose-50 text-rose-900';

  const iconClasses =
    tone === 'warning'
      ? 'bg-amber-100 text-amber-600'
      : tone === 'info'
        ? 'bg-[rgba(255,212,59,0.18)] text-[#7a5600]'
        : 'bg-rose-100 text-rose-600';

  const bodyClasses =
    tone === 'warning'
      ? 'text-amber-700'
      : tone === 'info'
        ? 'text-[#8a6a20]'
        : 'text-rose-700';

  return (
    <div className={`flex items-start gap-3 rounded-[24px] border p-4 ${toneClasses}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconClasses}`}>
        <AlertCircle size={20} />
      </div>
      <div>
        <p className="text-sm font-black">{title}</p>
        <p className={`mt-1 text-xs font-bold leading-relaxed ${bodyClasses}`}>{message}</p>
      </div>
    </div>
  );
};

const MetricTile: React.FC<{
  label: string;
  value: string;
  subtle?: boolean;
}> = ({ label, value, subtle = false }) => (
  <div className={`rounded-2xl border px-4 py-3 ${subtle ? 'border-white/8 bg-white/6' : 'border-[rgba(118,90,35,0.12)] bg-[rgba(255,250,238,0.74)]'}`}>
    <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${subtle ? 'text-white/48' : 'text-[var(--admin-pro-text-muted)]'}`}>{label}</p>
    <p className={`mt-1 text-lg font-black ${subtle ? 'text-white' : 'text-[var(--admin-pro-text)]'}`}>{value}</p>
  </div>
);

const AdminOrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const storeOrder = useOrdersStore((state) =>
    orderId ? state.orders.find((candidate) => candidate.id === orderId) : undefined,
  );

  const [order, setOrder] = useState<Order | undefined>(undefined);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const {
    data: fetchedOrder,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useOrderDetails(orderId || '');
  const { connectionState, isConnected } = useOrderTrackingStream(orderId || '', Boolean(orderId));
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const approvePaymentMutation = useApproveOrderPayment();
  const rejectPaymentMutation = useRejectOrderPayment();
  const assignCourierMutation = useAssignCourierToOrder();
  const {
    data: couriers = [],
    error: courierOptionsError,
    refetch: refetchCouriers,
    isLoading: isLoadingCouriers,
  } = useAdminCouriers(isCourierModalOpen);

  const hasConsumedAssignIntent = React.useRef(false);

  useEffect(() => {
    if (fetchedOrder) {
      setOrder(fetchedOrder);
      setPaymentError(null);
      return;
    }

    if (storeOrder && !isFetching) {
      setOrder(storeOrder);
    }
  }, [fetchedOrder, isFetching, storeOrder]);

  useEffect(() => {
    if (!orderId) return;

    void refetch().then((result) => {
      if (result.data) {
        setOrder(result.data);
      }
    });
  }, [orderId, refetch]);

  useEffect(() => {
    hasConsumedAssignIntent.current = false;
  }, [orderId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('assignCourier') !== '1' || !order || hasConsumedAssignIntent.current) {
      return;
    }

    hasConsumedAssignIntent.current = true;

    if (order.orderStatus === OrderStatus.PENDING) {
      setAssignmentError('Avval buyurtmani tasdiqlang, keyin kuryer biriktiring');
      return;
    }

    setAssignmentError(null);
    setIsCourierModalOpen(true);
  }, [location.search, order]);

  const handleStatusUpdate = async (next: OrderStatus) => {
    if (!order) return;

    if (next === OrderStatus.DELIVERING && !order.courierId) {
      setStatusError("Buyurtmani yo'lga chiqarishdan oldin kuryer biriktiring");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      return;
    }

    setStatusError(null);

    try {
      const updatedOrder = await updateOrderStatusMutation.mutateAsync({
        id: order.id,
        status: next,
      });
      setOrder(updatedOrder);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    } catch (mutationFailure) {
      setStatusError(
        mutationFailure instanceof Error ? mutationFailure.message : 'Status yangilanmadi',
      );
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    }
  };

  const handleApprovePayment = () => {
    if (!order || approvePaymentMutation.isPending) return;

    setPaymentError(null);
    approvePaymentMutation.mutate(
      { id: order.id },
      {
        onSuccess: (updatedOrder) => {
          setOrder(updatedOrder);
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        },
        onError: (mutationFailure) => {
          setPaymentError(
            mutationFailure instanceof Error ? mutationFailure.message : "To'lov tasdiqlanmadi",
          );
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
        },
      },
    );
  };

  const handleRejectPayment = () => {
    if (!order || rejectPaymentMutation.isPending) return;

    if (window.confirm("Ushbu to'lovni rad etsangiz, buyurtma ham bekor qilinadi. Davom etasizmi?")) {
      setPaymentError(null);
      rejectPaymentMutation.mutate(
        { id: order.id },
        {
          onSuccess: (updatedOrder) => {
            setOrder(updatedOrder);
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
          },
          onError: (mutationFailure) => {
            setPaymentError(
              mutationFailure instanceof Error ? mutationFailure.message : "To'lov rad etilmadi",
            );
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
          },
        },
      );
    }
  };

  const handleCancel = () => {
    if (window.confirm('Rostdan ham buyurtmani bekor qilmoqchimisiz?')) {
      void handleStatusUpdate(OrderStatus.CANCELLED);
    }
  };

  const handleCourierAssign = async (courier: AdminCourierOption) => {
    if (!order) return;

    setAssignmentError(null);

    if (order.orderStatus === OrderStatus.PENDING) {
      setAssignmentError('Avval buyurtmani tasdiqlang, keyin kuryerga yuboring');
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      return;
    }

    try {
      const updatedOrder = await assignCourierMutation.mutateAsync({
        id: order.id,
        courierId: courier.id,
      });
      setOrder(updatedOrder);
      setIsCourierModalOpen(false);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    } catch (mutationFailure) {
      setAssignmentError(
        mutationFailure instanceof Error ? mutationFailure.message : 'Kuryer biriktirilmadi',
      );
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    }
  };

  if (isLoading && !order) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 w-28 rounded-2xl bg-slate-200" />
        <div className="h-36 rounded-[32px] bg-slate-200" />
        <div className="h-52 rounded-[32px] bg-slate-200" />
        <div className="h-48 rounded-[32px] bg-slate-200" />
      </div>
    );
  }

  if (isError && !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle size={40} className="text-rose-500" />
        <h3 className="mt-4 text-xl font-black uppercase tracking-tighter text-[var(--admin-pro-text)]">
          Buyurtma yuklanmadi
        </h3>
        <p className="mt-2 max-w-xs text-sm font-bold leading-relaxed text-[var(--admin-pro-text-muted)]">
          {(error as Error).message}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="admin-pro-button-primary mt-5 h-11 rounded-2xl px-5 text-[11px] font-black uppercase tracking-widest"
        >
          Qayta yuklash
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h3 className="mb-2 text-xl font-black uppercase italic tracking-tighter text-[var(--admin-pro-text)]">
          Buyurtma topilmadi
        </h3>
        <button
          onClick={() => navigate('/admin/orders')}
          className="text-[10px] font-bold uppercase tracking-widest text-[#7a5600]"
        >
          Ro'yxatga qaytish
        </button>
      </div>
    );
  }

  const date = new Date(order.createdAt).toLocaleDateString('uz-UZ', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  const statusColor = getStatusColor(order.orderStatus);
  const statusStyles = STATUS_STYLES[statusColor] || STATUS_STYLES.slate;
  const courierModalError = courierOptionsError instanceof Error ? courierOptionsError.message : undefined;
  const pickupPin = {
    lat: order.pickupLat ?? DEFAULT_RESTAURANT_LOCATION.pin.lat,
    lng: order.pickupLng ?? DEFAULT_RESTAURANT_LOCATION.pin.lng,
  };
  const destinationPin = {
    lat: order.destinationLat ?? order.customerAddress?.latitude ?? pickupPin.lat,
    lng: order.destinationLng ?? order.customerAddress?.longitude ?? pickupPin.lng,
  };
  const courierPin = order.tracking?.courierLocation
    ? {
        lat: order.tracking.courierLocation.latitude,
        lng: order.tracking.courierLocation.longitude,
      }
    : undefined;
  const courierLocation = order.tracking?.courierLocation;
  const destinationLocation =
    order.destinationLat != null && order.destinationLng != null
      ? { latitude: order.destinationLat, longitude: order.destinationLng }
      : order.customerAddress?.latitude != null && order.customerAddress?.longitude != null
        ? { latitude: order.customerAddress.latitude, longitude: order.customerAddress.longitude }
        : undefined;
  const remainingEta =
    typeof order.tracking?.courierLocation?.remainingEtaMinutes === 'number'
      ? formatEtaMinutes(order.tracking.courierLocation.remainingEtaMinutes)
      : null;
  const showTrackingPanel =
    Boolean(order.courierId) ||
    order.orderStatus === OrderStatus.READY_FOR_PICKUP ||
    order.orderStatus === OrderStatus.DELIVERING ||
    Boolean(order.tracking?.courierLocation);
  const routeSnapshot = estimateRouteMetrics(courierPin ?? pickupPin, destinationPin, {
    minimumDistanceKm: 0,
    minimumEtaMinutes: 1,
  });
  const routeDistanceLabel = formatRouteDistance(routeSnapshot.distanceKm);
  const routeEtaLabel = remainingEta || formatEtaMinutes(routeSnapshot.etaMinutes);
  const syncBadgeClass = isConnected
    ? 'admin-pro-sync-good'
    : connectionState === 'reconnecting'
      ? 'admin-pro-sync-warn'
      : 'admin-pro-sync-idle';

  return (
    <div className="space-y-6 pb-40 animate-in fade-in slide-in-from-bottom duration-500">
      <section className="admin-pro-card admin-hero-card relative overflow-hidden p-6">
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/orders')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/80 transition active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0 flex-1 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Admin order detail</p>
            <h2 className="mt-2 truncate text-3xl font-black tracking-tight text-white">#{order.orderNumber}</h2>
            <p className="mt-1 text-xs font-bold text-white/58">{date}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className={`inline-flex items-center gap-3 rounded-[22px] border px-4 py-3 ${statusStyles.surface} ${statusStyles.border}`}>
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg ${statusStyles.icon}`}>
              <Clock size={20} />
            </div>
            <div className="text-left">
              <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${statusStyles.label}`}>Holat</p>
              <p className="mt-1 text-sm font-black uppercase tracking-wide text-white">
                {getStatusLabel(order.orderStatus)}
              </p>
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${syncBadgeClass}`}>
            <Radio size={12} className={isConnected ? 'animate-pulse' : ''} />
            <span>
              {isConnected ? 'Jonli' : connectionState === 'reconnecting' ? 'Qayta ulanmoqda' : 'Kutilyapti'}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricTile label="Jami" value={`${order.total.toLocaleString()} so'm`} subtle />
          <MetricTile label="Mahsulot" value={`${order.items.length} ta`} subtle />
          <MetricTile label="Masofa" value={routeDistanceLabel} subtle />
          <MetricTile label="ETA" value={routeEtaLabel} subtle />
        </div>

        <div className="mt-5 flex justify-end">
          <StatusActionButtons
            currentStatus={order.orderStatus}
            onUpdate={(next) => void handleStatusUpdate(next)}
            onCancel={handleCancel}
            isPending={updateOrderStatusMutation.isPending}
          />
        </div>
      </section>

      {statusError ? <AlertBanner title="Status yangilanmadi" message={statusError} tone="danger" /> : null}
      {paymentError ? <AlertBanner title="To'lov yangilanmadi" message={paymentError} tone="danger" /> : null}

      <AdminModificationRequestsCard orderId={order.id} orderNumber={order.orderNumber} />

      <PaymentVerificationCard
        order={order}
        onApprove={handleApprovePayment}
        onReject={handleRejectPayment}
        isPending={approvePaymentMutation.isPending || rejectPaymentMutation.isPending}
      />

      {order.dispatchState === 'MANUAL_ASSIGNMENT_REQUIRED' ? (
        <AlertBanner
          title="Qo'lda kuryer biriktirish kerak"
          message="Avtomatik urinishlar tugadi. Buyurtma saqlanib qolgan, endi admin mos kuryerni qo'lda biriktirishi kerak."
          tone="warning"
        />
      ) : null}

      {order.dispatchState === 'SEARCHING' && !order.courierId ? (
        <AlertBanner
          title="Tizim boshqa kuryerni qidirmoqda"
          message="Oldingi kuryer buyurtmani olmadi. Agar kerak bo'lsa, shu yerning o'zidan qo'lda biriktirishingiz mumkin."
          tone="info"
        />
      ) : null}

      <section className={sectionClassName}>
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-text-muted)]">Yetkazib beruvchi</p>
            <p className="mt-1 text-lg font-black text-[var(--admin-pro-text)]">Kuryer biriktirish va bog'lanish</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (order.orderStatus === OrderStatus.PENDING) {
                setAssignmentError('Avval buyurtmani tasdiqlang, keyin kuryerga yuboring');
                return;
              }
              setAssignmentError(null);
              setIsCourierModalOpen(true);
            }}
            className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
              order.orderStatus === OrderStatus.PENDING
                ? 'border border-[var(--admin-pro-line)] text-[var(--admin-pro-text-muted)]'
                : 'admin-pro-button-primary'
            }`}
          >
            {order.orderStatus === OrderStatus.PENDING
              ? 'Avval tasdiqlang'
              : order.courierId
                ? 'Qayta biriktirish'
                : 'Kuryer biriktirish'}
          </button>
        </div>

        {assignmentError ? (
          <div className="mb-4">
            <AlertBanner title="Biriktirish xatosi" message={assignmentError} tone="danger" />
          </div>
        ) : null}

        {order.courierName ? (
          <div className="rounded-[24px] border border-[rgba(255,190,11,0.16)] bg-[linear-gradient(135deg,rgba(255,212,59,0.14)_0%,rgba(255,250,239,0.96)_100%)] p-4 shadow-[0_18px_34px_rgba(255,190,11,0.1)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f1a12] text-[#ffe39b] shadow-lg">
                <User size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-[var(--admin-pro-text)]">{order.courierName}</p>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#7a5600]">
                  Kuryer biriktirilgan
                </p>
              </div>
              <div className="flex items-center gap-2">
                {order.courierPhone ? (
                  <button
                    type="button"
                    onClick={() => initiateCall(order.courierPhone)}
                    title={`Kuryerga qo'ng'iroq: ${order.courierPhone}`}
                    className="admin-pro-button-secondary flex h-10 w-10 items-center justify-center rounded-xl text-emerald-600"
                  >
                    <Phone size={18} />
                  </button>
                ) : order.courierTelegramId || order.courierUsername ? (
                  <button
                    type="button"
                    onClick={() => openTelegramProfile(order.courierUsername)}
                    title="Telegram orqali bog'lanish"
                    className="admin-pro-button-secondary flex h-10 w-10 items-center justify-center rounded-xl text-[#7a5600]"
                  >
                    <MessageCircle size={18} />
                  </button>
                ) : null}
              </div>
            </div>

            {assignCourierMutation.isPending ? (
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#7a5600]">Yangilanmoqda</p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[var(--admin-pro-line)] bg-[rgba(255,248,229,0.52)] p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(255,212,59,0.14)] text-[#b99836]">
                <Truck size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-[var(--admin-pro-text)]">Kuryer biriktirilmagan</p>
                <p className="mt-1 text-xs font-semibold text-[var(--admin-pro-text-muted)]">
                  Shu joydan mos kuryerni qo'lda biriktirishingiz mumkin.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {showTrackingPanel ? (
        <section className={sectionClassName}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-text-muted)]">Jonli kuzatuv</p>
              <p className="mt-2 text-lg font-black text-[var(--admin-pro-text)]">
                {order.courierName ? `${order.courierName} harakatda` : 'Kuryer kuzatuvi'}
              </p>
              <p className="mt-1 text-xs font-bold text-[var(--admin-pro-text-muted)]">
                So'nggi yangilanish: {formatTrackingTime(order.tracking?.lastEventAt)}
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${syncBadgeClass}`}>
              <Radio size={12} className={isConnected ? 'animate-pulse' : ''} />
              <span>
                {isConnected ? 'Jonli' : connectionState === 'reconnecting' ? 'Qayta ulanmoqda' : 'Kutilyapti'}
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[28px] border border-[var(--admin-pro-line)] bg-[rgba(255,248,229,0.48)] shadow-[0_12px_28px_rgba(74,56,16,0.08)]">
            <CourierMapView
              pickup={pickupPin}
              destination={destinationPin}
              courierPos={courierPin}
              routeFrom={pickupPin}
              routeTo={destinationPin}
              height="240px"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--admin-pro-line)] bg-[rgba(255,250,238,0.8)] px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-text-muted)]">
                <Route size={14} className="text-[#7a5600]" />
                <span>Qolgan masofa</span>
              </div>
              <OrderDistanceDisplay
                courier={courierLocation}
                destination={destinationLocation}
                label="Qolgan masofa"
                className="mt-2 text-lg font-black text-[var(--admin-pro-text)]"
              />
            </div>

            <div className="rounded-2xl border border-[var(--admin-pro-line)] bg-[rgba(255,250,238,0.8)] px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-text-muted)]">
                <TimerReset size={14} className="text-emerald-500" />
                <span>Qolgan ETA</span>
              </div>
              <p className="mt-2 text-lg font-black text-emerald-700">{remainingEta || 'Hisoblanmoqda'}</p>
            </div>
          </div>

          {!courierPin ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--admin-pro-line)] bg-[rgba(255,248,229,0.52)] px-4 py-3">
              <p className="text-xs font-bold leading-relaxed text-[var(--admin-pro-text-muted)]">
                Kuryer joylashuvi hali uzatilmadi. Jonli marker kuryer xarita sahifasida harakat boshlaganda ko'rinadi.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className={sectionClassName}>
        <div className="mb-4 flex items-center justify-between gap-4 px-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-text-muted)]">Mijoz va manzil</p>
            <p className="mt-1 text-lg font-black text-[var(--admin-pro-text)]">Yetkazish nuqtasi va aloqa</p>
          </div>
          {order.customerPhone ? (
            <button
              type="button"
              onClick={() => initiateCall(order.customerPhone)}
              title={`Mijozga qo'ng'iroq: ${order.customerPhone}`}
              className="admin-pro-button-primary flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[11px] font-black uppercase tracking-[0.16em]"
            >
              <Phone size={15} />
              Qo'ng'iroq
            </button>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-[24px] border border-[var(--admin-pro-line)] bg-[rgba(255,250,238,0.82)] p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,212,59,0.16)] text-[#7a5600]">
              <MapPin size={20} />
            </div>
            <div>
              <p className="font-black leading-tight text-[var(--admin-pro-text)]">
                {order.customerAddress?.label || 'Manzil'}
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug text-[var(--admin-pro-text-muted)]">
                {order.customerAddress?.addressText || "Manzil yo'q"}
              </p>
            </div>
          </div>

          {order.customerName ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--admin-pro-line)] bg-[rgba(255,250,238,0.76)] px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1f1a12] text-[#ffe39b]">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-[var(--admin-pro-text)]">{order.customerName}</p>
                <p className="text-[11px] font-semibold text-[var(--admin-pro-text-muted)]">
                  {order.customerPhone || 'Telefon kiritilmagan'}
                </p>
              </div>
            </div>
          ) : null}

          {order.note ? (
            <AlertBanner title="Mijoz izohi" message={order.note} tone="warning" />
          ) : null}
        </div>
      </section>

      <section className={sectionClassName}>
        <div className="mb-4 px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-text-muted)]">Buyurtma tarkibi</p>
          <p className="mt-1 text-lg font-black text-[var(--admin-pro-text)]">Mahsulotlar va to'lov tarkibi</p>
        </div>

        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={index} className="flex items-center justify-between rounded-2xl border border-[var(--admin-pro-line)] bg-[rgba(255,250,238,0.7)] px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[rgba(255,212,59,0.16)] text-[10px] font-black text-[#7a5600]">
                  {item.quantity}
                </span>
                <span className="font-bold text-[var(--admin-pro-text)]">{item.name}</span>
              </div>
              <span className="font-black text-[var(--admin-pro-text)]">
                {(item.price * item.quantity).toLocaleString()} so'm
              </span>
            </div>
          ))}

          <div className="rounded-[24px] border border-[var(--admin-pro-line)] bg-[rgba(255,248,229,0.58)] p-4">
            <div className="flex justify-between text-xs font-black uppercase tracking-[0.14em] text-[var(--admin-pro-text-muted)]">
              <span>Jami</span>
              <span className="text-[var(--admin-pro-text)]">{order.total.toLocaleString()} so'm</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MetricTile
                label="To'lov usuli"
                value={order.paymentMethod === 'CASH' ? 'Naqd' : 'Onlayn'}
              />
              <MetricTile
                label="Kutilgan ETA"
                value={routeEtaLabel}
              />
            </div>
          </div>
        </div>
      </section>

      <CourierAssignModal
        isOpen={isCourierModalOpen}
        onClose={() => setIsCourierModalOpen(false)}
        onAssign={(courier) => void handleCourierAssign(courier)}
        currentCourierId={order.courierId}
        couriers={couriers}
        isLoading={isLoadingCouriers}
        isAssigning={assignCourierMutation.isPending}
        errorMessage={courierModalError}
        onRetry={() => {
          void refetchCouriers();
        }}
      />
    </div>
  );
};

export default AdminOrderDetailPage;

