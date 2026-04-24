import React from 'react';
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
            Menyu ma'lumotlarini yuklab bo'lmadi.
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-3 animate-pulse">
            <div className="h-18 rounded-[26px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,239,210,0.88)_100%)]" />
            <div className="h-18 rounded-[26px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,239,210,0.88)_100%)]" />
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
          <MenuSummaryCards categories={categories} products={products} />
          <p className="pb-2 text-center text-xs font-semibold text-[var(--admin-pro-text-muted)]">@turonkafebot</p>
        </div>
      )}
    </div>
  );
};

export default AdminMenuDashboard;
