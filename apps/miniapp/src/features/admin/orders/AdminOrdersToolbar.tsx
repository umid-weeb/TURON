import React from 'react';
import { Loader2, Search, X } from 'lucide-react';
import type { AdminOrderFilter, AdminOrderFilterOption } from './adminOrders.utils';

interface AdminOrdersToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  filters: AdminOrderFilterOption[];
  activeFilter: AdminOrderFilter;
  onFilterChange: (value: AdminOrderFilter) => void;
  filteredCount: number;
  totalCount: number;
  isFetching: boolean;
}

export function AdminOrdersToolbar({
  searchValue,
  onSearchChange,
  onSearchClear,
  filters,
  activeFilter,
  onFilterChange,
  filteredCount,
  totalCount,
  isFetching,
}: AdminOrdersToolbarProps) {
  return (
    <section className="adminx-surface rounded-[24px] px-4 py-4">
      <div className="flex items-center gap-3 rounded-[20px] border border-[rgba(28,18,7,0.08)] bg-white/95 px-4 py-3 shadow-[var(--adminx-shadow-soft)]">
        <Search size={18} className="text-[var(--adminx-color-faint)]" />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="ID, mijoz, telefon, manzil"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--adminx-color-ink)] outline-none placeholder:text-[var(--adminx-color-faint)]"
        />
        {searchValue ? (
          <button
            type="button"
            onClick={onSearchClear}
            aria-label="Qidiruvni tozalash"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(28,18,7,0.08)] bg-white text-[var(--adminx-color-muted)]"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-[var(--adminx-color-muted)]">
          {filteredCount}/{totalCount}
        </p>
        {isFetching ? <Loader2 size={16} className="animate-spin text-[var(--adminx-color-faint)]" /> : null}
      </div>

      <div className="adminx-stat-rail mt-4">
        {filters.map((filter, index) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilterChange(filter.value)}
              className="adminx-order-filter"
              data-active={isActive}
              style={{ ['--i' as string]: index } as React.CSSProperties}
            >
              <span className="block text-[11px] font-black uppercase tracking-[0.16em] opacity-70">
                {filter.label}
              </span>
              <span className="mt-2 block text-[24px] font-black leading-none tracking-[-0.04em]">
                {filter.count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
