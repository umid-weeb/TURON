import React from 'react';
import { RotateCcw, Search } from 'lucide-react';
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
    <section className="admin-pro-card admin-motion-up rounded-[28px] px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--admin-pro-text-muted)]" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(event) => onChange({ ...filters, searchQuery: event.target.value })}
            placeholder="Qidirish"
            className="admin-input h-12 pl-11 pr-4 text-sm font-bold"
          />
        </div>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          aria-label="Filterlarni tozalash"
          className="admin-pro-button-secondary inline-flex h-12 w-12 items-center justify-center rounded-[18px] disabled:opacity-50"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
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
          <option value="all">Faollik</option>
          <option value="active">Faol</option>
          <option value="inactive">Nofaol</option>
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
          <option value="all">Holati</option>
          <option value={ProductAvailabilityEnum.AVAILABLE}>Mavjud</option>
          <option value={ProductAvailabilityEnum.TEMPORARILY_UNAVAILABLE}>Vaqtincha yo'q</option>
          <option value={ProductAvailabilityEnum.OUT_OF_STOCK}>Tugagan</option>
        </select>
      </div>
    </section>
  );
};

export default ProductFiltersBar;
