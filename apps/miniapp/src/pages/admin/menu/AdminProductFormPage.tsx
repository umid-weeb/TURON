import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Package2 } from 'lucide-react';
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

      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      navigate('/admin/menu/products');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Taomni saqlab bo'lmadi");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!productId) return;

    setFormError(null);

    try {
      await deleteProductMutation.mutateAsync(productId);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setIsConfirmOpen(false);
      navigate('/admin/menu/products');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Taomni o'chirib bo'lmadi");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      setIsConfirmOpen(false);
    }
  };

  if (categoriesLoading || productsLoading) {
    return (
      <div className="space-y-5 animate-pulse pb-8">
        <div className="admin-hero-card rounded-[30px] px-5 py-6">
          <div className="mt-2 h-8 w-56 rounded-2xl bg-white/12" />
        </div>
        <div className="admin-pro-card h-72 rounded-[32px]" />
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
        <h3 className="mt-5 text-xl font-black tracking-tight text-[var(--admin-pro-text)]">Taom topilmadi</h3>
      </div>
    );
  }

  return (
    <div className="admin-motion-up pb-8">
      <ProductForm
        categories={categories}
        initialData={existingProduct}
        onSubmit={handleSubmit}
        title={isEdit ? 'Taomni tahrirlash' : 'Yangi taom'}
        error={formError}
        isSubmitting={createProductMutation.isPending || updateProductMutation.isPending}
        onDelete={isEdit ? () => setIsConfirmOpen(true) : undefined}
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
