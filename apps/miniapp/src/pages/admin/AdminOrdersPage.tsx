import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react';
import '../../styles/admin-overhaul.css';
import { Order, OrderStatus } from '../../data/types';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useAdminOrders, useUpdateOrderStatus } from '../../hooks/queries/useOrders';
import { getNextStatus } from '../../lib/orderStatusUtils';
import { useOrdersStore } from '../../store/useOrdersStore';
import { AdminOrderCard } from '../../features/admin/orders/AdminOrderCard';
import { AdminOrdersHero } from '../../features/admin/orders/AdminOrdersHero';
import { AdminOrdersSkeleton } from '../../features/admin/orders/AdminOrdersSkeleton';
import { AdminOrdersToolbar } from '../../features/admin/orders/AdminOrdersToolbar';
import {
  buildAdminOrdersSummary,
  needsCourierAssignment,
  resolveAdminOrderFilter,
  type AdminOrderFilter,
} from '../../features/admin/orders/adminOrders.utils';

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.PENDING]: 'Qabul qilish',
  [OrderStatus.PREPARING]: 'Tayyor',
  [OrderStatus.READY_FOR_PICKUP]: 'Jo\'natish',
  [OrderStatus.DELIVERING]: 'Kuzatish',
  [OrderStatus.DELIVERED]: 'Ko\'rish',
  [OrderStatus.CANCELLED]: 'Ko\'rish',
};

function getPrimaryActionLabel(order: Order) {
  return ACTION_LABELS[order.orderStatus] || 'Ko\'rish';
}

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = React.useState(() => searchParams.get('q') ?? '');
  const [activeFilter, setActiveFilter] = React.useState<AdminOrderFilter>(() =>
    resolveAdminOrderFilter(searchParams.get('status')),
  );
  const [mutationError, setMutationError] = React.useState<string | null>(null);
  const [mutatingOrderId, setMutatingOrderId] = React.useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(searchInput, 220);
  const storeOrders = useOrdersStore((state) => state.orders);
  const { data: adminOrders = [], isLoading, isError, error, isFetching, refetch } = useAdminOrders();
  const updateOrderStatus = useUpdateOrderStatus();

  const useFallbackOrders = (isLoading || isError) && storeOrders.length > 0;
  const orders = useFallbackOrders ? storeOrders : adminOrders;
  const summary = React.useMemo(
    () => buildAdminOrdersSummary(orders, activeFilter, debouncedQuery),
    [activeFilter, debouncedQuery, orders],
  );
  const urgentOrder = summary.urgentOrder;

  React.useEffect(() => {
    const urlQuery = searchParams.get('q') ?? '';
    const urlFilter = resolveAdminOrderFilter(searchParams.get('status'));

    setSearchInput((current) => (current === urlQuery ? current : urlQuery));
    setActiveFilter((current) => (current === urlFilter ? current : urlFilter));
  }, [searchParams]);

  React.useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (debouncedQuery.trim()) {
      nextParams.set('q', debouncedQuery.trim());
    } else {
      nextParams.delete('q');
    }

    if (activeFilter !== 'ALL') {
      nextParams.set('status', activeFilter);
    } else {
      nextParams.delete('status');
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeFilter, debouncedQuery, searchParams, setSearchParams]);

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
      navigate(`/admin/orders/${order.id}?assignCourier=1`);
      return;
    }

    void handleStatusUpdate(order, nextStatus);
  };

  const handleOpenUrgent = () => {
    if (urgentOrder) {
      navigate(`/admin/orders/${urgentOrder.id}`);
    }
  };

  if (isLoading && storeOrders.length === 0) {
    return <AdminOrdersSkeleton />;
  }

  if (isError && !useFallbackOrders) {
    return (
      <div className="adminx-page pb-[calc(env(safe-area-inset-bottom,0px)+108px)]">
        <div className="adminx-surface flex min-h-[360px] flex-col items-center justify-center rounded-[24px] px-6 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[rgba(255,244,242,0.95)] text-[var(--adminx-color-danger)]">
            <AlertCircle size={28} />
          </div>
          <h2 className="mt-5 text-xl font-black tracking-[-0.04em] text-[var(--adminx-color-ink)]">
            Buyurtmalar ochilmadi
          </h2>
          <p className="mt-2 max-w-[260px] text-sm font-semibold text-[var(--adminx-color-muted)]">
            {error instanceof Error ? error.message : 'Server bilan aloqa tiklanmadi'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,var(--adminx-color-primary)_0%,var(--adminx-color-primary-dark)_100%)] px-5 text-sm font-black text-[var(--adminx-color-dark)] shadow-[var(--adminx-shadow-glow)]"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="adminx-page space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+108px)]">
      <AdminOrdersHero
        pendingCount={summary.pendingCount}
        pendingValue={summary.pendingValue}
        readyCount={summary.readyCount}
        deliveringCount={summary.deliveringCount}
        courierNeededCount={summary.courierNeededCount}
        onOpenPending={() => { setSearchInput(''); setActiveFilter(OrderStatus.PENDING); }}
        onOpenUrgentOrder={handleOpenUrgent}
      />

      <AdminOrdersToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchClear={() => setSearchInput('')}
        filters={summary.filters}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        filteredCount={summary.filteredCount}
        totalCount={summary.totalCount}
        isFetching={isFetching}
      />

      {isError && useFallbackOrders ? (
        <button
          type="button"
          onClick={() => refetch()}
          className="adminx-surface flex w-full items-center justify-between gap-3 rounded-[22px] px-4 py-4 text-left"
        >
          <span>
            <span className="block text-sm font-black text-[var(--adminx-color-ink)]">Lokal ma'lumot</span>
            <span className="block text-xs font-semibold text-[var(--adminx-color-muted)]">Jonli holatni qayta oling</span>
          </span>
          <RefreshCw size={17} className="text-[var(--adminx-color-primary-dark)]" />
        </button>
      ) : null}

      {mutationError ? (
        <div className="adminx-surface rounded-[22px] border-[rgba(214,69,69,0.18)] px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-[var(--adminx-color-danger)]">
              <AlertCircle size={16} />
            </div>
            <div>
              <p className="text-sm font-black text-[var(--adminx-color-ink)]">Status yangilanmadi</p>
              <p className="mt-1 text-xs font-semibold text-[var(--adminx-color-muted)]">{mutationError}</p>
            </div>
          </div>
        </div>
      ) : null}

      {summary.filteredCount === 0 && summary.staleOrders.length === 0 ? (
        <div className="adminx-surface flex flex-col items-center justify-center rounded-[24px] px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[rgba(245,166,35,0.14)] text-[var(--adminx-color-primary-dark)]">
            <ShoppingBag size={30} />
          </div>
          <h3 className="mt-5 text-lg font-black tracking-[-0.03em] text-[var(--adminx-color-ink)]">
            Buyurtma topilmadi
          </h3>
          <p className="mt-2 text-sm font-semibold text-[var(--adminx-color-muted)]">
            Filter yoki qidiruvni o'zgartiring
          </p>
          {(activeFilter !== 'ALL' || debouncedQuery.trim()) ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setActiveFilter('ALL');
              }}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-[16px] border border-[rgba(28,18,7,0.08)] bg-white px-5 text-sm font-black text-[var(--adminx-color-ink)]"
            >
              Tozalash
            </button>
          ) : null}
        </div>
      ) : null}

      {summary.filteredCount > 0 ? (
        <section className="space-y-3">
          {summary.filteredOrders.map((order, index) => {
            const needsCourier = needsCourierAssignment(order);
            return (
              <AdminOrderCard
                key={order.id}
                order={order}
                index={index}
                isMutating={mutatingOrderId === order.id}
                primaryActionLabel={getPrimaryActionLabel(order)}
                needsCourier={needsCourier}
                onOpen={() => navigate(`/admin/orders/${order.id}`)}
                onPrimaryAction={() => handlePrimaryAction(order)}
                onAssignCourier={needsCourier ? () => navigate(`/admin/orders/${order.id}?assignCourier=1`) : undefined}
              />
            );
          })}
        </section>
      ) : null}

      {summary.staleOrders.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="h-px flex-1 bg-[rgba(28,18,7,0.06)]" />
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--adminx-color-faint)]">
              Eskirgan · {summary.staleOrders.length} ta
            </p>
            <div className="h-px flex-1 bg-[rgba(28,18,7,0.06)]" />
          </div>
          {summary.staleOrders.map((order, index) => (
            <AdminOrderCard
              key={order.id}
              order={order}
              index={index}
              isMutating={false}
              primaryActionLabel="Ko'rish"
              needsCourier={false}
              isStale
              onOpen={() => navigate(`/admin/orders/${order.id}`)}
              onPrimaryAction={() => navigate(`/admin/orders/${order.id}`)}
            />
          ))}
        </section>
      ) : null}

    </div>
  );
}


