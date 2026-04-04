import React from 'react';
import { ChevronRight, Globe2, MapPinned, MessageCircle, Package2, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';
import { useAddresses } from '../../hooks/queries/useAddresses';
import { useMyOrders } from '../../hooks/queries/useOrders';
import { useAuthStore } from '../../store/useAuthStore';
import { customerLanguageOptions, useCustomerLanguage } from '../../features/i18n/customerLocale';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { tg, requestPhoneContact } = useTelegram();
  const { data: addresses = [] } = useAddresses();
  const { data: orders = [] } = useMyOrders();
  const { language, setLanguage, tr, formatText } = useCustomerLanguage();

  const handleSyncPhone = () => {
    requestPhoneContact((shared, contact) => {
      if (shared && contact?.phone_number) {
        updateUser({ phoneNumber: contact.phone_number });
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
      }
    });
  };

  const actions = [
    {
      label: tr('profile.addresses'),
      description:
        language === 'ru'
          ? `${addresses.length} сохраненных адресов`
          : language === 'uz-cyrl'
            ? `${addresses.length} та сақланган манзил`
            : `${addresses.length} ta saqlangan manzil`,
      icon: MapPinned,
      onClick: () => navigate('/customer/addresses'),
    },
    {
      label: tr('profile.orders'),
      description:
        language === 'ru'
          ? `${orders.length} заказов в истории`
          : language === 'uz-cyrl'
            ? `${orders.length} та буюртма тарихи`
            : `${orders.length} ta buyurtma tarixi`,
      icon: Package2,
      onClick: () => navigate('/customer/orders'),
    },
    {
      label: tr('profile.notifications'),
      description:
        language === 'ru'
          ? 'Статусы и системные сообщения'
          : language === 'uz-cyrl'
            ? 'Статус ва тизим хабарлари'
            : 'Status va tizim xabarlari',
      icon: MessageCircle,
      onClick: () => navigate('/customer/notifications'),
    },
    {
      label: tr('profile.support'),
      description:
        language === 'ru'
          ? 'Связь с оператором через Telegram'
          : language === 'uz-cyrl'
            ? 'Оператор билан Telegram орқали боғланиш'
            : "Operator bilan Telegram orqali bog'lanish",
      icon: MessageCircle,
      onClick: () => navigate('/customer/support'),
    },
  ];

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-500">
      <section className="glass-panel rounded-[34px] p-5 shadow-[0_18px_42px_rgba(148,101,60,0.12)]">
        <p className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-400">{tr('profile.badge')}</p>
        <h2 className="mt-2 text-[2rem] font-black leading-none tracking-tight text-slate-900">
          {formatText(user?.fullName || 'Turon mijozi')}
        </h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-[22px] bg-white/90 px-4 py-4 shadow-sm transition-all active:scale-[0.99]" onClick={!user?.phoneNumber ? handleSyncPhone : undefined}>
            <div className={`flex h-11 w-11 items-center justify-center rounded-[18px] ${!user?.phoneNumber ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
              <Phone size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{tr('profile.phone')}</p>
              <p className={`text-sm font-bold ${!user?.phoneNumber ? 'text-amber-600' : 'text-slate-900'}`}>
                {user?.phoneNumber || (language === 'ru' ? 'Синхронизация с Telegram' : language === 'uz-cyrl' ? 'Telegram билан уланиш' : 'Telegramdan olish')}
              </p>
            </div>
            {!user?.phoneNumber && <ChevronRight size={16} className="text-amber-400" />}
          </div>

          <div className="flex items-start gap-3 rounded-[22px] bg-white/90 px-4 py-4 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-slate-100 text-slate-500">
              <Globe2 size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{tr('profile.language')}</p>
              
              <div className="mt-3 flex flex-wrap gap-2">
                {customerLanguageOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLanguage(option.value)}
                    className={`h-10 flex-1 min-w-[80px] rounded-full px-3 text-[11px] font-black tracking-wider transition-all active:scale-[0.95] ${
                      language === option.value
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {tr(option.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.label}
              onClick={action.onClick}
              className="glass-panel flex w-full items-center gap-4 rounded-[30px] p-4 text-left shadow-[0_18px_42px_rgba(148,101,60,0.12)] transition-transform active:scale-[0.985]"
            >
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[22px] bg-white/90 text-slate-700 shadow-sm">
                <Icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black tracking-tight text-slate-900">{action.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{action.description}</p>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          );
        })}
      </section>
    </div>
  );
};

export default ProfilePage;
