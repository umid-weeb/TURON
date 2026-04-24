import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layers3, Sparkles } from 'lucide-react';
import CategoryForm from '../../../features/menu/components/CategoryForm';
import DeleteConfirmationModal from '../../../components/admin/DeleteConfirmationModal';
import type { CategoryFormData } from '../../../features/menu/types';
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../../../hooks/queries/useMenu';

const AdminCategoryFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: categories = [], isLoading } = useAdminCategories();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const isEdit = !!categoryId;
  const existingCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );

  const handleSubmit = async (data: CategoryFormData) => {
    setFormError(null);

    try {
      if (isEdit && categoryId) {
        await updateCategoryMutation.mutateAsync({ id: categoryId, data });
      } else {
        await createCategoryMutation.mutateAsync(data);
      }

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      navigate('/admin/menu/categories');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Kategoriyani saqlab bo\'lmadi');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  const handleDelete = async () => {
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryId) return;

    setFormError(null);

    try {
      await deleteCategoryMutation.mutateAsync(categoryId);

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      setIsConfirmOpen(false);
      navigate('/admin/menu/categories');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Kategoriyani o\'chirib bo\'lmadi');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }

      setIsConfirmOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse pb-8">
        <div className="admin-hero-card rounded-[30px] px-5 py-6">
          <div className="h-5 w-28 rounded-full bg-white/15" />
          <div className="mt-5 h-8 w-56 rounded-2xl bg-white/12" />
          <div className="mt-3 h-4 w-72 rounded-2xl bg-white/10" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="h-20 rounded-[22px] bg-white/10" />
            <div className="h-20 rounded-[22px] bg-white/10" />
          </div>
        </div>
        <div className="admin-pro-card h-24 rounded-[28px]" />
        <div className="admin-pro-card h-44 rounded-[32px]" />
        <div className="admin-pro-card h-28 rounded-[30px]" />
      </div>
    );
  }

  if (isEdit && !existingCategory) {
    return (
      <div className="admin-pro-card admin-motion-up admin-pro-card-muted flex flex-col items-center justify-center rounded-[32px] px-6 py-16 text-center">
        <div className="rounded-[24px] border border-[var(--admin-pro-line)] bg-white/80 p-4 text-[var(--admin-pro-primary-contrast)] shadow-[0_16px_34px_rgba(74,56,16,0.08)]">
          <Layers3 size={28} />
        </div>
        <h3 className="mt-5 text-xl font-black tracking-tight text-[var(--admin-pro-text)]">
          Kategoriya topilmadi
        </h3>
        <p className="mt-2 max-w-[280px] text-sm font-semibold leading-relaxed text-[var(--admin-pro-text-muted)]">
          U o&apos;chirilgan yoki yangilanish paytida mavjud ro&apos;yxatdan chiqib ketgan bo&apos;lishi mumkin.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-motion-up pb-8">
      <div className="mb-5 flex items-center justify-between gap-3 rounded-[24px] border border-[var(--admin-pro-line)] bg-[rgba(255,249,233,0.88)] px-4 py-3 shadow-[0_16px_34px_rgba(74,56,16,0.08)]">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
            Menu Studio
          </p>
          <p className="mt-1 text-sm font-black text-[var(--admin-pro-text)]">
            Kategoriya strukturasi va ko&apos;rinishi shu yerda boshqariladi
          </p>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(255,190,11,0.18)] bg-[rgba(255,212,59,0.16)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-primary-contrast)]">
          <Sparkles size={14} />
          Premium
        </div>
      </div>

      <CategoryForm
        initialData={existingCategory}
        onSubmit={handleSubmit}
        title={isEdit ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
        error={formError}
        isSubmitting={createCategoryMutation.isPending || updateCategoryMutation.isPending}
        onDelete={isEdit ? handleDelete : undefined}
        isDeleting={deleteCategoryMutation.isPending}
      />

      <DeleteConfirmationModal
        isOpen={isConfirmOpen}
        title="Kategoriyani o'chirilsinmi?"
        description="Bu kategoriya va unga biriktirilgan barcha taomlar menyudan olib tashlanadi."
        itemName={existingCategory?.name}
        isDeleting={deleteCategoryMutation.isPending}
        confirmLabel="Ha, o'chirish"
        warningText="Bu amalni qaytarib bo'lmaydi. Kategoriya bilan bog'liq taomlar ham o'chiriladi."
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setIsConfirmOpen(false)}
        isDangerous
      />
    </div>
  );
};

export default AdminCategoryFormPage;
