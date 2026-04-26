import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRoleEnum } from '@turon/shared';
import { api } from '../../lib/api';
import type { AppNotification } from '../../features/notifications/notificationTypes';
import { isNotificationStale } from '../../lib/orderStaleUtils';

function resolveNotificationActionRoute(notification: AppNotification) {
  if (!notification.relatedOrderId) {
    return undefined;
  }

  if (notification.roleTarget === UserRoleEnum.ADMIN) {
    return `/admin/orders/${notification.relatedOrderId}`;
  }

  if (notification.roleTarget === UserRoleEnum.COURIER) {
    return `/courier/order/${notification.relatedOrderId}`;
  }

  return `/customer/orders/${notification.relatedOrderId}`;
}

function normalizeNotifications(notifications: AppNotification[]) {
  return notifications.map((notification) => ({
    ...notification,
    actionRoute: resolveNotificationActionRoute(notification),
  }));
}

export const useNotifications = (role: UserRoleEnum) =>
  useQuery<AppNotification[]>({
    queryKey: ['notifications', role],
    queryFn: async () =>
      normalizeNotifications((await api.get('/notifications/my')) as AppNotification[]),
    refetchInterval: 10_000,
  });

export const useUnreadNotificationCount = (role: UserRoleEnum) => {
  const query = useNotifications(role);
  return {
    ...query,
    unreadCount: (query.data || []).filter(
      (notification) => !notification.isRead && !isNotificationStale(notification.createdAt),
    ).length,
  };
};

export const useMarkNotificationAsRead = (role: UserRoleEnum) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      (await api.patch(`/notifications/${id}/read`)) as AppNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', role] });
    },
  });
};

export const useMarkAllNotificationsAsRead = (role: UserRoleEnum) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => api.post('/notifications/read-all') as Promise<{ success: boolean }>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', role] });
    },
  });
};
