import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layers3, Plus, RotateCcw, Search } from 'lucide-react';
import CategoryCard from '../../../features/menu/components/CategoryCard';
import DeleteConfirmationModal from '../../../components/admin/DeleteConfirmationModal';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import {
  useAdminCategories,
  useAdminProducts,
  useDeleteCategory,
  useSetCategoryActive,
} from '../../../hooks/queries/useMenu';
import type { MenuCategory } from '../../../features/menu/types';

type CategoryFilterState = {
  activeFilter: 'all' | 'active' | 'inactive';
  searchQuery: string;
};

const AdminCategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageError, setPageError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null);
  const [filters, setFilters] = useState<CategoryFilterState>(() => ({
    activeFilter: searchParams.get('active') === 'active' || searchParams.get('active') === 'inactive'
      ? (searchParams.get('active') as 'active' | 'inactive')
      : 'all',
    searchQuery: searchParams.get('q') || '',
  }));

  const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } = useAdminCategories();
  const { data: products = [], isLoading: productsLoading } = useAdminProducts();
  const setCategoryActiveMutation = useSetCategoryActive();
  const deleteCategoryMutation = useDeleteCategory();
  const debouncedSearch = useDebouncedValue(filters.searchQuery, 220);
  const searchKey = searchParams.toString();

  useEffect(() => {
    const activeParam = searchParams.get('active');
    const searchParam = searchParams.get('q') || '';

    const nextFilters: CategoryFilterState = {
      activeFilter:
        activeParam === 'active' || activeParam === 'inactive' ? activeParam : 'all',
      searchQuery: searchParam,
    };

    setFilters((current) => {
      if (
        current.activeFilter === nextFilters.activeFilter &&
        current.searchQuery === nextFilters.searchQuery
      ) {
        return current;
      }

      return nextFilters;
    });
  }, [searchKey, searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (filters.activeFilter !== 'all') {
      nextParams.set('active', filters.activeFilter);
    }

    if (debouncedSearch.trim()) {
      nextParams.set('q', debouncedSearch.trim());
    }

    const nextKey = nextParams.toString();
    if (nextKey !== searchKey) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [debouncedSearch, filters.activeFilter, searchKey, setSearchParams]);

  const sortedCategories = useMemo(
    () => [...categories].sort((left, right) => left.sortOrder - right.sortOrder),
    [categories],
  );

  const filteredCategories = useMemo(() => {
    let result = [...sortedCategories];

    if (filters.activeFilter === 'active') {
      result = result.filter((category) => category.isActive);
    } else if (filters.activeFilter === 'inactive') {
      result = result.filter((category) => !category.isActive);
    }

    const query = debouncedSearch.trim().toLowerCase();
    if (query) {
      result = result.filter((category) => category.name.toLowerCase().includes(query));
    }

    return result;
  }, [debouncedSearch, filters.activeFilter, sortedCategories]);

  const isBusy = setCategoryActiveMutation.isPending || deleteCategoryMutation.isPending;
  const isLoading = categoriesLoading || productsLoading;
  const activeFiltersCount = (filters.activeFilter !== 'all' ? 1 : 0) + (filters.searchQuery.trim() ? 1 : 0);

  const handleToggleActive = async (category: MenuCategory) => {
    setPageError(null);

    try {
      await setCategoryActiveMutation.mutateAsync({
        id: category.id,
        isActive: !category.isActive,
      });

      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Kategoriya holatini yangilab bo'lmadi");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    }
  };

  const handleDelete = (category: MenuCategory) => {
    setCategoryToDelete(category);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setPageError(null);

    try {
      await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setIsConfirmOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Kategoriyani o'chirib bo'lmadi");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    }
  };

  return (
    <div className="space-y-5 admin-motion-up pb-8">
      <header className="admin-hero-card rounded-[32px] px-5 py-5 text-[#fff8e9] shadow-[0_24px_48px_rgba(18,14,10,0.26)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[28px] font-black tracking-tight">Kategoriyalar</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/menu/categories/new')}
            className="admin-pro-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-black uppercase tracking-[0.12em]"
          >
            <Plus size={18} />
            Qo'shish
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe8a3]/85">Jami</p>
            <p className="mt-2 text-2xl font-black text-white">{sortedCategories.length}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe8a3]/85">Ko'rindi</p>
            <p className="mt-2 text-2xl font-black text-white">{filteredCategories.length}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe8a3]/85">Filter</p>
            <p className="mt-2 text-2xl font-black text-white">{activeFiltersCount}</p>
          </div>
        </div>
      </header>

      <section className="admin-pro-card rounded-[28px] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--admin-pro-text-muted)]" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(event) => setFilters((current) => ({ ...current, searchQuery: event.target.value }))}
              placeholder="Qidirish"
              className="admin-input h-12 pl-11 pr-4 text-sm font-bold"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilters({ activeFilter: 'all', searchQuery: '' })}
            disabled={!activeFiltersCount}
            aria-label="Filterlarni tozalash"
            className="admin-pro-button-secondary inline-flex h-12 w-12 items-center justify-center rounded-[18px] disabled:opacity-50"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            value={filters.activeFilter}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                activeFilter: event.target.value as 'all' | 'active' | 'inactive',
              }))
            }
            className="admin-input h-12 appearance-none text-[13px] font-black"
          >
            <option value="all">Faollik</option>
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
          </select>
          <div className="flex h-12 items-center rounded-[18px] border border-[var(--admin-pro-line)] bg-white/88 px-4 text-sm font-black text-[var(--admin-pro-text-muted)]">
            {filteredCategories.length} ta natija
          </div>
        </div>
      </section>

      {pageError ? (
        <div className="admin-pro-card rounded-[28px] border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,245,246,0.98)_0%,rgba(255,237,240,0.92)_100%)] px-4 py-3 shadow-[0_16px_34px_rgba(244,63,94,0.12)]">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-500">Xatolik</p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-rose-700">{pageError}</p>
        </div>
      ) : null}

      {categoriesError ? (
        <div className="admin-pro-card rounded-[28px] border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,245,246,0.98)_0%,rgba(255,237,240,0.92)_100%)] px-5 py-4 shadow-[0_16px_34px_rgba(244,63,94,0.12)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">Xatolik</p>
          <p className="mt-2 text-sm font-bold text-rose-700">Kategoriyalarni yuklab bo'lmadi.</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-[28px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(247,239,210,0.88)_100%)]"
            />
          ))}
        </div>
      ) : filteredCategories.length > 0 ? (
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              productCount={products.filter((product) => product.categoryId === category.id).length}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              isBusy={isBusy}
            />
          ))}
        </div>
      ) : (
        <div className="admin-pro-card admin-pro-card-muted flex flex-col items-center justify-center rounded-[32px] px-6 py-20 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[26px] border border-[rgba(255,190,11,0.18)] bg-[linear-gradient(180deg,rgba(255,250,235,0.98)_0%,rgba(255,243,208,0.92)_100%)] text-[var(--admin-pro-primary-contrast)] shadow-[0_16px_34px_rgba(74,56,16,0.08)]">
            <Layers3 size={34} />
          </div>
          <h3 className="text-xl font-black tracking-tight text-[var(--admin-pro-text)]">Kategoriyalar topilmadi</h3>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={isConfirmOpen}
        title="Kategoriyani o'chirilsinmi?"
        description={
          categoryToDelete && products.some((product) => product.categoryId === categoryToDelete.id)
            ? 'Bu kategoriyadagi barcha taomlar ham menyudan olib tashlanadi.'
            : 'Kategoriya menyudan butunlay olib tashlanadi.'
        }
        itemName={categoryToDelete?.name}
        isDeleting={deleteCategoryMutation.isPending}
        confirmLabel="Ha, o'chirish"
        warningText="Bu amalni qaytarib bo'lmaydi. Kategoriya bilan bog'liq ma'lumotlar o'chadi."
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          setIsConfirmOpen(false);
          setCategoryToDelete(null);
        }}
        isDangerous
      />
    </div>
  );
};

export default AdminCategoriesPage;
