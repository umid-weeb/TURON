import React, { useState } from 'react';
import { Tag, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { validatePromo } from '../../lib/promoService';
import { useCartStore } from '../../store/useCartStore';

const PromoCodeCard: React.FC = () => {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { appliedPromo, setPromo, getSubtotal } = useCartStore();
  
  const handleApply = () => {
    const subtotal = getSubtotal();
    const result = validatePromo(input, subtotal);
    
    if (result.isValid && result.promo) {
      setPromo(result.promo);
      setError(null);
      setInput('');
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } else {
      setError(result.message);
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  const handleRemove = () => {
    setPromo(null);
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  if (appliedPromo) {
    return (
      <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200 flex items-center justify-between animate-in zoom-in duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-md">
            <Tag size={24} />
          </div>
          <div>
            <h4 className="font-black text-amber-900 text-[14px]">"{appliedPromo.code}" qo'llandi!</h4>
            <p className="text-amber-700 text-[11px] font-bold uppercase tracking-tight">
              {appliedPromo.discountType === 'PERCENT' ? `${appliedPromo.value}% chegirma` : `${appliedPromo.value.toLocaleString()} so'm chegirma`}
            </p>
          </div>
        </div>
        <button 
          onClick={handleRemove}
          className="w-10 h-10 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-amber-900 active:scale-90 transition-transform shadow-sm"
        >
          <X size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Tag size={16} className="text-amber-500" />
        <h4 className="font-bold text-[14px] text-gray-900">Promo-kod bormi?</h4>
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="Kodni kiriting..."
            className={`w-full h-12 bg-gray-50 border ${error ? 'border-red-300 bg-red-50' : 'border-gray-100'} rounded-2xl px-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all`}
          />
        </div>
        <button 
          onClick={handleApply}
          disabled={!input}
          className="px-6 bg-gray-900 text-white rounded-2xl font-black text-sm active:scale-95 disabled:opacity-50 transition-all"
        >
          Qo'shish
        </button>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-[11px] font-bold animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default PromoCodeCard;
