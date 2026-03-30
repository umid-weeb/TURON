import { Order, OrderStatus } from '../../data/types';
import { 
  TimeRange, 
  KPIMetrics, 
  OrderStatusBreakdown, 
  TopProductMetric, 
  CourierPerformanceMetric,
  PromoInsightMetric,
  RecentActivityEvent
} from './types';
import { AdminPromo } from '../promo/types';

export function filterOrdersByTimeRange(orders: Order[], range: TimeRange): Order[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7)); // Monday start
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    if (range === 'TODAY') return orderDate >= startOfToday;
    if (range === 'THIS_WEEK') return orderDate >= startOfWeek;
    if (range === 'THIS_MONTH') return orderDate >= startOfMonth;
    return true; // ALL_TIME
  });
}

export function calculateKPIMetrics(orders: Order[]): KPIMetrics {
  let activeOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let totalRevenue = 0;

  orders.forEach(order => {
    if (order.orderStatus === 'CANCELLED') {
      cancelledOrders++;
    } else if (order.orderStatus === 'DELIVERED') {
      deliveredOrders++;
      totalRevenue += order.total;
    } else {
      activeOrders++;
    }
  });

  const averageOrderValue = deliveredOrders > 0 ? Math.floor(totalRevenue / deliveredOrders) : 0;

  return {
    totalOrders: orders.length,
    activeOrders,
    deliveredOrders,
    cancelledOrders,
    totalRevenue,
    averageOrderValue,
  };
}

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: 'Yangi', color: 'bg-blue-500' },
  PREPARING: { label: 'Tayyorlanmoqda', color: 'bg-amber-500' },
  READY_FOR_PICKUP: { label: 'Olib ketish uchun tayyor', color: 'bg-orange-500' },
  DELIVERING: { label: 'Yetkazilmoqda', color: 'bg-purple-500' },
  DELIVERED: { label: 'Yetkazib berildi', color: 'bg-emerald-500' },
  CANCELLED: { label: 'Bekor qilingan', color: 'bg-red-500' },
};

export function getOrderStatusBreakdown(orders: Order[]): OrderStatusBreakdown[] {
  const counts = orders.reduce((acc, order) => {
    acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1;
    return acc;
  }, {} as Record<OrderStatus, number>);

  return (Object.keys(counts) as OrderStatus[]).map(status => ({
    status,
    count: counts[status],
    label: statusConfig[status]?.label || status,
    colorClass: statusConfig[status]?.color || 'bg-slate-500'
  })).sort((a, b) => b.count - a.count);
}

export function getTopProducts(orders: Order[]): TopProductMetric[] {
  const productMap: Record<string, TopProductMetric> = {};

  orders.forEach(order => {
    // Only count non-cancelled items towards top selling maybe?
    if (order.orderStatus === 'CANCELLED') return;

    order.items.forEach(item => {
      if (!productMap[item.id]) {
        productMap[item.id] = { productId: item.id, name: item.name, quantitySold: 0, revenueGenerated: 0 };
      }
      productMap[item.id].quantitySold += item.quantity;
      productMap[item.id].revenueGenerated += (item.price * item.quantity);
    });
  });

  return Object.values(productMap)
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 10);
}

export function getCourierPerformance(orders: Order[]): CourierPerformanceMetric[] {
  const courierMap: Record<string, CourierPerformanceMetric> = {};

  orders.forEach(order => {
    if (!order.courierId) return;

    if (!courierMap[order.courierId]) {
      courierMap[order.courierId] = {
        courierId: order.courierId,
        courierName: order.courierName || 'Noma\'lum',
        assignedOrders: 0,
        deliveredOrders: 0,
        activeDeliveries: 0,
      };
    }

    courierMap[order.courierId].assignedOrders++;
    if (order.orderStatus === 'DELIVERED') {
      courierMap[order.courierId].deliveredOrders++;
    } else if (order.orderStatus !== 'CANCELLED') {
      courierMap[order.courierId].activeDeliveries++;
    }
  });

  return Object.values(courierMap).sort((a, b) => b.deliveredOrders - a.deliveredOrders);
}

export function getPromoInsights(orders: Order[], promos: AdminPromo[]): PromoInsightMetric[] {
  const promoStats: Record<string, PromoInsightMetric> = {};
  
  // Base stats from store promos
  promos.forEach(p => {
    promoStats[p.code.toUpperCase()] = {
      promoCode: p.code,
      title: p.title,
      usageCount: 0,
      totalDiscountGenerated: 0,
      isActive: p.isActive
    };
  });

  orders.forEach(order => {
    if (order.promoCode && order.discount > 0 && order.orderStatus !== 'CANCELLED') {
      const code = order.promoCode.toUpperCase();
      if (!promoStats[code]) {
        promoStats[code] = { promoCode: code, usageCount: 0, totalDiscountGenerated: 0, isActive: false };
      }
      promoStats[code].usageCount++;
      promoStats[code].totalDiscountGenerated += order.discount;
    }
  });

  return Object.values(promoStats)
    .filter(p => p.usageCount > 0 || p.isActive)
    .sort((a, b) => b.totalDiscountGenerated - a.totalDiscountGenerated);
}

export function getRecentActivity(orders: Order[]): RecentActivityEvent[] {
  return orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(order => {
      let type: RecentActivityEvent['type'] = 'ORDER_CREATED';
      let title = 'Yangi buyurtma';
      let description = `${order.orderNumber} - ${order.total.toLocaleString()} so'm`;

      if (order.orderStatus === 'DELIVERED') {
        type = 'ORDER_DELIVERED';
        title = 'Yetkazib berildi';
      } else if (order.promoCode) {
        type = 'PROMO_USED';
        title = 'Promokod ishlatildi';
        description += ` (${order.promoCode})`;
      } else if (order.paymentStatus === 'COMPLETED') {
        type = 'PAYMENT_VERIFIED';
        title = 'To\'lov qabul qilindi';
      }

      return {
        id: order.id + '-' + type,
        type,
        title,
        description,
        timestamp: order.createdAt,
        orderId: order.id
      };
    });
}
