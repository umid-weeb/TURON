import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CircleUserRound, History, Home, List, Navigation, Truck } from 'lucide-react';
import { UserRoleEnum } from '@turon/shared';
import NotificationBadge from '../../features/notifications/components/NotificationBadge';
import { isActiveDeliveryStage } from '../../features/courier/deliveryStage';
import { useCourierOrders, useCourierStatus, useOrdersRealtimeSync } from '../../hooks/queries/useOrders';

const CourierLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: orders = [] } = useCourierOrders();
  const { data: courierStatus } = useCourierStatus();
  const { connectionState, isConnected } = useOrdersRealtimeSync();
  const isMapPage = location.pathname.includes('/map/');
  const activeDelivery = orders.find((order) => isActiveDeliveryStage(order.deliveryStage));
  const syncBadgeClass = isConnected
    ? 'bg-emerald-50 text-emerald-700'
    : connectionState === 'reconnecting' || connectionState === 'connecting'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-slate-100 text-slate-500';
  const syncLabel = isConnected
    ? 'Jonli sync'
    : connectionState === 'reconnecting'
      ? 'Qayta ulanmoqda'
      : connectionState === 'connecting'
        ? 'Ulanmoqda'
        : 'Offline';
  const availabilityLabel = courierStatus?.isOnline
    ? courierStatus.isAcceptingOrders
      ? "Online / qabul ochiq"
      : "Online / qabul yopiq"
    : 'Offline / Turon';

  const NavItem: React.FC<{
    path: string;
    icon: React.ReactNode;
    label: string;
  }> = ({ path, icon, label }) => {
    const isActive =
      path === '/courier'
        ? location.pathname === '/courier'
        : location.pathname.startsWith(path);

    return (
      <button
        type="button"
        onClick={() => navigate(path)}
        className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-2 transition-all ${
          isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'
        }`}
      >
        <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>{icon}</div>
        <span
          className={`text-[10px] font-black uppercase tracking-widest ${
            isActive ? 'text-indigo-700' : 'text-slate-400'
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50 pb-32 font-sans text-slate-900">
      {!isMapPage && (
        <header className="fixed left-0 right-0 top-0 z-50 flex h-20 items-center justify-between border-b border-slate-100 bg-white/80 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
              <Navigation size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase italic leading-none tracking-tighter">Kuryer</h2>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{availabilityLabel}</p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${syncBadgeClass}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'animate-pulse bg-emerald-500' : 'bg-current/50'}`} />
                  <span>{syncLabel}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/courier/notifications')}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-transform active:scale-95"
            >
              <Bell size={20} />
              <NotificationBadge role={UserRoleEnum.COURIER} />
            </button>
            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Courier" alt="Avatar" />
            </div>
          </div>
        </header>
      )}

      <main className={`relative h-full w-full flex-1 ${!isMapPage ? 'mt-20' : ''}`}>
        {!isMapPage && activeDelivery && (
          <button
            type="button"
            onClick={() => navigate(`/courier/map/${activeDelivery.id}`)}
            className="mx-6 mb-2 mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white shadow-lg shadow-emerald-200 transition-transform active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Truck size={20} className="animate-bounce text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Faol yetkazib berish</span>
                <span className="font-black">Buyurtma {activeDelivery.orderNumber}</span>
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Navigation size={16} />
            </div>
          </button>
        )}

        <Outlet />
      </main>

      {!isMapPage && (
        <nav className="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-50 flex h-24 items-center justify-around border-t border-slate-100 bg-white/95 px-4 shadow-2xl backdrop-blur-md">
          <NavItem path="/courier" icon={<Home size={24} />} label="Holat" />
          <NavItem path="/courier/orders" icon={<List size={24} />} label="Buyurtmalar" />
          <NavItem path="/courier/history" icon={<History size={24} />} label="Tarix" />
          <NavItem path="/courier/profile" icon={<CircleUserRound size={24} />} label="Profil" />
        </nav>
      )}
    </div>
  );
};

export default CourierLayout;
