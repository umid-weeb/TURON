import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
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
    setProductToDelete((currentProduct) => (currentProduct?.id === product.id ? null : product));
  };

  const handleConfirmDelete = async (product: MenuProduct) => {
    setProductToDelete(product);

    setPageError(null);

    try {
      await deleteProductMutation.mutateAsync(product.id);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Taomlar</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">{filteredProducts.length} ta topildi</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/menu/products/new')}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-transform active:scale-95 sm:w-auto"
        >
          <Plus size={18} />
          Qo'shish
        </button>
      </div>

      <ProductFiltersBar categories={categories} filters={filters} onChange={setFilters} />

      {pageError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-widest text-rose-500">Xatolik</p>
          <p className="text-sm font-bold text-rose-700 mt-1 leading-relaxed">{pageError}</p>
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-sm font-bold text-rose-700">Taomlarni yuklab bo'lmadi.</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <ProductCardAdmin
              key={product.id}
              product={product}
              categoryName={categories.find((category) => category.id === product.categoryId)?.name}
              onToggleActive={handleToggleActive}
              onDeleteRequest={handleDeleteRequest}
              onConfirmDelete={(selectedProduct) => void handleConfirmDelete(selectedProduct)}
              onCancelDelete={() => setProductToDelete(null)}
              isDeleteConfirmOpen={productToDelete?.id === product.id}
              isDeleting={deleteProductMutation.isPending && productToDelete?.id === product.id}
              isBusy={isBusy}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl mb-4">🍽️</div>
          <h3 className="font-bold text-slate-600 text-lg">Taomlar topilmadi</h3>
          <p className="text-sm text-slate-400 mt-1">Filtrlarni o'zgartiring yoki yangi taom qo'shing</p>
        </div>
      )}
    </div>
  );
};

export default AdminProductsPage;
