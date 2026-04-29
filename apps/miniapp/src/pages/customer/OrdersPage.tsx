import React, { useCallback, useMemo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OrderCard, OrderTimeline, OrdersEmptyState } from '../../components/customer/OrderHistoryComponents';
import { Order, OrderStatus } from '../../data/types';
import { isOrderStale } from '../../lib/orderStaleUtils';
import { useMyOrders } from '../../hooks/queries/useOrders';
import { useProducts } from '../../hooks/queries/useMenu';
import { useCartStore } from '../../store/useCartStore';
import { useToast } from '../../components/ui/Toast';
import { initiateCall } from '../../lib/callUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Section header used by Active / Stale / Completed lists.
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeading: React.FC<{
  eyebrow: string;
  title: string;
  trailing?: React.ReactNode;
}> = ({ eyebrow, title, trailing }) => (
  <div className="mb-4 flex items-end justify-between gap-3">
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-[22px] font-black tracking-tight text-[var(--app-text)]">{title}</h2>
    </div>
    {trailing}
  </div>
);

const ActiveOrdersList = React.memo(({
  orders,
  onNavigate,
  onCall,
}: {
  orders: Order[];
  onNavigate: (id: string) => void;
  onCall: (phone: string) => void;
}) => (
  <section>
    <SectionHeading
      eyebrow="Hozir"
      title="Faol buyurtmalar"
      trailing={
        <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          {orders.length} ta
        </span>
      }
    />
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[14px] font-black text-[var(--app-text)]">
              Buyurtma #{order.orderNumber}
            </span>
            <button
              onClick={() => onNavigate(order.id)}
              className="text-[13px] font-bold text-[#C62020] transition-opacity active:opacity-70 dark:text-[#ff8a8a]"
            >
              Batafsil
            </button>
          </div>
          <OrderTimeline
            status={order.orderStatus}
            onCallCourier={() => onCall(order.courierPhone || '+998901234567')}
          />
        </div>
      ))}
    </div>
  </section>
));

const CompletedOrdersList = React.memo(({
  orders,
  onNavigate,
  onReorder,
  onRefetch,
}: {
  orders: Order[];
  onNavigate: (id: string) => void;
  onReorder: (order: Order) => void;
  onRefetch: () => void;
}) => (
  <section>
    <SectionHeading
      eyebrow="Tarix"
      title="Oldingi buyurtmalar"
      trailing={
        <button
          onClick={onRefetch}
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--app-soft)] px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-soft-hover)]"
        >
          <RefreshCw size={14} />
          <span>Yangilash</span>
        </button>
      }
    />
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onClick={() => onNavigate(order.id)}
          onReorder={() => onReorder(order)}
        />
      ))}
    </div>
  </section>
));

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: orders = [], isLoading, isFetching, error, refetch } = useMyOrders();
  const { data: products = [] } = useProducts();
  const { setItems } = useCartStore();

  const handleReorder = useCallback(
    (order: Order) => {
      const productMap = new Map(products.map((p) => [p.id, p]));
      const nextItems = order.items
        .map((item) => {
          const menuItemId = (item as any).menuItemId ?? item.id;
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
            quantity: (item as any).quantity ?? 1,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (!nextItems.length) {
        showToast('Bu buyurtmadagi taomlar hozir menyuda mavjud emas.', 'warning');
        return;
      }
      setItems(nextItems);
      navigate('/customer/cart');
    },
    [products, setItems, navigate, showToast],
  );

  const handleNavigate = useCallback((id: string) => navigate(`/customer/orders/${id}`), [navigate]);
  const handleCallCourier = useCallback((phone: string) => initiateCall(phone, 'kuryer'), []);
  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  const { activeOrders, staleOrders, completedOrders } = useMemo(() => {
    const isTerminal = (order: Order) =>
      order.orderStatus === OrderStatus.DELIVERED || order.orderStatus === OrderStatus.CANCELLED;
    return {
      activeOrders: orders.filter((order) => !isTerminal(order) && !isOrderStale(order)),
      staleOrders: orders.filter((order) => !isTerminal(order) && isOrderStale(order)),
      completedOrders: orders.filter(isTerminal),
    };
  }, [orders]);

  // Skeleton on first paint only (preserves cache transitions).
  if (isLoading && !orders.length) {
    return (
      <div
        className="min-h-screen bg-[var(--app-bg)] px-4 pb-6 pt-4 text-[var(--app-text)]"
        style={{ paddingBottom: 'calc(var(--customer-nav-top-edge, 78px) + 16px)' }}
      >
        <div className="mb-4 mt-2 flex items-end justify-between">
          <div>
            <div className="mb-2.5 h-3 w-16 animate-pulse rounded-full bg-[var(--app-soft)]" />
            <div className="h-6 w-40 animate-pulse rounded-lg bg-[var(--app-soft)]" />
          </div>
          <div className="h-6 w-12 animate-pulse rounded-full bg-[var(--app-soft)]" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[20px] border border-[var(--app-line)] bg-[var(--app-card)] p-4"
              style={{ boxShadow: 'var(--app-soft-shadow)' }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="h-4 w-32 animate-pulse rounded-md bg-[var(--app-soft)]" />
                <div className="h-4 w-16 animate-pulse rounded-md bg-[var(--app-soft)]" />
              </div>
              <div className="mb-4 h-20 w-full animate-pulse rounded-[14px] bg-[var(--app-soft)]" />
              <div className="mt-2 flex items-center justify-between border-t border-[var(--app-line)] pt-4">
                <div className="h-4 w-24 animate-pulse rounded-md bg-[var(--app-soft)]" />
                <div className="h-9 w-28 animate-pulse rounded-full bg-[var(--app-soft)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[var(--app-bg)] px-5 text-center text-[var(--app-text)]">
        <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
          <AlertCircle size={34} />
        </div>
        <h2 className="mt-6 text-2xl font-black tracking-tight">Buyurtmalarni yuklab bo'lmadi</h2>
        <p className="mt-3 max-w-[260px] text-sm leading-6 text-[var(--app-muted)]">
          {(error as Error).message}
        </p>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--app-soft)] px-6 py-3.5 text-sm font-black text-[var(--app-text)] transition-transform active:scale-[0.985]"
        >
          <RefreshCw size={16} />
          <span>Qayta yuklash</span>
        </button>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
        <OrdersEmptyState onShop={() => navigate('/customer')} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] animate-in fade-in duration-300"
      style={{ paddingBottom: 'calc(var(--customer-nav-top-edge, 78px) + 16px)' }}
    >
      {isFetching && orders.length > 0 ? (
        <div className="flex justify-center pb-1 pt-3">
          <span className="animate-pulse text-[10px] font-bold uppercase tracking-widest text-[var(--app-muted)]">
            Yangilanmoqda...
          </span>
        </div>
      ) : null}

      <div className="space-y-8 px-4 pb-6 pt-4">
        {activeOrders.length > 0 ? (
          <ActiveOrdersList
            orders={activeOrders}
            onNavigate={handleNavigate}
            onCall={handleCallCourier}
          />
        ) : null}

        {staleOrders.length > 0 ? (
          <section>
            <SectionHeading
              eyebrow="Muddati o'tgan"
              title="Eskirgan"
              trailing={
                <span className="rounded-full bg-[var(--app-soft)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[var(--app-muted)]">
                  {staleOrders.length} ta
                </span>
              }
            />
            <div className="space-y-4">
              {staleOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => handleNavigate(order.id)}
                  onReorder={() => handleReorder(order)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {completedOrders.length > 0 ? (
          <CompletedOrdersList
            orders={completedOrders}
            onNavigate={handleNavigate}
            onReorder={handleReorder}
            onRefetch={handleRefetch}
          />
        ) : null}
      </div>
    </div>
  );
};

export default OrdersPage;
