import React from 'react';
import { ArrowLeft, Copy, RefreshCcw, Headphones, Loader2, MapPinned, MessageCircle, ShieldCheck, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { CheckoutSectionCard } from '../../components/customer/CheckoutComponents';
import { OrderTimeline } from '../../components/customer/OrderHistoryComponents';
import { ErrorStateCard } from '../../components/ui/FeedbackStates';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../data/types';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { getCustomerTrackingMeta } from '../../features/tracking/customerTracking';
import { estimateRouteMetrics, formatRouteDistance } from '../../features/maps/route';
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

const OrderDistanceDisplay: React.FC<{ order: any }> = ({ order }) => {
  const courier = order?.tracking?.courierLocation;
  const destLat = order?.destinationLat ?? order?.customerAddress?.latitude;
  const destLng = order?.destinationLng ?? order?.customerAddress?.longitude;

  if (!courier || typeof destLat !== 'number' || typeof destLng !== 'number') {
    return (
      <p className="mt-1 text-xs text-white/48">
        Buyurtmagacha masofa: <span className="italic">Hisoblanmoqda...</span>
      </p>
    );
  }

  const { distanceKm } = estimateRouteMetrics(
    { lat: courier.latitude, lng: courier.longitude },
    { lat: destLat, lng: destLng },
    { minimumDistanceKm: 0 },
  );

  return (
    <p className="mt-1 text-xs text-white/48">
      Buyurtmagacha masofa: <span className="font-bold">{formatRouteDistance(distanceKm)}</span>
    </p>
  );
};

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
  const { data: unreadCount = 0 } = useOrderChatUnread(orderId, 'customer');
  const prevArrivingNow = React.useRef(false);

  // Haptic notification when courier transitions to ≤ 50 m from customer
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
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-10">
        <ErrorStateCard
          title="Buyurtma"
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
      <div className="px-4 py-20 text-center text-white">
        <p className="text-xl font-black">Buyurtma topilmadi</p>
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
  const trackingMeta = getCustomerTrackingMeta(order, language);

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
    const productMap = new Map(products.map((product) => [product.id, product]));
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

  return (
    <div
      className="min-h-screen animate-in fade-in duration-300"
      style={{ paddingBottom: 'calc(var(--customer-nav-top-edge, 78px) + 16px)' }}
    >
      <section className="px-4 pb-5 pt-[calc(env(safe-area-inset-top,0px)+14px)]">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/customer/orders')}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0 flex-1 px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">Turon Kafesi</p>
            <h1 className="mt-1.5 text-[1.85rem] font-black tracking-[-0.05em] text-white">#{order.orderNumber}</h1>
            <p className="mt-2 text-sm font-semibold text-white/58">{createdAt}</p>
          </div>

          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white"
            title="Nusxalash"
            aria-label="Nusxalash"
          >
            <Copy size={18} />
          </button>
        </div>
      </section>

      <section className="px-4">
        <div className="rounded-[12px] border border-white/10 bg-[linear-gradient(135deg,#111827_0%,#0f172a_65%,#1e293b_100%)] p-4 shadow-[0_16px_32px_rgba(2,6,23,0.24)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">
                {isConnected ? 'Jonli status' : 'Buyurtma holati'}
              </p>
              <h2 className={`mt-2 text-[1.55rem] font-black leading-[0.98] tracking-[-0.04em] ${trackingMeta.isArrivingNow ? 'text-emerald-300' : 'text-white'}`}>
                {trackingMeta.stageLabel}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/62">
                {trackingMeta.statusLine}
              </p>
              {trackingMeta.isArrivingNow && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-[11px] font-black text-emerald-300">Kuryer yetib keldi!</span>
                </div>
              )}
              {!trackingMeta.isArrivingNow && trackingMeta.isNearArrival && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                  <span className="text-[11px] font-black text-amber-300">Yaqin qoldi</span>
                </div>
              )}
            </div>
            <div className="rounded-[12px] border border-white/8 bg-white/[0.06] px-3 py-2.5 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/36">Jami</p>
              <p className="mt-1 text-lg font-black text-white">{order.total.toLocaleString()} so'm</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <div className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/68">
              {paymentLabel}
            </div>
            <div className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/68">
              {paymentStatusLabel}
            </div>
            {trackingMeta.courierLabel ? (
              <div className="rounded-full border border-sky-300/18 bg-sky-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-sky-100">
                {trackingMeta.courierLabel}
              </div>
            ) : null}
            {copyState === 'copied' ? (
              <div className="rounded-full border border-emerald-300/18 bg-emerald-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">
                Nusxalandi
              </div>
            ) : null}
            {copyState === 'failed' ? (
              <div className="rounded-full border border-rose-300/18 bg-rose-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-rose-200">
                Nusxalab bo'lmadi
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-4 pt-5">
        <div className="grid grid-cols-2 gap-3">
          {isActiveOrder ? (
            <button
              type="button"
              onClick={() => navigate(`/customer/orders/${order.id}/tracking`)}
              className="flex flex-col items-center justify-center gap-2 rounded-[12px] border border-emerald-300/18 bg-emerald-400/10 px-3 py-3.5 text-emerald-200"
            >
              <MapPinned size={18} />
              <span className="text-[11px] font-black">Xaritada</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => navigate(`/customer/support?orderId=${order.id}`)}
            className="flex flex-col items-center justify-center gap-2 rounded-[12px] border border-white/8 bg-white/[0.05] px-3 py-3.5 text-white"
          >
            <Headphones size={18} />
            <span className="text-[11px] font-black">Support</span>
          </button>
          {isActiveOrder && order.courierId && (
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="relative flex flex-col items-center justify-center gap-2 rounded-[12px] border border-indigo-300/20 bg-indigo-400/10 px-3 py-3.5 text-indigo-200"
            >
              <MessageCircle size={18} />
              <span className="text-[11px] font-black">Kuryer</span>
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/customer/support?orderId=${order.id}&topic=cancel`)}
            className="flex flex-col items-center justify-center gap-2 rounded-[12px] border border-rose-300/16 bg-rose-400/10 px-3 py-3.5 text-rose-200"
          >
            <XCircle size={18} />
            <span className="text-[11px] font-black">Bekor qilish</span>
          </button>
        </div>
      </section>

      {/* ── In-app chat overlay ──────────────────────────────────────────────── */}
      {isChatOpen && (
        <OrderChatPanel
          orderId={order.id}
          role="customer"
          theme="dark"
          onClose={() => setIsChatOpen(false)}
        />
      )}

      <section className="px-4 pt-5">
        <OrderTimeline status={order.orderStatus} />
      </section>

      <section className="space-y-5 px-4 pt-5">
        <CheckoutSectionCard title="Buyurtma tarkibi">
          <div className="space-y-2.5">
            {order.items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center justify-between rounded-[12px] border border-white/8 bg-white/[0.04] px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-black text-white/72">
                    {item.quantity}x
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white/82">{formatText(item.name)}</p>
                    <p className="mt-1 text-xs text-white/38">{item.price.toLocaleString()} so'm / dona</p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-black text-white">
                  {(item.price * item.quantity).toLocaleString()} so'm
                </p>
              </div>
            ))}
          </div>
        </CheckoutSectionCard>

        <CheckoutSectionCard title="To'lov va yetkazish">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-semibold text-white/72">
              <span>Taomlar summasi</span>
              <span className="font-black text-white">{order.subtotal.toLocaleString()} so'm</span>
            </div>
            {order.discount > 0 ? (
              <div className="flex items-center justify-between text-sm font-semibold text-emerald-300">
                <span>Chegirma</span>
                <span className="font-black">-{order.discount.toLocaleString()} so'm</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm font-semibold text-white/72">
              <span>Yetkazish</span>
              <span className="font-black text-white">{order.deliveryFee.toLocaleString()} so'm</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/8 pt-4">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">Umumiy</span>
              <span className="text-xl font-black text-white">{order.total.toLocaleString()} so'm</span>
            </div>
          </div>
        </CheckoutSectionCard>

        <CheckoutSectionCard title="Yetkazish ma'lumoti">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">Manzil</p>
              <p className="mt-1.5 text-sm font-semibold leading-6 text-white/76">
                {formatText(order.customerAddress?.addressText || "Manzil ko'rsatilmagan")}
              </p>
              {/* Buyurtmagacha masofa */}
              <OrderDistanceDisplay order={order} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">Izoh</p>
              <p className="mt-1.5 text-sm font-semibold leading-6 text-white/76">
                {order.note ? formatText(order.note) : "Izoh qoldirilmagan"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">To'lov</p>
              <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-white/76">
                <span>{paymentLabel}</span>
                {order.verificationStatus ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/18 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">
                    <ShieldCheck size={12} />
                    <span>Admin tasdiqlagan</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </CheckoutSectionCard>
      </section>

      <section className="px-4 pt-5">
        <button
          type="button"
          onClick={handleReorder}
          className={`flex h-[52px] w-full items-center justify-center gap-3 rounded-[12px] text-base font-black transition-transform active:scale-[0.985] ${
            isActiveOrder ? 'border border-white/8 bg-white/[0.06] text-white' : 'bg-white text-slate-950'
          }`}
        >
          <RefreshCcw size={18} />
          <span>{isActiveOrder ? "Savatga qayta qo'shish" : 'Qayta buyurtma berish'}</span>
        </button>
      </section>
    </div>
  );
};

export default OrderDetailPage;
