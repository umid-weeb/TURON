import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRoleEnum } from '@turon/shared';

interface User {
  id: string;
  telegramId: string;
  telegramUsername?: string | null;
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
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      updateUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : state.user,
        })),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'turon-auth-storage',
    }
  )
);
