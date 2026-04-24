import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers3, Plus, Sparkles } from 'lucide-react';
import CategoryCard from '../../../features/menu/components/CategoryCard';
import DeleteConfirmationModal from '../../../components/admin/DeleteConfirmationModal';
import {
  useAdminCategories,
  useAdminProducts,
  useDeleteCategory,
  useSetCategoryActive,
} from '../../../hooks/queries/useMenu';
import type { MenuCategory } from '../../../features/menu/types';

const AdminCategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [pageError, setPageError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null);

  const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } = useAdminCategories();
  const { data: products = [], isLoading: productsLoading } = useAdminProducts();
  const setCategoryActiveMutation = useSetCategoryActive();
  const deleteCategoryMutation = useDeleteCategory();

  const sortedCategories = useMemo(
    () => [...categories].sort((left, right) => left.sortOrder - right.sortOrder),
    [categories],
  );

  const activeCategoriesCount = useMemo(
    () => sortedCategories.filter((category) => category.isActive).length,
    [sortedCategories],
  );

  const isBusy = setCategoryActiveMutation.isPending || deleteCategoryMutation.isPending;
  const isLoading = categoriesLoading || productsLoading;

  const handleToggleActive = async (category: MenuCategory) => {
    setPageError(null);

    try {
      await setCategoryActiveMutation.mutateAsync({
        id: category.id,
        isActive: !category.isActive,
      });

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Kategoriya holatini yangilab bo\'lmadi');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  const handleDelete = async (category: MenuCategory) => {
    setCategoryToDelete(category);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setPageError(null);

    try {
      await deleteCategoryMutation.mutateAsync(categoryToDelete.id);

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      setIsConfirmOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Kategoriyani o\'chirib bo\'lmadi');

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
              <Layers3 size={13} />
              Menu studio
            </span>
            <h1 className="mt-4 text-[28px] font-black tracking-tight">Kategoriyalar</h1>
            <p className="mt-1 max-w-[300px] text-sm font-medium text-[#f5e7bf]/82">
              Menyu bo&apos;limlarini boshqarish, tartiblash va ko&apos;rinishini nazorat qilish paneli.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/menu/categories/new')}
            className="admin-pro-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-black uppercase tracking-[0.12em]"
          >
            <Plus size={18} />
            Qo&apos;shish
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe8a3]/85">Jami</p>
            <p className="mt-2 text-2xl font-black text-white">{sortedCategories.length}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe8a3]/85">Faol</p>
            <p className="mt-2 text-2xl font-black text-white">{activeCategoriesCount}</p>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3 rounded-[24px] border border-[var(--admin-pro-line)] bg-[rgba(255,249,233,0.88)] px-4 py-3 shadow-[0_16px_34px_rgba(74,56,16,0.08)]">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
            Interaction layer
          </p>
          <p className="mt-1 text-sm font-black text-[var(--admin-pro-text)]">
            Kartaga tegish orqali tahrirlash, o&apos;ngdagi actionlar orqali tezkor boshqaruv
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(255,190,11,0.18)] bg-[rgba(255,212,59,0.16)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-primary-contrast)]">
          <Sparkles size={14} />
          Premium
        </span>
      </div>

      {pageError ? (
        <div className="admin-pro-card rounded-[28px] border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,245,246,0.98)_0%,rgba(255,237,240,0.92)_100%)] px-4 py-3 shadow-[0_16px_34px_rgba(244,63,94,0.12)]">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-500">Xatolik</p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-rose-700">{pageError}</p>
        </div>
      ) : null}

      {categoriesError ? (
        <div className="admin-pro-card rounded-[28px] border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,245,246,0.98)_0%,rgba(255,237,240,0.92)_100%)] px-5 py-4 shadow-[0_16px_34px_rgba(244,63,94,0.12)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">Yuklash</p>
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
      ) : sortedCategories.length > 0 ? (
        <div className="space-y-4">
          {sortedCategories.map((category) => (
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
          <p className="mt-2 max-w-[280px] text-sm font-semibold leading-relaxed text-[var(--admin-pro-text-muted)]">
            Yangi kategoriya qo&apos;shib, menyu strukturasi uchun birinchi bo&apos;limni yarating.
          </p>
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
