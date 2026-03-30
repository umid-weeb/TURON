import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  User, 
  Package, 
  Truck,
  AlertCircle,
  Hash
} from 'lucide-react';
import { OrderStatus, Order, PaymentStatus } from '../../data/types';

// Payment Verification Panel for Admin
export const PaymentVerificationCard: React.FC<{
  order: Order;
  onApprove: () => void;
  onReject: () => void;
}> = ({ order, onApprove, onReject }) => {
  if (order.paymentStatus !== PaymentStatus.PENDING) return null;

  return (
    <div className="bg-amber-50 rounded-[32px] p-6 border border-amber-100 shadow-xl shadow-amber-200/20 overflow-hidden relative group animate-in zoom-in duration-300">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <ShieldCheck size={80} />
      </div>
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2 text-amber-600 font-black uppercase tracking-widest text-[10px]">
          <AlertCircle size={14} />
          <span>To'lov Tasdiqlanishi Kutilmoqda</span>
        </div>
        
        <div className="space-y-2">
           <div className="flex justify-between items-center text-xs">
              <span className="text-amber-700 font-bold uppercase">To'lov usuli:</span>
              <span className="font-black text-amber-900 italic uppercase">Click / Payme</span>
           </div>
           <div className="flex justify-between items-center text-xs">
              <span className="text-amber-700 font-bold uppercase">Reference:</span>
              <span className="font-black text-amber-900 uppercase tracking-tighter">{order.paymentReference || 'N/A'}</span>
           </div>
           <div className="flex justify-between items-center text-xs">
              <span className="text-amber-700 font-bold uppercase">Summa:</span>
              <span className="font-black text-amber-900 text-sm italic">{order.total.toLocaleString()} so'm</span>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button 
            onClick={onReject}
            className="h-12 bg-white text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-100 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <XCircle size={16} />
            <span>Rad etish</span>
          </button>
          <button 
            onClick={onApprove}
            className="h-12 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} />
            <span>Tasdiqlash</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Existing components continued...
export const StatusActionButtons: React.FC<{
  currentStatus: OrderStatus;
  onUpdate: (next: OrderStatus) => void;
  onCancel: () => void;
}> = ({ currentStatus, onUpdate, onCancel }) => {
  if (currentStatus === OrderStatus.CANCELLED || currentStatus === OrderStatus.DELIVERED) return null;

  const steps: Record<OrderStatus, { next: OrderStatus; label: string }> = {
    [OrderStatus.PENDING]: { next: OrderStatus.PREPARING, label: 'Qabul qilish' },
    [OrderStatus.PREPARING]: { next: OrderStatus.READY_FOR_PICKUP, label: 'Tayyorlash' },
    [OrderStatus.READY_FOR_PICKUP]: { next: OrderStatus.DELIVERING, label: 'Kuryerga berish' },
    [OrderStatus.DELIVERING]: { next: OrderStatus.DELIVERED, label: 'Tugatish' },
    [OrderStatus.DELIVERED]: { next: OrderStatus.DELIVERED, label: 'Tugatilgan' },
    [OrderStatus.CANCELLED]: { next: OrderStatus.CANCELLED, label: 'Bekor qilingan' },
  };

  const current = steps[currentStatus];

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={onCancel}
        className="w-10 h-10 rounded-xl bg-white border border-red-100 text-red-500 flex items-center justify-center active:scale-90 transition-transform"
      >
        <XCircle size={20} />
      </button>
      {current && (
        <button 
          onClick={() => onUpdate(current.next)}
          className="h-10 px-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-transform"
        >
          <span>{current.label}</span>
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
};

export const CourierAssignModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAssign: (id: string, name: string) => void;
  currentCourierId?: string;
}> = ({ isOpen, onClose, onAssign, currentCourierId }) => {
  if (!isOpen) return null;

  const couriers = [
    { id: 'c1', name: 'Alixon Orifov', phone: '+998 90 123 45 67' },
    { id: 'c2', name: 'Botir Zokirov', phone: '+998 90 765 43 21' },
    { id: 'c3', name: 'Sardor Mamadaliyev', phone: '+998 90 111 22 33' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500">
        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter italic mb-6">Kuryerni tanlang</h3>
        
        <div className="space-y-3">
          {couriers.map(c => (
            <button 
              key={c.id}
              onClick={() => { onAssign(c.id, c.name); onClose(); }}
              className={`w-full p-5 rounded-[24px] border flex items-center justify-between transition-all ${
                currentCourierId === c.id ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center gap-4 text-left">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  currentCourierId === c.id ? 'bg-indigo-500 text-white' : 'bg-white text-slate-400 border border-slate-100'
                }`}>
                  <User size={24} />
                </div>
                <div>
                  <p className="font-black text-slate-900 uppercase italic tracking-tight">{c.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{c.phone}</p>
                </div>
              </div>
              {currentCourierId === c.id && <CheckCircle size={20} className="text-indigo-500" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminOrderCard: React.FC<{
  order: Order;
  onClick: () => void;
}> = ({ order, onClick }) => {
  const date = new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  return (
    <button 
      onClick={onClick}
      className="w-full bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all text-left flex items-center justify-between group active:scale-[0.99]"
    >
      <div className="flex items-center gap-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
          order.orderStatus === OrderStatus.PENDING ? 'bg-amber-100 text-amber-600' :
          order.orderStatus === OrderStatus.PREPARING ? 'bg-blue-100 text-blue-600' :
          order.orderStatus === OrderStatus.READY_FOR_PICKUP ? 'bg-emerald-100 text-emerald-600' :
          'bg-slate-100 text-slate-400'
        }`}>
          <Package size={28} />
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-black text-slate-900 text-lg italic uppercase tracking-tighter italic">#{order.orderNumber}</span>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
              order.orderStatus === OrderStatus.PENDING ? 'bg-amber-50 text-amber-600' :
              order.orderStatus === OrderStatus.PREPARING ? 'bg-blue-50 text-blue-600' :
              'bg-slate-50 text-slate-400'
            }`}>
              {order.orderStatus === OrderStatus.PENDING ? 'Yangi' : 
               order.orderStatus === OrderStatus.PREPARING ? 'Tayyorlov' : 'Yopilgan'}
            </span>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 text-slate-400">
               <Clock size={12} />
               <span className="text-[10px] font-bold uppercase">{date}</span>
             </div>
             <div className="flex items-center gap-1 text-slate-400">
               <User size={12} />
               <span className="text-[10px] font-bold uppercase">{order.courierName || 'Kuryer yo\'q'}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right mr-2">
          <p className="font-black text-slate-900 text-lg tracking-tight italic">
            {(order.total || 0).toLocaleString()} <span className="text-[10px] uppercase">so'm</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
          <ChevronRight size={20} />
        </div>
      </div>
    </button>
  );
};

const ArrowRight: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

const ChevronRight: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
