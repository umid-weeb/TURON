import React from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { ProductAvailabilityEnum } from '@turon/shared';
import type { MenuCategory, ProductFilterState } from '../types';

interface Props {
  categories: MenuCategory[];
  filters: ProductFilterState;
  onChange: (filters: ProductFilterState) => void;
}

const ProductFiltersBar: React.FC<Props> = ({ categories, filters, onChange }) => {
  const hasActiveFilters =
    filters.categoryId !== 'all' ||
    filters.activeFilter !== 'all' ||
    filters.availabilityFilter !== 'all' ||
    filters.searchQuery.trim().length > 0;

  const resetFilters = () => {
    onChange({
      categoryId: 'all',
      activeFilter: 'all',
      availabilityFilter: 'all',
      searchQuery: '',
    });
  };

  return (
    <section className="admin-pro-card rounded-[30px] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
            Filter panel
          </p>
          <h3 className="mt-1 inline-flex items-center gap-2 text-base font-black tracking-tight text-[var(--admin-pro-text)]">
            <SlidersHorizontal size={16} className="text-[var(--admin-pro-primary-strong)]" />
            Qidiruv va saralash
          </h3>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          className="inline-flex h-10 items-center gap-2 rounded-[16px] border border-[var(--admin-pro-line)] bg-white/90 px-3 text-[12px] font-black uppercase tracking-[0.12em] text-[var(--admin-pro-text-muted)] shadow-[0_10px_20px_rgba(74,56,16,0.05)] transition hover:-translate-y-0.5 hover:text-[var(--admin-pro-primary-contrast)] disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <RotateCcw size={14} />
          Tozalash
        </button>
      </div>

      <div className="relative mt-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--admin-pro-text-muted)]" />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(event) => onChange({ ...filters, searchQuery: event.target.value })}
          placeholder="Taom nomi bo'yicha qidirish..."
          className="admin-input h-12 pl-11 pr-4 text-sm font-bold"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <select
          value={filters.categoryId}
          onChange={(event) => onChange({ ...filters, categoryId: event.target.value })}
          className="admin-input h-12 appearance-none text-[13px] font-black"
        >
          <option value="all">Barcha kategoriyalar</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={filters.activeFilter}
          onChange={(event) =>
            onChange({
              ...filters,
              activeFilter: event.target.value as 'all' | 'active' | 'inactive',
            })
          }
          className="admin-input h-12 appearance-none text-[13px] font-black"
        >
          <option value="all">Faollik: barchasi</option>
          <option value="active">Faqat faol</option>
          <option value="inactive">Faqat nofaol</option>
        </select>

        <select
          value={filters.availabilityFilter}
          onChange={(event) =>
            onChange({
              ...filters,
              availabilityFilter: event.target.value as 'all' | ProductAvailabilityEnum,
            })
          }
          className="admin-input h-12 appearance-none text-[13px] font-black"
        >
          <option value="all">Holati: barchasi</option>
          <option value={ProductAvailabilityEnum.AVAILABLE}>Mavjud</option>
          <option value={ProductAvailabilityEnum.TEMPORARILY_UNAVAILABLE}>Vaqtincha yo'q</option>
          <option value={ProductAvailabilityEnum.OUT_OF_STOCK}>Tugagan</option>
        </select>
      </div>

      {hasActiveFilters ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.searchQuery.trim() ? (
            <span className="rounded-full border border-[rgba(255,190,11,0.18)] bg-[rgba(255,212,59,0.14)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--admin-pro-primary-contrast)]">
              Qidiruv: {filters.searchQuery}
            </span>
          ) : null}
          {filters.categoryId !== 'all' ? (
            <span className="rounded-full border border-[var(--admin-pro-line)] bg-white/88 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--admin-pro-text-muted)]">
              Kategoriya tanlandi
            </span>
          ) : null}
          {filters.activeFilter !== 'all' ? (
            <span className="rounded-full border border-[var(--admin-pro-line)] bg-white/88 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--admin-pro-text-muted)]">
              {filters.activeFilter === 'active' ? 'Faol' : 'Nofaol'}
            </span>
          ) : null}
          {filters.availabilityFilter !== 'all' ? (
            <span className="rounded-full border border-[var(--admin-pro-line)] bg-white/88 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--admin-pro-text-muted)]">
              {filters.availabilityFilter === ProductAvailabilityEnum.AVAILABLE
                ? 'Mavjud'
                : filters.availabilityFilter === ProductAvailabilityEnum.TEMPORARILY_UNAVAILABLE
                  ? 'Vaqtincha yo\'q'
                  : 'Tugagan'}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default ProductFiltersBar;
