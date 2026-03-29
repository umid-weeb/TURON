import React from 'react';
import { 
  Package, 
  ChevronRight, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  MoreHorizontal, 
  Navigation,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { Order, OrderStatus } from '../../data/types';
import { getStatusLabel, getStatusColor, getStatusStep, ORDER_TRACKING_STEPS } from '../../lib/orderStatusUtils';

export const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-${color}-100 text-${color}-600`}>
      {label}
    </span>
  );
};

export const OrderCard: React.FC<{ order: Order; onClick: () => void }> = ({ order, onClick }) => {
  const date = new Date(order.createdAt).toLocaleDateString('uz-UZ', { 
    day: 'numeric', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[32px] p-5 border border-slate-100 shadow-sm active:scale-[0.98] transition-all mb-4"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-black text-slate-900 text-lg leading-none">#{order.orderNumber}</h4>
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">{date}</p>
        </div>
        <OrderStatusBadge status={order.orderStatus} />
      </div>

      <div className="space-y-2 mb-4">
        {order.items.slice(0, 2).map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-slate-600 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            <span className="font-bold text-xs opacity-60">{item.quantity}x</span>
            <span className="truncate">{item.name}</span>
          </div>
        ))}
        {order.items.length > 2 && (
          <p className="text-slate-400 text-[10px] font-bold uppercase pl-3.5">
            va yana {order.items.length - 2} ta mahsulot...
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Jami summa</span>
          <span className="font-black text-slate-900">{order.total.toLocaleString()} so'm</span>
        </div>
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
          <ChevronRight size={20} />
        </div>
      </div>
    </div>
  );
};

export const OrderTimeline: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const currentStep = getStatusStep(status);
  const isCancelled = status === 'CANCELLED';

  if (isCancelled) {
    return (
      <div className="bg-red-50 p-6 rounded-[32px] flex items-center gap-4 border border-red-100 mb-6">
        <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shrink-0">
          <Clock size={24} />
        </div>
        <div>
          <h4 className="font-black text-red-600 uppercase tracking-tight">Buyurtma bekor qilindi</h4>
          <p className="text-red-400 text-xs font-bold leading-tight mt-0.5">Savollar bo'lsa qo'llab-quvvatlash bilan bog'laning</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm mb-6">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-8 ml-1">Buyurtma holati</h3>
      <div className="relative space-y-8">
        {/* Connector Line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100" />
        
        {ORDER_TRACKING_STEPS.map((step, idx) => {
          const stepIndex = getStatusStep(step.id);
          const isCompleted = currentStep > stepIndex;
          const isActive = currentStep === stepIndex;
          
          return (
            <div key={step.id} className="relative flex items-start gap-6 group">
              {/* Dot */}
              <div 
                className={`
                  relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 shrink-0
                  ${isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : ''}
                  ${isActive ? 'bg-amber-500 text-white shadow-xl shadow-amber-200 scale-125' : ''}
                  ${!isCompleted && !isActive ? 'bg-white border-2 border-slate-100 text-slate-200' : ''}
                `}
              >
                {isCompleted ? <CheckCircle2 size={16} strokeWidth={3} /> : <span className="text-xs font-black">{idx + 1}</span>}
              </div>
              
              <div className="flex-1 pt-0.5">
                <h4 className={`
                  font-black text-sm uppercase tracking-tight transition-colors
                  ${isCompleted ? 'text-slate-400' : ''}
                  ${isActive ? 'text-amber-600' : 'text-slate-300'}
                `}>
                  {step.label}
                </h4>
                {isActive && (
                  <p className="text-slate-600 text-[11px] font-bold mt-1 leading-snug animate-in fade-in slide-in-from-left duration-500">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TrackingMapPlaceholder: React.FC = () => (
  <div className="bg-slate-50 rounded-[40px] p-8 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4 mb-6 aspect-video">
    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
      <Navigation size={32} />
    </div>
    <div>
      <h4 className="font-black text-slate-900 uppercase tracking-tight">Jonli kuzatuv</h4>
      <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1 max-w-[200px] mx-auto leading-relaxed">
        Kuryer harakati keyingi bosqichda shu yerda ko'rinadi
      </p>
    </div>
    <div className="px-4 py-2 bg-white rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
      Tez kunda!
    </div>
  </div>
);

export const OrdersEmptyState: React.FC<{ onShop: () => void }> = ({ onShop }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
      <ShoppingBag size={48} strokeWidth={1} />
    </div>
    <h3 className="text-2xl font-black text-slate-900 mb-2 italic">Buyurtmalar yo'q!</h3>
    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest max-w-[220px] mb-10 leading-relaxed">
      Siz hali bizdan taom buyurtma bermagansiz.
    </p>
    <button 
      onClick={onShop}
      className="h-14 bg-amber-500 text-white px-10 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-200 active:scale-95 transition-transform"
    >
      Menyuni ko'rish
    </button>
  </div>
);
