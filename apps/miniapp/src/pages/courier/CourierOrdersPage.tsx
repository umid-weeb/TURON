import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  MapPin, 
  Clock, 
  ChevronRight,
  Navigation
} from 'lucide-react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { CourierOrderCard } from '../../components/courier/CourierComponents';

const CourierOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders } = useOrdersStore();
  
  // Mock courier ID for demonstration
  const COURIER_ID = 'c1'; 
  const courierOrders = orders.filter(o => o.courierId === COURIER_ID && o.orderStatus !== 'DELIVERED');

  return (
    <div className="px-6 py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header Summary */}
      <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-100 flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tighter italic uppercase leading-none">Vazifalar</h2>
          <p className="text-[11px] font-black uppercase tracking-widest mt-2 text-indigo-200">
            {courierOrders.length > 0 ? `${courierOrders.length} ta faol buyurtma` : 'Yangi buyurtmalar kutilmoqda'}
          </p>
        </div>
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md relative z-10">
           <Navigation size={32} />
        </div>
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Task List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-400">Yo'nalishlar</h3>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Hammasi</span>
        </div>

        {courierOrders.length > 0 ? (
          courierOrders.map(order => (
            <CourierOrderCard 
              key={order.id} 
              order={order} 
              onClick={() => navigate(`/courier/order/${order.id}`)} 
            />
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                <ShoppingBag size={40} />
             </div>
             <div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic italic">Buyurtmalar yo'q</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Yangi vazifalarni kuting</p>
             </div>
          </div>
        )}
      </div>

      {/* Quick Access to Active Delivery (If any) */}
      {courierOrders.some(o => o.deliveryStage && o.deliveryStage !== 'IDLE' && o.deliveryStage !== 'DELIVERED') && (
        <div className="fixed bottom-28 left-6 right-6 z-40 animate-bounce">
           <button 
             onClick={() => {
               const active = courierOrders.find(o => o.deliveryStage !== 'IDLE' && o.deliveryStage !== 'DELIVERED');
               if (active) navigate(`/courier/map/${active.id}`);
             }}
             className="w-full bg-emerald-500 text-white p-5 rounded-[24px] flex items-center justify-between shadow-xl shadow-emerald-100"
           >
             <div className="flex items-center gap-3">
                <Navigation size={24} />
                <span className="font-black uppercase tracking-widest text-xs">Aktiv yetkazishga qaytish</span>
             </div>
             <ChevronRight size={20} />
           </button>
        </div>
      )}
    </div>
  );
};

export default CourierOrdersPage;
