import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRoleEnum } from '@turon/shared';

interface User {
  id: string;
  telegramId: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRoleEnum;
  language: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isCustomer: () => boolean;
  isAdmin: () => boolean;
  isCourier: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      isCustomer: () => get().user?.role === UserRoleEnum.CUSTOMER,
      isAdmin: () => get().user?.role === UserRoleEnum.ADMIN,
      isCourier: () => get().user?.role === UserRoleEnum.COURIER,
    }),
    {
      name: 'turon-auth-storage',
    }
  )
);
