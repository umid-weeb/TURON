import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layers3 } from 'lucide-react';
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

      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      navigate('/admin/menu/categories');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Kategoriyani saqlab bo'lmadi");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryId) return;

    setFormError(null);

    try {
      await deleteCategoryMutation.mutateAsync(categoryId);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setIsConfirmOpen(false);
      navigate('/admin/menu/categories');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Kategoriyani o'chirib bo'lmadi");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      setIsConfirmOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse pb-8">
        <div className="admin-hero-card rounded-[30px] px-5 py-6">
          <div className="mt-2 h-8 w-56 rounded-2xl bg-white/12" />
        </div>
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
        <h3 className="mt-5 text-xl font-black tracking-tight text-[var(--admin-pro-text)]">Kategoriya topilmadi</h3>
      </div>
    );
  }

  return (
    <div className="admin-motion-up pb-8">
      <CategoryForm
        initialData={existingCategory}
        onSubmit={handleSubmit}
        title={isEdit ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
        error={formError}
        isSubmitting={createCategoryMutation.isPending || updateCategoryMutation.isPending}
        onDelete={isEdit ? () => setIsConfirmOpen(true) : undefined}
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
