import React from 'react';
import { Home, Briefcase, MapPin, Check, ChevronRight, Edit2, Trash2, Navigation, MessageCircle } from 'lucide-react';
import { Address } from '../../data/types';

export const AddressCard: React.FC<{ 
  address: Address; 
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ address, isSelected, onSelect, onEdit, onDelete }) => {
  const Icon = address.label === 'Uy' ? Home : address.label === 'Ish' ? Briefcase : MapPin;

  return (
    <div 
      className={`
        p-4 rounded-[28px] border-2 transition-all active:scale-[0.98] 
        ${isSelected 
          ? 'bg-amber-50 border-amber-500 shadow-lg shadow-amber-100' 
          : 'bg-white border-slate-100 shadow-sm'}
      `}
      onClick={() => onSelect(address.id)}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
          <Icon size={24} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-slate-900 text-lg">{address.label}</h4>
            {isSelected && (
              <div className="bg-amber-500 text-white p-1 rounded-full">
                <Check size={14} strokeWidth={4} />
              </div>
            )}
          </div>
          <p className="text-slate-500 text-[13px] line-clamp-2 leading-snug mb-3">
            {address.addressText}
          </p>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(address.id); }}
              className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
            >
              <Edit2 size={12} />
              O'zgartirish
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(address.id); }}
              className="px-3 py-1.5 rounded-xl bg-red-50 text-red-500 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
            >
              <Trash2 size={12} />
              O'chirish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SelectedAddressCard: React.FC<{ 
  address: Address; 
  onAction: () => void;
  actionLabel: string;
}> = ({ address, onAction, actionLabel }) => (
  <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm flex items-center gap-4">
    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
      <MapPin size={28} />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-slate-900 leading-tight">Delivery Address</h4>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">{address.label}</p>
      <p className="text-slate-600 text-sm mt-1 truncate">{address.addressText}</p>
      {address.note && (
        <div className="flex items-center gap-1.5 mt-2 bg-slate-50 w-fit px-2 py-1 rounded-lg">
          <MessageCircle size={12} className="text-slate-400" />
          <span className="text-[10px] text-slate-500 italic truncate max-w-[150px]">{address.note}</span>
        </div>
      )}
    </div>
    <button 
      onClick={onAction}
      className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 active:scale-90 transition-transform"
    >
      <Edit2 size={20} />
    </button>
  </div>
);

export const AddressEmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
    <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
      <Navigation size={48} strokeWidth={1} />
    </div>
    <h3 className="text-xl font-black text-slate-900 mb-2">Manzil yo'q!</h3>
    <p className="text-slate-400 text-[13px] max-w-[200px] mb-8 leading-relaxed">
      Sizda saqlangan manzillar mavjud emas. Buyurtma berish uchun manzil kiriting.
    </p>
    <button 
      onClick={onAdd}
      className="h-14 bg-amber-500 text-white px-8 rounded-2xl font-black shadow-xl shadow-amber-100 flex items-center gap-3 active:scale-95 transition-transform"
    >
      <MapPin size={20} />
      <span>Manzil qo'shish</span>
    </button>
  </div>
);

export const GeoLocationButton: React.FC<{ 
  loading: boolean; 
  onClick: () => void;
  error?: string | null;
}> = ({ loading, onClick, error }) => (
  <div className="w-full">
    <button 
      onClick={onClick}
      disabled={loading}
      className={`
        w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest transition-all
        ${loading 
          ? 'bg-slate-100 text-slate-400' 
          : 'bg-amber-100 text-amber-600 active:bg-amber-200 active:scale-98 shadow-sm'}
      `}
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>Aniqlanmoqda...</span>
        </>
      ) : (
        <>
          <Navigation size={20} />
          <span>Joylashuvimni aniqlash</span>
        </>
      )}
    </button>
    {error && (
      <p className="mt-2 text-center text-red-500 text-[11px] font-bold uppercase tracking-tight">
        ⚠️ {error}
      </p>
    )}
  </div>
);
