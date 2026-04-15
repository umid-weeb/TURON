import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Edit2, Trash2, Loader2 } from 'lucide-react';
import { AdminPromo, DiscountTypeEnum } from '../types';
import { PromoStatusBadge } from './PromoStatusBadge';
import { getPromoStatus } from '../discountEngine';
import { useDeleteAdminPromo } from '../../../hooks/queries/usePromos';

interface Props {
  promo: AdminPromo;
}

export const PromoCodeCard: React.FC<Props> = ({ promo }) => {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useDeleteAdminPromo();
  const status = getPromoStatus(promo);

  const discountText = promo.discountType === DiscountTypeEnum.PERCENTAGE
    ? `${promo.discountValue}%`
    : `${promo.discountValue.toLocaleString()} so'm`;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(promo.id);
    setConfirmDelete(false);
  };

  if (confirmDelete) {
    return (
      <div className="bg-white rounded-[24px] p-4 border-2 border-rose-100 shadow-sm">
        <p className="font-bold text-slate-800 text-sm mb-1">
          <span className="uppercase tracking-widest text-rose-600">{promo.code}</span> — o'chirilsinmi?
        </p>
        <p className="text-xs text-slate-400 mb-3">Bu amalni qaytarib bo'lmaydi</p>
        <div className="flex gap-2">
          <button
            onClick={() => { void handleDelete(); }}
            disabled={deleteMutation.isPending}
            className="flex-1 h-10 bg-rose-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-60"
          >
            {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            O'chirish
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex-1 h-10 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          >
            Bekor qilish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-4 group transition-shadow hover:shadow-md">
      <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
        <Tag size={24} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-black text-slate-900 text-[15px] truncate uppercase tracking-widest">{promo.code}</h3>
          <PromoStatusBadge status={status} />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[12px] font-bold text-slate-500 line-clamp-1">{promo.title || 'Sarlavhasiz'}</p>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 mt-1">
            <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 text-indigo-600">
              Chegirma: {discountText}
            </span>
            <span>Ishlatilgan: {promo.timesUsed}{promo.usageLimit ? ` / ${promo.usageLimit}` : ''}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => navigate(`/admin/promos/${promo.id}/edit`)}
          className="w-10 h-10 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors active:scale-90"
        >
          <Edit2 size={18} />
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-10 h-10 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-colors active:scale-90"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
