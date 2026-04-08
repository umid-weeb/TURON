import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppErrorBoundary } from '../ui/AppErrorBoundary';
import {
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Clock, 
  Settings,
  Bell,
  Search,
  Truck,
  UtensilsCrossed
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
        className={`flex flex-col items-center justify-center gap-1.5 transition-all relative px-4 py-2 rounded-2xl
          ${isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-50'}
        `}
      >
        <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-700' : 'text-slate-400'}`}>
          {label}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-32">
      {/* Admin Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Settings size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tighter italic uppercase leading-none">Admin</h2>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Turon Kafesi</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${syncBadgeClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'animate-pulse bg-emerald-500' : 'bg-current/50'}`} />
                <span>{syncLabel}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => navigate('/admin/notifications')}
             className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 relative active:scale-95 transition-transform"
           >
             <Bell size={20} />
             <NotificationBadge role={UserRoleEnum.ADMIN} />
           </button>
           <button className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
             <Search size={20} />
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mt-20 px-6 pt-6 overflow-x-hidden">
        <AppErrorBoundary theme="light" homeUrl="/admin">
          <Outlet />
        </AppErrorBoundary>
      </main>

      {/* Admin Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 flex items-center justify-around z-50 shadow-2xl safe-area-inset-bottom">
        <NavItem 
          path="/admin/dashboard" 
          icon={<LayoutDashboard size={24} />} 
          label="Statistika" 
        />
        <NavItem
          path="/admin/orders"
          icon={<ShoppingBag size={24} className={flashActive ? 'text-rose-500' : ''} />}
          label="Buyurtmalar"
          badge={newOrdersCount}
        />
        <NavItem 
          path="/admin/menu" 
          icon={<UtensilsCrossed size={24} />} 
          label="Menyu" 
        />
        <NavItem 
          path="/admin/couriers" 
          icon={<Truck size={24} />} 
          label="Kuryerlar" 
        />
        <NavItem 
          path="/admin/promos" 
          icon={<Settings size={24} />} 
          label="Aksiyalar" 
        />
      </nav>
    </div>
  );
};

export default AdminLayout;
