import React from 'react';
import { OrderDistanceDisplay } from '../../components/OrderDistanceDisplay';
import {
  ArrowLeft,
  Copy,
  RefreshCcw,
  Headphones,
  Loader2,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  Star,
  XCircle,
} from 'lucide-react';
import { OrderRatingModal } from '../../components/customer/OrderRatingModal';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { OrderTimeline } from '../../components/customer/OrderHistoryComponents';
import { ErrorStateCard } from '../../components/ui/FeedbackStates';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../data/types';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { getCustomerTrackingMeta } from '../../features/tracking/customerTracking';
import { useProducts } from '../../hooks/queries/useMenu';
import { useOrderDetails, useOrderTrackingStream } from '../../hooks/queries/useOrders';
import { useCartStore } from '../../store/useCartStore';
import { OrderChatPanel } from '../../components/chat/OrderChatPanel';
import { useOrderChatUnread } from '../../hooks/queries/useOrderChat';

function getPaymentLabel(method: PaymentMethod) {
  if (method === PaymentMethod.CASH) return 'Naqd';
  if (method === PaymentMethod.EXTERNAL_PAYMENT) return 'Click / Payme';
  return 'Karta orqali';
}

function getPaymentStatusLabel(status: PaymentStatus) {
  if (status === PaymentStatus.COMPLETED) return 'To\'langan';
  if (status === PaymentStatus.FAILED) return 'Rad etilgan';
  return 'Tekshiruvda';
}

// Card wrapper used for all content sections below the hero
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`rounded-[22px] px-5 py-5 ${className}`}
    style={{ background: 'var(--tg-theme-secondary-bg-color, #f2f2f7)' }}
  >
    {children}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p
    className="mb-4 text-[17px] font-black tracking-tight"
    style={{ color: 'var(--tg-theme-text-color)' }}
  >
    {children}
  </p>
);

const OrderDetailPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setItems } = useCartStore();
  const { data: order, isLoading, isError, error, refetch } = useOrderDetails(orderId);
  const { isConnected } = useOrderTrackingStream(orderId, Boolean(orderId));
  const { data: products = [] } = useProducts();
  const { formatText, language, intlLocale } = useCustomerLanguage();
  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'failed'>('idle');
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [isRatingOpen, setIsRatingOpen] = React.useState(false);
  const { data: unreadCount = 0 } = useOrderChatUnread(orderId, 'customer');
  const prevArrivingNow = React.useRef(false);

  const _arrivingNow = order ? getCustomerTrackingMeta(order, language).isArrivingNow : false;
  React.useEffect(() => {
    if (_arrivingNow && !prevArrivingNow.current) {
      prevArrivingNow.current = true;
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');
    } else if (!_arrivingNow) {
      prevArrivingNow.current = false;
    }
  }, [_arrivingNow]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={36} className="animate-spin" style={{ color: '#C62020' }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-10">
        <ErrorStateCard
          title="Buyurtma"
          message={(error as Error).message}
          onRetry={() => { void refetch(); }}
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-xl font-black" style={{ color: 'var(--tg-theme-text-color)' }}>
          Buyurtma topilmadi
        </p>
      </div>
    );
  }

  const createdAt = new Date(order.createdAt).toLocaleDateString(intlLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const paymentLabel = getPaymentLabel(order.paymentMethod);
  const paymentStatusLabel = getPaymentStatusLabel(order.paymentStatus);
  const isActiveOrder =
    order.orderStatus !== OrderStatus.DELIVERED && order.orderStatus !== OrderStatus.CANCELLED;
  const isDelivered = order.orderStatus === OrderStatus.DELIVERED;
  const isCancelled = order.orderStatus === OrderStatus.CANCELLED;
  const trackingMeta = getCustomerTrackingMeta(order, language);
  const canOpenLiveTracking =
    isActiveOrder &&
    !trackingMeta.isCancelled &&
    (Boolean(order.courierId) || Boolean(order.tracking?.courierLocation));
  const courierLocation = order.tracking?.courierLocation;
  const destinationLocation =
    order.destinationLat != null && order.destinationLng != null
      ? { latitude: order.destinationLat, longitude: order.destinationLng }
      : order.customerAddress?.latitude != null && order.customerAddress?.longitude != null
      ? { latitude: order.customerAddress.latitude, longitude: order.customerAddress.longitude }
      : undefined;

  const handleCopyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(`#${order.orderNumber}`);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    window.setTimeout(() => setCopyState('idle'), 1800);
  };

  const handleReorder = () => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const nextItems = order.items
      .map((item) => {
        const menuItemId = item.menuItemId ?? item.id;
        const product = menuItemId ? productMap.get(menuItemId) : undefined;
        if (!product) return null;
        return {
          id: product.id,
          menuItemId: product.id,
          categoryId: product.categoryId,
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.imageUrl,
          isAvailable: true,
          quantity: item.quantity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (!nextItems.length) {
      showToast("Bu buyurtmadagi taomlar hozir menyuda mavjud emas.", 'warning');
      return;
    }
    setItems(nextItems);
    navigate('/customer/cart');
  };

  // Hero gradient by order state
  const heroGradient = isActiveOrder
    ? 'linear-gradient(160deg, #7A0000 0%, #C62020 50%, #E83535 100%)'
    : isDelivered
    ? 'linear-gradient(160deg, #064e3b 0%, #059669 50%, #10b981 100%)'
    : 'linear-gradient(160deg, #1c1c1e 0%, #2c2c2e 100%)';

  // Overlay circle decoration inside hero (decorative)
  const heroOverlay = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[32px]"
    >
      <div
        className="absolute -right-12 -top-12 h-52 w-52 rounded-full opacity-10"
        style={{ background: 'rgba(255,255,255,0.6)' }}
      />
      <div
        className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full opacity-10"
        style={{ background: 'rgba(255,255,255,0.5)' }}
      />
    </div>
  );

  return (
    <div
      className="animate-in fade-in duration-300"
      style={{
        minHeight: '100dvh',
        background: 'var(--tg-theme-bg-color, #ffffff)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      }}
    >
      {/* ━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        className="relative"
        style={{
          background: heroGradient,
          borderRadius: '0 0 32px 32px',
          paddingTop: 'calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 10px)',
          paddingBottom: 28,
        }}
      >
        {heroOverlay}

        {/* top row: back + copy */}
        <div className="relative flex items-center justify-between px-4 pb-3">
          <button
            type="button"
            onClick={() => navigate('/customer/orders')}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity active:opacity-60"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            aria-label="Orqaga"
          >
            <ArrowLeft size={20} />
          </button>

          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity active:opacity-60"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            aria-label="Nusxalash"
          >
            {copyState === 'copied'
              ? <span className="text-[10px] font-black">✓</span>
              : <Copy size={17} />}
          </button>
        </div>

        {/* restaurant + order number */}
        <div className="relative px-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
            Turon Kafesi
          </p>
          <h1 className="mt-1 text-[2.4rem] font-black leading-none tracking-[-0.05em] text-white">
            #{order.orderNumber}
          </h1>
          <p className="mt-1.5 text-[13px] font-semibold text-white/60">{createdAt}</p>
        </div>

        {/* status block */}
        <div className="relative mt-5 px-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/55">
            {isConnected ? 'Jonli status' : isCancelled ? 'Holat' : 'Buyurtma holati'}
          </p>
          <h2
            className="mt-2 text-[1.6rem] font-black leading-tight tracking-[-0.03em]"
            style={{ color: trackingMeta.isArrivingNow ? '#6ee7b7' : '#fff' }}
          >
            {trackingMeta.stageLabel}
          </h2>
          <p className="mt-1.5 text-[14px] leading-6 text-white/65">{trackingMeta.statusLine}</p>

          {trackingMeta.isArrivingNow && (
            <div className="mt-3 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[12px] font-black text-emerald-300">Kuryer yetib keldi!</span>
            </div>
          )}
          {!trackingMeta.isArrivingNow && trackingMeta.isNearArrival && (
            <div className="mt-3 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
              </span>
              <span className="text-[12px] font-black text-amber-300">Yaqin qoldi</span>
            </div>
          )}
        </div>

        {/* total + pills row */}
        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 px-5">
          <div className="flex flex-wrap gap-2">
            <span
              className="rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em]"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.90)' }}
            >
              {paymentLabel}
            </span>
            <span
              className="rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em]"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.90)' }}
            >
              {paymentStatusLabel}
            </span>
            {trackingMeta.courierLabel ? (
              <span
                className="rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em]"
                style={{ background: 'rgba(56,189,248,0.25)', color: 'rgba(186,230,253,1)' }}
              >
                {trackingMeta.courierLabel}
              </span>
            ) : null}
          </div>

          <div
            className="rounded-[14px] px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Jami</p>
            <p className="mt-0.5 text-[18px] font-black text-white">{order.total.toLocaleString()} so'm</p>
          </div>
        </div>
      </div>

      {/* ━━━ CONTENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="space-y-3 px-4 pt-4">

        {/* Action Buttons */}
        {(canOpenLiveTracking || isActiveOrder) && (
          <div className="grid grid-cols-2 gap-3">
            {canOpenLiveTracking ? (
              <button
                type="button"
                onClick={() => navigate(`/customer/orders/${order.id}/tracking`)}
                className="flex flex-col items-center gap-2.5 rounded-[20px] px-3 py-4 text-white transition-opacity active:opacity-75"
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  boxShadow: '0 4px 14px rgba(5,150,105,0.35)',
                }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                  <MapPinned size={20} />
                </div>
                <span className="text-[12px] font-black">Xaritada kuzat</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => navigate(`/customer/support?orderId=${order.id}`)}
              className="flex flex-col items-center gap-2.5 rounded-[20px] px-3 py-4 transition-opacity active:opacity-75"
              style={{
                background: 'var(--tg-theme-secondary-bg-color, #f2f2f7)',
                border: '1.5px solid rgba(0,0,0,0.06)',
                color: 'var(--tg-theme-text-color)',
              }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: 'rgba(0,0,0,0.06)' }}
              >
                <Headphones size={20} />
              </div>
              <span className="text-[12px] font-black">Support</span>
            </button>

            {isActiveOrder && order.courierId && (
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="relative flex flex-col items-center gap-2.5 rounded-[20px] px-3 py-4 text-white transition-opacity active:opacity-75"
                style={{
                  background: 'linear-gradient(135deg, #4338ca, #6366f1)',
                  boxShadow: '0 4px 14px rgba(67,56,202,0.35)',
                }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                  <MessageCircle size={20} />
                </div>
                <span className="text-[12px] font-black">Kuryer chat</span>
                {unreadCount > 0 && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {isActiveOrder ? (
              <button
                type="button"
                onClick={() => navigate(`/customer/support?orderId=${order.id}&topic=cancel`)}
                className="flex flex-col items-center gap-2.5 rounded-[20px] px-3 py-4 transition-opacity active:opacity-75"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1.5px solid rgba(239,68,68,0.18)',
                  color: '#dc2626',
                }}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  style={{ background: 'rgba(239,68,68,0.10)' }}
                >
                  <XCircle size={20} />
                </div>
                <span className="text-[12px] font-black">Bekor qilish</span>
              </button>
            ) : null}

            {/* Support always visible even without live tracking */}
            {!canOpenLiveTracking && !order.courierId && !isActiveOrder && (
              <button
                type="button"
                onClick={() => navigate(`/customer/support?orderId=${order.id}`)}
                className="flex flex-col items-center gap-2.5 rounded-[20px] px-3 py-4 transition-opacity active:opacity-75"
                style={{
                  background: 'var(--tg-theme-secondary-bg-color, #f2f2f7)',
                  border: '1.5px solid rgba(0,0,0,0.06)',
                  color: 'var(--tg-theme-text-color)',
                }}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  style={{ background: 'rgba(0,0,0,0.06)' }}
                >
                  <Headphones size={20} />
                </div>
                <span className="text-[12px] font-black">Support</span>
              </button>
            )}
          </div>
        )}

        {/* Timeline */}
        <OrderTimeline status={order.orderStatus} />

        {/* Order Items */}
        <Card>
          <SectionTitle>Buyurtma tarkibi</SectionTitle>
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center justify-between rounded-[14px] px-3.5 py-3.5"
                style={{ background: 'var(--tg-theme-bg-color, #fff)' }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                    style={{ background: '#C62020' }}
                  >
                    {item.quantity}x
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
                      {formatText(item.name)}
                    </p>
                    <p className="mt-0.5 text-[12px]" style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}>
                      {item.price.toLocaleString()} so'm
                    </p>
                  </div>
                </div>
                <p className="shrink-0 pl-2 text-[15px] font-black" style={{ color: 'var(--tg-theme-text-color)' }}>
                  {(item.price * item.quantity).toLocaleString()} so'm
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Payment Summary */}
        <Card>
          <SectionTitle>To'lov va yetkazish</SectionTitle>
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold" style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}>
                Taomlar summasi
              </span>
              <span className="text-[14px] font-black" style={{ color: 'var(--tg-theme-text-color)' }}>
                {order.subtotal.toLocaleString()} so'm
              </span>
            </div>

            {order.discount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-emerald-600">Chegirma</span>
                <span className="text-[14px] font-black text-emerald-600">
                  -{order.discount.toLocaleString()} so'm
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold" style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}>
                Yetkazish
              </span>
              <span className="text-[14px] font-black" style={{ color: 'var(--tg-theme-text-color)' }}>
                {order.deliveryFee.toLocaleString()} so'm
              </span>
            </div>

            <div
              className="flex items-center justify-between pt-3.5"
              style={{ borderTop: '1.5px solid rgba(0,0,0,0.07)' }}
            >
              <span
                className="text-[11px] font-black uppercase tracking-[0.14em]"
                style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}
              >
                Umumiy
              </span>
              <span className="text-[22px] font-black" style={{ color: 'var(--tg-theme-text-color)' }}>
                {order.total.toLocaleString()} so'm
              </span>
            </div>
          </div>
        </Card>

        {/* Delivery Info */}
        <Card>
          <SectionTitle>Yetkazish ma'lumoti</SectionTitle>
          <div className="space-y-4">
            <div>
              <p
                className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em]"
                style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}
              >
                Manzil
              </p>
              <p className="text-[14px] font-semibold leading-6" style={{ color: 'var(--tg-theme-text-color)' }}>
                {formatText(order.customerAddress?.addressText || "Manzil ko'rsatilmagan")}
              </p>
              <OrderDistanceDisplay
                courier={courierLocation}
                destination={destinationLocation}
                label="Buyurtmagacha masofa"
                className="mt-1 text-[12px] font-semibold"
              />
            </div>

            <div
              className="h-px"
              style={{ background: 'rgba(0,0,0,0.07)' }}
            />

            <div>
              <p
                className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em]"
                style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}
              >
                Izoh
              </p>
              <p className="text-[14px] font-semibold leading-6" style={{ color: 'var(--tg-theme-text-color)' }}>
                {order.note ? formatText(order.note) : "Izoh qoldirilmagan"}
              </p>
            </div>

            <div
              className="h-px"
              style={{ background: 'rgba(0,0,0,0.07)' }}
            />

            <div>
              <p
                className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em]"
                style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}
              >
                To'lov
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold" style={{ color: 'var(--tg-theme-text-color)' }}>
                  {paymentLabel}
                </span>
                {order.verificationStatus ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]"
                    style={{
                      background: 'rgba(5,150,105,0.10)',
                      border: '1px solid rgba(5,150,105,0.18)',
                      color: '#059669',
                    }}
                  >
                    <ShieldCheck size={11} />
                    Admin tasdiqlagan
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        {/* Rating prompt */}
        {order.orderStatus === OrderStatus.DELIVERED && !order.customerRating && (
          <button
            type="button"
            onClick={() => setIsRatingOpen(true)}
            className="flex w-full items-center gap-4 rounded-[20px] px-4 py-4 text-left transition-opacity active:opacity-75"
            style={{
              background: 'rgba(245,158,11,0.09)',
              border: '1.5px solid rgba(245,158,11,0.22)',
            }}
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(245,158,11,0.15)' }}
            >
              <Star size={22} className="text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-black text-amber-600">Yetkazishni baholang</p>
              <p className="mt-0.5 text-[12px] text-amber-500/70">Fikringiz bizga muhim</p>
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={13} className="fill-amber-400/40 text-amber-400/40" />
              ))}
            </div>
          </button>
        )}

        {order.orderStatus === OrderStatus.DELIVERED && order.customerRating && (
          <div
            className="flex items-center gap-4 rounded-[20px] px-4 py-4"
            style={{
              background: 'rgba(5,150,105,0.07)',
              border: '1.5px solid rgba(5,150,105,0.15)',
            }}
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(5,150,105,0.12)' }}
            >
              <Star size={22} className="fill-emerald-500 text-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-black text-emerald-600">Bahoyingiz</p>
              <div className="mt-1 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={15}
                    className={
                      s <= (order.customerRating ?? 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-300 text-slate-300'
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reorder CTA */}
        <button
          type="button"
          onClick={handleReorder}
          className="flex h-[58px] w-full items-center justify-center gap-3 rounded-[20px] text-[16px] font-black transition-opacity active:opacity-80"
          style={
            isActiveOrder
              ? {
                  background: 'var(--tg-theme-secondary-bg-color, #f2f2f7)',
                  border: '1.5px solid rgba(0,0,0,0.06)',
                  color: 'var(--tg-theme-text-color)',
                }
              : {
                  background: 'linear-gradient(135deg, #8B0000 0%, #C62020 100%)',
                  color: '#fff',
                  boxShadow: '0 6px 20px rgba(198,32,32,0.40)',
                }
          }
        >
          <RefreshCcw size={19} />
          <span>{isActiveOrder ? "Savatga qayta qo'shish" : 'Qayta buyurtma berish'}</span>
        </button>
      </div>

      {/* ━━━ Chat overlay ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isChatOpen && (
        <OrderChatPanel
          orderId={order.id}
          role="customer"
          theme="dark"
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {isRatingOpen && (
        <OrderRatingModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          onClose={() => setIsRatingOpen(false)}
        />
      )}
    </div>
  );
};

export default OrderDetailPage;
