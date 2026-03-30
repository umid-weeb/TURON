import React from 'react';
import { CategoryCard, ProductCard, ProductDetailModal, LoadingSkeleton } from '../../components/customer/CustomerComponents';
import { useCategories, useProducts } from '../../hooks/queries/useMenu';
import { AppHeader } from '../../components/layout/AppLayout';
import { useCartStore } from '../../store/useCartStore';
import { MenuProduct } from '../../features/menu/types';

const MenuPage: React.FC = () => {
  const { data: categories = [], isLoading: isLoadingCategories, error: categoriesError } = useCategories();
  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useProducts();
  const { addToCart } = useCartStore();
  const [previewProduct, setPreviewProduct] = React.useState<MenuProduct | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const openProductPreview = (product: MenuProduct) => {
    setPreviewProduct(product);
    setIsPreviewOpen(true);
  };

  const closeProductPreview = () => {
    setIsPreviewOpen(false);
    setPreviewProduct(null);
  };

  const handleAddToCartFromModal = (product: MenuProduct, quantity: number) => {
    addToCart({ id: product.id, categoryId: product.categoryId, name: product.name, description: product.description, price: product.price, image: product.imageUrl }, quantity);
    closeProductPreview();
  };

  if (isLoadingCategories || isLoadingProducts) {
    return <LoadingSkeleton />;
  }

  if (categoriesError || productsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-4">
          <h2 className="font-black">Xatolik yuz berdi</h2>
          <p className="text-sm mt-1">{(categoriesError as Error)?.message || (productsError as Error)?.message || 'Maʼlumotlarni yuklashda xatolik.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <AppHeader title="Menu" showBack={true} />

      <section className="px-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Kategoriyalar</h3>
        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
          {categories.length > 0 ? categories.map((category: any) => (
            <CategoryCard key={category.id} category={category} />
          )) : (
            <p className="text-gray-500 text-sm">Kategoriya topilmadi</p>
          )}
        </div>
      </section>

      <section className="px-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-black">Mahsulotlar</h3>
          <span className="text-[10px] uppercase tracking-widest text-gray-500">{products.length} ta</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {products.length > 0 ? products.map((product: MenuProduct) => (
            <ProductCard key={product.id} product={product} onPreview={openProductPreview} />
          )) : (
            <p className="text-gray-500 col-span-2 text-center">Mahsulotlar topilmadi</p>
          )}
        </div>
      </section>

      <ProductDetailModal
        open={isPreviewOpen}
        product={previewProduct}
        onClose={closeProductPreview}
        onAddToCart={handleAddToCartFromModal}
      />
    </div>
  );
};

export default MenuPage;
