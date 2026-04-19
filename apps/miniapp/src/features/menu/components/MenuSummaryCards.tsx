import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Layers, Package, Plus } from 'lucide-react';
import { ProductAvailabilityEnum } from '@turon/shared';
import type { MenuCategory, MenuProduct } from '../types';

interface Props {
  categories: MenuCategory[];
  products: MenuProduct[];
}

const MenuSummaryCards: React.FC<Props> = ({ categories, products }) => {
  const navigate = useNavigate();

  const totalCategories = categories.length;
  const activeProducts = products.filter((product) => product.isActive).length;
  const inactiveProducts = products.filter((product) => !product.isActive).length;
  const oosProducts = products.filter(
    (product) => product.availability === ProductAvailabilityEnum.OUT_OF_STOCK,
  ).length;

  const cards = [
    {
      label: 'Kategoriyalar',
      value: totalCategories,
      tone: 'neutral',
      onClick: () => navigate('/admin/menu/categories'),
    },
    {
      label: 'Faol taomlar',
      value: activeProducts,
      tone: 'active',
      onClick: () => navigate('/admin/menu/products?active=active'),
    },
    {
      label: 'Nofaol',
      value: inactiveProducts,
      tone: 'inactive',
      onClick: () => navigate('/admin/menu/products?active=inactive'),
    },
    {
      label: 'Tugagan',
      value: oosProducts,
      tone: 'danger',
      onClick: () => navigate(`/admin/menu/products?availability=${ProductAvailabilityEnum.OUT_OF_STOCK}`),
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Tezkor amallar</h3>
        <button
          type="button"
          onClick={() => navigate('/admin/menu/categories/new')}
          className="w-full flex min-h-16 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition hover:border-blue-200 hover:shadow-[0_14px_28px_rgba(37,99,235,0.14)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
              <Plus size={20} />
            </div>
            <div>
              <span className="block text-[15px] font-bold text-slate-900">Kategoriya qo'shish</span>
              <span className="text-xs text-slate-500">Yangi bo'lim ochish</span>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
        <button
          type="button"
          onClick={() => navigate('/admin/menu/products/new')}
          className="w-full flex min-h-16 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition hover:border-emerald-200 hover:shadow-[0_14px_28px_rgba(16,185,129,0.14)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
              <Plus size={20} />
            </div>
            <div>
              <span className="block text-[15px] font-bold text-slate-900">Taom qo'shish</span>
              <span className="text-xs text-slate-500">Menyuga yangi taom kiritish</span>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
      </section>

      <section className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Ko'rsatkichlar</h3>
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card) => {
            const colorClass =
              card.tone === 'active'
                ? 'text-emerald-700'
                : card.tone === 'danger'
                  ? 'text-rose-700'
                  : card.tone === 'inactive'
                    ? 'text-slate-600'
                    : 'text-slate-800';

            const dotClass =
              card.tone === 'active'
                ? 'bg-emerald-500'
                : card.tone === 'danger'
                  ? 'bg-rose-500'
                  : card.tone === 'inactive'
                    ? 'bg-slate-400'
                    : 'bg-blue-500';

            return (
              <button
                key={card.label}
                type="button"
                onClick={card.onClick}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:border-blue-200 hover:shadow-[0_12px_24px_rgba(37,99,235,0.12)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-slate-500">{card.label}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                </div>
                <p className={`mt-2 text-2xl font-black leading-none ${colorClass}`}>{card.value}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Bo'limlar</h3>
        <button
          type="button"
          onClick={() => navigate('/admin/menu/categories')}
          className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:shadow-[0_12px_24px_rgba(15,23,42,0.09)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
              <Layers size={20} />
            </div>
            <div className="text-left">
              <span className="font-bold text-slate-800 block">Kategoriyalar</span>
              <span className="text-xs text-slate-400">{totalCategories} ta</span>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>
        <button
          type="button"
          onClick={() => navigate('/admin/menu/products')}
          className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:shadow-[0_12px_24px_rgba(15,23,42,0.09)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-600">
              <Package size={20} />
            </div>
            <div className="text-left">
              <span className="font-bold text-slate-800 block">Taomlar</span>
              <span className="text-xs text-slate-400">{products.length} ta</span>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>
      </section>
    </div>
  );
};

export default MenuSummaryCards;
