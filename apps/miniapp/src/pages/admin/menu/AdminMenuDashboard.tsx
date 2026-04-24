import React from 'react';
import { Sparkles } from 'lucide-react';
import MenuSummaryCards from '../../../features/menu/components/MenuSummaryCards';
import { useAdminCategories, useAdminProducts } from '../../../hooks/queries/useMenu';

const AdminMenuDashboard: React.FC = () => {
  const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } = useAdminCategories();
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useAdminProducts();

  const isLoading = categoriesLoading || productsLoading;
  const isError = categoriesError || productsError;

  return (
    <div className="animate-in fade-in duration-300 pb-[calc(env(safe-area-inset-bottom,0px)+96px)]">
      {isError ? (
        <div className="admin-pro-card rounded-[28px] border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,245,246,0.98)_0%,rgba(255,237,240,0.92)_100%)] px-5 py-4 shadow-[0_16px_34px_rgba(244,63,94,0.12)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">Xatolik</p>
          <p className="mt-2 text-sm font-bold text-rose-700">
            Menyu ma'lumotlarini yuklab bo'lmadi. Iltimos, qayta urinib ko'ring.
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-3 animate-pulse">
            <div className="h-20 rounded-[26px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,239,210,0.88)_100%)]" />
            <div className="h-20 rounded-[26px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,239,210,0.88)_100%)]" />
          </div>
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 rounded-[24px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,239,210,0.88)_100%)]"
              />
            ))}
          </div>
          <div className="space-y-3 animate-pulse">
            <div className="h-16 rounded-[24px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,239,210,0.88)_100%)]" />
            <div className="h-16 rounded-[24px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,239,210,0.88)_100%)]" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 rounded-[24px] border border-[var(--admin-pro-line)] bg-[rgba(255,249,233,0.88)] px-4 py-3 shadow-[0_16px_34px_rgba(74,56,16,0.08)]">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
                Overview
              </p>
              <p className="mt-1 text-sm font-black text-[var(--admin-pro-text)]">
                Menu bo'limidagi asosiy amallar va ko'rsatkichlar shu yerga jamlandi
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(255,190,11,0.18)] bg-[rgba(255,212,59,0.16)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-primary-contrast)]">
              <Sparkles size={14} />
              Premium
            </span>
          </div>

          <MenuSummaryCards categories={categories} products={products} />
          <p className="pb-2 text-center text-xs font-semibold text-[var(--admin-pro-text-muted)]">@turonkafebot</p>
        </div>
      )}
    </div>
  );
};

export default AdminMenuDashboard;
