import React from 'react';
import { ArrowLeft, MessageSquareMore, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCheckoutStore } from '../../store/useCheckoutStore';

export const CheckoutSectionCard: React.FC<{
  title: string;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, children, actionLabel, onAction }) => (
  <section
    className="py-5 last:border-b-0"
    style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
  >
    <div className="flex items-center justify-between gap-4">
      <h3
        className="text-[18px] font-black tracking-tight"
        style={{ color: 'var(--tg-theme-text-color)' }}
      >
        {title}
      </h3>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-transform active:scale-95"
          style={{
            background: 'var(--tg-theme-secondary-bg-color, #f2f2f7)',
            border: '1px solid rgba(0,0,0,0.06)',
            color: 'var(--tg-theme-hint-color, #8e8e93)',
          }}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
    <div className="pt-3">{children}</div>
  </section>
);

export const CheckoutNoteField: React.FC = () => {
  const { note, setNote } = useCheckoutStore();

  return (
    <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center gap-2 text-slate-600">
        <MessageSquareMore size={16} />
        <span className="text-[10px] font-black uppercase tracking-[0.16em]">Kuryer uchun izoh</span>
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Eshik kodi, qavat, mo'ljal yoki qo'ng'iroq bo'yicha eslatma yozing"
        className="h-24 w-full rounded-[12px] border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-300"
      />
    </div>
  );
};

export const EmptyCartState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f6f7] px-5 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-[20px] bg-white shadow-[0_10px_26px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.035] text-amber-500">
        <ShoppingBag size={52} />
      </div>
      <h2 className="mt-8 text-[28px] font-black tracking-tight text-slate-950">Savat bo'sh</h2>
      <p className="mt-3 max-w-[280px] text-sm leading-7 text-slate-600">
        Zamonaviy checkout shu yerda ishlaydi. Boshlash uchun avval bir nechta mazali taomni savatga qo'shing.
      </p>
      <button
        type="button"
        onClick={() => navigate('/customer')}
        className="mt-8 inline-flex h-14 items-center justify-center gap-3 rounded-[24px] bg-gradient-to-r from-amber-400 to-amber-500 px-6 text-sm font-black text-white shadow-lg shadow-amber-200/50 transition-transform active:scale-[0.97]"
      >
        <ArrowLeft size={18} />
        <span>Asosiy sahifaga qaytish</span>
      </button>
    </div>
  );
};
