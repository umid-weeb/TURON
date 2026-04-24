import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, FolderKanban, GripVertical, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import type { MenuCategory } from '../types';

interface Props {
  category: MenuCategory;
  productCount: number;
  onToggleActive: (category: MenuCategory) => void;
  onDelete: (category: MenuCategory) => void;
  isBusy?: boolean;
}

const CategoryCard: React.FC<Props> = ({
  category,
  productCount,
  onToggleActive,
  onDelete,
  isBusy = false,
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={`group flex items-start gap-4 overflow-hidden rounded-[28px] border p-4 shadow-[0_14px_30px_rgba(74,56,16,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(74,56,16,0.12)] ${
        category.isActive
          ? 'border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,250,240,0.92)_100%)]'
          : 'border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,248,248,0.98)_0%,rgba(255,240,240,0.92)_100%)]'
      }`}
    >
      <div className="cursor-grab self-start pt-3 text-[rgba(125,106,76,0.45)] transition group-hover:text-[var(--admin-pro-primary-contrast)]">
        <GripVertical size={18} />
      </div>

      <button
        type="button"
        onClick={() => navigate(`/admin/menu/categories/${category.id}/edit`)}
        disabled={isBusy}
        className="flex min-w-0 flex-1 items-center gap-4 text-left transition disabled:opacity-70"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-[rgba(255,190,11,0.16)] bg-[linear-gradient(180deg,rgba(255,250,235,0.98)_0%,rgba(255,243,208,0.9)_100%)] shadow-[0_12px_24px_rgba(74,56,16,0.08)]">
          {category.imageUrl ? (
            <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
          ) : (
            <FolderKanban size={22} className="text-[var(--admin-pro-primary-contrast)]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="truncate text-[15px] font-black text-[var(--admin-pro-text)]">{category.name}</h4>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--admin-pro-line)] bg-white/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--admin-pro-text-muted)]">
                  #{category.sortOrder}
                </span>
                <span className="rounded-full border border-[rgba(255,190,11,0.16)] bg-[rgba(255,212,59,0.14)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--admin-pro-primary-contrast)]">
                  {productCount} taom
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                    category.isActive
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border border-rose-200 bg-rose-50 text-rose-600'
                  }`}
                >
                  {category.isActive ? 'Faol' : 'Nofaol'}
                </span>
              </div>
            </div>
            <span className="rounded-full border border-[var(--admin-pro-line)] bg-white/86 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-text-muted)] transition group-hover:border-[rgba(255,190,11,0.26)] group-hover:text-[var(--admin-pro-primary-contrast)]">
              Tahrirlash
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-[var(--admin-pro-text-muted)]">
            Kategoriya tartibi va ko&apos;rinishini boshqarish
          </p>
        </div>
      </button>

      <div className="flex flex-col gap-2 self-center">
        <button
          type="button"
          onClick={() => onToggleActive(category)}
          disabled={isBusy}
          className={`flex h-10 w-10 items-center justify-center rounded-[16px] border transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 ${
            category.isActive
              ? 'border-emerald-200 bg-emerald-50 text-emerald-600 shadow-[0_10px_20px_rgba(16,185,129,0.1)]'
              : 'border-rose-200 bg-rose-50 text-rose-500 shadow-[0_10px_20px_rgba(244,63,94,0.08)]'
          }`}
        >
          {category.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
        </button>
        <button
          type="button"
          onClick={() => navigate(`/admin/menu/categories/${category.id}/edit`)}
          disabled={isBusy}
          className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--admin-pro-line)] bg-white/88 text-[var(--admin-pro-text-muted)] shadow-[0_10px_20px_rgba(74,56,16,0.06)] transition hover:-translate-y-0.5 hover:text-[var(--admin-pro-primary-contrast)] active:scale-95 disabled:opacity-60"
        >
          <Edit3 size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(category)}
          disabled={isBusy}
          className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,247,247,0.96)_0%,rgba(255,237,237,0.94)_100%)] text-rose-500 shadow-[0_10px_20px_rgba(244,63,94,0.08)] transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default CategoryCard;
