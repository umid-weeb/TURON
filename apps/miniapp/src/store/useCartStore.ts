import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../data/mockData';
import { CartItem, Promo } from '../data/types';
import { calculateDiscount } from '../lib/promoService';

interface CartState {
  items: CartItem[];
  appliedPromo: Promo | null;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  setPromo: (promo: Promo | null) => void;
  setItems: (items: CartItem[]) => void;
  
  // Computed (helper style instead of actual derived state for simple skeletons)
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotalItems: () => number;
  getFinalTotal: (deliveryFee: number) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedPromo: null,

      addToCart: (product, quantity = 1) => {
        const { items } = get();
        const existingItem = items.find((item) => item.id === product.id);
        
        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({ items: [...items, { ...product, quantity }] });
        }
        
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
      },

      removeFromCart: (productId) => {
        set({ items: get().items.filter((item) => item.id !== productId) });
      },

      updateQuantity: (productId, delta) => {
        const { items } = get();
        const newItems = items.map((item) => {
          if (item.id === productId) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        }).filter(item => item.quantity > 0);

        set({ items: newItems });
        
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
      },

      clearCart: () => set({ items: [], appliedPromo: null }),
      
      setPromo: (appliedPromo) => set({ appliedPromo }),

      setItems: (items) => set({ items, appliedPromo: null }),

      getSubtotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getDiscount: () => {
        const { appliedPromo } = get();
        const subtotal = get().getSubtotal();
        if (!appliedPromo) return 0;
        return calculateDiscount(appliedPromo, subtotal);
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getFinalTotal: (deliveryFee: number) => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscount();
        return Math.max(0, subtotal - discount + deliveryFee);
      },
    }),
    {
      name: 'turon-cart-storage',
    }
  )
);
