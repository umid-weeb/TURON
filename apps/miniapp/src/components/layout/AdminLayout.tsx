import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppErrorBoundary } from '../ui/AppErrorBoundary';
import {
  LayoutDashboard,
  ShoppingBag,
  Bell,
  Search,
  Truck,
  Tag,
  UtensilsCrossed,
} from 'lucide-react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useAdminOrders, useOrdersRealtimeSync } from '../../hooks/queries/useOrders';
import NotificationBadge from '../../features/notifications/components/NotificationBadge';
import { OrderStatusEnum, UserRoleEnum } from '@turon/shared';

/** Play a short beep using Web Audio API when a new order arrives */
function playNewOrderBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    osc.onended = () => ctx.close();
  } catch {
    // Web Audio not available — silent fail
  }
}

/** Detect new PENDING orders and fire audio + haptic alert */
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
  const syncLabel = isConnected
    ? 'Main Branch'
    : connectionState === 'reconnecting'
      ? 'Qayta ulanmoqda'
      : connectionState === 'connecting'
        ? 'Ulanmoqda'
        : 'Offline';

  const NavItem: React.FC<{
    path: string;
    icon: React.ReactNode;
    label: string;
    badge?: number;
  }> = ({ path, icon, label, badge }) => {
    const isActive = location.pathname.startsWith(path);
    return (
      <button
        onClick={() => navigate(path)}
        className={`relative flex h-14 min-w-[58px] flex-col items-center justify-center gap-1 transition-colors
          ${isActive ? 'text-blue-600' : 'text-slate-500'}
        `}
      >
        <div className="relative">
          {icon}
        </div>
        <span className={`text-[10px] font-bold ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
          {label}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute right-1 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="admin-shell min-h-screen bg-[#f4f6fa] flex flex-col font-sans text-slate-950 pb-24">
      {/* Admin Header */}
      <header className="fixed top-0 left-1/2 z-50 w-full max-w-[390px] -translate-x-1/2 bg-white px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white">
              T
            </div>
            <div>
              <h2 className="text-base font-black leading-none tracking-tight text-slate-950">TURON</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Admin Panel · {syncLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Izlash"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400 active:scale-95"
            >
              <Search size={21} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/notifications')}
              aria-label="Bildirishnomalar"
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-500 active:scale-95"
            >
              <Bell size={20} />
              <NotificationBadge role={UserRoleEnum.ADMIN} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mt-[76px] px-4 pt-4 overflow-x-hidden">
        <AppErrorBoundary theme="light" homeUrl="/admin">
          <Outlet />
        </AppErrorBoundary>
      </main>

      {/* Admin Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 z-50 flex h-[68px] w-full max-w-[390px] -translate-x-1/2 items-center justify-around border-t border-slate-100 bg-white px-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] safe-area-inset-bottom">
        <NavItem
          path="/admin/dashboard"
          icon={<LayoutDashboard size={22} />}
          label="Home"
        />
        <NavItem
          path="/admin/orders"
          icon={<ShoppingBag size={22} className={flashActive ? 'text-rose-500' : ''} />}
          label="Buyurtma"
          badge={newOrdersCount}
        />
        <NavItem
          path="/admin/menu"
          icon={<UtensilsCrossed size={22} />}
          label="Menu"
        />
        <NavItem
          path="/admin/couriers"
          icon={<Truck size={22} />}
          label="Kuryer"
        />
        <NavItem
          path="/admin/promos"
          icon={<Tag size={22} />}
          label="Promo"
        />
      </nav>
    </div>
  );
};

export default AdminLayout;
