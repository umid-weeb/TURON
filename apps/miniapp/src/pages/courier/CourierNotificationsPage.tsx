import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { UserRoleEnum } from '@turon/shared';
import NotificationList from '../../features/notifications/components/NotificationList';

const CourierNotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="courier-page min-h-screen pb-8">
      <header
        className="sticky top-0 z-30 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="courier-topbar flex items-center gap-3 rounded-[26px] px-4 py-3 courier-enter-soft">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="courier-topbar-button flex h-11 w-11 items-center justify-center rounded-[18px]"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="courier-label">Courier Pro</p>
            <div className="mt-1 flex items-center gap-2">
              <Bell size={18} className="text-[var(--courier-text)]" />
              <p className="truncate text-[18px] font-black text-[var(--courier-text)]">Bildirishnomalar</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-2">
        <NotificationList role={UserRoleEnum.COURIER} />
      </main>
    </div>
  );
};

export default CourierNotificationsPage;
