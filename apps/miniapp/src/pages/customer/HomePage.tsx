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
    .replace(/o['\u2018\u2019\u02BC]/gi, 'o')
    .replace(/g['\u2018\u2019\u02BC]/gi, 'g')
    .replace(/\s+/g, ' ');

/** Simple subsequence fuzzy match — "gmb" matches "gamburger" */
const isFuzzyMatch = (haystack: string, query: string): boolean => {
  let hi = 0;
  for (let qi = 0; qi < query.length; qi++) {
    const found = haystack.indexOf(query[qi], hi);
    if (found === -1) return false;
    hi = found + 1;
  }
  return true;
};

const productMatchesSearch = (product: MenuProduct, query: string) => {
  if (!query) return true;
  const haystack = normalize(
    `${product.name} ${product.description ?? ''} ${product.weight ?? ''} ${product.weightText ?? ''}`
  );
  // 1. Exact substring
  if (haystack.includes(query)) return true;
  // 2. Fuzzy subsequence (works for partial / mis-ordered chars)
  if (query.length >= 2 && isFuzzyMatch(haystack, query)) return true;
  return false;
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
      className={`group relative min-h-[266px] overflow-hidden rounded-[18px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.035] transition duration-200 active:scale-[0.985] ${available ? '' : 'opacity-60 grayscale'
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
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-[0_12px_20px_rgba(15,23,42,0.22)] transition active:scale-90 ${available ? 'bg-[#202124] text-white' : 'bg-slate-200 text-slate-400'
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
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', color: 'var(--app-text)' }}>

      {/* ── Sticky search bar ─────────────────────────────────────── */}
      <div style={{
        position: 'sticky',
        top: 'calc(60px + var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)))',
        zIndex: 30,
        background: 'var(--app-card)',
        borderBottom: '1px solid var(--app-line)',
        padding: '10px 16px',
      }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          height: 46,
          background: 'var(--app-input-bg, #F0F0F3)',
          borderRadius: 14,
          padding: '0 14px',
          cursor: 'text',
        }}>
          <Search size={19} strokeWidth={2.2} style={{ color: 'var(--app-muted)', flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Taom qidirish..."
            style={{
              flex: 1, minWidth: 0, height: '100%',
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: 15, fontWeight: 600,
              color: 'var(--app-text)',
            }}
            autoComplete="off"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--app-muted)', padding: 0, display: 'flex' }}
            >✕</button>
          ) : null}
        </label>
      </div>

      <main style={{ padding: '0 16px 24px' }}>

        {/* Category filter pills */}
        <div className="scrollbar-hide" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginInline: -16, paddingInline: 16, paddingBottom: 8, marginTop: 16 }}>
          <button
            onClick={() => setActiveCategoryId('all')}
            style={{
              height: 38, flexShrink: 0, borderRadius: 999, padding: '0 16px',
              fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer',
              background: activeCategoryId === 'all' ? '#C62020' : 'var(--app-card)',
              color: activeCategoryId === 'all' ? 'white' : 'var(--app-text)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Utensils size={16} />
            Hammasi
          </button>
          {sortedCategories.map((category) => {
            const isActive = activeCategoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                style={{
                  height: 38, flexShrink: 0, borderRadius: 999, padding: '0 16px',
                  fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer',
                  background: isActive ? '#C62020' : 'var(--app-card)',
                  color: isActive ? 'white' : 'var(--app-text)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}
              >
                {formatText(getCustomerCategoryLabel(category.name))}
              </button>
            );
          })}
        </div>

        {/* Search result hint */}
        {searchQuery ? (
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--app-muted)', fontWeight: 600 }}>
            &ldquo;{searchQuery}&rdquo; uchun {filteredProducts.length} ta natija
          </p>
        ) : null}

        {filteredProducts.length ? (
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {filteredProducts.map((product) => (
              <MenuProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 40, borderRadius: 18, background: 'var(--app-card)', padding: '40px 20px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 17, fontWeight: 900, color: 'var(--app-text)' }}>Taom topilmadi</p>
            <p style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: 'var(--app-muted)', lineHeight: 1.5 }}>
              Boshqa kategoriya tanlang yoki qidiruvdan foydalaning.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;
