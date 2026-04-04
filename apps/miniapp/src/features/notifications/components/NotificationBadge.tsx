import React from 'react';
import { UserRoleEnum } from '@turon/shared';
import { useUnreadNotificationCount } from '../../../hooks/queries/useNotifications';

export const NotificationBadge: React.FC<{ role: UserRoleEnum }> = ({ role }) => {
  const { unreadCount } = useUnreadNotificationCount(role);

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-sm border border-white z-10 animate-in zoom-in">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
};

export default NotificationBadge;
