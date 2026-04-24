import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Package2, Sparkles } from 'lucide-react';
import ProductForm from '../../../features/menu/components/ProductForm';
import DeleteConfirmationModal from '../../../components/admin/DeleteConfirmationModal';
import type { ProductFormData } from '../../../features/menu/types';
import {
  useAdminCategories,
  useAdminProducts,
  useCreateProduct,
  useDeleteProduct,
  useUpdateProduct,
} from '../../../hooks/queries/useMenu';

const AdminProductFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useAdminCategories();
  const { data: products = [], isLoading: productsLoading } = useAdminProducts();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  const isEdit = !!productId;
  const existingProduct = useMemo(
    () => products.find((product) => product.id === productId),
    [products, productId],
  );

  const handleSubmit = async (data: ProductFormData) => {
    setFormError(null);

    try {
      if (isEdit && productId) {
        await updateProductMutation.mutateAsync({ id: productId, data });
      } else {
        await createProductMutation.mutateAsync(data);
      }

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      navigate('/admin/menu/products');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Taomni saqlab bo\'lmadi');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  const handleDelete = async () => {
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productId) return;

    setFormError(null);

    try {
      await deleteProductMutation.mutateAsync(productId);

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      setIsConfirmOpen(false);
      navigate('/admin/menu/products');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Taomni o\'chirib bo\'lmadi');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }

      setIsConfirmOpen(false);
    }
  };

  if (categoriesLoading || productsLoading) {
    return (
      <div className="space-y-5 animate-pulse pb-8">
        <div className="admin-hero-card rounded-[30px] px-5 py-6">
          <div className="h-5 w-32 rounded-full bg-white/15" />
          <div className="mt-5 h-8 w-60 rounded-2xl bg-white/12" />
          <div className="mt-3 h-4 w-72 rounded-2xl bg-white/10" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="h-20 rounded-[22px] bg-white/10" />
            <div className="h-20 rounded-[22px] bg-white/10" />
          </div>
        </div>
        <div className="admin-pro-card h-72 rounded-[32px]" />
        <div className="admin-pro-card h-80 rounded-[32px]" />
        <div className="admin-pro-card h-32 rounded-[32px]" />
      </div>
    );
  }

  if (isEdit && !existingProduct) {
    return (
      <div className="admin-pro-card admin-motion-up admin-pro-card-muted flex flex-col items-center justify-center rounded-[32px] px-6 py-16 text-center">
        <div className="rounded-[24px] border border-[var(--admin-pro-line)] bg-white/80 p-4 text-[var(--admin-pro-primary-contrast)] shadow-[0_16px_34px_rgba(74,56,16,0.08)]">
          <Package2 size={28} />
        </div>
        <h3 className="mt-5 text-xl font-black tracking-tight text-[var(--admin-pro-text)]">
          Taom topilmadi
        </h3>
        <p className="mt-2 max-w-[280px] text-sm font-semibold leading-relaxed text-[var(--admin-pro-text-muted)]">
          Mahsulot o&apos;chirilgan yoki hozirgi ro&apos;yxatda mavjud emas. Katalogni yangilab ko&apos;ring.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-motion-up pb-8">
      <div className="mb-5 flex items-center justify-between gap-3 rounded-[24px] border border-[var(--admin-pro-line)] bg-[rgba(255,249,233,0.88)] px-4 py-3 shadow-[0_16px_34px_rgba(74,56,16,0.08)]">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
            Product Studio
          </p>
          <p className="mt-1 text-sm font-black text-[var(--admin-pro-text)]">
            Taom kartasi, rasm va mavjudlikni premium katalog standartida boshqaring
          </p>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(255,190,11,0.18)] bg-[rgba(255,212,59,0.16)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-primary-contrast)]">
          <Sparkles size={14} />
          Premium
        </div>
      </div>

      <ProductForm
        categories={categories}
        initialData={existingProduct}
        onSubmit={handleSubmit}
        title={isEdit ? 'Taomni tahrirlash' : 'Yangi taom'}
        error={formError}
        isSubmitting={createProductMutation.isPending || updateProductMutation.isPending}
        onDelete={isEdit ? handleDelete : undefined}
        isDeleting={deleteProductMutation.isPending}
      />

      <DeleteConfirmationModal
        isOpen={isConfirmOpen}
        title="Taomni o'chirilsinmi?"
        description="Taom katalog va mijozlar menyusidan butunlay olib tashlanadi."
        itemName={existingProduct?.name}
        isDeleting={deleteProductMutation.isPending}
        confirmLabel="Ha, o'chirish"
        warningText="Bu amalni qaytarib bo'lmaydi. Taom qayta tiklanmaydi."
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setIsConfirmOpen(false)}
        isDangerous
      />
    </div>
  );
};

export default AdminProductFormPage;
