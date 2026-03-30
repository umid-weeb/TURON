import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Navigation, 
  List, 
  User, 
  Settings,
  Bell,
  Search,
  Map as MapIcon,
  Truck
} from 'lucide-react';
import NotificationBadge from '../../features/notifications/components/NotificationBadge';
import { UserRoleEnum } from '@turon/shared';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useAuthStore } from '../../store/useAuthStore';

const CourierLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders } = useOrdersStore();
  const { user } = useAuthStore();
  
  // Active delivery check
  const activeDelivery = orders.find(
    o => o.courierId === user?.id && (o.orderStatus === 'PREPARING' || o.orderStatus === 'DELIVERING')
  );

  const NavItem: React.FC<{ 
    path: string; 
    icon: React.ReactNode; 
    label: string; 
  }> = ({ path, icon, label }) => {
    const isActive = location.pathname.startsWith(path);
    return (
      <button 
        onClick={() => navigate(path)}
        className={`flex flex-col items-center justify-center gap-1.5 transition-all relative px-4 py-2 rounded-2xl
          ${isActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-50'}
        `}
      >
        <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-32 overflow-x-hidden">
      {/* Courier Header (Hidden on map page) */}
      {!location.pathname.includes('/map/') && (
        <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-50 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Navigation size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tighter italic uppercase leading-none">Kuryer</h2>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-0.5">Online • Turon</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
               onClick={() => navigate('/courier/notifications')}
               className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 relative active:scale-95 transition-transform"
             >
               <Bell size={20} />
               <NotificationBadge role={UserRoleEnum.COURIER} />
             </button>
             <div className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white overflow-hidden shadow-sm">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Courier" alt="Avatar" />
             </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 ${!location.pathname.includes('/map/') ? 'mt-20' : ''} h-full w-full relative`}>
        {/* Active Delivery Shortcut Banner */}
        {!location.pathname.includes('/map/') && activeDelivery && (
          <div className="mx-6 mt-4 mb-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 shadow-lg shadow-emerald-200 flex items-center justify-between text-white cursor-pointer active:scale-95 transition-transform" onClick={() => navigate(`/courier/map/${activeDelivery.id}`)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                 <Truck size={20} className="text-white animate-bounce" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Faol yetkazib berish</span>
                 <span className="font-black">Buyurtma {activeDelivery.orderNumber}</span>
              </div>
            </div>
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
               <Navigation size={16} />
            </div>
          </div>
        )}
        
        <Outlet />
      </main>

      {/* Courier Bottom Navigation (Hidden on map page to allow bottom sheet) */}
      {!location.pathname.includes('/map/') && (
        <nav className="fixed bottom-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 flex items-center justify-around z-50 shadow-2xl safe-area-inset-bottom">
          <NavItem 
            path="/courier/orders" 
            icon={<List size={24} />} 
            label="Buyurtmalar" 
          />
          <NavItem 
            path="/courier/profile" 
            icon={<User size={24} />} 
            label="Profil" 
          />
          <NavItem 
            path="/courier/settings" 
            icon={<Settings size={24} />} 
            label="Sozlamalar" 
          />
        </nav>
      )}
    </div>
  );
};

export default CourierLayout;
