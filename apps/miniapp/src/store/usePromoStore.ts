import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdminPromo, PromoFilterState, DiscountTypeEnum } from '../features/promo/types';

interface PromoState {
  promos: AdminPromo[];
  _seeded: boolean;

  // Init
  ensureSeeded: () => void;

  // CRUD
  addPromo: (data: Omit<AdminPromo, 'id' | 'timesUsed' | 'createdAt' | 'updatedAt'>) => AdminPromo;
  updatePromo: (id: string, data: Partial<Omit<AdminPromo, 'id' | 'timesUsed' | 'createdAt' | 'updatedAt'>>) => void;
  togglePromoActive: (id: string) => void;
  deletePromo: (id: string) => void;

  // Usage
  incrementPromoUsage: (id: string) => void;

  // Queries
  getPromoById: (id: string) => AdminPromo | undefined;
  getPromoByCode: (code: string) => AdminPromo | undefined;
  filterPromos: (filters: PromoFilterState) => AdminPromo[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export const usePromoStore = create<PromoState>()(
  persist(
    (set, get) => ({
      promos: [],
      _seeded: false,

      ensureSeeded: () => {
        if (!get()._seeded) {
          const now = new Date().toISOString();
          set({
            promos: [
              {
                id: '1',
                code: 'NEW',
                title: 'Yozgi chegirma',
                discountType: DiscountTypeEnum.PERCENTAGE,
                discountValue: 10,
                minOrderValue: 50000,
                startDate: now,
                usageLimit: 0,
                timesUsed: 12,
                isActive: true,
                isFirstOrderOnly: false,
                targetUserId: null,
                createdAt: now,
                updatedAt: now,
              },
              {
                id: '2',
                code: 'QISH2024',
                title: 'Qishki aksiya',
                discountType: DiscountTypeEnum.FIXED,
                discountValue: 15000,
                minOrderValue: 100000,
                startDate: now,
                usageLimit: 50,
                timesUsed: 50,
                isActive: true,
                isFirstOrderOnly: false,
                targetUserId: null,
                createdAt: now,
                updatedAt: now,
              }
            ],
            _seeded: true,
          });
        }
      },

      addPromo: (data) => {
        const now = new Date().toISOString();
        const promo: AdminPromo = {
          id: generateId(),
          ...data,
          code: data.code.toUpperCase().trim(),
          timesUsed: 0,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ promos: [...state.promos, promo] }));
        return promo;
      },

      updatePromo: (id, data) => {
        set((state) => ({
          promos: state.promos.map((p) =>
            p.id === id ? { 
              ...p, 
              ...data, 
              code: data.code ? data.code.toUpperCase().trim() : p.code,
              updatedAt: new Date().toISOString() 
            } : p
          ),
        }));
      },

      togglePromoActive: (id) => {
        set((state) => ({
          promos: state.promos.map((p) =>
            p.id === id ? { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deletePromo: (id) => {
        set((state) => ({
          promos: state.promos.filter((p) => p.id !== id),
        }));
      },

      incrementPromoUsage: (id) => {
        set((state) => ({
          promos: state.promos.map((p) =>
            p.id === id ? { ...p, timesUsed: p.timesUsed + 1 } : p
          ),
        }));
      },

      getPromoById: (id) => get().promos.find((p) => p.id === id),

      getPromoByCode: (code) => {
        const normalized = code.toUpperCase().trim();
        return get().promos.find((p) => p.code === normalized);
      },

      filterPromos: (filters) => {
        let result = get().promos;
        const now = new Date();

        if (filters.statusFilter !== 'all') {
          result = result.filter(p => {
             const isStarted = new Date(p.startDate) <= now;
             const isExpired = p.endDate ? new Date(p.endDate) < now : false;
             
             if (filters.statusFilter === 'active') return p.isActive && isStarted && !isExpired;
             if (filters.statusFilter === 'inactive') return (!p.isActive) || (!isStarted);
             if (filters.statusFilter === 'expired') return isExpired;
             return true;
          });
        }

        if (filters.discountTypeFilter !== 'all') {
          result = result.filter((p) => p.discountType === filters.discountTypeFilter);
        }

        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          result = result.filter((p) => p.code.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q));
        }

        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },
    }),
    { name: 'turon-promo-storage' }
  )
);
