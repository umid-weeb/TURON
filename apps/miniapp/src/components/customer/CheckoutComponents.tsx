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
  <section className="rounded-[12px] border border-white/8 bg-[#111827] p-3 shadow-[0_12px_24px_rgba(2,6,23,0.2)]">
    <div className="flex items-center justify-between gap-4">
      <h3 className="text-base font-black tracking-tight text-white">{title}</h3>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/78"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
    <div className="pt-2">{children}</div>
  </section>
);

export const CheckoutNoteField: React.FC = () => {
  const { note, setNote } = useCheckoutStore();

  return (
    <div className="rounded-[12px] border border-white/8 bg-white/[0.04] p-3">
      <div className="mb-3 flex items-center gap-2 text-white/52">
        <MessageSquareMore size={16} />
        <span className="text-[10px] font-black uppercase tracking-[0.16em]">Kuryer uchun izoh</span>
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Eshik kodi, qavat, mo'ljal yoki qo'ng'iroq bo'yicha eslatma yozing"
        className="h-24 w-full rounded-[10px] border border-white/8 bg-slate-950/55 p-3 text-sm font-semibold text-white outline-none placeholder:text-white/28"
      />
    </div>
  );
};

export const EmptyCartState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.05] text-white/74 shadow-[0_12px_24px_rgba(2,6,23,0.18)]">
        <ShoppingBag size={52} />
      </div>
      <h2 className="mt-8 text-[2rem] font-black tracking-tight text-white">Savat bo'sh</h2>
      <p className="mt-3 max-w-[280px] text-sm leading-7 text-white/56">
        Zamonaviy checkout shu yerda ishlaydi. Boshlash uchun avval bir nechta mazali taomni savatga qo'shing.
      </p>
      <button
        type="button"
        onClick={() => navigate('/customer')}
        className="mt-8 inline-flex h-14 items-center justify-center gap-3 rounded-[24px] bg-white px-6 text-sm font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_18px_36px_rgba(255,255,255,0.08)]"
      >
        <ArrowLeft size={18} />
        <span>Asosiy sahifaga qaytish</span>
      </button>
    </div>
  );
};
