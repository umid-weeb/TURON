import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order } from '../data/types';

interface OrdersState {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateDeliveryStage: (orderId: string, stage: DeliveryStage) => void;
  assignCourier: (orderId: string, courierId: string, courierName: string) => void;
  getOrderById: (id: string) => Order | undefined;
  clearHistory: () => void;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
      updateOrderStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, orderStatus: status } : o)
      })),
      updateDeliveryStage: (orderId, stage) => set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, deliveryStage: stage } : o)
      })),
      assignCourier: (orderId, courierId, courierName) => set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, courierId, courierName, deliveryStage: 'IDLE' } : o)
      })),
      getOrderById: (id) => get().orders.find((o) => o.id === id),
      clearHistory: () => set({ orders: [] }),
    }),
    {
      name: 'turon-orders-storage',
    }
  )
);
