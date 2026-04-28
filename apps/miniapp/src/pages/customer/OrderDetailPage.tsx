import React from 'react';
import { OrderDistanceDisplay } from '../../components/OrderDistanceDisplay';
import { ArrowLeft, Copy, RefreshCcw, Headphones, Loader2, MapPinned, MessageCircle, ShieldCheck, Star, XCircle } from 'lucide-react';
import { OrderRatingModal } from '../../components/customer/OrderRatingModal';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { CheckoutSectionCard } from '../../components/customer/CheckoutComponents';
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
  if (status === PaymentStatus.COMPLETED) return 'Tasdiqlangan';
  if (status === PaymentStatus.FAILED) return 'Rad etilgan';
  return 'Tekshiruvda';
}

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
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }} />
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
    window.setTimeout(() => setCopyState('idle'), 1600);
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

  // Hero card gradient adapts to order status — text is always white over colored bg
  const heroGradient = isActiveOrder
    ? 'linear-gradient(135deg, #8B0000 0%, #C62020 55%, #E83535 100%)'
    : isDelivered
    ? 'linear-gradient(135deg, #064e3b 0%, #065f46 55%, #047857 100%)'
    : undefined;

  const heroOnColor = heroGradient !== undefined; // white text is safe over colored bg
  const heroText: React.CSSProperties = heroOnColor
    ? { color: 'rgba(255,255,255,0.96)' }
    : { color: 'var(--tg-theme-text-color)' };
  const heroHint: React.CSSProperties = heroOnColor
    ? { color: 'rgba(255,255,255,0.60)' }
    : { color: 'var(--tg-theme-hint-color, #8e8e93)' };
  const heroChip: React.CSSProperties = heroOnColor
    ? { background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.88)' }
    : { background: 'var(--tg-theme-bg-color)', border: '1px solid rgba(0,0,0,0.07)', color: 'var(--tg-theme-hint-color, #8e8e93)' };

  const iconBtn: React.CSSProperties = {
    background: 'var(--tg-theme-secondary-bg-color, #f2f2f7)',
    border: '1px solid rgba(0,0,0,0.06)',
    color: 'var(--tg-theme-text-color)',
  };

  return (
    <div
      className="min-h-screen animate-in fade-in duration-300"
      style={{ paddingBottom: 'calc(var(--customer-nav-top-edge, 78px) + 20px)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+14px)]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/customer/orders')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
            style={iconBtn}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0 flex-1 px-1">
            <p
              className="text-[10px] font-black uppercase tracking-[0.16em]"
              style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}
            >
              Turon Kafesi
            </p>
            <h1
              className="mt-1 text-[1.85rem] font-black tracking-[-0.05em]"
              style={{ color: 'var(--tg-theme-text-color)' }}
            >
              #{order.orderNumber}
            </h1>
            <p
              className="mt-1 text-sm font-semibold"
              style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}
            >
              {createdAt}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
            style={iconBtn}
            title="Nusxalash"
            aria-label="Nusxalash"
          >
            <Copy size={18} />
          </button>
        </div>
      </section>

      {/* ── Status Hero Card ────────────────────────────────────────────────────── */}
      <section className="px-4">
        <div
          className="rounded-[22px] p-5 shadow-[0_8px_28px_rgba(0,0,0,0.13)]"
          style={
            heroGradient
              ? { background: heroGradient }
              : { background: 'var(--tg-theme-secondary-bg-color, #f2f2f7)' }
          }
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={heroHint}>
                {isConnected ? 'Jonli status' : isCancelled ? 'Holat' : 'Buyurtma holati'}
              </p>

              <h2
                className="mt-2 text-[1.55rem] font-black leading-[0.98] tracking-[-0.04em]"
                style={trackingMeta.isArrivingNow ? { color: '#6ee7b7' } : heroText}
              >
                {trackingMeta.stageLabel}
              </h2>

              <p className="mt-2 text-sm leading-6" style={heroHint}>
                {trackingMeta.statusLine}
              </p>

              {trackingMeta.isArrivingNow && (
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-[11px] font-black text-emerald-300">Kuryer yetib keldi!</span>
                </div>
              )}

              {!trackingMeta.isArrivingNow && trackingMeta.isNearArrival && (
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                  <span className="text-[11px] font-black text-amber-300">Yaqin qoldi</span>
                </div>
              )}
            </div>

            {/* Total chip */}
            <div className="shrink-0 rounded-[14px] px-3.5 py-3 text-right" style={heroChip}>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-70">Jami</p>
              <p className="mt-1 text-[17px] font-black">{order.total.toLocaleString()} so'm</p>
            </div>
          </div>

          {/* Status pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]" style={heroChip}>
              {paymentLabel}
            </span>
            <span className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]" style={heroChip}>
              {paymentStatusLabel}
            </span>

            {trackingMeta.courierLabel ? (
              <span
                className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]"
                style={{
                  background: 'rgba(56,189,248,0.16)',
                  border: '1px solid rgba(56,189,248,0.26)',
                  color: heroOnColor ? 'rgba(186,230,253,1)' : '#0ea5e9',
                }}
              >
                {trackingMeta.courierLabel}
              </span>
            ) : null}

            {copyState === 'copied' && (
              <span
                className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]"
                style={{
                  background: 'rgba(52,211,153,0.16)',
                  border: '1px solid rgba(52,211,153,0.26)',
                  color: heroOnColor ? 'rgba(167,243,208,1)' : '#059669',
                }}
              >
                Nusxalandi
              </span>
            )}
            {copyState === 'failed' && (
              <span
                className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]"
                style={{
                  background: 'rgba(251,113,133,0.16)',
                  border: '1px solid rgba(251,113,133,0.26)',
                  color: heroOnColor ? 'rgba(253,164,175,1)' : '#f43f5e',
                }}
              >
                Nusxalab bo'lmadi
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Action Buttons ──────────────────────────────────────────────────────── */}
      <section className="px-4 pt-3">
        <div className="grid grid-cols-2 gap-3">
          {canOpenLiveTracking ? (
            <button
              type="button"
              onClick={() => navigate(`/customer/orders/${order.id}/tracking`)}
              className="flex flex-col items-center justify-center gap-2 rounded-[18px] px-3 py-4 text-white shadow-md transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              <MapPinned size={20} />
              <span className="text-[12px] font-black">Xaritada kuzat</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => navigate(`/customer/support?orderId=${order.id}`)}
            className="flex flex-col items-center justify-center gap-2 rounded-[18px] px-3 py-4 transition-transform active:scale-95"
            style={{ background: 'var(--tg-theme-secondary-bg-color, #f2f2f7)', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--tg-theme-text-color)' }}
          >
            <Headphones size={20} />
            <span className="text-[12px] font-black">Support</span>
          </button>

          {isActiveOrder && order.courierId && (
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="relative flex flex-col items-center justify-center gap-2 rounded-[18px] px-3 py-4 text-white shadow-md transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)' }}
            >
              <MessageCircle size={20} />
              <span className="text-[12px] font-black">Kuryer chat</span>
              {unreadCount > 0 && (
                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {isActiveOrder ? (
            <button
              type="button"
              onClick={() => navigate(`/customer/support?orderId=${order.id}&topic=cancel`)}
              className="flex flex-col items-center justify-center gap-2 rounded-[18px] px-3 py-4 transition-transform active:scale-95"
              style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.18)', color: '#dc2626' }}
            >
              <XCircle size={20} />
              <span className="text-[12px] font-black">Bekor qilish</span>
            </button>
          ) : null}
        </div>
      </section>

      {/* ── Chat overlay ────────────────────────────────────────────────────────── */}
      {isChatOpen && (
        <OrderChatPanel
          orderId={order.id}
          role="customer"
          theme="dark"
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* ── Order Timeline ──────────────────────────────────────────────────────── */}
      <section className="px-4 pt-4">
        <OrderTimeline status={order.orderStatus} />
      </section>

      {/* ── Order Items ─────────────────────────────────────────────────────────── */}
      <section className="px-4 pt-4">
        <CheckoutSectionCard title="Buyurtma tarkibi">
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center justify-between rounded-[14px] px-3.5 py-3"
                style={{ background: 'var(--tg-theme-secondary-bg-color, #f2f2f7)' }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                    style={{ background: '#C62020' }}>
                    {item.quantity}x
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
                      {formatText(item.name)}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}>
                      {item.price.toLocaleString()} so'm / dona
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-black" style={{ color: 'var(--tg-theme-text-color)' }}>
                  {(item.price * item.quantity).toLocaleString()} so'm
                </p>
              </div>
            ))}
          </div>
        </CheckoutSectionCard>
      </section>

      {/* ── Payment Summary ─────────────────────────────────────────────────────── */}
      <section className="px-4">
        <CheckoutSectionCard title="To'lov va yetkazish">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}>Taomlar summasi</span>
              <span className="font-black" style={{ color: 'var(--tg-theme-text-color)' }}>
                {order.subtotal.toLocaleString()} so'm
              </span>
            </div>
            {order.discount > 0 ? (
              <div className="flex items-center justify-between text-sm font-semibold text-emerald-600">
                <span>Chegirma</span>
                <span className="font-black">-{order.discount.toLocaleString()} so'm</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm font-semibold">
              <span style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}>Yetkazish</span>
              <span className="font-black" style={{ color: 'var(--tg-theme-text-color)' }}>
                {order.deliveryFee.toLocaleString()} so'm
              </span>
            </div>
            <div
              className="flex items-center justify-between pt-4"
              style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
            >
              <span
                className="text-[10px] font-black uppercase tracking-[0.14em]"
                style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}
              >
                Umumiy
              </span>
              <span className="text-xl font-black" style={{ color: 'var(--tg-theme-text-color)' }}>
                {order.total.toLocaleString()} so'm
              </span>
            </div>
          </div>
        </CheckoutSectionCard>
      </section>

      {/* ── Delivery Info ───────────────────────────────────────────────────────── */}
      <section className="px-4">
        <CheckoutSectionCard title="Yetkazish ma'lumoti">
          <div className="space-y-4">
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-[0.14em]"
                style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}
              >
                Manzil
              </p>
              <p
                className="mt-1.5 text-sm font-semibold leading-6"
                style={{ color: 'var(--tg-theme-text-color)' }}
              >
                {formatText(order.customerAddress?.addressText || "Manzil ko'rsatilmagan")}
              </p>
              <OrderDistanceDisplay
                courier={courierLocation}
                destination={destinationLocation}
                label="Buyurtmagacha masofa"
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-[0.14em]"
                style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}
              >
                Izoh
              </p>
              <p
                className="mt-1.5 text-sm font-semibold leading-6"
                style={{ color: 'var(--tg-theme-text-color)' }}
              >
                {order.note ? formatText(order.note) : "Izoh qoldirilmagan"}
              </p>
            </div>
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-[0.14em]"
                style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}
              >
                To'lov
              </p>
              <div
                className="mt-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold"
                style={{ color: 'var(--tg-theme-text-color)' }}
              >
                <span>{paymentLabel}</span>
                {order.verificationStatus ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]"
                    style={{
                      background: 'rgba(16,185,129,0.09)',
                      border: '1px solid rgba(16,185,129,0.18)',
                      color: '#059669',
                    }}
                  >
                    <ShieldCheck size={12} />
                    Admin tasdiqlagan
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </CheckoutSectionCard>
      </section>

      {/* ── Rating Prompt ───────────────────────────────────────────────────────── */}
      {order.orderStatus === OrderStatus.DELIVERED && !order.customerRating && (
        <section className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setIsRatingOpen(true)}
            className="flex w-full items-center gap-4 rounded-[18px] px-4 py-4 text-left transition-transform active:scale-[0.985]"
            style={{ background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.20)' }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(245,158,11,0.14)' }}
            >
              <Star size={20} className="text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black text-amber-600">Yetkazishni baholang</p>
              <p className="mt-0.5 text-[11px] text-amber-500/70">Fikringiz bizga muhim</p>
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={12} className="fill-amber-400/35 text-amber-400/35" />
              ))}
            </div>
          </button>
        </section>
      )}

      {order.orderStatus === OrderStatus.DELIVERED && order.customerRating && (
        <section className="px-4 pb-2">
          <div
            className="flex items-center gap-4 rounded-[18px] px-4 py-4"
            style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(16,185,129,0.12)' }}
            >
              <Star size={20} className="fill-emerald-500 text-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black text-emerald-600">Bahoyingiz</p>
              <div className="mt-1 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
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
        </section>
      )}

      {isRatingOpen && (
        <OrderRatingModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          onClose={() => setIsRatingOpen(false)}
        />
      )}

      {/* ── Reorder Button ──────────────────────────────────────────────────────── */}
      <section className="px-4 pt-2">
        <button
          type="button"
          onClick={handleReorder}
          className="flex h-[56px] w-full items-center justify-center gap-3 rounded-[18px] text-base font-black shadow-md transition-transform active:scale-[0.985]"
          style={
            isActiveOrder
              ? {
                  background: 'var(--tg-theme-secondary-bg-color, #f2f2f7)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  color: 'var(--tg-theme-text-color)',
                }
              : {
                  background: 'linear-gradient(135deg, #8B0000 0%, #C62020 100%)',
                  color: '#fff',
                }
          }
        >
          <RefreshCcw size={18} />
          <span>{isActiveOrder ? "Savatga qayta qo'shish" : 'Qayta buyurtma berish'}</span>
        </button>
      </section>
    </div>
  );
};

export default OrderDetailPage;
