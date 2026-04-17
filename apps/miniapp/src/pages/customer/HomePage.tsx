import React from 'react';
import { Plus, Utensils } from 'lucide-react';
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
import type { MenuProduct } from '../../features/menu/types';
import { useCategories, useProducts } from '../../hooks/queries/useMenu';
import { useCartStore } from '../../store/useCartStore';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[\u00B4`']/g, '')
    .replace(/o[''\u2018\u2019\u02BC]/gi, 'o')
    .replace(/g[''\u2018\u2019\u02BC]/gi, 'g')
    .replace(/\s+/g, ' ');

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
  const hay = normalize(`${product.name} ${product.description ?? ''} ${product.weight ?? ''} ${product.weightText ?? ''}`);
  if (hay.includes(query)) return true;
  if (query.length >= 2 && isFuzzyMatch(hay, query)) return true;
  return false;
};

const productIsAvailable = (p: MenuProduct) =>
  p.isActive && p.availability === ProductAvailabilityEnum.AVAILABLE;

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/* ── Banner card (horizontal scroll item) ────────────────────────────────── */
const BannerCard: React.FC<{ product: MenuProduct; badge?: React.ReactNode }> = ({ product, badge }) => {
  const navigate = useNavigate();
  const { formatText } = useCustomerLanguage();
  const posterSrc = React.useMemo(() => getProductPosterUrl(product), [product]);
  const [imgSrc, setImgSrc] = React.useState(() =>
    getProductImageUrl({ id: product.id, name: product.name, imageUrl: product.imageUrl, categoryId: product.categoryId }, product.categoryId)
  );
  const promotion = React.useMemo(() => getProductPromotion(product), [product]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/customer/product/${product.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/customer/product/${product.id}`); }}
      style={{
        width: 220,
        height: 150,
        borderRadius: 18,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        userSelect: 'none',
      }}
    >
      {/* Background image */}
      <img
        src={imgSrc}
        alt={formatText(product.name)}
        onError={() => { if (imgSrc !== posterSrc) setImgSrc(posterSrc); }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
      />
      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)',
      }} />

      {/* Top badge */}
      {badge && (
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          {badge}
        </div>
      )}

      {/* Bottom text */}
      <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
        <p style={{ color: 'white', fontSize: 13, fontWeight: 900, margin: 0, letterSpacing: '-0.02em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {formatText(product.name)}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ color: 'white', fontSize: 14, fontWeight: 900 }}>
            {product.price.toLocaleString()} so'm
          </span>
          {promotion.oldPrice ? (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textDecoration: 'line-through' }}>
              {promotion.oldPrice.toLocaleString()}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* ── Horizontal banner section ───────────────────────────────────────────── */
const BannerSection: React.FC<{
  title: string;
  emoji: string;
  badgeColor: string;
  badgeText: (p: MenuProduct) => string;
  items: MenuProduct[];
}> = ({ title, emoji, badgeColor, badgeText, items }) => {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--app-text)',
        margin: '0 0 12px 16px', letterSpacing: '-0.02em' }}>
        {emoji} {title}
      </p>
      <div
        className="scrollbar-hide"
        style={{
          display: 'flex', gap: 12, overflowX: 'auto',
          paddingInline: 16, paddingBottom: 4,
        }}
      >
        {items.map((product) => (
          <BannerCard
            key={product.id}
            product={product}
            badge={
              <span style={{
                background: badgeColor, color: 'white', borderRadius: 999,
                padding: '4px 10px', fontSize: 11, fontWeight: 900,
                letterSpacing: '0.04em', boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}>
                {badgeText(product)}
              </span>
            }
          />
        ))}
      </div>
    </div>
  );
};

/* ── Main product card (grid) ────────────────────────────────────────────── */
const MenuProductCard: React.FC<{ product: MenuProduct }> = ({ product }) => {
  const navigate = useNavigate();
  const { formatText } = useCustomerLanguage();
  const addToCart = useCartStore((s) => s.addToCart);
  const posterSrc = React.useMemo(() => getProductPosterUrl(product), [product]);
  const [imageSrc, setImageSrc] = React.useState(() =>
    getProductImageUrl({ id: product.id, name: product.name, imageUrl: product.imageUrl, categoryId: product.categoryId }, product.categoryId)
  );
  const promotion = React.useMemo(() => getProductPromotion(product), [product]);
  const available = productIsAvailable(product);

  React.useEffect(() => {
    setImageSrc(getProductImageUrl(
      { id: product.id, name: product.name, imageUrl: product.imageUrl, categoryId: product.categoryId },
      product.categoryId,
    ));
  }, [product]);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!available) return;
    addToCart({
      id: product.id, menuItemId: product.id, categoryId: product.categoryId,
      name: product.name, description: product.description, price: product.price,
      image: imageSrc, isAvailable: true,
    });
  };

  return (
    <article
      role="button" tabIndex={0}
      onClick={() => navigate(`/customer/product/${product.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/customer/product/${product.id}`); }}}
      className={`group relative overflow-hidden rounded-[18px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.035] transition duration-200 active:scale-[0.985] ${available ? '' : 'opacity-60 grayscale'}`}
      style={{ minHeight: 266 }}
    >
      <div className="relative overflow-hidden bg-slate-100" style={{ height: 142 }}>
        <img
          src={imageSrc} alt={formatText(product.name)} loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-active:scale-[1.03]"
          onError={() => { if (imageSrc !== posterSrc) setImageSrc(posterSrc); }}
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

      <div className="flex flex-col px-3.5 pb-3.5 pt-3" style={{ minHeight: 124 }}>
        <h3 className="line-clamp-1 text-[17px] font-black leading-tight tracking-[-0.03em] text-[#202020]">
          {formatText(product.name)}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[12.5px] font-medium leading-[17px] text-[#8c8c96]" style={{ minHeight: 34 }}>
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
            type="button" onClick={handleAdd} disabled={!available}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-[0_12px_20px_rgba(15,23,42,0.22)] transition active:scale-90 ${available ? 'bg-[#202124] text-white' : 'bg-slate-200 text-slate-400'}`}
            aria-label="Savatga qo'shish"
          >
            <Plus size={22} strokeWidth={2.7} />
          </button>
        </div>
      </div>
    </article>
  );
};

/* ── HomePage ─────────────────────────────────────────────────────────────── */
const HomePage: React.FC = () => {
  const { formatText } = useCustomerLanguage();
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
  const { data: products = [], isLoading: isProductsLoading } = useProducts();
  const [activeCategoryId, setActiveCategoryId] = React.useState('all');

  const sortedCategories = React.useMemo(() => sortCustomerCategories(categories), [categories]);
  const activeProducts = React.useMemo(() => products.filter((p) => p.isActive), [products]);

  // --- Banner data ---
  const discountedProducts = React.useMemo(() => {
    const list = activeProducts.filter((p) => p.isDiscounted || (p.oldPrice && p.oldPrice > p.price));
    // Fallback: if none discounted, return top-6 sorted by price desc (most popular)
    return list.length > 0 ? list.slice(0, 10) : activeProducts.slice(0, 6);
  }, [activeProducts]);

  const newProducts = React.useMemo(() => {
    // Priority 1: created today
    const todayList = activeProducts.filter((p) => isToday(p.createdAt));
    if (todayList.length >= 2) return todayList.slice(0, 10);
    // Priority 2: isNew flag
    const newList = activeProducts.filter((p) => p.isNew);
    if (newList.length >= 2) return newList.slice(0, 10);
    // Fallback: newest by createdAt
    return [...activeProducts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [activeProducts]);

  // --- Grid products ---
  const filteredProducts = React.useMemo(() => {
    return activeProducts
      .filter((p) => activeCategoryId === 'all' || p.categoryId === activeCategoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [activeCategoryId, activeProducts]);

  if (isCategoriesLoading || isProductsLoading) return <LoadingSkeleton />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', color: 'var(--app-text)' }}>

      {/* ── Chegirmali taomlar banner ───────────────────────── */}
      <BannerSection
        title="Chegirmali taomlar"
        emoji="🔥"
        badgeColor="#C62020"
        badgeText={(p) => p.discountPercent ? `-${p.discountPercent}%` : 'Chegirma'}
        items={discountedProducts}
      />

      {/* ── Yangi taomlar banner ────────────────────────────── */}
      <BannerSection
        title="Yangi taomlar"
        emoji="✨"
        badgeColor="#0ea5e9"
        badgeText={() => 'Yangi'}
        items={newProducts}
      />

      {/* ── Category filter pills ───────────────────────────── */}
      <div
        className="scrollbar-hide"
        style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          marginInline: 0, paddingInline: 16, paddingBottom: 8, marginTop: 20,
        }}
      >
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

      {/* ── Product grid ────────────────────────────────────── */}
      <main style={{ padding: '12px 16px 24px' }}>
        {filteredProducts.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {filteredProducts.map((product) => (
              <MenuProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 40, borderRadius: 18, background: 'var(--app-card)', padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 17, fontWeight: 900, color: 'var(--app-text)' }}>Taom topilmadi</p>
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--app-muted)', lineHeight: 1.5 }}>
              Boshqa kategoriya tanlang.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;
