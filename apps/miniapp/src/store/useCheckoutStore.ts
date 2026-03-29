import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentMethod } from '../data/types';

interface CheckoutState {
  paymentMethod: PaymentMethod;
  note: string;
  deliveryFee: number;
  setPaymentMethod: (method: PaymentMethod) => void;
  setNote: (note: string) => void;
  setDeliveryFee: (fee: number) => void;
  resetCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      paymentMethod: 'CASH',
      note: '',
      deliveryFee: 5000, // Mock fixed delivery fee

      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setNote: (note) => set({ note }),
      setDeliveryFee: (deliveryFee) => set({ deliveryFee }),
      resetCheckout: () => set({ paymentMethod: 'CASH', note: '' }),
    }),
    {
      name: 'turon-checkout-storage',
    }
  )
);
