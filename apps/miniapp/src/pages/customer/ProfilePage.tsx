import React from 'react';
import { ChevronRight, Globe2, MapPinned, HelpCircle, Info, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';
import { useAddresses } from '../../hooks/queries/useAddresses';
import { useAuthStore } from '../../store/useAuthStore';
import { customerLanguageOptions, useCustomerLanguage } from '../../features/i18n/customerLocale';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { tg } = useTelegram();
  const { data: addresses = [] } = useAddresses();
  const { language, setLanguage, tr } = useCustomerLanguage();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Get initials from user name
  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'MM';

  // Language label
  const languageLabel = language === 'ru' ? 'Русский' : language === 'uz-cyrl' ? 'Ўзбекча' : "O'zbekcha";

  const menuItems = [
    {
      icon: MapPinned,
      label: tr('profile.addresses') || 'Manzillarim',
      onClick: () => navigate('/customer/addresses'),
    },
    {
      icon: Globe2,
      label: tr('profile.language') || 'Tilni o\'zgartirish',
      value: languageLabel,
      onClick: () => {
        // Toggle language selection
        const nextLang = language === 'uz' ? 'ru' : 'uz';
        setLanguage(nextLang);
      },
    },
    {
      icon: HelpCircle,
      label: tr('profile.support') || 'Yordam',
      onClick: () => navigate('/customer/support'),
    },
    {
      icon: Info,
      label: 'Ilova haqida',
      onClick: () => navigate('/customer/about'),
    },
  ];

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-4">
        <h1 className="text-center text-lg font-black text-slate-900">Profil</h1>
      </div>

      {/* Profile Card */}
      <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-50 shadow-sm">
            <span className="text-2xl font-black text-amber-700">{initials}</span>
          </div>

          {/* Name */}
          <h2 className="text-lg font-black tracking-tight text-slate-900">
            {user?.fullName || 'Turon mijozi'}
          </h2>

          {/* Phone */}
          <p className="mt-1 text-sm text-slate-500">{user?.phoneNumber || '+998 90 000 00 00'}</p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="mt-6 space-y-3 px-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex w-full items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-gray-100 transition-colors hover:bg-gray-50 active:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Icon size={20} className="text-slate-600" />
                </div>
                <span className="font-semibold text-slate-900">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.value && <span className="text-sm text-slate-500">{item.value}</span>}
                <ChevronRight size={18} className="text-slate-300" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Logout Button */}
      <div className="mx-4 mt-8">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-4 font-black text-white transition-colors hover:bg-red-600 active:bg-red-700 shadow-sm"
        >
          <LogOut size={18} />
          <span>Tizimdan chiqish</span>
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
