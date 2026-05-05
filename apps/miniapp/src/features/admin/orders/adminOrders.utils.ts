import { Order, OrderStatus, PaymentStatus, type OrderDispatchState } from '../../../data/types';
import { isOrderStale } from '../../../lib/orderStaleUtils';

export type AdminOrderFilter = 'ALL' | OrderStatus;

export interface AdminOrderFilterOption {
  value: AdminOrderFilter;
  label: string;
  count: number;
}

const currencyFormatter = new Intl.NumberFormat('uz-UZ');

const STATUS_PRIORITY: Record<OrderStatus, number> = {
  PENDING: 0,
  READY_FOR_PICKUP: 1,
  PREPARING: 2,
  DELIVERING: 3,
  DELIVERED: 4,
  CANCELLED: 5,
};

const FILTER_LABELS: Record<AdminOrderFilter, string> = {
  ALL: 'Hammasi',
  PENDING: 'Yangi',
  PREPARING: 'Tayyorlanmoqda',
  READY_FOR_PICKUP: 'Tayyor',
  DELIVERING: 'Yo\'lda',
  DELIVERED: 'Tugagan',
  CANCELLED: 'Bekor',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Yangi',
  PREPARING: 'Tayyorlanmoqda',
  READY_FOR_PICKUP: 'Tayyor',
  DELIVERING: 'Yo\'lda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor',
};

const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  PENDING: 'border-[rgba(214,69,69,0.14)] bg-[rgba(255,244,242,0.95)] text-[var(--adminx-color-danger)]',
  PREPARING: 'border-[rgba(245,166,35,0.2)] bg-[rgba(255,247,232,0.96)] text-[var(--adminx-color-primary-dark)]',
  READY_FOR_PICKUP: 'border-[rgba(36,159,99,0.18)] bg-[rgba(240,255,246,0.98)] text-[var(--adminx-color-success)]',
  DELIVERING: 'border-[rgba(45,108,223,0.18)] bg-[rgba(239,245,255,0.98)] text-[var(--adminx-color-info)]',
  DELIVERED: 'border-[rgba(36,159,99,0.14)] bg-[rgba(240,255,246,0.92)] text-[var(--adminx-color-success)]',
  CANCELLED: 'border-[rgba(214,69,69,0.12)] bg-[rgba(255,244,242,0.88)] text-[var(--adminx-color-danger)]',
};

const PAYMENT_BADGE: Record<PaymentStatus, { label: string; className: string }> = {
  COMPLETED: {
    label: 'To\'langan',
    className: 'border-[rgba(36,159,99,0.18)] bg-[rgba(240,255,246,0.98)] text-[var(--adminx-color-success)]',
  },
  PENDING: {
    label: 'Kutilmoqda',
    className: 'border-[rgba(245,166,35,0.2)] bg-[rgba(255,247,232,0.96)] text-[var(--adminx-color-primary-dark)]',
  },
  FAILED: {
    label: 'Muammo',
    className: 'border-[rgba(214,69,69,0.14)] bg-[rgba(255,244,242,0.95)] text-[var(--adminx-color-danger)]',
  },
  CANCELLED: {
    label: 'Bekor',
    className: 'border-[rgba(214,69,69,0.14)] bg-[rgba(255,244,242,0.95)] text-[var(--adminx-color-danger)]',
  },
};

const DISPATCH_LABELS: Partial<Record<OrderDispatchState, string>> = {
  MANUAL_ASSIGNMENT_REQUIRED: 'Kuryer kerak',
  SEARCHING: 'Kuryer qidirilmoqda',
  AWAITING_COURIER_ACCEPTANCE: 'Javob kutilmoqda',
  COURIER_EN_ROUTE_TO_RESTAURANT: 'Kuryer yo\'lda',
  COURIER_AT_RESTAURANT: 'Restoranda',
  COURIER_PICKED_UP: 'Olib ketdi',
  COURIER_DELIVERING: 'Yetkazmoqda',
};

export function resolveAdminOrderFilter(rawValue: string | null): AdminOrderFilter {
  if (!rawValue) return 'ALL';
  const normalized = rawValue.toUpperCase() as AdminOrderFilter;
  if (normalized === 'ALL') return normalized;
  return normalized in STATUS_LABELS ? normalized : 'ALL';
}

function getStatusSortValue(status: OrderStatus) {
  return STATUS_PRIORITY[status] ?? 99;
}

export function sortOrdersForAdmin(orders: Order[]) {
  return [...orders].sort((left, right) => {
    // 1) Stale orders always go to the bottom.
    const leftStale = isOrderStale(left);
    const rightStale = isOrderStale(right);
    if (leftStale !== rightStale) return leftStale ? 1 : -1;

    // 2) Within the *stale* group: oldest at the very bottom (DESC by time)
    //    so the most recently expired stay near the top of the stale section
    //    and the truly forgotten orders sink to the floor.
    if (leftStale && rightStale) {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return rightTime - leftTime;
    }

    // 3) Within the live group: status priority first, then by time.
    //    Active statuses (PENDING → DELIVERING) prefer the oldest first so
    //    the queue is FIFO; terminal / completed orders are newest first.
    const leftPriority = getStatusSortValue(left.orderStatus);
    const rightPriority = getStatusSortValue(right.orderStatus);
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    const isActiveStatus = leftPriority <= STATUS_PRIORITY.DELIVERING;
    return isActiveStatus ? leftTime - rightTime : rightTime - leftTime;
  });
}

export function formatOrderTime(timestamp: string) {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));

  if (diffSeconds < 60) {
    return `${Math.max(1, diffSeconds)} soniya`;
  }

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) {
    return `${minutes} daqiqa`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} soat`;
  }

  const days = Math.floor(hours / 24);
  return `${days} kun`;
}

export function formatCurrency(value: number) {
  return `${currencyFormatter.format(value)} so'm`;
}

export function getOrderStatusMeta(status: OrderStatus) {
  return {
    label: STATUS_LABELS[status],
    className: STATUS_BADGE_CLASS[status],
  };
}

export function getPaymentMeta(status: PaymentStatus) {
  return PAYMENT_BADGE[status];
}

export function getOrderCustomerTitle(order: Order) {
  return order.customerName?.trim() || 'Mijoz';
}

export function getOrderAddressSummary(order: Order) {
  return order.customerAddress?.addressText?.trim() || 'Manzil ko\'rsatilmagan';
}

export function getOrderItemSummary(order: Order) {
  if (order.items.length === 0) {
    return 'Mahsulot yo\'q';
  }

  if (order.items.length === 1) {
    return order.items[0]?.name || '1 ta mahsulot';
  }

  const firstItem = order.items[0]?.name || `${order.items.length} ta mahsulot`;
  return `${firstItem} va yana ${order.items.length - 1} ta`;
}

export function matchesOrderSearch(order: Order, query: string) {
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

export function needsCourierAssignment(order: Order) {
  if (
    order.orderStatus === OrderStatus.PENDING ||
    order.orderStatus === OrderStatus.CANCELLED ||
    order.orderStatus === OrderStatus.DELIVERED
  ) {
    return false;
  }

  return (
    !order.courierId ||
    order.dispatchState === 'MANUAL_ASSIGNMENT_REQUIRED' ||
    order.dispatchState === 'SEARCHING'
  );
}

export function getDispatchLabel(order: Order) {
  if (needsCourierAssignment(order)) {
    return 'Kuryer kerak';
  }

  if (order.courierName?.trim()) {
    return order.courierName.trim();
  }

  if (order.dispatchState && DISPATCH_LABELS[order.dispatchState]) {
    return DISPATCH_LABELS[order.dispatchState] as string;
  }

  return null;
}

export function buildAdminOrderFilters(orders: Order[]): AdminOrderFilterOption[] {
  const counts = orders.reduce<Record<OrderStatus, number>>((acc, order) => {
    acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1;
    return acc;
  }, {
    PENDING: 0,
    PREPARING: 0,
    READY_FOR_PICKUP: 0,
    DELIVERING: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  });

  return [
    { value: 'ALL', label: FILTER_LABELS.ALL, count: orders.length },
    { value: OrderStatus.PENDING, label: FILTER_LABELS.PENDING, count: counts.PENDING },
    { value: OrderStatus.PREPARING, label: FILTER_LABELS.PREPARING, count: counts.PREPARING },
    { value: OrderStatus.READY_FOR_PICKUP, label: FILTER_LABELS.READY_FOR_PICKUP, count: counts.READY_FOR_PICKUP },
    { value: OrderStatus.DELIVERING, label: FILTER_LABELS.DELIVERING, count: counts.DELIVERING },
    { value: OrderStatus.DELIVERED, label: FILTER_LABELS.DELIVERED, count: counts.DELIVERED },
    { value: OrderStatus.CANCELLED, label: FILTER_LABELS.CANCELLED, count: counts.CANCELLED },
  ];
}

export function buildAdminOrdersSummary(orders: Order[], activeFilter: AdminOrderFilter, query: string) {
  const sortedOrders = sortOrdersForAdmin(orders);
  const liveOrders = sortedOrders.filter((order) => !isOrderStale(order));
  const allStaleOrders = sortedOrders.filter((order) => isOrderStale(order));

  const matchesFilterAndQuery = (order: Order) => {
    const matchesFilter = activeFilter === 'ALL' || order.orderStatus === activeFilter;
    return matchesFilter && matchesOrderSearch(order, query);
  };

  const filteredOrders = liveOrders.filter(matchesFilterAndQuery);
  const staleOrders = allStaleOrders.filter(matchesFilterAndQuery);

  const pendingOrders = liveOrders.filter((order) => order.orderStatus === OrderStatus.PENDING);
  const readyOrders = liveOrders.filter((order) => order.orderStatus === OrderStatus.READY_FOR_PICKUP);
  const deliveringOrders = liveOrders.filter((order) => order.orderStatus === OrderStatus.DELIVERING);
  const activeOrders = liveOrders.filter(
    (order) => order.orderStatus !== OrderStatus.DELIVERED && order.orderStatus !== OrderStatus.CANCELLED,
  );
  const courierNeededOrders = liveOrders.filter((order) => needsCourierAssignment(order));

  return {
    totalCount: orders.length,
    filteredCount: filteredOrders.length,
    pendingCount: pendingOrders.length,
    pendingValue: pendingOrders.reduce((sum, order) => sum + order.total, 0),
    readyCount: readyOrders.length,
    deliveringCount: deliveringOrders.length,
    activeCount: activeOrders.length,
    courierNeededCount: courierNeededOrders.length,
    staleCount: allStaleOrders.length,
    filters: buildAdminOrderFilters(liveOrders),
    filteredOrders,
    staleOrders,
    urgentOrder: pendingOrders[0] || readyOrders[0] || filteredOrders[0] || null,
  };
}
