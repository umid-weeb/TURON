import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LayoutDashboard, ShoppingBag, Tag, Truck, UtensilsCrossed } from 'lucide-react';
import { OrderStatusEnum, UserRoleEnum } from '@turon/shared';
import { AppErrorBoundary } from '../ui/AppErrorBoundary';
import NotificationBadge from '../../features/notifications/components/NotificationBadge';
import { useAdminOrders, useOrdersRealtimeSync } from '../../hooks/queries/useOrders';
import { useOrdersStore } from '../../store/useOrdersStore';

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

  const getPageHeaderTitle = (pathname: string) => {
    if (pathname.startsWith('/admin/orders')) return 'Buyurtma page';
    if (pathname.startsWith('/admin/menu')) return 'Menu page';
    if (pathname.startsWith('/admin/promos')) return 'Promo page';
    if (pathname.startsWith('/admin/dashboard') || pathname === '/admin') return 'Home page';
    return 'Home page';
  };

  const pageHeaderTitle = getPageHeaderTitle(location.pathname);

  const layoutVars: React.CSSProperties & Record<string, string> = {
    '--admin-header-clearance': 'calc(env(safe-area-inset-top, 0px) + 60px)',
    '--admin-nav-clearance': 'calc(env(safe-area-inset-bottom, 0px) + 108px)',
    '--admin-fab-offset': 'calc(env(safe-area-inset-bottom, 0px) + 110px)',
  };

  const syncLabel = isConnected
    ? 'Main Branch'
    : connectionState === 'reconnecting'
      ? 'Qayta ulanmoqda'
      : connectionState === 'connecting'
        ? 'Ulanmoqda'
        : 'Offline';

  const syncBadgeClass = isConnected
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : connectionState === 'reconnecting' || connectionState === 'connecting'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-slate-100 text-slate-500';

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
        className={`relative flex h-[60px] min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] transition-all ${
          isActive
            ? 'bg-blue-50 text-blue-600 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.14)]'
            : 'text-slate-500'
        }`}
      >
        <div className="relative">{icon}</div>
        <span className={`text-[10px] font-black ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
          {label}
        </span>
        {badge !== undefined && badge > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_28%),linear-gradient(180deg,#eef4ff_0%,#f7f9fc_44%,#eef3fb_100%)] font-sans text-slate-950"
      style={layoutVars}
    >
      <div
        className="fixed inset-x-0 top-0 z-50 px-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="mx-auto flex w-full max-w-[430px] items-center justify-between gap-3">
          <h1 className="truncate text-lg font-black tracking-tight text-slate-900">{pageHeaderTitle}</h1>
          <button
            type="button"
            onClick={() => navigate('/admin/notifications')}
            aria-label="Bildirishnomalar"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-md transition-transform active:scale-95"
          >
            <Bell size={20} />
            <NotificationBadge role={UserRoleEnum.ADMIN} />
          </button>
        </div>
      </div>

      <main
        className="mx-auto w-full max-w-[430px] overflow-x-hidden px-4"
        style={{
          paddingTop: 'var(--admin-header-clearance)',
          paddingBottom: 'var(--admin-nav-clearance)',
        }}
      >
        <AppErrorBoundary theme="light" homeUrl="/admin">
          <Outlet />
        </AppErrorBoundary>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 px-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
      >
        <div className="mx-auto grid h-[78px] w-full max-w-[430px] grid-cols-5 items-center gap-1 rounded-[30px] border border-white/80 bg-white/96 px-2 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          <NavItem
            path="/admin/dashboard"
            icon={<LayoutDashboard size={21} />}
            label="Home"
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
            label="Menu"
          />
          <NavItem
            path="/admin/couriers"
            icon={<Truck size={21} />}
            label="Kuryer"
          />
          <NavItem
            path="/admin/promos"
            icon={<Tag size={21} />}
            label="Promo"
          />
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
