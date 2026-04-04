import { create } from 'zustand';
import { Order, OrderStatus, DeliveryStage, OrderTrackingState, PaymentStatus } from '../data/types';
import { notifyOrderConfirmed, notifyPaymentVerified, notifyPaymentFailed, notifyCourierAssigned, notifyOrderDelivered, notifyOrderCancelled } from '../features/notifications/notificationTriggers';

function mergeOrders(existingOrders: Order[], incomingOrders: Order[]) {
  const orderMap = new Map(existingOrders.map((order) => [order.id, order]));

  for (const order of incomingOrders) {
    const existing = orderMap.get(order.id);
    orderMap.set(order.id, existing ? { ...existing, ...order } : order);
  }

  return Array.from(orderMap.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

interface OrdersState {
  orders: Order[];
  addOrder: (order: Order) => void;
  upsertOrder: (order: Order) => void;
  upsertOrders: (orders: Order[]) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateDeliveryStage: (orderId: string, stage: DeliveryStage) => void;
  updateOrderTracking: (orderId: string, tracking: OrderTrackingState) => void;
  updatePaymentStatus: (orderId: string, status: PaymentStatus) => void;
  verifyPayment: (orderId: string, adminName: string) => void;
  rejectPayment: (orderId: string) => void;
  assignCourier: (orderId: string, courierId: string, courierName: string) => void;
  getOrderById: (id: string) => Order | undefined;
  clearHistory: () => void;
}

export const useOrdersStore = create<OrdersState>()(
    (set, get) => ({
      orders: [],
      addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
      upsertOrder: (order) =>
        set((state) => ({
          orders: mergeOrders(state.orders, [order]),
        })),
      upsertOrders: (orders) =>
        set((state) => ({
          orders: mergeOrders(state.orders, orders),
        })),
      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map((o) => o.id === orderId ? { ...o, orderStatus: status } : o)
        }));
        
        const order = get().orders.find(o => o.id === orderId);
        if (order) {
          if (status === OrderStatus.PREPARING) notifyOrderConfirmed(order.id, order.orderNumber);
          if (status === OrderStatus.DELIVERED) notifyOrderDelivered(order.id, order.orderNumber);
          if (status === OrderStatus.CANCELLED) notifyOrderCancelled(order.id, order.orderNumber, 'Admin tomonidan bekor qilindi');
        }
      },
      updateDeliveryStage: (orderId, stage) => set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, deliveryStage: stage } : o)
      })),
      updateOrderTracking: (orderId, tracking) => set((state) => ({
        orders: state.orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                tracking: {
                  ...order.tracking,
                  ...tracking,
                  courierLocation: tracking.courierLocation
                    ? {
                        ...order.tracking?.courierLocation,
                        ...tracking.courierLocation,
                      }
                    : order.tracking?.courierLocation,
                },
              }
            : order,
        ),
      })),
      updatePaymentStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, paymentStatus: status } : o)
      })),
      verifyPayment: (orderId, adminName) => {
        set((state) => ({
          orders: state.orders.map((o) => o.id === orderId ? { 
            ...o, 
            paymentStatus: PaymentStatus.COMPLETED,
            verificationStatus: true,
            verifiedByAdmin: adminName,
            verifiedAt: new Date().toISOString()
          } : o)
        }));
        const order = get().orders.find(o => o.id === orderId);
        if (order) notifyPaymentVerified(order.id, order.orderNumber);
      },
      rejectPayment: (orderId) => {
        set((state) => ({
          orders: state.orders.map((o) => o.id === orderId ? { 
            ...o, 
            paymentStatus: PaymentStatus.FAILED,
            verificationStatus: false
          } : o)
        }));
        const order = get().orders.find(o => o.id === orderId);
        if (order) notifyPaymentFailed(order.id, order.orderNumber, 'To\'lov verifikatsiyadan o\'tmadi');
      },
      assignCourier: (orderId, courierId, courierName) => {
        set((state) => ({
          orders: state.orders.map((o) => o.id === orderId ? { ...o, courierId, courierName, deliveryStage: DeliveryStage.IDLE } : o)
        }));
        const order = get().orders.find(o => o.id === orderId);
        if (order) notifyCourierAssigned(order.id, order.orderNumber, courierName);
      },
      getOrderById: (id) => get().orders.find((o) => o.id === id),
      clearHistory: () => set({ orders: [] }),
    })
);
