import { create } from 'zustand';
import type { CourierOrderPreview } from '../data/types';

interface OrderInterruptState {
  // The order currently demanding courier's attention (null = no interrupt)
  pendingOrder: CourierOrderPreview | null;

  // IDs of orders we have already shown an interrupt for — prevents re-showing
  seenOrderIds: Set<string>;

  // Whether the detection hook has done its first-load initialization
  initialized: boolean;

  // Bottom sheet visibility. Hidden state keeps a small pull tab on screen.
  isVisible: boolean;

  showInterrupt: (order: CourierOrderPreview) => void;
  dismissInterrupt: () => void;
  setInterruptVisible: (visible: boolean) => void;
  markSeen: (orderId: string) => void;
  setInitialized: () => void;
}

export const useOrderInterruptStore = create<OrderInterruptState>()((set) => ({
  pendingOrder: null,
  seenOrderIds: new Set(),
  initialized: false,
  isVisible: true,

  showInterrupt: (order) =>
    set((state) => ({
      pendingOrder: order,
      isVisible: true,
      seenOrderIds: new Set([...state.seenOrderIds, order.id]),
    })),

  dismissInterrupt: () => set({ pendingOrder: null, isVisible: false }),

  setInterruptVisible: (visible) => set({ isVisible: visible }),

  markSeen: (orderId) =>
    set((state) => ({
      seenOrderIds: new Set([...state.seenOrderIds, orderId]),
    })),

  setInitialized: () => set({ initialized: true }),
}));
