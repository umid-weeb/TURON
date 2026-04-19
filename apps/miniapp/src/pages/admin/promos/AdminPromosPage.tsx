import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useAdminPromos } from '../../../hooks/queries/usePromos';
import { getPromoStatus } from '../../../features/promo/discountEngine';
import { PromoFilterState } from '../../../features/promo/types';
import { PromoSummaryCards } from '../../../features/promo/components/PromoSummaryCards';
import { PromoFiltersBar } from '../../../features/promo/components/PromoFiltersBar';
import { PromoCodeCard } from '../../../features/promo/components/PromoCodeCard';

const AdminPromosPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: promos = [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useAdminPromos();

  const [filters, setFilters] = useState<PromoFilterState>({
    statusFilter: 'all',
    discountTypeFilter: 'all',
    searchQuery: '',
  });

  const filteredPromos = useMemo(() => {
    const normalizedQuery = filters.searchQuery.trim().toLowerCase();

    return promos.filter((promo) => {
      const status = getPromoStatus(promo);
      const matchesStatus =
        filters.statusFilter === 'all' ||
        (filters.statusFilter === 'active' && status === 'ACTIVE') ||
        (filters.statusFilter === 'inactive' && status === 'INACTIVE') ||
        (filters.statusFilter === 'expired' && status === 'EXPIRED');
      const matchesDiscountType =
        filters.discountTypeFilter === 'all' || promo.discountType === filters.discountTypeFilter;
      const matchesSearch =
        !normalizedQuery ||
        promo.code.toLowerCase().includes(normalizedQuery) ||
        promo.title?.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesDiscountType && matchesSearch;
    });
  }, [filters, promos]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10 pt-2">
      <section className="rounded-[16px] border border-[#E5E7EB] bg-[#FFFFFF] p-3 shadow-[0_8px_20px_rgba(17,24,39,0.06)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-black tracking-tight text-[#111827]">Promokodlar boshqaruvi</h2>
            <p className="text-[12px] font-medium text-[#6B7280]">Kodlar, holatlar va ishlatilish statistikasi</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#6B7280] shadow-sm transition-transform active:scale-95"
              aria-label="Promokodlarni yangilash"
            >
              {isFetching ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            </button>
            <button
              onClick={() => navigate('/admin/promos/new')}
              className="flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#2563EB] px-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)] transition-all hover:bg-[#1D4ED8] active:scale-[0.98]"
            >
              <Plus size={16} />
              Qo&apos;shish
            </button>
          </div>
        </div>
      </section>

      <PromoSummaryCards promos={promos} />

      <div className="rounded-[16px] border border-[#E5E7EB] bg-[#FFFFFF] p-3 shadow-[0_8px_20px_rgba(17,24,39,0.05)]">
        <PromoFiltersBar filters={filters} onChange={setFilters} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-[96px] rounded-[14px] border border-[#E5E7EB] bg-[#FFFFFF] animate-pulse" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="flex items-start gap-3 rounded-[14px] border border-rose-200 bg-rose-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-rose-900">Promokodlar yuklanmadi</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-rose-700">
              {(error as Error).message}
            </p>
          </div>
        </div>
      ) : null}

      {!isLoading && !isError && filteredPromos.length > 0 ? (
        <div className="space-y-3">
          {filteredPromos.map((promo, index) => (
            <PromoCodeCard key={promo.id} promo={promo} index={index} />
          ))}
        </div>
      ) : null}

      {!isLoading && !isError && filteredPromos.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[#E5E7EB] bg-[#FFFFFF] px-5 py-12 text-center">
          <p className="text-base font-black text-[#111827]">Promokod topilmadi</p>
          <p className="mt-2 text-sm font-medium text-[#6B7280]">Filtr yoki qidiruvni o&apos;zgartiring</p>
        </div>
      ) : null}
    </div>
  );
};

export default AdminPromosPage;
