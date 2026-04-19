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
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { AdminCourierOption, OrderStatus, Order, PaymentMethod, PaymentStatus } from '../../data/types';

function getAdminOrderStatusMeta(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PENDING:
      return {
        iconClass: 'bg-amber-100 text-amber-600',
        badgeClass: 'bg-amber-50 text-amber-600',
        label: 'Yangi',
      };
    case OrderStatus.PREPARING:
      return {
        iconClass: 'bg-blue-100 text-blue-600',
        badgeClass: 'bg-blue-50 text-blue-600',
        label: 'Tayyorlov',
      };
    case OrderStatus.READY_FOR_PICKUP:
      return {
        iconClass: 'bg-emerald-100 text-emerald-600',
        badgeClass: 'bg-emerald-50 text-emerald-600',
        label: 'Tayyor',
      };
    case OrderStatus.DELIVERING:
      return {
        iconClass: 'bg-violet-100 text-violet-600',
        badgeClass: 'bg-violet-50 text-violet-600',
        label: 'Yo\'lda',
      };
    case OrderStatus.DELIVERED:
      return {
        iconClass: 'bg-slate-900 text-white',
        badgeClass: 'bg-emerald-50 text-emerald-600',
        label: 'Yetkazildi',
      };
    case OrderStatus.CANCELLED:
    default:
      return {
        iconClass: 'bg-red-100 text-red-600',
        badgeClass: 'bg-red-50 text-red-600',
        label: 'Bekor',
      };
  }
}

// Payment Verification Panel for Admin
export const PaymentVerificationCard: React.FC<{
  order: Order;
  onApprove: () => void;
  onReject: () => void;
  isPending?: boolean;
}> = ({ order, onApprove, onReject, isPending = false }) => {
  if (order.paymentStatus !== PaymentStatus.PENDING) return null;

  const paymentMethodLabel =
    order.paymentMethod === PaymentMethod.CASH
      ? 'Naqd pul'
      : order.paymentMethod === PaymentMethod.MANUAL_TRANSFER
        ? 'Manual transfer'
        : 'Click / Payme';

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
              <span className="font-black text-amber-900 italic uppercase">{paymentMethodLabel}</span>
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
            disabled={isPending}
            className="h-12 bg-white text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-100 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <XCircle size={16} />
            <span>{isPending ? 'Kutilmoqda' : 'Rad etish'}</span>
          </button>
          <button 
            onClick={onApprove}
            disabled={isPending}
            className="h-12 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} />
            <span>{isPending ? 'Kutilmoqda' : 'Tasdiqlash'}</span>
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
  isPending?: boolean;
}> = ({ currentStatus, onUpdate, onCancel, isPending = false }) => {
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
        disabled={isPending}
        className="w-10 h-10 rounded-xl bg-white border border-red-100 text-red-500 flex items-center justify-center active:scale-90 transition-transform"
      >
        <XCircle size={20} />
      </button>
      {current && (
        <button 
          onClick={() => onUpdate(current.next)}
          disabled={isPending}
          className="h-10 px-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
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
  onAssign: (courier: AdminCourierOption) => void;
  currentCourierId?: string;
  couriers: AdminCourierOption[];
  isLoading: boolean;
  isAssigning: boolean;
  errorMessage?: string;
  onRetry: () => void;
}> = ({
  isOpen,
  onClose,
  onAssign,
  currentCourierId,
  couriers,
  isLoading,
  isAssigning,
  errorMessage,
  onRetry,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500">
        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter italic mb-6">Kuryerni tanlang</h3>
        
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="w-full p-5 rounded-[24px] border border-slate-100 bg-slate-50 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100" />
                    <div className="space-y-2">
                      <div className="h-3 w-32 rounded bg-white" />
                      <div className="h-2.5 w-24 rounded bg-white" />
                    </div>
                  </div>
                  <div className="h-6 w-12 rounded-full bg-white" />
                </div>
              </div>
            ))
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="rounded-[24px] border border-rose-100 bg-rose-50 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertCircle size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-rose-900">Kuryerlar ro'yxati yuklanmadi</p>
                  <p className="text-xs font-bold text-rose-700 mt-1 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 h-11 px-4 rounded-2xl bg-white border border-rose-100 text-rose-600 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                <span>Qayta yuklash</span>
              </button>
            </div>
          ) : null}

          {!isLoading && !errorMessage && couriers.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Truck size={20} />
              </div>
              <p className="text-sm font-black text-slate-900 mt-4">Faol kuryer topilmadi</p>
              <p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">
                Biriktirish uchun avval kuryer akkaunti mavjud bo'lishi kerak.
              </p>
            </div>
          ) : null}

          {!isLoading && !errorMessage
            ? couriers.map((courier) => {
                const isBusy = !courier.isFree || courier.activeAssignments > 0;
                const distanceLabel =
                  typeof courier.distanceMeters === 'number'
                    ? courier.distanceMeters < 1000
                      ? `${courier.distanceMeters} m`
                      : `${(courier.distanceMeters / 1000).toFixed(1)} km`
                    : null;
                const remainingLabel =
                  typeof courier.remainingDeliveryDistanceMeters === 'number'
                    ? courier.remainingDeliveryDistanceMeters < 1000
                      ? `${courier.remainingDeliveryDistanceMeters} m`
                      : `${(courier.remainingDeliveryDistanceMeters / 1000).toFixed(1)} km`
                    : null;

                return (
                <button
                  key={courier.id}
                  type="button"
                  onClick={() => onAssign(courier)}
                  disabled={isAssigning || isBusy}
                  className={`w-full p-5 rounded-[24px] border flex items-center justify-between transition-all disabled:opacity-60 ${
                    currentCourierId === courier.id
                      ? 'bg-indigo-50 border-indigo-200'
                      : isBusy
                        ? 'bg-amber-50 border-amber-100'
                      : 'bg-slate-50 border-slate-100 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      currentCourierId === courier.id
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white text-slate-400 border border-slate-100'
                    }`}>
                      <User size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 uppercase italic tracking-tight">
                        {courier.fullName}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {courier.phoneNumber || 'Telefon yo\'q'}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 mt-2">
                        {isBusy
                          ? `Band${remainingLabel ? ` - ${remainingLabel} qoldi` : ''}`
                          : `Bo'sh${distanceLabel ? ` - Restoranga ${distanceLabel}` : ''}`}
                      </p>
                    </div>
                  </div>
                  {isAssigning ? (
                    <Loader2 size={20} className="text-slate-400 animate-spin" />
                  ) : currentCourierId === courier.id ? (
                    <CheckCircle size={20} className="text-indigo-500" />
                  ) : isBusy ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                      Band
                    </span>
                  ) : null}
                </button>
              );
              })
            : null}
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
  const statusMeta = getAdminOrderStatusMeta(order.orderStatus);

  return (
    <button 
      onClick={onClick}
      className="w-full bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all text-left flex items-center justify-between group active:scale-[0.99]"
    >
      <div className="flex items-center gap-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${statusMeta.iconClass}`}>
          <Package size={28} />
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-black text-slate-900 text-lg italic uppercase tracking-tighter italic">#{order.orderNumber}</span>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${statusMeta.badgeClass}`}>
              {statusMeta.label}
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
