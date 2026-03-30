import { UserRoleEnum } from '@turon/shared';
import { useAuthStore } from '../store/useAuthStore';

type RoleUser = { id: string; telegramId: string; fullName: string; role: UserRoleEnum; language: string } | null;

export function getRoleFromUser(user: { role?: UserRoleEnum | string } | null | undefined): UserRoleEnum | null {
  if (!user?.role) return null;
  if (user.role === UserRoleEnum.ADMIN) return UserRoleEnum.ADMIN;
  if (user.role === UserRoleEnum.COURIER) return UserRoleEnum.COURIER;
  return UserRoleEnum.CUSTOMER;
}

export function useRole() {
  const { user, isAuthenticated, isAdmin, isCourier, isCustomer } = useAuthStore();

  return {
    isAuthenticated,
    user: user as RoleUser,
    role: getRoleFromUser(user),
    isAdmin: () => isAdmin(),
    isCourier: () => isCourier(),
    isCustomer: () => isCustomer(),
  };
}
