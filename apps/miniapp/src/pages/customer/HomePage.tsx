import React from 'react';
import { Plus, Search, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductAvailabilityEnum } from '@turon/shared';
import { LoadingSkeleton } from '../../components/customer/CustomerComponents';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { getProductImageUrl, getProductPosterUrl } from '../../features/menu/placeholders';
import {
  getCustomerCategoryLabel,
  getProductPromotion,
  getProductSecondaryText,
  sortCustomerCategories,
} from '../../features/menu/customerCatalog';
import type { MenuCategory, MenuProduct } from '../../features/menu/types';
import { useCategories, useProducts } from '../../hooks/queries/useMenu';
import { useCartStore } from '../../store/useCartStore';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[\u00B4`']/g, '')
    .replace(/\s+/g, ' ');

const productMatchesSearch = (product: MenuProduct, query: string) => {
  if (!query) return true;
  const haystack = normalize(`${product.name} ${product.description} ${product.weight ?? ''} ${product.weightText ?? ''}`);
  return haystack.includes(query);
};

const productIsAvailable = (product: MenuProduct) =>
  product.isActive && product.availability === ProductAvailabilityEnum.AVAILABLE;

const getCategoryTone = (category: MenuCategory) => {
  const label = normalize(getCustomerCategoryLabel(category.name));
  if (label.includes('osh')) return 'from-amber-100 to-orange-50 text-orange-700';
  if (label.includes('shorva') || label.includes('sho')) return 'from-sky-100 to-cyan-50 text-sky-700';
  if (label.includes('lavash') || label.includes('burger')) return 'from-rose-100 to-orange-50 text-rose-700';
  if (label.includes('ichimlik')) return 'from-emerald-100 to-teal-50 text-emerald-700';
  return 'from-slate-100 to-white text-slate-600';
};

const MenuProductCard: React.FC<{ product: MenuProduct }> = ({ product }) => {
  const navigate = useNavigate();
  const { formatText } = useCustomerLanguage();
  const addToCart = useCartStore((state) => state.addToCart);
  const posterSrc = React.useMemo(() => getProductPosterUrl(product), [product]);
  const [imageSrc, setImageSrc] = React.useState(() =>
    getProductImageUrl(
      {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
      },
      product.categoryId,
    ),
  );
  const promotion = React.useMemo(() => getProductPromotion(product), [product]);
  const available = productIsAvailable(product);

  React.useEffect(() => {
    setImageSrc(
      getProductImageUrl(
        {
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          categoryId: product.categoryId,
        },
        product.categoryId,
      ),
    );
  }, [product]);

  const handleAdd = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!available) return;

    addToCart({
      id: product.id,
      menuItemId: product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      price: product.price,
      image: imageSrc,
      isAvailable: true,
    });
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/customer/product/${product.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/customer/product/${product.id}`);
        }
      }}
      className={`group relative min-h-[266px] overflow-hidden rounded-[18px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.035] transition duration-200 active:scale-[0.985] ${
        available ? '' : 'opacity-60 grayscale'
      }`}
    >
      <div className="relative h-[142px] overflow-hidden bg-slate-100 min-[390px]:h-[152px]">
        <img
          src={imageSrc}
          alt={formatText(product.name)}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-active:scale-[1.03]"
          onError={() => {
            if (imageSrc !== posterSrc) setImageSrc(posterSrc);
          }}
        />
        {promotion.kind === 'new' ? (
          <span className="absolute left-3 top-3 rounded-full bg-sky-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-lg">
            Yangi
          </span>
        ) : promotion.kind === 'discount' && promotion.discountPercent ? (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
            -{promotion.discountPercent}%
          </span>
        ) : null}
      </div>

      <div className="flex min-h-[124px] flex-col px-3.5 pb-3.5 pt-3">
        <h3 className="line-clamp-1 text-[17px] font-black leading-tight tracking-[-0.03em] text-[#202020]">
          {formatText(product.name)}
        </h3>
        <p className="mt-1.5 line-clamp-2 min-h-[34px] text-[12.5px] font-medium leading-[17px] text-[#8c8c96]">
          {formatText(getProductSecondaryText(product) || product.description || 'Mazali taom')}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <p className="truncate text-[18px] font-black tracking-[-0.04em] text-[#202020]">
              {product.price.toLocaleString()} so'm
            </p>
            {promotion.oldPrice ? (
              <p className="mt-0.5 text-[11px] font-semibold text-slate-300 line-through">
                {promotion.oldPrice.toLocaleString()} so'm
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!available}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-[0_12px_20px_rgba(15,23,42,0.22)] transition active:scale-90 ${
              available ? 'bg-[#202124] text-white' : 'bg-slate-200 text-slate-400'
            }`}
            aria-label="Savatga qo'shish"
          >
            <Plus size={22} strokeWidth={2.7} />
          </button>
        </div>
      </div>
    </article>
  );
};

const HomePage: React.FC = () => {
  const { formatText } = useCustomerLanguage();
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
  const { data: products = [], isLoading: isProductsLoading } = useProducts();
  const [activeCategoryId, setActiveCategoryId] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const sortedCategories = React.useMemo(() => sortCustomerCategories(categories), [categories]);
  const normalizedSearch = React.useMemo(() => normalize(searchQuery), [searchQuery]);
  const activeProducts = React.useMemo(
    () => products.filter((product) => product.isActive),
    [products],
  );
  const filteredProducts = React.useMemo(() => {
    return activeProducts
      .filter((product) => activeCategoryId === 'all' || product.categoryId === activeCategoryId)
      .filter((product) => productMatchesSearch(product, normalizedSearch))
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  }, [activeCategoryId, activeProducts, normalizedSearch]);

  if (isCategoriesLoading || isProductsLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#202020]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)' }}>
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 px-4 backdrop-blur-xl">
        <div className="mx-auto flex h-[50px] max-w-[430px] items-center justify-center">
          <h1 className="text-[18px] font-black tracking-[-0.02em]">Menyu</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[430px] px-4 pb-6 pt-4">
        <label className="flex h-[48px] w-full items-center gap-3 rounded-[16px] bg-[#f0f0f3] px-4 text-[#9a9aa3] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <Search size={20} strokeWidth={2.2} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Taom qidirish..."
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#202020] outline-none placeholder:text-[#9a9aa3]"
            autoComplete="off"
          />
        </label>

        <div className="scrollbar-hide -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2">
          <button
            type="button"
            onClick={() => setActiveCategoryId('all')}
            className={`flex h-[40px] shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-black shadow-sm transition active:scale-95 ${
              activeCategoryId === 'all'
                ? 'bg-[#202124] text-white'
                : 'border border-slate-200 bg-white text-slate-500'
            }`}
          >
            <Utensils size={17} />
            Hammasi
          </button>
          {sortedCategories.map((category) => {
            const isActive = activeCategoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={`h-[40px] shrink-0 rounded-full px-4 text-[15px] font-black shadow-sm transition active:scale-95 ${
                  isActive
                    ? 'bg-[#202124] text-white'
                    : `border border-slate-200 bg-gradient-to-br ${getCategoryTone(category)}`
                }`}
              >
                {formatText(getCustomerCategoryLabel(category.name))}
              </button>
            );
          })}
        </div>

        {filteredProducts.length ? (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 max-[340px]:gap-x-3">
            {filteredProducts.map((product) => (
              <MenuProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[18px] bg-white px-5 py-10 text-center shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <p className="text-[17px] font-black text-slate-900">Taom topilmadi</p>
            <p className="mt-2 text-[13px] font-medium leading-5 text-slate-500">
              Boshqa kategoriya tanlang yoki qidiruvdan foydalaning.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;
