import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentMethod } from '../data/types';

interface CheckoutState {
  paymentMethod: PaymentMethod;
  note: string;
  /** Base64 data URL of the receipt image (card payment check) — not persisted */
  receiptImage: string | null;
  setPaymentMethod: (method: PaymentMethod) => void;
  setNote: (note: string) => void;
  setReceiptImage: (image: string | null) => void;
  resetCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      paymentMethod: PaymentMethod.CASH,
      note: '',
      receiptImage: null,

      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setNote: (note) => set({ note }),
      setReceiptImage: (receiptImage) => set({ receiptImage }),
      resetCheckout: () =>
        set({ paymentMethod: PaymentMethod.CASH, note: '', receiptImage: null }),
    }),
    {
      name: 'turon-checkout-storage',
      // Never persist receipt image to localStorage — it's large and transient
      partialize: (state) => ({
        paymentMethod: state.paymentMethod,
        note: state.note,
      }),
    },
  ),
);
