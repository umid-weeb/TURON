import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Clock, 
  Settings,
  Bell,
  Search
} from 'lucide-react';
import { useOrdersStore } from '../../store/useOrdersStore';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders } = useOrdersStore();
  const newOrdersCount = orders.filter(o => o.orderStatus === 'NEW').length;

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
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-0.5">Turon Kafesi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 relative">
             <Bell size={20} />
             {newOrdersCount > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />}
           </button>
           <button className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
             <Search size={20} />
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mt-20 px-6 pt-6 overflow-x-hidden">
        <Outlet />
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
          icon={<ShoppingBag size={24} />} 
          label="Buyurtmalar" 
          badge={newOrdersCount}
        />
        <NavItem 
          path="/admin/couriers" 
          icon={<Truck size={24} />} 
          label="Kuryerlar" 
        />
        <NavItem 
          path="/admin/users" 
          icon={<Users size={24} />} 
          label="Mijozlar" 
        />
      </nav>
    </div>
  );
};

export default AdminLayout;
