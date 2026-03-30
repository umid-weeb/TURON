import React from 'react';
import { X, CreditCard, Star, ShieldCheck } from 'lucide-react';
import { AppButton } from '../ui/GlobalComponents';

type SubscriptionModalProps = {
  open: boolean;
  onClose: () => void;
};

const plans = [
  { id: '1', title: '1 oylik', price: '29 000 soʻm', description: 'Eng mos keladi' },
  { id: '3', title: '3 oylik', price: '79 000 soʻm', description: 'Koʻproq tejang', highlight: true },
  { id: '6', title: '6 oylik', price: '159 000 soʻm', description: 'Eng qadrli variant' },
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ open, onClose }) => {
  const [selectedPlanId, setSelectedPlanId] = React.useState('1');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md md:max-w-lg overflow-hidden rounded-t-3xl md:rounded-3xl bg-slate-800 text-white shadow-2xl border border-slate-700">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-300 hover:text-white"
          aria-label="Close subscription modal"
        >
          <X size={22} />
        </button>

        <div className="p-6 space-y-4">
          <h3 className="text-xl font-black">Obunalar toʻplami</h3>
          <p className="text-xs text-slate-300">Tanlangan obuna “bu” va “kelasi” oylar uchun amal qiladi.</p>
          <p className="text-xs text-slate-400">Balansingizda 0 soʻm bor</p>

          <div className="space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  selectedPlanId === plan.id
                    ? 'border-amber-300 bg-amber-500/20'
                    : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-base">{plan.title}</p>
                    <p className="text-[11px] text-slate-300">{plan.description}</p>
                  </div>
                  <p className="font-black text-base">{plan.price}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-300">Toʻlov turini tanlang</p>

          <div className="grid grid-cols-2 gap-3">
            <AppButton variant="secondary" size="sm" fullWidth icon={<CreditCard size={16} />}>
              Balans orqali toʻlash
            </AppButton>
            <AppButton variant="secondary" size="sm" fullWidth icon={<Star size={16} />}>
              Telegram stars orqali
            </AppButton>
          </div>

          <AppButton variant="primary" size="lg" fullWidth icon={<ShieldCheck size={18} />}>
            Hisobni toʻldirish
          </AppButton>

          <div className="rounded-xl border border-emerald-500 p-3 text-center text-xs text-emerald-400 font-bold">
            Chet eldagilar uchun toʻlov va yordam
          </div>
        </div>
      </div>
    </div>
  );
};
