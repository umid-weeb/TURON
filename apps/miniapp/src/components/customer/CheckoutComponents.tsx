import React from 'react';
import { useCheckoutStore } from '../../store/useCheckoutStore';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CheckoutSectionCard: React.FC<{ 
    title: string; 
    children: React.ReactNode; 
    actionLabel?: string; 
    onAction?: () => void 
}> = ({ title, children, actionLabel, onAction }) => (
  <section className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-4 animate-in slide-in-from-right duration-500">
    <div className="flex items-center justify-between">
      <h3 className="font-black text-sm text-gray-400 uppercase tracking-widest leading-none">{title}</h3>
      {actionLabel && (
        <button 
          onClick={onAction}
          className="text-[11px] font-black text-amber-500 bg-amber-50 px-2.5 py-1.5 rounded-xl active:scale-95 transition-all uppercase tracking-tighter"
        >
          {actionLabel}
        </button>
      )}
    </div>
    <div className="pt-1">
      {children}
    </div>
  </section>
);

export const CheckoutNoteField: React.FC = () => {
  const { note, setNote } = useCheckoutStore();
  return (
    <textarea 
      value={note}
      onChange={(e) => setNote(e.target.value)}
      placeholder="Kurer uchun eslatma (masalan: dom kodi, etaj...)"
      className="w-full h-24 bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
    />
  );
};

export const EmptyCartState: React.FC = () => {
    const navigate = useNavigate();
    return (
      <div className="flex flex-col items-center justify-center pt-20 px-8 text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <ShoppingBag size={44} />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Savatchangiz bo'sh!</h2>
        <p className="text-gray-400 text-sm font-bold leading-relaxed mb-8">
            Buyurtma berish uchun avval taom tanlashingiz kerak. Bosh sahifamizda juda mazzali taomlar kutilmoqda!
        </p>
        <button 
          onClick={() => navigate('/customer')}
          className="w-full h-14 bg-amber-500 text-white rounded-[24px] font-black shadow-lg shadow-amber-200 active:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <ArrowRight size={20} className="rotate-180" />
          <span>Taom tanlashga qaytish</span>
        </button>
      </div>
    );
};
