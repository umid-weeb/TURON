import React from 'react';
import { Banknote, CreditCard, Smartphone, CheckCircle2 } from 'lucide-react';
import { PaymentMethod } from '../../data/types';
import { useCheckoutStore } from '../../store/useCheckoutStore';

const PaymentMethodSelector: React.FC = () => {
  const { paymentMethod, setPaymentMethod } = useCheckoutStore();

  const methods = [
    { 
      id: PaymentMethod.CASH, 
      label: 'Naqd pul', 
      description: 'Taom yetkazilganda to\'lash', 
      icon: Banknote, 
      color: 'green',
      disabled: false 
    },
    { 
      id: PaymentMethod.EXTERNAL_PAYMENT, 
      label: 'Click / Payme / Uzum', 
      description: 'Online to\'lov orqali', 
      icon: Smartphone, 
      color: 'blue',
      disabled: false 
    },
    { 
      id: PaymentMethod.MANUAL_TRANSFER, 
      label: 'Karta orqali', 
      description: 'Tez kunda kutilmoqda...', 
      icon: CreditCard, 
      color: 'gray',
      disabled: true 
    },
  ];

  return (
    <div className="space-y-3">
      {methods.map((method) => {
        const Icon = method.icon;
        const isSelected = paymentMethod === method.id;
        
        return (
          <button
            key={method.id}
            disabled={method.disabled}
            onClick={() => setPaymentMethod(method.id as PaymentMethod)}
            className={`w-full text-left p-4 rounded-3xl border-2 transition-all flex items-center gap-4 relative overflow-hidden active:scale-[0.98]
              ${method.disabled ? 'opacity-50 grayscale border-gray-100 bg-gray-50' : ''}
              ${isSelected 
                ? 'border-amber-500 bg-amber-50 shadow-md shadow-amber-100' 
                : 'border-gray-50 bg-white hover:border-gray-200'}
            `}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center 
              ${isSelected ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              <Icon size={24} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className={`font-black text-sm uppercase tracking-tight ${isSelected ? 'text-amber-900' : 'text-gray-900'}`}>
                {method.label}
              </h4>
              <p className={`text-[11px] font-bold ${isSelected ? 'text-amber-700/70' : 'text-gray-400'}`}>
                {method.description}
              </p>
            </div>
            
            {isSelected && (
              <div className="absolute top-4 right-4 text-amber-500 animate-in zoom-in duration-300">
                <CheckCircle2 size={24} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PaymentMethodSelector;
