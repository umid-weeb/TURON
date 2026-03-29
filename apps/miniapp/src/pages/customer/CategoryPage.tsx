import React from 'react';
import { useParams } from 'react-router-dom';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../../data/mockData';
import { ProductCard, EmptyState, LoadingSkeleton } from '../../components/customer/CustomerComponents';

const CategoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const category = MOCK_CATEGORIES.find(c => c.id === id);
  const products = MOCK_PRODUCTS.filter(p => p.categoryId === id);

  if (!category) {
    return <EmptyState message="Kategoriya topilmadi!" />;
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      {/* Category Header */}
      <section className="relative h-32 rounded-[32px] overflow-hidden shadow-sm">
        <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
          <h2 className="text-white text-3xl font-black uppercase tracking-widest">{category.name}</h2>
        </div>
      </section>

      {/* Product List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[14px] text-gray-500 uppercase tracking-wide">
            {products.length} ta taom mavjud
          </h3>
        </div>
        
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 pb-8">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState 
            message="Hozircha bu yerda hech narsa yo'q!" 
            subMessage="Boshqa kategoriyalarni ko'rib chiqing." 
          />
        )}
      </section>
    </div>
  );
};

export default CategoryPage;
