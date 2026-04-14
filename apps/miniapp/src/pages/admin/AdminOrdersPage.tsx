import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { useAdminOrders, useUpdateOrderStatus } from '../../hooks/queries/useOrders';
import { useOrdersStore } from '../../store/useOrdersStore';
import { Order, OrderStatus } from '../../data/types';
import { getNextStatus } from '../../lib/orderStatusUtils';

type OrderFilter = 'ALL' | OrderStatus;

const FILTERS: Array<{ value: OrderFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: OrderStatus.PENDING, label: 'New' },
  { value: OrderStatus.PREPARING, label: 'Preparing' },
  { value: OrderStatus.DELIVERING, label: 'On the way' },
  { value: OrderStatus.DELIVERED, label: 'Completed' },
];

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  [OrderStatus.PENDING]: {
    label: 'New',
    className: 'bg-blue-50 text-blue-600',
  },
  [OrderStatus.PREPARING]: {
    label: 'Preparing',
    className: 'bg-amber-50 text-amber-600',
  },
  [OrderStatus.READY_FOR_PICKUP]: {
    label: 'Ready',
    className: 'bg-emerald-50 text-emerald-600',
  },
  [OrderStatus.DELIVERING]: {
    label: 'On the way',
    className: 'bg-emerald-50 text-emerald-600',
  },
  [OrderStatus.DELIVERED]: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-600',
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-600',
  },
};

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.PENDING]: 'Accept',
  [OrderStatus.PREPARING]: 'Ready',
  [OrderStatus.READY_FOR_PICKUP]: 'Send',
  [OrderStatus.DELIVERING]: 'Track',
  [OrderStatus.DELIVERED]: 'View',
  [OrderStatus.CANCELLED]: 'View',
};

function getMinutesSince(timestamp: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000));
}

function formatOrderTime(timestamp: string) {
  const minutes = getMinutesSince(timestamp);

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours} hr ago`;
}

function matchesSearch(order: Order, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchableValues = [
    order.orderNumber?.toString(),
    order.customerName,
    order.customerPhone,
    order.courierName,
    order.customerAddress?.addressText,
    order.customerAddress?.label,
  ];

  return searchableValues.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

const OrdersSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-12 rounded-[20px] bg-white" />
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-9 w-24 shrink-0 rounded-full bg-white" />
      ))}
    </div>
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="h-28 rounded-[18px] bg-white" />
    ))}
  </div>
);

interface OrderListCardProps {
  order: Order;
  isMutating: boolean;
  onOpen: () => void;
  onPrimaryAction: () => void;
}

const OrderListCard: React.FC<OrderListCardProps> = ({
  order,
  isMutating,
  onOpen,
  onPrimaryAction,
}) => {
  const meta = STATUS_META[order.orderStatus];
  const actionLabel = ACTION_LABELS[order.orderStatus] || 'View';

  return (
    <article className="rounded-[18px] bg-white px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 text-left">
          <div className="flex items-center gap-2">
            <p className="text-base font-black leading-none text-slate-950">#{order.orderNumber}</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${meta.className}`}>
              {meta.label}
            </span>
          </div>
          <p className="mt-3 truncate text-sm font-semibold text-slate-500">
            {order.customerName || 'Mijoz'}
          </p>
        </button>

        <div className="shrink-0 text-right">
          <p className="text-base font-black leading-none text-slate-950">
            {order.total.toLocaleString()} UZS
          </p>
          <p className="mt-3 text-xs font-semibold text-slate-500">{formatOrderTime(order.createdAt)}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">
          {order.items.length} items
        </p>
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={isMutating}
          className="flex h-10 min-w-[70px] items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-black text-white active:scale-[0.98] disabled:opacity-60"
        >
          {isMutating ? <Loader2 size={16} className="animate-spin" /> : actionLabel}
        </button>
      </div>
    </article>
  );
};

const AdminOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('ALL');
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutatingOrderId, setMutatingOrderId] = useState<string | null>(null);

  const storeOrders = useOrdersStore((state) => state.orders);
  const {
    data: adminOrders = [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useAdminOrders();
  const updateOrderStatus = useUpdateOrderStatus();

  const useFallbackOrders = (isLoading || isError) && storeOrders.length > 0;
  const orders = useFallbackOrders ? storeOrders : adminOrders;

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesFilter = activeFilter === 'ALL' || order.orderStatus === activeFilter;
        return matchesFilter && matchesSearch(order, searchQuery);
      }),
    [activeFilter, orders, searchQuery],
  );

  const handleStatusUpdate = async (order: Order, nextStatus: OrderStatus) => {
    setMutationError(null);
    setMutatingOrderId(order.id);

    try {
      await updateOrderStatus.mutateAsync({ id: order.id, status: nextStatus });
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    } catch (mutationFailure) {
      const message = mutationFailure instanceof Error ? mutationFailure.message : 'Status yangilanmadi';
      setMutationError(message);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    } finally {
      setMutatingOrderId(null);
    }
  };

  const handlePrimaryAction = (order: Order) => {
    const nextStatus = getNextStatus(order.orderStatus);

    if (!nextStatus || order.orderStatus === OrderStatus.DELIVERING) {
      navigate(`/admin/orders/${order.id}`);
      return;
    }

    if (nextStatus === OrderStatus.DELIVERING && !order.courierId) {
      navigate(`/admin/orders/${order.id}`);
      return;
    }

    void handleStatusUpdate(order, nextStatus);
  };

  if (isLoading && storeOrders.length === 0) {
    return <OrdersSkeleton />;
  }

  if (isError && !useFallbackOrders) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <AlertCircle size={48} className="text-red-500" />
        <h3 className="font-bold text-slate-900">Buyurtmalar yuklanmadi</h3>
        <p className="text-sm text-slate-500">{(error as Error).message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full bg-blue-600 px-6 py-2 text-sm font-bold text-white"
        >
          Yangilash
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-[20px] border border-slate-200 bg-transparent px-4 py-3">
        <label className="flex items-center gap-3">
          <Search size={19} className="text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by order ID or name..."
            className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>
      </section>

      <section className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-bold transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-[0_10px_18px_rgba(37,99,235,0.22)]'
                  : 'border border-slate-200 bg-transparent text-slate-500'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </section>

      {isError && useFallbackOrders ? (
        <button
          type="button"
          onClick={() => refetch()}
          className="flex w-full items-center justify-between rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-left"
        >
          <span>
            <span className="block text-sm font-black text-amber-900">Lokal ma'lumot ko'rsatilmoqda</span>
            <span className="block text-xs font-semibold text-amber-700">Jonli ma'lumot uchun qayta yuklang</span>
          </span>
          <RefreshCw size={17} className="text-amber-600" />
        </button>
      ) : null}

      {mutationError ? (
        <div className="rounded-[16px] border border-rose-100 bg-rose-50 px-4 py-3">
          <p className="text-sm font-black text-rose-900">Status yangilanmadi</p>
          <p className="mt-1 text-xs font-semibold text-rose-700">{mutationError}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">
          {filteredOrders.length} orders
        </p>
        {isFetching ? (
          <Loader2 size={16} className="animate-spin text-slate-400" />
        ) : null}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[18px] bg-white py-16 text-center shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <ShoppingBag size={28} />
          </div>
          <h3 className="mt-4 text-base font-black text-slate-900">Buyurtma topilmadi</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">Qidiruv yoki filterni o'zgartiring.</p>
        </div>
      ) : (
        <section className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderListCard
              key={order.id}
              order={order}
              isMutating={mutatingOrderId === order.id}
              onOpen={() => navigate(`/admin/orders/${order.id}`)}
              onPrimaryAction={() => handlePrimaryAction(order)}
            />
          ))}
        </section>
      )}
    </div>
  );
};

export default AdminOrdersPage;
