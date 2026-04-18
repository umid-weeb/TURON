import React, { useState, useMemo } from 'react';
import { Search, Flame, Pizza, Coffee, IceCream, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LoadingSkeleton,
  ProductGrid,
  EmptyState,
} from '../../components/customer/CustomerComponents';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { getCustomerCategoryLabel, sortCustomerCategories } from '../../features/menu/customerCatalog';
import { useCategories, useProducts } from '../../hooks/queries/useMenu';
import { ProductAvailabilityEnum } from '@turon/shared';

function getCategoryIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes('pitsa') || l.includes('pizza')) return <Pizza size={24} strokeWidth={2.2} />;
  if (l.includes('drink') || l.includes('ichimlik')) return <Coffee size={24} strokeWidth={2.2} />;
  if (l.includes('dessert') || l.includes('shirinlik') || l.includes('muzqaymoq')) return <IceCream size={24} strokeWidth={2.2} />;
  if (l.includes('burger') || l.includes('lavash') || l.includes('fast food') || l.includes('kombo')) return <Flame size={24} strokeWidth={2.2} />;
  return <Utensils size={24} strokeWidth={2.2} />;
}

const MenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
  const { data: products = [], isLoading: isProductsLoading } = useProducts();
  const { formatText } = useCustomerLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  
  const sortedCategories = useMemo(() => sortCustomerCategories(categories), [categories]);
  
  // Default to first category if none selected, and no search query active
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');

  React.useEffect(() => {
    if (sortedCategories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(sortedCategories[0].id);
    }
  }, [sortedCategories, activeCategoryId]);

  if (isCategoriesLoading || isProductsLoading) {
    return <LoadingSkeleton />;
  }

  const activeProducts = products.filter(
    (product) => product.isActive && product.availability !== ProductAvailabilityEnum.OUT_OF_STOCK
  );

  const tabs = sortedCategories.map((category) => ({
    id: category.id,
    label: formatText(getCustomerCategoryLabel(category.name)),
  }));

  // Filtering logic
  const filteredProducts = activeProducts.filter((product) => {
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      return formatText(product.name).toLowerCase().includes(query) || 
             (product.description && formatText(product.description).toLowerCase().includes(query));
    }
    return product.categoryId === activeCategoryId;
  });

  return (
    <div
      className="min-h-screen bg-[#f6f6f7] animate-in fade-in duration-300"
      style={{ paddingBottom: 'calc(var(--customer-floating-content-clearance, 164px) + 16px)' }}
    >
      {/* Universal Search & Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="flex h-[58px] items-center px-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="relative h-10 w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-[#9a9aa3]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-full w-full rounded-xl bg-[#f4f4f5] pl-10 pr-4 text-[14px] font-bold text-[#202020] placeholder-[#9a9aa3] outline-none"
              placeholder="Taom yoki pishiriq qidirish..."
            />
          </div>
        </div>

        {/* Category Tabs (only show when not searching) */}
        {!searchQuery.trim() && (
          <div className="border-t border-slate-100 bg-white py-3">
            <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-5 pb-1 relative">
              {tabs.map((tab) => {
                const isActive = tab.id === activeCategoryId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategoryId(tab.id)}
                    className="flex flex-col items-center gap-2 outline-none group"
                  >
                    <div
                      className={`flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full transition-all duration-300 ${isActive
                          ? 'bg-[#FFD700] text-[#111] shadow-sm transform scale-[1.02]'
                          : 'bg-[#f4f4f5] text-[#222] group-active:scale-95 hover:bg-[#e4e4e5]'
                        }`}
                    >
                      {getCategoryIcon(tab.label)}
                    </div>
                    <span
                      className={`text-[12px] whitespace-nowrap transition-colors ${isActive ? 'font-black text-slate-900' : 'font-bold text-slate-500'
                        }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Grid */}
      <main className="px-4 pt-5">
        {!searchQuery.trim() && sortedCategories.find(c => c.id === activeCategoryId) ? (
          <div className="mb-4">
            <h2 className="text-[1.3rem] font-black tracking-tight text-[#202020]">
              {formatText(getCustomerCategoryLabel(sortedCategories.find(c => c.id === activeCategoryId)?.name || ''))}
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-[#8c8c96]">
              {filteredProducts.length} ta taom topildi
            </p>
          </div>
        ) : searchQuery.trim() ? (
          <div className="mb-4">
            <h2 className="text-[1.3rem] font-black tracking-tight text-[#202020]">
              Qidiruv natijalari
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-[#8c8c96]">
              "{searchQuery}" bo'yicha {filteredProducts.length} ta taom topildi
            </p>
          </div>
        ) : null}

        {filteredProducts.length > 0 ? (
          <ProductGrid products={filteredProducts} />
        ) : (
          <div className="pt-10">
            <EmptyState
              message="Taom topilmadi"
              subMessage={searchQuery.trim() ? "So'rovingizga mos bo'lgan taom yo'q." : "Ushbu bo'limda hozircha hech narsa yo'q."}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default MenuPage;
