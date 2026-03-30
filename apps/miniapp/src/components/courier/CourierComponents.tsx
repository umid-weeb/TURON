import React from 'react';
import { 
  Package, 
  MapPin, 
  Phone, 
  ChevronRight, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Truck,
  MessageCircle,
  ArrowRight,
  Info
} from 'lucide-react';
import { Order, DeliveryStage, OrderStatus } from '../../data/types';

// --- Order Card for List ---
export const CourierOrderCard: React.FC<{ 
  order: Order; 
  onClick: () => void; 
}> = ({ order, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm active:scale-[0.98] transition-all mb-4 group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <Package size={24} />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900 leading-none">#{order.orderNumber}</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {order.items.length} ta mahsulot
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-indigo-50 rounded-xl">
           <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
             {order.paymentMethod === 'CASH' ? 'Naqd' : 'Onlayn'}
           </span>
        </div>
      </div>

      <div className="flex items-start gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
          <MapPin size={16} />
        </div>
        <p className="text-sm font-bold text-slate-600 line-clamp-2 leading-snug">
          {order.customerAddress?.addressText || 'Manzil ko\'rsatilmagan'}
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex items-center gap-2">
           <Clock size={14} className="text-slate-300" />
           <span className="text-xs font-bold text-slate-400">15-20 daqiqa</span>
        </div>
        <button className="flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-[10px]">
          <span>Ochish</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

// --- Bottom Delivery Panel (Yandex Style) ---
export const DeliveryBottomPanel: React.FC<{ 
  order: Order;
  currentStage: DeliveryStage;
  onAction: (nextStage: DeliveryStage) => void;
  onCall: () => void;
}> = ({ order, currentStage, onAction, onCall }) => {
  
  const getActionContent = () => {
    switch (currentStage) {
      case DeliveryStage.IDLE:
        return { label: 'Yo‘lga chiqaman', next: DeliveryStage.GOING_TO_RESTAURANT, color: 'slate-900' };
      case DeliveryStage.GOING_TO_RESTAURANT:
        return { label: 'Restoranga yetib keldim', next: DeliveryStage.ARRIVED_AT_RESTAURANT, color: 'blue-600' };
      case DeliveryStage.ARRIVED_AT_RESTAURANT:
        return { label: 'Buyurtmani oldim', next: DeliveryStage.PICKED_UP, color: 'amber-500' };
      case DeliveryStage.PICKED_UP:
        return { label: 'Yetkazishni boshlayman', next: DeliveryStage.DELIVERING, color: 'indigo-600' };
      case DeliveryStage.DELIVERING:
        return { label: 'Manzilga yaqin', next: DeliveryStage.ARRIVED_AT_DESTINATION, color: 'emerald-600' };
      case DeliveryStage.ARRIVED_AT_DESTINATION:
        return { label: 'Yetkazib berdim', next: DeliveryStage.DELIVERED, color: 'emerald-600' };
      default:
        return { label: 'Yopish', next: null, color: 'slate-400' };
    }
  };

  const action = getActionContent();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] px-8 pt-10 pb-12 animate-in slide-in-from-bottom duration-500">
      <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            {order.customerAddress?.label || 'Mijoz'}
          </h3>
          <p className="text-xs font-bold text-slate-400 mt-2 leading-relaxed max-w-[200px]">
            {order.customerAddress?.addressText}
          </p>
        </div>
        <button 
          onClick={onCall}
          className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 active:scale-90 transition-transform"
        >
          <Phone size={24} fill="currentColor" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
         <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">To'lov</p>
            <p className="text-sm font-black text-slate-900">{order.total.toLocaleString()} so'm</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {order.paymentMethod === 'CASH' ? 'Naqd pul' : 'To\'langan'}
            </p>
         </div>
         <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Izoh</p>
            <p className="text-[11px] font-bold text-slate-600 line-clamp-2 italic">
              {order.note || 'Izoh yo\'q'}
            </p>
         </div>
      </div>

      {action.next ? (
        <button 
          onClick={() => onAction(action.next)}
          className={`w-full h-18 bg-${action.color} text-white rounded-[24px] font-black uppercase tracking-widest shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm`}
        >
          <span>{action.label}</span>
          <ArrowRight size={20} />
        </button>
      ) : (
         <div className="flex items-center justify-center gap-2 p-5 bg-emerald-50 text-emerald-600 rounded-[24px] border border-emerald-100">
            <CheckCircle2 size={24} />
            <span className="font-black uppercase tracking-widest text-xs">Muvaffaqiyatli yetkazildi!</span>
         </div>
      )}
    </div>
  );
};

// --- Route Info Panel ---
export const RouteInfoPanel: React.FC<{ 
  distance: string; 
  eta: string; 
}> = ({ distance, eta }) => (
  <div className="absolute top-24 left-6 right-6 bg-white/90 backdrop-blur-xl rounded-[28px] p-4 shadow-xl border border-white/50 flex items-center justify-between z-40">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
        <Navigation size={24} />
      </div>
      <div>
        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Masofa</p>
        <p className="text-lg font-black text-slate-900 leading-none mt-0.5">{distance}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yetib borish</p>
      <p className="text-lg font-black text-emerald-600 leading-none mt-0.5">{eta}</p>
    </div>
  </div>
);
