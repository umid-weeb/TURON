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
  ArrowRight,
  ChevronRight,
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
        iconClass: 'bg-[rgba(255,212,59,0.18)] text-[#7a5600]',
        badgeClass: 'bg-[rgba(255,212,59,0.18)] text-[#7a5600]',
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
        iconClass: 'bg-[#1f1a12] text-[#ffe39b]',
        badgeClass: 'bg-[#fff4cc] text-[#7a5600]',
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
  if (
    order.paymentStatus !== PaymentStatus.PENDING ||
    order.paymentMethod !== PaymentMethod.MANUAL_TRANSFER
  ) {
    return null;
  }

  const paymentMethodLabel = 'Manual transfer';

  return (
    <div className="admin-pro-card relative overflow-hidden rounded-[32px] border-[rgba(255,190,11,0.18)] bg-[linear-gradient(135deg,rgba(255,212,59,0.16)_0%,rgba(255,250,238,0.96)_100%)] p-6 shadow-[0_18px_36px_rgba(255,190,11,0.12)] group animate-in zoom-in duration-300">
      <div className="absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
        <ShieldCheck size={80} />
      </div>
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#7a5600]">
          <AlertCircle size={14} />
          <span>To'lov Tasdiqlanishi Kutilmoqda</span>
        </div>
        
        <div className="space-y-2">
           <div className="flex justify-between items-center text-xs">
              <span className="font-bold uppercase text-[#8a6a20]">To'lov usuli:</span>
              <span className="font-black italic uppercase text-[var(--admin-pro-text)]">{paymentMethodLabel}</span>
           </div>
           <div className="flex justify-between items-center text-xs">
              <span className="font-bold uppercase text-[#8a6a20]">Reference:</span>
              <span className="font-black uppercase tracking-tighter text-[var(--admin-pro-text)]">{order.paymentReference || 'N/A'}</span>
           </div>
           <div className="flex justify-between items-center text-xs">
              <span className="font-bold uppercase text-[#8a6a20]">Summa:</span>
              <span className="text-sm font-black italic text-[var(--admin-pro-text)]">{order.total.toLocaleString()} so'm</span>
           </div>
        </div>

        {order.receiptImageUrl && (
          <div className="mt-4 flex justify-center">
            <a href={order.receiptImageUrl} target="_blank" rel="noreferrer">
              <img
                src={order.receiptImageUrl}
                alt="Chek rasmi"
                className="max-h-64 rounded-xl border border-white/20 object-contain shadow-md"
              />
            </a>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button 
            onClick={onReject}
            disabled={isPending}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white text-[10px] font-black uppercase tracking-widest text-red-600 shadow-sm transition-all active:scale-95"
          >
            <XCircle size={16} />
            <span>{isPending ? 'Kutilmoqda' : 'Rad etish'}</span>
          </button>
          <button 
            onClick={onApprove}
            disabled={isPending}
            className="admin-pro-button-primary flex h-12 items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95"
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
        className="admin-pro-button-secondary flex h-10 w-10 items-center justify-center rounded-xl border-red-100 text-red-500 active:scale-90"
      >
        <XCircle size={20} />
      </button>
      {current && (
        <button 
          onClick={() => onUpdate(current.next)}
          disabled={isPending}
          className="admin-pro-button-primary flex h-10 items-center gap-2 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest transition-transform active:scale-95 disabled:opacity-60"
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
      <div className="absolute inset-0 bg-[rgba(21,17,11,0.36)] backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full rounded-t-[40px] border border-[rgba(118,90,35,0.16)] bg-[rgba(255,250,239,0.98)] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500">
        <div className="mx-auto mb-8 h-1.5 w-12 rounded-full bg-[rgba(255,190,11,0.28)]" />
        <h3 className="mb-6 text-xl font-black uppercase italic tracking-tighter text-[var(--admin-pro-text)]">Kuryerni tanlang</h3>
        
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
                      ? 'bg-[rgba(255,212,59,0.18)] border-[rgba(255,190,11,0.22)]'
                      : isBusy
                        ? 'bg-amber-50 border-amber-100'
                      : 'bg-slate-50 border-slate-100 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      currentCourierId === courier.id
                        ? 'bg-[var(--admin-pro-primary)] text-[var(--admin-pro-primary-contrast)]'
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
                    <CheckCircle size={20} className="text-[#7a5600]" />
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
      className="w-full admin-pro-card p-5 text-left flex items-center justify-between group active:scale-[0.99] animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all group-hover:scale-105 ${statusMeta.iconClass}`}>
          <Package size={24} strokeWidth={2.5} />
        </div>
        
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-black text-slate-900 text-lg italic tracking-tighter">#{order.orderNumber}</span>
            <div className={`text-[8px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border border-current opacity-70`}>
              {statusMeta.label}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 text-slate-400">
               <Clock size={11} />
               <span className="text-[10px] font-bold uppercase tracking-wider">{date}</span>
             </div>
             <div className="flex items-center gap-1 text-slate-400">
               <User size={11} />
               <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[80px]">
                 {order.courierName ? order.courierName.split(' ')[0] : 'Biriktirilmagan'}
               </span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-2">
        <div className="text-right">
          <p className="font-black text-slate-950 text-base tracking-tight italic">
            {(order.total || 0).toLocaleString()} <span className="text-[9px] font-bold uppercase text-slate-400">so'm</span>
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-950 group-hover:text-white transition-all shadow-sm">
          <ChevronRight size={18} />
        </div>
      </div>
    </button>
  );
};

