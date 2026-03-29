import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  CreditCard, 
  Clock, 
  MessageCircle, 
  ChevronRight,
  Package,
  Map as MapIcon,
  ShoppingBag
} from 'lucide-react';
import { useOrdersStore } from '../../store/useOrdersStore';

const CourierOrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById } = useOrdersStore();
  
  const [order, setOrder] = useState(orderId ? getOrderById(orderId) : undefined);

  useEffect(() => {
    if (!order && orderId) {
      const found = getOrderById(orderId);
      if (found) setOrder(found);
    }
  }, [orderId, getOrderById, order]);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h3 className="text-xl font-black text-slate-900 mb-2 italic uppercase tracking-tighter italic">Buyurtma topilmadi</h3>
        <button onClick={() => navigate('/courier/orders')} className="text-indigo-600 font-bold uppercase tracking-widest text-[10px]">Ro'yxatga qaytish</button>
      </div>
    );
  }

  const date = new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="px-6 py-6 pb-24 space-y-6 animate-in slide-in-from-bottom duration-500">
      {/* Detail Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/courier/orders')}
          className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-right">
          <h2 className="text-xl font-black text-slate-900 leading-none italic uppercase tracking-tighter italic">#{order.orderNumber}</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Soat {date} da qabul qilingan</p>
        </div>
      </div>

      {/* Main Action Button */}
      <button 
        onClick={() => navigate(`/courier/map/${order.id}`)}
        className="w-full h-20 bg-indigo-600 text-white rounded-[28px] shadow-2xl shadow-indigo-100 flex items-center justify-between px-8 group active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
              <MapIcon size={24} />
           </div>
           <span className="text-sm font-black uppercase tracking-widest leading-none">Yo'nalishni ko'rish</span>
        </div>
        <ChevronRight size={24} />
      </button>

      {/* Customer & Address Card */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="flex justify-between items-center mb-6 relative z-10 px-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manzil va Mijoz</h3>
          <button className="text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
             <Phone size={14} fill="currentColor" />
             <span>Qo'ng'iroq</span>
          </button>
        </div>
        <div className="space-y-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
               <MapPin size={24} />
            </div>
            <div>
               <p className="text-lg font-black text-slate-900 leading-tight tracking-tight uppercase italic">{order.customerAddress?.label || 'Mijoz'}</p>
               <p className="text-slate-500 text-xs mt-1 leading-relaxed font-bold uppercase tracking-tight">{order.customerAddress?.addressText || 'Manzil yo\'q'}</p>
            </div>
          </div>
          {order.note && (
             <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 italic">
                <MessageCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-amber-700 leading-relaxed font-bold uppercase tracking-tight">{order.note}</p>
             </div>
          )}
        </div>
        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-100/50 transition-all" />
      </div>

      {/* Order Info & Payment */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm overflow-hidden h-fit">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 px-1">Ma'lumotlar</h3>
        <div className="space-y-5">
           <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                    <ShoppingBag size={16} />
                 </div>
                 <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tarkibi</span>
              </div>
              <span className="font-black text-slate-900 uppercase tracking-tight">{order.items.length} ta mahsulot</span>
           </div>
           
           <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                    <CreditCard size={16} />
                 </div>
                 <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">To'lov</span>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-900 leading-none">{order.total.toLocaleString()} so'm</p>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                  {order.paymentMethod === 'CASH' ? 'Naqd pulda' : 'Onlayn to\'langan'}
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CourierOrderDetailPage;
