import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package2, Plus, Sparkles } from 'lucide-react';
import DeleteConfirmationModal from '../../../components/admin/DeleteConfirmationModal';
import ProductCardAdmin from '../../../features/menu/components/ProductCardAdmin';
import ProductFiltersBar from '../../../features/menu/components/ProductFiltersBar';
import type { MenuProduct, ProductFilterState } from '../../../features/menu/types';
import {
  useAdminCategories,
  useAdminProducts,
  useDeleteProduct,
  useSetProductActive,
} from '../../../hooks/queries/useMenu';

const AdminProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pageError, setPageError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<MenuProduct | null>(null);
  const [filters, setFilters] = useState<ProductFilterState>(() => {
    const activeParam = searchParams.get('active');
    const availabilityParam = searchParams.get('availability');
    const categoryParam = searchParams.get('categoryId');
    const searchParam = searchParams.get('q');

    return {
      categoryId: categoryParam || 'all',
      activeFilter:
        activeParam === 'active' || activeParam === 'inactive' ? activeParam : 'all',
      availabilityFilter: (availabilityParam as ProductFilterState['availabilityFilter']) || 'all',
      searchQuery: searchParam || '',
    };
  });

  const { data: categories = [] } = useAdminCategories();
  const { data: products = [], isLoading, isError } = useAdminProducts();
  const setProductActiveMutation = useSetProductActive();
  const deleteProductMutation = useDeleteProduct();

  React.useEffect(() => {
    const activeParam = searchParams.get('active');
    const availabilityParam = searchParams.get('availability');
    const categoryParam = searchParams.get('categoryId');
    const searchParam = searchParams.get('q');

    const nextFilters: ProductFilterState = {
      categoryId: categoryParam || 'all',
      activeFilter:
        activeParam === 'active' || activeParam === 'inactive' ? activeParam : 'all',
      availabilityFilter: (availabilityParam as ProductFilterState['availabilityFilter']) || 'all',
      searchQuery: searchParam || '',
    };

    setFilters((current) => {
      if (
        current.categoryId === nextFilters.categoryId &&
        current.activeFilter === nextFilters.activeFilter &&
        current.availabilityFilter === nextFilters.availabilityFilter &&
        current.searchQuery === nextFilters.searchQuery
      ) {
        return current;
      }

      return nextFilters;
    });
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (filters.categoryId !== 'all') {
      result = result.filter((product) => product.categoryId === filters.categoryId);
    }

    if (filters.activeFilter === 'active') {
      result = result.filter((product) => product.isActive);
    } else if (filters.activeFilter === 'inactive') {
      result = result.filter((product) => !product.isActive);
    }

    if (filters.availabilityFilter !== 'all') {
      result = result.filter((product) => product.availability === filters.availabilityFilter);
    }

    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter((product) => product.name.toLowerCase().includes(query));
    }

    return result;
  }, [filters, products]);

  const activeFiltersCount =
    (filters.categoryId !== 'all' ? 1 : 0) +
    (filters.activeFilter !== 'all' ? 1 : 0) +
    (filters.availabilityFilter !== 'all' ? 1 : 0) +
    (filters.searchQuery.trim() ? 1 : 0);

  const isBusy = setProductActiveMutation.isPending || deleteProductMutation.isPending;

  const handleToggleActive = async (product: MenuProduct) => {
    setPageError(null);

    try {
      await setProductActiveMutation.mutateAsync({
        id: product.id,
        isActive: !product.isActive,
      });

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Taom holatini yangilab bo\'lmadi');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  const handleDeleteRequest = (product: MenuProduct) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    setPageError(null);

    try {
      await deleteProductMutation.mutateAsync(productToDelete.id);

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      setProductToDelete(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Taomni o\'chirib bo\'lmadi');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-8">
      <header className="admin-hero-card rounded-[32px] px-5 py-5 text-[#fff8e9] shadow-[0_24px_48px_rgba(18,14,10,0.26)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#ffe8a3]">
              <Package2 size={13} />
              Product studio
            </span>
            <h1 className="mt-4 text-[28px] font-black tracking-tight">Taomlar</h1>
            <p className="mt-1 max-w-[300px] text-sm font-medium text-[#f5e7bf]/82">
              Katalog kartalari, narxlar va mavjudlikni premium tezlikda boshqarish paneli.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/menu/products/new')}
            className="admin-pro-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-black uppercase tracking-[0.12em]"
          >
            <Plus size={18} />
            Qo&apos;shish
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe8a3]/85">Jami</p>
            <p className="mt-2 text-2xl font-black text-white">{products.length}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe8a3]/85">Topildi</p>
            <p className="mt-2 text-2xl font-black text-white">{filteredProducts.length}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe8a3]/85">Filter</p>
            <p className="mt-2 text-2xl font-black text-white">{activeFiltersCount}</p>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3 rounded-[24px] border border-[var(--admin-pro-line)] bg-[rgba(255,249,233,0.88)] px-4 py-3 shadow-[0_16px_34px_rgba(74,56,16,0.08)]">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
            Interaction layer
          </p>
          <p className="mt-1 text-sm font-black text-[var(--admin-pro-text)]">
            Kartani bosish tahrirlaydi, yon actionlar esa mahsulotni tezkor boshqaradi
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(255,190,11,0.18)] bg-[rgba(255,212,59,0.16)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-primary-contrast)]">
          <Sparkles size={14} />
          Premium
        </span>
      </div>

      <ProductFiltersBar categories={categories} filters={filters} onChange={setFilters} />

      {pageError ? (
        <div className="admin-pro-card rounded-[28px] border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,245,246,0.98)_0%,rgba(255,237,240,0.92)_100%)] px-4 py-3 shadow-[0_16px_34px_rgba(244,63,94,0.12)]">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-500">Xatolik</p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-rose-700">{pageError}</p>
        </div>
      ) : null}

      {isError ? (
        <div className="admin-pro-card rounded-[28px] border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,245,246,0.98)_0%,rgba(255,237,240,0.92)_100%)] px-5 py-4 shadow-[0_16px_34px_rgba(244,63,94,0.12)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">Yuklash</p>
          <p className="mt-2 text-sm font-bold text-rose-700">Taomlarni yuklab bo'lmadi.</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-32 rounded-[30px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(247,239,210,0.88)_100%)]"
            />
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <ProductCardAdmin
              key={product.id}
              product={product}
              categoryName={categories.find((category) => category.id === product.categoryId)?.name}
              onToggleActive={handleToggleActive}
              onDeleteRequest={handleDeleteRequest}
              isBusy={isBusy}
            />
          ))}
        </div>
      ) : (
        <div className="admin-pro-card admin-pro-card-muted flex flex-col items-center justify-center rounded-[32px] px-6 py-20 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[26px] border border-[rgba(255,190,11,0.18)] bg-[linear-gradient(180deg,rgba(255,250,235,0.98)_0%,rgba(255,243,208,0.92)_100%)] text-[var(--admin-pro-primary-contrast)] shadow-[0_16px_34px_rgba(74,56,16,0.08)]">
            <Package2 size={34} />
          </div>
          <h3 className="text-xl font-black tracking-tight text-[var(--admin-pro-text)]">Taomlar topilmadi</h3>
          <p className="mt-2 max-w-[280px] text-sm font-semibold leading-relaxed text-[var(--admin-pro-text-muted)]">
            Filterlarni o&apos;zgartiring yoki menyuga yangi taom qo&apos;shing.
          </p>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={!!productToDelete}
        title="Taomni o'chirilsinmi?"
        description="Taom katalog va mijozlar menyusidan butunlay olib tashlanadi."
        itemName={productToDelete?.name}
        isDeleting={deleteProductMutation.isPending}
        confirmLabel="Ha, o'chirish"
        warningText="Bu amalni qaytarib bo'lmaydi. Taom qayta tiklanmaydi."
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setProductToDelete(null)}
        isDangerous
      />
    </div>
  );
};

export default AdminProductsPage;
