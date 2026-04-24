import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CircleUserRound, History, Home, List, Navigation } from 'lucide-react';
import { UserRoleEnum } from '@turon/shared';
import NotificationBadge from '../../features/notifications/components/NotificationBadge';
import { isActiveDeliveryStage } from '../../features/courier/deliveryStage';
import { useCourierOrders, useCourierStatus, useOrdersRealtimeSync } from '../../hooks/queries/useOrders';
import { OrderInterruptModal } from '../courier/OrderInterruptModal';
import { useLocationPermission } from '../../hooks/useLocationPermission';
import { useOrderInterruptStore } from '../../store/useOrderInterruptStore';
import { useAuthStore } from '../../store/useAuthStore';
import { AppErrorBoundary } from '../ui/AppErrorBoundary';
import { MiniAppCloseButton } from '../telegram/MiniAppCloseButton';

function useCourierNewOrderDetection() {
  const { data: orders = [] } = useCourierOrders();
  const { data: courierStatus } = useCourierStatus();
  const initialized = useOrderInterruptStore((state) => state.initialized);
  const seenOrderIds = useOrderInterruptStore((state) => state.seenOrderIds);
  const showInterrupt = useOrderInterruptStore((state) => state.showInterrupt);
  const dismissInterrupt = useOrderInterruptStore((state) => state.dismissInterrupt);
  const markSeen = useOrderInterruptStore((state) => state.markSeen);
  const setInitialized = useOrderInterruptStore((state) => state.setInitialized);
  const initializedRef = React.useRef(initialized);

  React.useEffect(() => {
    const assignedOrders = orders.filter((o) => o.courierAssignmentStatus === 'ASSIGNED');
    const hasInProgressOrder =
      orders.some((o) => ['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(o.courierAssignmentStatus || '')) ||
      ['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(
        courierStatus?.activeAssignment?.assignmentStatus || '',
      );

    if (hasInProgressOrder) {
      assignedOrders.forEach((o) => markSeen(o.id));
      dismissInterrupt();
      return;
    }

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
  }, [
    orders,
    courierStatus?.activeAssignment?.assignmentStatus,
    initialized,
    seenOrderIds,
    showInterrupt,
    dismissInterrupt,
    markSeen,
    setInitialized,
  ]);
}

const CourierLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: orders = [] } = useCourierOrders();
  const { data: courierStatus } = useCourierStatus();
  const { isConnected } = useOrdersRealtimeSync();
  const user = useAuthStore((state) => state.user);

  useCourierNewOrderDetection();
  useLocationPermission({ autoRequest: true });

  const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);

  const isTypingElement = (element: Element | null) => {
    if (!element) return false;
    const tag = element.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (element as HTMLElement).isContentEditable;
  };

  const computeKeyboardOpen = React.useCallback(() => {
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const keyboardLikelyVisible = window.innerHeight - viewportHeight > 140;
    const hasInputFocus = isTypingElement(document.activeElement);
    setIsKeyboardOpen(hasInputFocus || keyboardLikelyVisible);
  }, []);

  React.useEffect(() => {
    computeKeyboardOpen();
    window.addEventListener('focusin', computeKeyboardOpen);
    window.addEventListener('focusout', computeKeyboardOpen);
    window.visualViewport?.addEventListener('resize', computeKeyboardOpen);
    window.visualViewport?.addEventListener('scroll', computeKeyboardOpen);

    return () => {
      window.removeEventListener('focusin', computeKeyboardOpen);
      window.removeEventListener('focusout', computeKeyboardOpen);
      window.visualViewport?.removeEventListener('resize', computeKeyboardOpen);
      window.visualViewport?.removeEventListener('scroll', computeKeyboardOpen);
    };
  }, [computeKeyboardOpen]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      computeKeyboardOpen();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [location.pathname, computeKeyboardOpen]);

  const isMapPage = location.pathname.includes('/map/');
  const activeDelivery = orders.find((o) => isActiveDeliveryStage(o.deliveryStage));
  const isDarkTheme = typeof document !== 'undefined' && document.body.classList.contains('dark');

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'K';

  const isOnline = courierStatus?.isOnline ?? false;
  const statusCopy = isOnline
    ? courierStatus?.isAcceptingOrders
      ? 'Buyurtma qabul qilmoqda'
      : 'Qabul vaqtincha yopiq'
    : 'Tayyor holatda turibdi';

  const tabs = [
    { path: '/courier', icon: Home, label: 'Asosiy', exact: true, matchPrefix: undefined },
    { path: '/courier/orders', icon: List, label: 'Buyurtmalar', exact: false, matchPrefix: '/courier/order' },
    { path: '/courier/history', icon: History, label: 'Tarix', exact: false, matchPrefix: undefined },
    { path: '/courier/profile', icon: CircleUserRound, label: 'Profil', exact: false, matchPrefix: undefined },
  ];

  return (
    <div className={`flex min-h-screen flex-col font-sans ${isMapPage ? 'bg-[#0d0d0f] text-white' : 'courier-page'}`}>
      <OrderInterruptModal />

      {!isMapPage && (
        <header className="fixed left-0 right-0 top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="mx-4 mt-3 flex h-[72px] items-center justify-between gap-3 rounded-[28px] px-4 courier-topbar courier-enter-soft">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative">
                <div className="courier-accent-pill flex h-11 w-11 items-center justify-center rounded-[16px] text-[13px] font-black">
                  {initials}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 ${
                    isDarkTheme ? 'border-[#1d1d1f]' : 'border-[var(--courier-surface-strong)]'
                  } ${isOnline ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(31,165,107,0.14)]' : 'bg-neutral-400'}`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[15px] font-black leading-none text-[var(--courier-text)]">
                    {user?.fullName?.split(' ')[0] || 'Kuryer'}
                  </p>
                  {!isConnected ? (
                    <span className="rounded-full bg-rose-500/12 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">
                      Offline sync
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                      isOnline ? 'courier-status-pill' : 'bg-black/5 text-[var(--courier-muted)] dark:bg-white/6'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-current animate-pulse' : 'bg-current/70'}`} />
                    {isOnline
                      ? courierStatus?.isAcceptingOrders
                        ? 'Faol'
                        : 'Onlayn'
                      : 'Offline'}
                  </span>
                  <span className="truncate text-[11px] font-semibold text-[var(--courier-muted)]">
                    {statusCopy}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/courier/notifications')}
                className="courier-topbar-button relative flex h-11 w-11 items-center justify-center rounded-[18px]"
              >
                <Bell size={19} />
                <NotificationBadge role={UserRoleEnum.COURIER} />
              </button>
              <MiniAppCloseButton tone="courier" />
            </div>
          </div>
        </header>
      )}

      {!isMapPage && activeDelivery && (
        <div className="fixed left-0 right-0 z-40" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 88px)' }}>
          <button
            type="button"
            onClick={() => navigate(`/courier/map/${activeDelivery.id}`)}
            className="courier-floating-banner courier-hoverable mx-4 flex w-[calc(100%-32px)] items-center justify-between rounded-[26px] px-4 py-3.5 text-left active:scale-[0.985]"
          >
            <div className="flex items-center gap-3">
              <div className="courier-accent-pill flex h-11 w-11 items-center justify-center rounded-[16px]">
                <Navigation size={18} className="animate-pulse text-[var(--courier-accent-contrast)]" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/54">
                  Faol yetkazish
                </p>
                <p className="mt-1 text-[15px] font-black tracking-tight text-white">
                  #{activeDelivery.orderNumber} - xaritada davom etish
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--courier-accent)]">
              Pro
            </span>
          </button>
        </div>
      )}

      <main
        className="flex-1"
        style={{
          paddingTop: isMapPage
            ? 0
            : activeDelivery
              ? 'calc(env(safe-area-inset-top, 0px) + 88px + 74px)'
              : 'calc(env(safe-area-inset-top, 0px) + 88px)',
          paddingBottom: isMapPage
            ? 0
            : isKeyboardOpen
              ? 'env(safe-area-inset-bottom, 20px)'
              : 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        }}
      >
        <AppErrorBoundary theme={isDarkTheme ? 'dark' : 'light'} homeUrl="/courier">
          <Outlet />
        </AppErrorBoundary>
      </main>

      <nav
        className={`courier-bottom-bar fixed bottom-0 left-0 right-0 z-50 flex items-center transition-all duration-300 ${
          isMapPage || isKeyboardOpen ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
      >
        <div className="flex w-full items-center justify-around px-3 pt-2">
          {tabs.map(({ path, icon: Icon, label, exact, matchPrefix }) => {
            const isActive = exact
              ? location.pathname === path
              : location.pathname.startsWith(matchPrefix ?? path);

            return (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                data-active={isActive}
                className="courier-nav-item flex flex-1 flex-col items-center gap-1 rounded-[22px] py-2.5"
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.9} />
                <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default CourierLayout;
