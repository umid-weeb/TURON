import { OrderDistanceDisplay } from '../../components/OrderDistanceDisplay';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  MapPin,
  MessageCircle,
  Radio,
  Route,
  TimerReset,
  Truck,
  User,
} from 'lucide-react';
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
import { formatEtaMinutes, formatRouteDistance, estimateRouteMetrics } from '../../features/maps/route';

const STATUS_STYLES: Record<string, { surface: string; border: string; icon: string; iconShadow: string; label: string }> = {
  slate: {
    surface: 'bg-slate-50',
    border: 'border-slate-100',
    icon: 'bg-slate-500 text-white',
    iconShadow: 'shadow-slate-200',
    label: 'text-slate-600',
  },
  amber: {
    surface: 'bg-amber-50',
    border: 'border-amber-100',
    icon: 'bg-amber-500 text-white',
    iconShadow: 'shadow-amber-200',
    label: 'text-amber-600',
  },
  orange: {
    surface: 'bg-orange-50',
    border: 'border-orange-100',
    icon: 'bg-orange-500 text-white',
    iconShadow: 'shadow-orange-200',
    label: 'text-orange-600',
  },
  violet: {
    surface: 'bg-violet-50',
    border: 'border-violet-100',
    icon: 'bg-violet-500 text-white',
    iconShadow: 'shadow-violet-200',
    label: 'text-violet-600',
  },
  emerald: {
    surface: 'bg-emerald-50',
    border: 'border-emerald-100',
    icon: 'bg-emerald-500 text-white',
    iconShadow: 'shadow-emerald-200',
    label: 'text-emerald-600',
  },
  red: {
    surface: 'bg-red-50',
    border: 'border-red-100',
    icon: 'bg-red-500 text-white',
    iconShadow: 'shadow-red-200',
    label: 'text-red-600',
  },
};

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

const AdminOrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById } = useOrdersStore();

  const [order, setOrder] = useState<Order | undefined>(orderId ? getOrderById(orderId) : undefined);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const {
    data: fetchedOrder,
    isLoading,
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

  useEffect(() => {
    if (fetchedOrder) {
      setOrder(fetchedOrder);
      setPaymentError(null);
      return;
    }

    if (orderId) {
      const fallbackOrder = getOrderById(orderId);
      if (fallbackOrder) {
        setOrder(fallbackOrder);
      }
    }
  }, [fetchedOrder, getOrderById, orderId]);

  const handleStatusUpdate = async (next: OrderStatus) => {
    if (!order) {
      return;
    }

    if (next === OrderStatus.DELIVERING && !order.courierId) {
      setStatusError('Buyurtmani yo\'lga chiqarishdan oldin kuryer biriktiring');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }

      return;
    }

    setStatusError(null);

    try {
      const updatedOrder = await updateOrderStatusMutation.mutateAsync({
        id: order.id,
        status: next,
      });

      setOrder(updatedOrder);

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
    } catch (mutationFailure) {
      setStatusError(
        mutationFailure instanceof Error ? mutationFailure.message : 'Status yangilanmadi',
      );

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  const handleApprovePayment = () => {
    if (!order || approvePaymentMutation.isPending) {
      return;
    }

    setPaymentError(null);

    approvePaymentMutation.mutate(
      { id: order.id },
      {
        onSuccess: (updatedOrder) => {
          setOrder(updatedOrder);

          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
        },
        onError: (mutationFailure) => {
          setPaymentError(
            mutationFailure instanceof Error ? mutationFailure.message : 'To\'lov tasdiqlanmadi',
          );

          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
          }
        },
      },
    );
  };

  const handleRejectPayment = () => {
    if (!order || rejectPaymentMutation.isPending) {
      return;
    }

    if (window.confirm('Ushbu to\'lovni rad etsangiz, buyurtma ham bekor qilinadi. Davom etasizmi?')) {
      setPaymentError(null);

      rejectPaymentMutation.mutate(
        { id: order.id },
        {
          onSuccess: (updatedOrder) => {
            setOrder(updatedOrder);

            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
          },
          onError: (mutationFailure) => {
            setPaymentError(
              mutationFailure instanceof Error ? mutationFailure.message : 'To\'lov rad etilmadi',
            );

            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            }
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
    if (!order) {
      return;
    }

    setAssignmentError(null);

    try {
      const updatedOrder = await assignCourierMutation.mutateAsync({
        id: order.id,
        courierId: courier.id,
      });

      setOrder(updatedOrder);
      setIsCourierModalOpen(false);

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (mutationFailure) {
      setAssignmentError(
        mutationFailure instanceof Error ? mutationFailure.message : 'Kuryer biriktirilmadi',
      );

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  if (isLoading && !order) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 w-28 rounded-2xl bg-slate-200" />
        <div className="h-24 rounded-[32px] bg-slate-200" />
        <div className="h-44 rounded-[32px] bg-slate-200" />
        <div className="h-48 rounded-[32px] bg-slate-200" />
      </div>
    );
  }

  if (isError && !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle size={40} className="text-rose-500" />
        <h3 className="text-xl font-black text-slate-900 mt-4 uppercase tracking-tighter">
          Buyurtma yuklanmadi
        </h3>
        <p className="text-sm font-bold text-slate-500 mt-2 leading-relaxed max-w-xs">
          {(error as Error).message}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 h-11 px-5 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest"
        >
          Qayta yuklash
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h3 className="text-xl font-black text-slate-900 mb-2 italic uppercase tracking-tighter italic">
          Buyurtma topilmadi
        </h3>
        <button
          onClick={() => navigate('/admin/orders')}
          className="text-blue-500 font-bold uppercase tracking-widest text-[10px]"
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
  // Use shared component for distance
  const remainingEta =
    typeof order.tracking?.courierLocation?.remainingEtaMinutes === 'number'
      ? formatEtaMinutes(order.tracking.courierLocation.remainingEtaMinutes)
      : null;
  const showTrackingPanel =
    Boolean(order.courierId) ||
    order.orderStatus === OrderStatus.READY_FOR_PICKUP ||
    order.orderStatus === OrderStatus.DELIVERING ||
    Boolean(order.tracking?.courierLocation);

  return (
    <div className="space-y-6 pb-40 animate-in fade-in slide-in-from-bottom duration-500">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/orders')}
          className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-right">
          <h2 className="text-xl font-black text-slate-900 leading-none italic uppercase tracking-tighter italic">
            #{order.orderNumber}
          </h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
            {date}
          </p>
        </div>
      </div>

      {statusError ? (
        <div className="bg-rose-50 border border-rose-100 rounded-[24px] p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-rose-900">Status yangilanmadi</p>
            <p className="text-xs font-bold text-rose-700 mt-1 leading-relaxed">{statusError}</p>
          </div>
        </div>
      ) : null}

      {paymentError ? (
        <div className="bg-rose-50 border border-rose-100 rounded-[24px] p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-rose-900">To&apos;lov yangilanmadi</p>
            <p className="text-xs font-bold text-rose-700 mt-1 leading-relaxed">{paymentError}</p>
          </div>
        </div>
      ) : null}

      <div className={`w-full p-6 rounded-[32px] border flex items-center justify-between shadow-lg ${statusStyles.surface} ${statusStyles.border}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${statusStyles.icon} ${statusStyles.iconShadow}`}>
            <Clock size={24} />
          </div>
          <div>
            <h4 className={`text-[10px] font-black uppercase tracking-widest ${statusStyles.label}`}>Holat</h4>
            <p className="text-lg font-black text-slate-900 uppercase tracking-tight">
              {getStatusLabel(order.orderStatus)}
            </p>
          </div>
        </div>
        <StatusActionButtons
          currentStatus={order.orderStatus}
          onUpdate={(next) => void handleStatusUpdate(next)}
          onCancel={handleCancel}
          isPending={updateOrderStatusMutation.isPending}
        />
      </div>

      <PaymentVerificationCard
        order={order}
        onApprove={handleApprovePayment}
        onReject={handleRejectPayment}
        isPending={approvePaymentMutation.isPending || rejectPaymentMutation.isPending}
      />

      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Yetkazib beruvchi
          </h3>
          <button
            onClick={() => {
              setAssignmentError(null);
              setIsCourierModalOpen(true);
            }}
            className="text-indigo-600 text-[10px] font-black uppercase tracking-widest"
          >
            {order.courierId ? "O'zgartirish" : "Biriktirish"}
          </button>
        </div>

        {assignmentError ? (
          <div className="mb-4 bg-rose-50 border border-rose-100 rounded-2xl p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-rose-700 leading-relaxed">{assignmentError}</p>
          </div>
        ) : null}

        {order.courierName ? (
          <div className="flex items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
            <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center">
              <User size={24} />
            </div>
            <div className="flex-1">
              <p className="font-black text-indigo-900">{order.courierName}</p>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">
                Kuryer biriktirilgan
              </p>
            </div>
            {assignCourierMutation.isPending ? (
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                Yangilanmoqda
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 opacity-60">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
              <Truck size={24} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">
              Kuryer biriktirilmagan
            </p>
          </div>
        )}
      </div>

      {showTrackingPanel ? (
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Jonli kuzatuv
              </p>
              <p className="mt-2 text-lg font-black text-slate-900">
                {order.courierName ? `${order.courierName} harakatda` : 'Kuryer kuzatuvi'}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                So&apos;nggi yangilanish: {formatTrackingTime(order.tracking?.lastEventAt)}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700'
                  : connectionState === 'reconnecting'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Radio size={12} className={isConnected ? 'animate-pulse' : ''} />
              <span>
                {isConnected
                  ? 'Jonli'
                  : connectionState === 'reconnecting'
                    ? 'Qayta ulanmoqda'
                    : 'Kutilyapti'}
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-100 bg-slate-50 shadow-sm">
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
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Route size={14} className="text-indigo-500" />
                <span>Qolgan masofa</span>
              </div>
              <OrderDistanceDisplay
                courier={courierLocation}
                destination={destinationLocation}
                label="Qolgan masofa"
                className="mt-2 text-lg font-black text-slate-900"
              />
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <TimerReset size={14} className="text-emerald-500" />
                <span>Qolgan ETA</span>
              </div>
              <p className="mt-2 text-lg font-black text-emerald-700">{remainingEta || 'Hisoblanmoqda'}</p>
            </div>
          </div>

          {!courierPin ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold leading-relaxed text-slate-500">
                Kuryer joylashuvi hali uzatilmadi. Jonli marker kuryer xarita sahifasida harakat boshlaganda ko&apos;rinadi.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-1">
          Mijoz va Manzil
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-tight">
                {order.customerAddress?.label || 'Manzil'}
              </p>
              <p className="text-slate-500 text-xs mt-1 leading-snug">
                {order.customerAddress?.addressText || 'Manzil yo\'q'}
              </p>
            </div>
          </div>
          {order.note ? (
            <div className="flex items-start gap-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <MessageCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-700 italic">{order.note}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-1">
          Buyurtma tarkibi
        </h3>
        <div className="space-y-4">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-slate-50 rounded flex items-center justify-center text-[10px] font-black text-slate-400">
                  {item.quantity}
                </span>
                <span className="font-bold text-slate-700">{item.name}</span>
              </div>
              <span className="font-black text-slate-900">
                {(item.price * item.quantity).toLocaleString()} so'm
              </span>
            </div>
          ))}
          <div className="pt-4 border-t border-slate-50 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Jami</span>
              <span className="text-slate-900">{order.total.toLocaleString()} so'm</span>
            </div>
            <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
              <span>To'lov usuli</span>
              <span>{order.paymentMethod === 'CASH' ? 'Naqd' : 'Onlayn'}</span>
            </div>
          </div>
        </div>
      </div>

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
