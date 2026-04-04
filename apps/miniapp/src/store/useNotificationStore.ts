import { create } from 'zustand';
import { UserRoleEnum } from '@turon/shared';
import { AppNotification } from '../features/notifications/notificationTypes';

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (role: UserRoleEnum) => void;
  getUnreadCount: (role: UserRoleEnum) => number;
  getNotificationsByRole: (role: UserRoleEnum) => AppNotification[];
  clearNotifications: (role: UserRoleEnum) => void;
}

export const useNotificationStore = create<NotificationState>()(
    (set, get) => ({
      notifications: [],
      
      addNotification: (notification) => set((state) => ({ 
        notifications: [notification, ...state.notifications] 
      })),

      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) => 
          n.id === id ? { ...n, isRead: true } : n
        )
      })),

      markAllAsRead: (role) => set((state) => ({
        notifications: state.notifications.map((n) => 
          n.roleTarget === role ? { ...n, isRead: true } : n
        )
      })),

      getUnreadCount: (role) => {
        return get().notifications.filter((n) => n.roleTarget === role && !n.isRead).length;
      },

      getNotificationsByRole: (role) => {
        return get().notifications.filter((n) => n.roleTarget === role);
      },

      clearNotifications: (role) => set((state) => ({
        notifications: state.notifications.filter((n) => n.roleTarget !== role)
      })),
    })
);
