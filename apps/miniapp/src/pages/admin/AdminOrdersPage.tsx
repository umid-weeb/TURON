import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Search, 
  Filter, 
  ShoppingBag,
  MoreVertical,
  Plus
} from 'lucide-react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { Order, OrderStatus } from '../../data/types';
import { AdminOrderCard } from '../../components/admin/AdminComponents';
import { getStatusLabel, getStatusColor } from '../../lib/orderStatusUtils';

const AdminOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders } = useOrdersStore();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');

  // Grouping logic for the board
  const newOrders = orders.filter(o => o.orderStatus === 'NEW');
  const activeOrders = orders.filter(o => ['ACCEPTED', 'PREPARING', 'READY'].includes(o.orderStatus));
  const deliveringOrders = orders.filter(o => ['PICKED_UP', 'DELIVERING'].includes(o.orderStatus));
  const completedOrders = orders.filter(o => o.orderStatus === 'DELIVERED');

  const tabs: { id: OrderStatus | 'ALL'; label: string; count: number }[] = [
    { id: 'ALL', label: 'Barchasi', count: orders.length },
    { id: 'NEW', label: 'Yangi', count: newOrders.length },
    { id: 'ACCEPTED', label: 'Jarayonda', count: activeOrders.length },
    { id: 'DELIVERING', label: 'Yo\'lda', count: deliveringOrders.length },
  ];

  const filteredOrders = activeTab === 'ALL' 
    ? orders 
    : orders.filter(o => {
        if (activeTab === 'ACCEPTED') return ['ACCEPTED', 'PREPARING', 'READY'].includes(o.orderStatus);
        if (activeTab === 'DELIVERING') return ['PICKED_UP', 'DELIVERING'].includes(o.orderStatus);
        return o.orderStatus === activeTab;
      });

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Buyurtmalar</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Boshqaruv paneli</p>
        </div>
        <div className="flex gap-2">
          <button className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              whitespace-nowrap px-5 h-11 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2
              ${activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'bg-white text-slate-400 border border-slate-100'}
            `}
          >
            <span>{tab.label}</span>
            <span className={`
              w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold
              ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-50'}
            `}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders Board / List */}
      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <AdminOrderCard 
              key={order.id} 
              order={order} 
              onClick={() => navigate(`/admin/orders/${order.id}`)} 
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
              <ShoppingBag size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic italic">Hech narsa topilmadi</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Ushbu holatda buyurtmalar yo'q</p>
          </div>
        )}
      </div>

      {/* Sticky Bottom Summary Badge (Optional) */}
      {newOrders.length > 0 && (
        <div className="fixed bottom-28 left-6 right-6 z-40 animate-bounce">
          <div className="bg-red-500 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-red-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingBag size={20} />
              </div>
              <span className="font-black uppercase tracking-widest text-xs">{newOrders.length} ta hamda yangi buyurtma!</span>
            </div>
            <ChevronRight size={20} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
