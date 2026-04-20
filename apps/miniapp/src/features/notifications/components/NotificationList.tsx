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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Loader2 size={28} className="animate-spin text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Bildirishnomalar yuklanmoqda</h3>
        <p className="text-sm text-slate-500">Real notification oqimi serverdan olinmoqda.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Bildirishnomalar yuklanmadi</h3>
        <p className="text-sm text-slate-500">{(error as Error).message}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Bell size={32} className="text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">{copy.emptyTitle}</h3>
        <p className="text-sm text-slate-500">{copy.emptySubtitle}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1 mb-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{copy.heading}</span>
        <button 
          onClick={() => markAllAsRead.mutate()}
          className="text-[11px] font-black uppercase tracking-widest text-amber-600 active:text-amber-700"
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
              relative p-4 rounded-[24px] border-2 transition-all active:scale-[0.98] cursor-pointer
              ${notification.isRead 
                ? 'bg-white border-slate-50 opacity-80' 
                : 'bg-white border-amber-100 shadow-lg shadow-amber-50'
              }
            `}
          >
            {!notification.isRead && (
              <div className="absolute top-4 right-4 w-2 h-2 bg-amber-500 rounded-full" />
            )}
            
            <div className="flex gap-4">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shrink-0
                ${notification.isRead ? 'bg-slate-50' : 'bg-amber-50'}
              `}>
                {getIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <h4 className={`text-sm font-bold truncate ${notification.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                    {notification.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                    {formatTimeAgo(notification.createdAt, language)}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${notification.isRead ? 'text-slate-500' : 'text-slate-700'}`}>
                  {notification.message}
                </p>
                
                {notification.actionRoute && (
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-amber-600">
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
