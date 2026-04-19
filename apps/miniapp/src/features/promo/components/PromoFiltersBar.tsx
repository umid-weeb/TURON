import React from 'react';
import { Search } from 'lucide-react';
import { PromoFilterState } from '../types';

interface Props {
  filters: PromoFilterState;
  onChange: (filters: PromoFilterState) => void;
}

export const PromoFiltersBar: React.FC<Props> = ({ filters, onChange }) => {
  return (
    <div className="grid grid-cols-1 gap-2">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9CA3AF]">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
          placeholder="Promokod yoki sarlavhani qidiring..."
          className="h-10 w-full rounded-[10px] border border-[#E5E7EB] bg-[#FFFFFF] pl-10 pr-3 text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-colors focus:border-[#2563EB]"
        />
      </div>
    </div>
  );
};
