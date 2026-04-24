import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppNotification } from '../notificationTypes';
import { Bell, CheckCircle2, AlertCircle, Info, Package, ChevronRight, Loader2 } from 'lucide-react';
import { NotificationTypeEnum, UserRoleEnum } from '@turon/shared';
import { useCustomerLanguage } from '../../i18n/customerLocale';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '../../../hooks/queries/useNotifications';

function formatTimeAgo(dateString: string, language: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (language === 'ru') {
    if (diffMin < 1) return 'только что';
    if (diffMin < 60) return `${diffMin} мин. назад`;
    if (diffHr < 24) return `${diffHr} ч. назад`;
    return `${diffDay} дн. назад`;
  }
  if (language === 'uz-cyrl') {
    if (diffMin < 1) return 'hozirgina';
    if (diffMin < 60) return `${diffMin} daq. oldin`;
    if (diffHr < 24) return `${diffHr} soat oldin`;
    return `${diffDay} kun oldin`;
  }
  if (diffMin < 1) return 'hozirgina';
  if (diffMin < 60) return `${diffMin} daq. oldin`;
  if (diffHr < 24) return `${diffHr} soat oldin`;
  return `${diffDay} kun oldin`;
}

interface NotificationListProps {
  role: UserRoleEnum;
}

const NotificationList: React.FC<NotificationListProps> = ({ role }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language } = useCustomerLanguage();
  const { data: notifications = [], isLoading, isError, error } = useNotifications(role);
  const markAsRead = useMarkNotificationAsRead(role);
  const markAllAsRead = useMarkAllNotificationsAsRead(role);
  const isCourier = role === UserRoleEnum.COURIER;
  const copy =
    language === 'ru'
      ? {
          emptyTitle: 'Пока уведомлений нет',
          emptySubtitle: 'Как только появятся новые сообщения, они будут показаны здесь.',
          heading: `Уведомления (${notifications.length})`,
          markAll: 'Прочитать все',
          details: 'Открыть',
        }
      : language === 'uz-cyrl'
        ? {
            emptyTitle: 'Ҳозирча билдиришномалар йўқ',
            emptySubtitle: 'Янги хабарлар келиши билан шу ерда кўринади.',
            heading: `Билдиришномалар (${notifications.length})`,
            markAll: 'Барчасини ўқиш',
            details: 'Батафсил',
          }
        : {
            emptyTitle: "Hozircha bildirishnomalar yo'q",
            emptySubtitle: 'Yangi xabarlar kelishi bilan bu yerda paydo bo‘ladi.',
            heading: `Bildirishnomalar (${notifications.length})`,
            markAll: "Barchasini o'qish",
            details: "Batafsil ko'rish",
          };

  const getIcon = (type: NotificationTypeEnum) => {
    switch (type) {
      case NotificationTypeEnum.SUCCESS: return <CheckCircle2 className="text-green-500" size={20} />;
      case NotificationTypeEnum.WARNING: return <AlertCircle className="text-amber-500" size={20} />;
      case NotificationTypeEnum.ERROR: return <AlertCircle className="text-red-500" size={20} />;
      case NotificationTypeEnum.ORDER_STATUS_UPDATE: return <Package className="text-blue-500" size={20} />;
      case NotificationTypeEnum.INFO:
      default: return <Info className="text-slate-400" size={20} />;
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }

    if (notification.relatedOrderId) {
      queryClient.removeQueries({ queryKey: ['order', notification.relatedOrderId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['courier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['courier-status'] });
    }

    if (notification.actionRoute) {
      navigate(notification.actionRoute);
    }
  };

  const renderStateCard = (
    icon: React.ReactNode,
    title: string,
    subtitle: string,
  ) => (
    <div
      className={
        isCourier
          ? 'courier-card-strong flex flex-col items-center justify-center rounded-[30px] px-6 py-16 text-center'
          : 'flex flex-col items-center justify-center px-6 py-20 text-center'
      }
    >
      <div
        className={
          isCourier
            ? 'courier-accent-pill mb-4 flex h-20 w-20 items-center justify-center rounded-full'
            : 'mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100'
        }
      >
        {icon}
      </div>
      <h3 className={isCourier ? 'text-lg font-black text-[var(--courier-text)]' : 'text-lg font-bold text-slate-800'}>
        {title}
      </h3>
      <p className={isCourier ? 'mt-1 text-sm text-[var(--courier-muted)]' : 'text-sm text-slate-500'}>
        {subtitle}
      </p>
    </div>
  );

  if (isLoading) {
    return renderStateCard(
      <Loader2 size={28} className={`animate-spin ${isCourier ? 'text-[var(--courier-accent-contrast)]' : 'text-slate-400'}`} />,
      'Bildirishnomalar yuklanmoqda',
      'Real notification oqimi serverdan olinmoqda.',
    );
  }

  if (isError) {
    return renderStateCard(
      <AlertCircle size={28} className="text-red-400" />,
      'Bildirishnomalar yuklanmadi',
      (error as Error).message,
    );
  }

  if (notifications.length === 0) {
    return renderStateCard(
      <Bell size={32} className={isCourier ? 'text-[var(--courier-accent-contrast)]' : 'text-slate-300'} />,
      copy.emptyTitle,
      copy.emptySubtitle,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1 mb-2">
        <span
          className={
            isCourier
              ? 'text-[11px] font-black uppercase tracking-[0.18em] text-[var(--courier-muted)]'
              : 'text-[11px] font-black uppercase tracking-widest text-slate-400'
          }
        >
          {copy.heading}
        </span>
        <button 
          onClick={() => markAllAsRead.mutate()}
          className={
            isCourier
              ? 'rounded-full bg-[var(--courier-accent-soft)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#7d5e00] active:scale-[0.98] dark:text-[var(--courier-accent)]'
              : 'text-[11px] font-black uppercase tracking-widest text-amber-600 active:text-amber-700'
          }
          disabled={markAllAsRead.isPending}
        >
          {markAllAsRead.isPending ? "Yuklanmoqda..." : copy.markAll}
        </button>
      </div>

      <div className="space-y-3 pb-20">
        {notifications.map((notification) => (
          <div 
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`
              relative cursor-pointer rounded-[24px] p-4 transition-all active:scale-[0.98]
              ${isCourier
                ? notification.isRead
                  ? 'courier-card border border-[var(--courier-line)] bg-[var(--courier-surface)] opacity-85'
                  : 'courier-card-strong border border-[rgba(255,216,76,0.26)] bg-[var(--courier-surface-strong)] shadow-[0_18px_42px_rgba(17,17,17,0.08)]'
                : notification.isRead 
                  ? 'border-2 border-slate-50 bg-white opacity-80' 
                  : 'border-2 border-amber-100 bg-white shadow-lg shadow-amber-50'
              }
            `}
          >
            {!notification.isRead && (
              <div className={`absolute top-4 right-4 h-2 w-2 rounded-full ${isCourier ? 'bg-[var(--courier-accent)]' : 'bg-amber-500'}`} />
            )}
            
            <div className="flex gap-4">
              <div className={`
                flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                ${isCourier
                  ? notification.isRead
                    ? 'bg-black/5 dark:bg-white/6'
                    : 'bg-[var(--courier-accent-soft)]'
                  : notification.isRead
                    ? 'bg-slate-50'
                    : 'bg-amber-50'}
              `}>
                {getIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <h4
                    className={`truncate text-sm font-bold ${
                      isCourier
                        ? notification.isRead
                          ? 'text-[var(--courier-text)]/72'
                          : 'text-[var(--courier-text)]'
                        : notification.isRead
                          ? 'text-slate-600'
                          : 'text-slate-900'
                    }`}
                  >
                    {notification.title}
                  </h4>
                  <span
                    className={`ml-2 whitespace-nowrap text-[10px] ${
                      isCourier ? 'text-[var(--courier-muted)]' : 'text-slate-400'
                    }`}
                  >
                    {formatTimeAgo(notification.createdAt, language)}
                  </span>
                </div>
                <p
                  className={`text-xs leading-relaxed ${
                    isCourier
                      ? notification.isRead
                        ? 'text-[var(--courier-muted)]'
                        : 'text-[var(--courier-text)]/78'
                      : notification.isRead
                        ? 'text-slate-500'
                        : 'text-slate-700'
                  }`}
                >
                  {notification.message}
                </p>
                
                {notification.actionRoute && (
                  <div
                    className={`mt-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                      isCourier ? 'text-[var(--courier-accent-strong)]' : 'text-amber-600'
                    }`}
                  >
                    <span>{copy.details}</span>
                    <ChevronRight size={12} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationList;
