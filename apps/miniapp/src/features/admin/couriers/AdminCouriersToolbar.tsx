import React from 'react';
import { Plus, RefreshCw, Search, X } from 'lucide-react';
import type { AdminCourierFilter, AdminCourierFilterOption } from './adminCouriers.utils';

interface AdminCouriersToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  filters: AdminCourierFilterOption[];
  activeFilter: AdminCourierFilter;
  onFilterChange: (value: AdminCourierFilter) => void;
  summary: {
    total: number;
    online: number;
    busy: number;
    available: number;
    deliveredToday: number;
  };
  onRefresh: () => void;
  onCreate: () => void;
  isFetching: boolean;
}

export function AdminCouriersToolbar({
  searchValue,
  onSearchChange,
  onSearchClear,
  filters,
  activeFilter,
  onFilterChange,
  summary,
  onRefresh,
  onCreate,
  isFetching,
}: AdminCouriersToolbarProps) {
  return (
    <section className="adminx-surface rounded-[22px] px-4 py-4">
      <div className="flex items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[16px] border border-[rgba(28,18,7,0.08)] bg-white/95 px-4 py-3 shadow-[var(--adminx-shadow-soft)]">
          <Search size={17} className="text-[var(--adminx-color-faint)]" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Ism, telefon, username"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[var(--adminx-color-ink)] outline-none placeholder:text-[var(--adminx-color-faint)]"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={onSearchClear}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(28,18,7,0.08)] bg-white text-[var(--adminx-color-muted)]"
              aria-label="Qidiruvni tozalash"
            >
              <X size={14} />
            </button>
          ) : null}
        </label>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-[rgba(28,18,7,0.08)] bg-white text-[var(--adminx-color-ink)] shadow-[var(--adminx-shadow-soft)]"
          aria-label="Yangilash"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,var(--adminx-color-primary)_0%,var(--adminx-color-primary-dark)_100%)] text-[var(--adminx-color-dark)] shadow-[var(--adminx-shadow-glow)]"
          aria-label="Kuryer qo'shish"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="adminx-courier-stat">
          <span>Jami</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="adminx-courier-stat">
          <span>Onlayn</span>
          <strong>{summary.online}</strong>
        </div>
        <div className="adminx-courier-stat">
          <span>Band</span>
          <strong>{summary.busy}</strong>
        </div>
        <div className="adminx-courier-stat">
          <span>Bugun</span>
          <strong>{summary.deliveredToday}</strong>
        </div>
      </div>

      <div className="adminx-stat-rail mt-3">
        {filters.map((filter, index) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onFilterChange(filter.value)}
            className="adminx-courier-filter"
            data-active={activeFilter === filter.value}
            style={{ ['--i' as string]: index } as React.CSSProperties}
          >
            <span>{filter.label}</span>
            <strong>{filter.count}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
