import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, LayoutDashboard, ShoppingBag, Store, Tag, Truck, UtensilsCrossed } from 'lucide-react';
import { OrderStatusEnum, UserRoleEnum } from '@turon/shared';
import { AppErrorBoundary } from '../ui/AppErrorBoundary';
import NotificationBadge from '../../features/notifications/components/NotificationBadge';
import { useAdminOrders, useOrdersRealtimeSync } from '../../hooks/queries/useOrders';
import { useOrdersStore } from '../../store/useOrdersStore';
import '../../styles/admin-pro.css';

function playNewOrderBeep() {
  try {
    const ctx = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => void ctx.close();
  } catch {
    // Silent fail when Web Audio is unavailable.
  }
}

function useAdminNewOrderAlert(pendingCount: number) {
  const prevCountRef = React.useRef<number | null>(null);
  const [flashActive, setFlashActive] = React.useState(false);

  React.useEffect(() => {
    if (prevCountRef.current === null) {
      prevCountRef.current = pendingCount;
      return;
    }

    if (pendingCount > prevCountRef.current) {
      playNewOrderBeep();
      setFlashActive(true);
      window.setTimeout(() => setFlashActive(false), 2000);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');
    }

    prevCountRef.current = pendingCount;
  }, [pendingCount]);

  return { flashActive };
}

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders: storeOrders } = useOrdersStore();
  const { data: adminOrders = [] } = useAdminOrders();
  const { connectionState, isConnected } = useOrdersRealtimeSync();
  const orders = adminOrders.length > 0 ? adminOrders : storeOrders;
  const newOrdersCount = orders.filter((order) => order.orderStatus === OrderStatusEnum.PENDING).length;
  const { flashActive } = useAdminNewOrderAlert(newOrdersCount);
  const [keyboardOpen, setKeyboardOpen] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);

  const isTypingElement = (element: Element | null) => {
    if (!element) return false;
    const tag = element.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (element as HTMLElement).isContentEditable;
  };

  const computeKeyboardOpen = React.useCallback(() => {
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const keyboardLikelyVisible = window.innerHeight - viewportHeight > 140;
    const hasInputFocus = isTypingElement(document.activeElement);
    setKeyboardOpen(hasInputFocus || keyboardLikelyVisible);
  }, []);

  const syncModalState = React.useCallback(() => {
    setModalOpen(document.body.getAttribute('data-admin-modal-open') === '1');
  }, []);

  React.useEffect(() => {
    computeKeyboardOpen();
    window.visualViewport?.addEventListener('resize', computeKeyboardOpen);
    window.visualViewport?.addEventListener('scroll', computeKeyboardOpen);
    window.addEventListener('focusin', computeKeyboardOpen);
    window.addEventListener('focusout', computeKeyboardOpen);

    return () => {
      window.visualViewport?.removeEventListener('resize', computeKeyboardOpen);
      window.visualViewport?.removeEventListener('scroll', computeKeyboardOpen);
      window.removeEventListener('focusin', computeKeyboardOpen);
      window.removeEventListener('focusout', computeKeyboardOpen);
    };
  }, [computeKeyboardOpen]);

  React.useEffect(() => {
    syncModalState();

    const observer = new MutationObserver(syncModalState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-admin-modal-open'],
    });

    return () => observer.disconnect();
  }, [syncModalState]);

  // CRITICAL: Re-sync UI state on navigation to prevent "stuck" hidden nav
  React.useEffect(() => {
    // Small delay to allow DOM updates and focus shifts
    const timer = window.setTimeout(() => {
      computeKeyboardOpen();
      syncModalState();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [location.pathname, computeKeyboardOpen, syncModalState]);

  const getPageHeaderTitle = (pathname: string) => {
    if (pathname.startsWith('/admin/orders')) return 'Buyurtmalar';
    if (pathname.startsWith('/admin/menu')) return 'Menyu';
    if (pathname.startsWith('/admin/promos')) return 'Promokodlar';
    if (pathname.startsWith('/admin/couriers')) return 'Kuryerlar';
    if (pathname.startsWith('/admin/restaurant')) return 'Restoran';
    if (pathname.startsWith('/admin/reports')) return 'Hisobotlar';
    if (pathname.startsWith('/admin/notifications')) return 'Bildirishnomalar';
    if (pathname.startsWith('/admin/dashboard') || pathname === '/admin') return 'Bosh sahifa';
    return '';
  };

  const getBackFallbackPath = (pathname: string) => {
    if (pathname.startsWith('/admin/menu/products/') && pathname.endsWith('/edit')) return '/admin/menu/products';
    if (pathname === '/admin/menu/products/new') return '/admin/menu/products';
    if (pathname.startsWith('/admin/menu/categories/') && pathname.endsWith('/edit')) return '/admin/menu/categories';
    if (pathname === '/admin/menu/categories/new') return '/admin/menu/categories';
    if (pathname.startsWith('/admin/promos/') && pathname.endsWith('/edit')) return '/admin/promos';
    if (pathname === '/admin/promos/new') return '/admin/promos';
    if (pathname.startsWith('/admin/orders/')) return '/admin/orders';
    if (pathname.startsWith('/admin/menu')) return '/admin/dashboard';
    if (pathname.startsWith('/admin/orders')) return '/admin/dashboard';
    if (pathname.startsWith('/admin/couriers')) return '/admin/dashboard';
    if (pathname.startsWith('/admin/restaurant')) return '/admin/dashboard';
    if (pathname.startsWith('/admin/promos')) return '/admin/dashboard';
    if (pathname.startsWith('/admin/reports')) return '/admin/dashboard';
    if (pathname.startsWith('/admin/notifications')) return '/admin/dashboard';
    return '/admin/dashboard';
  };

  const pageHeaderTitle = getPageHeaderTitle(location.pathname);
  const isHomePage = location.pathname === '/admin' || location.pathname === '/admin/dashboard';
  const isFormRoute = /\/(new|edit)$/.test(location.pathname);
  const isChatRoute = location.pathname.includes('/admin/chats');
  const hideBottomNav = keyboardOpen || modalOpen || isFormRoute || isChatRoute;

  const handleBack = () => {
    const fallback = getBackFallbackPath(location.pathname);
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  };

  const layoutVars: React.CSSProperties & Record<string, string> = {
    '--admin-header-clearance': 'calc(env(safe-area-inset-top, 0px) + 82px)',
    '--admin-nav-clearance': 'calc(env(safe-area-inset-bottom, 0px) + 108px)',
    '--admin-fab-offset': 'calc(env(safe-area-inset-bottom, 0px) + 110px)',
  };

  const syncLabel = isConnected
    ? 'Asosiy tarmoq'
    : connectionState === 'reconnecting'
      ? 'Qayta ulanmoqda'
      : connectionState === 'connecting'
        ? 'Ulanmoqda'
        : 'Oflayn';

  const syncBadgeClass = isConnected
    ? 'admin-pro-sync-good'
    : connectionState === 'reconnecting' || connectionState === 'connecting'
      ? 'admin-pro-sync-warn'
      : 'admin-pro-sync-idle';

  const syncDotClass = isConnected
    ? 'bg-emerald-500'
    : connectionState === 'reconnecting' || connectionState === 'connecting'
      ? 'bg-amber-500'
      : 'bg-slate-400';

  const NavItem: React.FC<{
    path: string;
    icon: React.ReactNode;
    label: string;
    badge?: number;
  }> = ({ path, icon, label, badge }) => {
    const isActive = location.pathname.startsWith(path);

    return (
      <button
        type="button"
        onClick={() => navigate(path)}
        data-active={isActive}
        className="admin-pro-nav-item relative flex h-[60px] min-w-0 flex-col items-center justify-center gap-1 rounded-[22px]"
      >
        <div className="relative transition-transform duration-300">
          {React.cloneElement(icon as React.ReactElement, { 
            strokeWidth: isActive ? 2.5 : 2,
            size: 22
          })}
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest">
          {label}
        </span>
        {badge !== undefined && badge > 0 ? (
          <span className="admin-pro-nav-badge absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black">
            {badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div
      className="admin-pro-shell min-h-screen font-sans text-[var(--admin-pro-text)]"
      style={layoutVars}
    >
      <header
        className="sticky top-0 z-[70] px-3 pb-3 admin-motion-up"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}
      >
        <div className="admin-pro-card admin-pro-topbar mx-auto flex w-full max-w-[430px] items-center justify-between gap-3 rounded-[20px] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {!isHomePage ? (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Orqaga qaytish"
                className="admin-pro-button-secondary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              >
                <ChevronLeft size={20} />
              </button>
            ) : null}
            {pageHeaderTitle ? (
              <div className="min-w-0">
                <h1 className="truncate text-lg font-black tracking-tight text-[var(--admin-pro-text)]">
                  {pageHeaderTitle}
                </h1>
                <div
                  className={`mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border ${syncBadgeClass} ${
                    isConnected ? '' : 'animate-pulse'
                  }`}
                  aria-label={syncLabel}
                  title={syncLabel}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${syncDotClass}`} />
                </div>
              </div>
            ) : (
              <span />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/restaurant')}
              aria-label="Restoran sozlamalari"
              className={`relative flex h-11 items-center justify-center gap-2 rounded-full px-3 transition-transform ${
                location.pathname.startsWith('/admin/restaurant')
                  ? 'admin-pro-button-primary'
                  : 'admin-pro-button-secondary'
              }`}
            >
              <Store size={19} />
              <span className="hidden text-[11px] font-black sm:inline">Sozlama</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/notifications')}
              aria-label="Bildirishnomalar"
              className="admin-pro-button-secondary relative flex h-11 w-11 items-center justify-center rounded-full transition-transform"
            >
              <Bell size={20} />
              <NotificationBadge role={UserRoleEnum.ADMIN} />
            </button>
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-[430px] overflow-x-hidden px-4"
        style={{
          paddingTop: '0px',
          paddingBottom: hideBottomNav ? 'calc(env(safe-area-inset-bottom, 0px) + 24px)' : 'var(--admin-nav-clearance)',
        }}
      >
        <AppErrorBoundary theme="light" homeUrl="/admin">
          <Outlet />
        </AppErrorBoundary>
      </main>

      <nav
        className={`fixed inset-x-0 bottom-0 z-50 px-3 transition-all duration-200 ${hideBottomNav ? 'pointer-events-none translate-y-[130%] opacity-0' : 'translate-y-0 opacity-100'}`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
      >
        <div className="admin-pro-card admin-pro-topbar mx-auto grid h-[78px] w-full max-w-[430px] grid-cols-5 items-center gap-1 rounded-[30px] px-2">
          <NavItem
            path="/admin/dashboard"
            icon={<LayoutDashboard size={21} />}
            label="Bosh"
          />
          <NavItem
            path="/admin/orders"
            icon={<ShoppingBag size={21} className={flashActive ? 'text-rose-500' : ''} />}
            label="Buyurtma"
            badge={newOrdersCount}
          />
          <NavItem
            path="/admin/menu"
            icon={<UtensilsCrossed size={21} />}
            label="Menyu"
          />
          <NavItem
            path="/admin/couriers"
            icon={<Truck size={21} />}
            label="Kuryer"
          />
          <NavItem
            path="/admin/promos"
            icon={<Tag size={21} />}
            label="Promokod"
          />
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
