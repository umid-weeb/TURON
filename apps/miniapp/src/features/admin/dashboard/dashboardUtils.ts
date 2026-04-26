import { OrderStatusEnum, PaymentStatusEnum } from '@turon/shared';
import type { Order, AdminCourierDirectoryItem } from '../../../data/types';
import { isOrderStale } from '../../../lib/orderStaleUtils';

export type DashboardMetricTone = 'pending' | 'revenue' | 'active' | 'done';

export interface DashboardMetric {
  key: string;
  label: string;
  value: string;
  description: string;
  tone: DashboardMetricTone;
  route: string;
}

export interface DashboardSummary {
  pendingCount: number;
  pendingValue: number;
  todayRevenue: number;
  activeOrdersCount: number;
  deliveredTodayCount: number;
  onlineCouriersCount: number;
  recentlyActiveCouriersCount: number;
  recentOrders: Order[];
  metrics: DashboardMetric[];
}

const formatCompactMoney = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K`;
  }

  return value.toString();
};

export const formatFullMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

export const formatRelativeTime = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'Hozir';
  if (diffMinutes < 60) return `${diffMinutes} daqiqa oldin`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} soat oldin`;

  return `${Math.floor(diffHours / 24)} kun oldin`;
};

export const getInitials = (order: Order) => {
  const source = order.customerName?.trim() || `#${order.orderNumber}`;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
};

const isToday = (value: string) => {
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const getOrderAmount = (order: Order) => Number(order.total || 0);

export const buildDashboardSummary = (
  orders: Order[],
  couriers: AdminCourierDirectoryItem[],
): DashboardSummary => {
  const pendingOrders = orders.filter(
    (order) =>
      !isOrderStale(order) &&
      (order.orderStatus === OrderStatusEnum.PENDING ||
        order.paymentStatus === PaymentStatusEnum.PENDING),
  );
  const activeOrders = orders.filter(
    (order) =>
      !isOrderStale(order) &&
      order.orderStatus !== OrderStatusEnum.PENDING &&
      order.orderStatus !== OrderStatusEnum.DELIVERED &&
      order.orderStatus !== OrderStatusEnum.CANCELLED,
  );
  const deliveredToday = orders.filter(
    (order) => order.orderStatus === OrderStatusEnum.DELIVERED && isToday(order.createdAt),
  );
  const recentOrders = [...orders]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6);

  const pendingValue = pendingOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);
  const todayRevenue = deliveredToday.reduce((sum, order) => sum + getOrderAmount(order), 0);
  const onlineCouriersCount = couriers.filter((courier) => courier.isOnline).length;
  const recentlyActiveCouriersCount = couriers.filter(
    (courier) => courier.isOnline || courier.activeAssignments > 0,
  ).length;

  return {
    pendingCount: pendingOrders.length,
    pendingValue,
    todayRevenue,
    activeOrdersCount: activeOrders.length,
    deliveredTodayCount: deliveredToday.length,
    onlineCouriersCount,
    recentlyActiveCouriersCount,
    recentOrders,
    metrics: [
      {
        key: 'revenue',
        label: 'Bugungi tushum',
        value: formatCompactMoney(todayRevenue),
        description: formatFullMoney(todayRevenue),
        tone: 'revenue',
        route: '/admin/reports',
      },
      {
        key: 'active',
        label: 'Faol buyurtmalar',
        value: String(activeOrders.length),
        description: 'Jarayondagi buyurtmalar',
        tone: 'active',
        route: '/admin/orders',
      },
      {
        key: 'pending',
        label: 'Kutayotganlar',
        value: String(pendingOrders.length),
        description: formatFullMoney(pendingValue),
        tone: 'pending',
        route: '/admin/orders',
      },
      {
        key: 'done',
        label: 'Yetkazildi',
        value: String(deliveredToday.length),
        description: 'Bugun yakunlangan',
        tone: 'done',
        route: '/admin/orders?status=delivered',
      },
    ],
  };
};
