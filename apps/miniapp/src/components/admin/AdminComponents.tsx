import React, { useState } from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  User, 
  Truck,
  MoreVertical,
  ArrowRight,
  XCircle,
  Hash
} from 'lucide-react';
import { Order, OrderStatus } from '../../data/types';
import { getStatusLabel, getStatusColor, getNextStatus } from '../../lib/orderStatusUtils';

// --- Dashboard Component ---
export const DashboardCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: string;
  onClick?: () => void;
}> = ({ title, value, icon, color, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm active:scale-95 transition-all flex flex-col justify-between h-40 group cursor-pointer`}
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-${color}-500 shadow-lg shadow-${color}-100 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <div>
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</h4>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  </div>
);

// --- Order Board Components ---
export const AdminOrderCard: React.FC<{ 
  order: Order; 
  onClick: () => void; 
}> = ({ order, onClick }) => {
  const time = new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  const statusColor = getStatusColor(order.orderStatus);

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm mb-3 active:scale-[0.98] transition-all hover:border-slate-300"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-${statusColor}-50 flex items-center justify-center text-${statusColor}-600`}>
            <Hash size={14} strokeWidth={3} />
          </div>
          <span className="font-black text-slate-900 leading-none">{order.orderNumber}</span>
        </div>
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{time}</span>
      </div>

      <div className="mb-4">
        <p className="text-xs font-bold text-slate-600 line-clamp-2 leading-snug">
          {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        <span className="font-black text-sm text-slate-900">{order.total.toLocaleString()} so'm</span>
        {order.courierName ? (
          <div className="flex items-center gap-1.5 text-indigo-500">
            <Truck size={12} />
            <span className="text-[10px] font-bold uppercase">{order.courierName}</span>
          </div>
        ) : (
          <ChevronRight size={16} className="text-slate-300" />
        )}
      </div>
    </div>
  );
};

// --- Status Management ---
export const StatusActionButtons: React.FC<{ 
  currentStatus: OrderStatus; 
  onUpdate: (next: OrderStatus) => void; 
  onCancel: () => void;
}> = ({ currentStatus, onUpdate, onCancel }) => {
  const next = getNextStatus(currentStatus);
  const nextLabel = next ? getStatusLabel(next) : null;
  const nextColor = next ? getStatusColor(next) : 'slate';

  return (
    <div className="flex gap-3">
      {next && (
        <button 
          onClick={() => onUpdate(next)}
          className={`flex-1 h-14 bg-${nextColor}-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-${nextColor}-100 active:scale-95 transition-all`}
        >
          <span>{nextLabel}</span>
          <ArrowRight size={18} />
        </button>
      )}
      <button 
        onClick={onCancel}
        className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center active:scale-95 transition-all border border-red-100"
      >
        <XCircle size={24} />
      </button>
    </div>
  );
};

// --- Courier Assignment ---
const MOCK_COURIERS = [
  { id: 'c1', name: 'Alijon' },
  { id: 'c2', name: 'Jamshid' },
  { id: 'c3', name: 'Murod' },
];

export const CourierAssignModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onAssign: (id: string, name: string) => void;
  currentCourierId?: string;
}> = ({ isOpen, onClose, onAssign, currentCourierId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-10 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Kuryerni tanlang</h3>
          <button onClick={onClose} className="text-slate-300 font-bold">Yopish</button>
        </div>
        
        <div className="space-y-3">
          {MOCK_COURIERS.map(c => (
            <button
              key={c.id}
              onClick={() => { onAssign(c.id, c.name); onClose(); }}
              className={`w-full p-5 rounded-2xl border flex items-center justify-between group transition-all
                ${currentCourierId === c.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-300'}
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                  ${currentCourierId === c.id ? 'bg-indigo-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}
                `}>
                  <User size={20} />
                </div>
                <span className={`font-bold ${currentCourierId === c.id ? 'text-indigo-900' : 'text-slate-700'}`}>{c.name}</span>
              </div>
              {currentCourierId === c.id && <CheckCircle size={20} className="text-indigo-500" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
