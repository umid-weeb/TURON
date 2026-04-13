import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CircleUserRound, History, Home, List, Navigation } from 'lucide-react';
import { UserRoleEnum } from '@turon/shared';
import NotificationBadge from '../../features/notifications/components/NotificationBadge';
import { isActiveDeliveryStage } from '../../features/courier/deliveryStage';
import { useCourierOrders, useCourierStatus, useOrdersRealtimeSync } from '../../hooks/queries/useOrders';
import { OrderInterruptModal } from '../courier/OrderInterruptModal';
import { useOrderInterruptStore } from '../../store/useOrderInterruptStore';
import { useAuthStore } from '../../store/useAuthStore';
import { AppErrorBoundary } from '../ui/AppErrorBoundary';
import { MiniAppCloseButton } from '../telegram/MiniAppCloseButton';

// ─── New-order interrupt detection ──────────────────────────────────────────
function useCourierNewOrderDetection() {
  const { data: orders = [] } = useCourierOrders();
  const { initialized, seenOrderIds, showInterrupt, markSeen, setInitialized } =
    useOrderInterruptStore();
  const initializedRef = React.useRef(initialized);

  React.useEffect(() => {
    const assignedOrders = orders.filter((o) => o.courierAssignmentStatus === 'ASSIGNED');

    if (!initializedRef.current) {
      assignedOrders.forEach((o) => markSeen(o.id));
      setInitialized();
      initializedRef.current = true;
      return;
    }

    const newOrder = assignedOrders.find((o) => !seenOrderIds.has(o.id));
    if (newOrder) {
      showInterrupt(newOrder);
    }
  }, [orders, initialized, seenOrderIds, showInterrupt, markSeen, setInitialized]);
}

const CourierLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: orders = [] } = useCourierOrders();
  const { data: courierStatus } = useCourierStatus();
  const { isConnected } = useOrdersRealtimeSync();
  const user = useAuthStore((state) => state.user);

  useCourierNewOrderDetection();

  const isMapPage = location.pathname.includes('/map/');
  const activeDelivery = orders.find((o) => isActiveDeliveryStage(o.deliveryStage));

  // Courier initials for avatar
  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'K';

  const isOnline = courierStatus?.isOnline ?? false;

  const tabs = [
    { path: '/courier', icon: Home, label: 'Asosiy', exact: true, matchPrefix: undefined },
    { path: '/courier/orders', icon: List, label: 'Buyurtmalar', exact: false, matchPrefix: '/courier/order' },
    { path: '/courier/history', icon: History, label: 'Tarix', exact: false, matchPrefix: undefined },
    { path: '/courier/profile', icon: CircleUserRound, label: 'Profil', exact: false, matchPrefix: undefined },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      {/* Global interrupt — renders above all content including map */}
      <OrderInterruptModal />

      {/* ─── Header ───────────────────────────────────────────────── */}
      {!isMapPage && (
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-xl"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex h-16 items-center justify-between px-5">
            {/* Left: avatar + name + status dot */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-[13px] font-black text-white">
                  {initials}
                </div>
                {/* Online/offline dot */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                    isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </div>
              <div>
                <p className="text-[15px] font-black leading-none text-slate-900">
                  {user?.fullName?.split(' ')[0] || 'Kuryer'}
                </p>
                <p className={`mt-0.5 text-[11px] font-semibold ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {isOnline
                    ? courierStatus?.isAcceptingOrders
                      ? 'Faol — buyurtma qabul qilmoqda'
                      : 'Onlayn — qabul yopiq'
                    : 'Offline'}
                </p>
              </div>
            </div>

            {/* Right: notification bell */}
            <button
              type="button"
              onClick={() => navigate('/courier/notifications')}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-transform active:scale-95"
            >
              <Bell size={19} />
              <NotificationBadge role={UserRoleEnum.COURIER} />
            </button>
            <MiniAppCloseButton tone="light" />
          </div>
        </header>
      )}

      {/* ─── Active delivery banner ────────────────────────────────── */}
      {!isMapPage && activeDelivery && (
        <div
          className="fixed left-0 right-0 z-40"
          style={{ top: `calc(env(safe-area-inset-top, 0px) + 64px)` }}
        >
          <button
            type="button"
            onClick={() => navigate(`/courier/map/${activeDelivery.id}`)}
            className="flex w-full items-center justify-between bg-emerald-500 px-5 py-3 text-white active:bg-emerald-600"
          >
            <div className="flex items-center gap-3">
              <Navigation size={18} className="animate-pulse" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
                  Faol yetkazish
                </p>
                <p className="text-[14px] font-black">#{activeDelivery.orderNumber} — xaritada ochish</p>
              </div>
            </div>
            <span className="text-emerald-200">›</span>
          </button>
        </div>
      )}

      {/* ─── Main content ──────────────────────────────────────────── */}
      <main
        className="flex-1"
        style={{
          paddingTop: isMapPage
            ? 0
            : activeDelivery
              ? 'calc(env(safe-area-inset-top, 0px) + 64px + 52px)'
              : 'calc(env(safe-area-inset-top, 0px) + 64px)',
          paddingBottom: isMapPage ? 0 : 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        }}
      >
        <AppErrorBoundary theme="light" homeUrl="/courier">
          <Outlet />
        </AppErrorBoundary>
      </main>

      {/* ─── Bottom navigation ─────────────────────────────────────── */}
      {!isMapPage && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-slate-100 bg-white/95 backdrop-blur-xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
        >
          <div className="flex w-full items-center justify-around px-2 pt-2">
            {tabs.map(({ path, icon: Icon, label, exact, matchPrefix }) => {
              const isActive = exact
                ? location.pathname === path
                : location.pathname.startsWith(matchPrefix ?? path);

              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => navigate(path)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-[18px] py-2 transition-colors ${
                    isActive ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default CourierLayout;
