import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { DashboardCard, AdminOrderCard } from '../../components/admin/AdminComponents';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders } = useOrdersStore();

  const stats = {
    total: orders.length,
    new: orders.filter(o => o.orderStatus === 'NEW').length,
    active: orders.filter(o => !['DELIVERED', 'CANCELLED', 'NEW'].includes(o.orderStatus)).length,
    delivered: orders.filter(o => o.orderStatus === 'DELIVERED').length,
  };

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Dashboard</h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Bugungi ko'rsatkichlar</p>
        </div>
        <button className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100 active:scale-90 transition-transform">
          <TrendingUp size={24} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <DashboardCard 
          title="Jami" 
          value={stats.total} 
          icon={<ShoppingBag size={24} />} 
          color="slate" 
          onClick={() => navigate('/admin/orders')}
        />
        <DashboardCard 
          title="Yangi" 
          value={stats.new} 
          icon={<AlertCircle size={24} />} 
          color="blue" 
          onClick={() => navigate('/admin/orders')}
        />
        <DashboardCard 
          title="Jarayonda" 
          value={stats.active} 
          icon={<Clock size={24} />} 
          color="amber" 
          onClick={() => navigate('/admin/orders')}
        />
        <DashboardCard 
          title="Yetkazildi" 
          value={stats.delivered} 
          icon={<CheckCircle size={24} />} 
          color="emerald" 
          onClick={() => navigate('/admin/orders')}
        />
      </div>

      {/* Recent Orders Overview */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-400">Oxirgi buyurtmalar</h3>
          <button 
            onClick={() => navigate('/admin/orders')}
            className="text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
          >
            <span>Barchasi</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
        
        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map(order => (
              <AdminOrderCard 
                key={order.id} 
                order={order} 
                onClick={() => navigate(`/admin/orders/${order.id}`)} 
              />
            ))}
          </div>
        ) : (
          <div className="p-8 bg-white rounded-[32px] border border-dashed border-slate-200 text-center text-slate-400">
            <p className="text-xs font-bold uppercase tracking-widest">Hozircha buyurtmalar yo'q</p>
          </div>
        )}
      </div>

      {/* Quick Actions Placeholder */}
      <div className="grid grid-cols-2 gap-4">
        <button className="h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center gap-3 text-slate-600 font-bold active:bg-slate-50 transition-colors">
          <Plus size={20} className="text-blue-500" />
          <span className="text-xs uppercase tracking-tight">Yangi mahsulot</span>
        </button>
        <button className="h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center gap-3 text-slate-600 font-bold active:bg-slate-50 transition-colors">
          <Users size={20} className="text-purple-500" />
          <span className="text-xs uppercase tracking-tight">Kuryer qo'shish</span>
        </button>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
