import React from 'react';
import { Plus, Minus, MapPin, Clock, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductAvailabilityEnum } from '@turon/shared';
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

/* ── Snap-scroll promo banner carousel ───────────────────────── */
const PromoBannerCarousel: React.FC<{ items: MenuProduct[] }> = ({ items }) => {
  const navigate = useNavigate();
  const { formatText } = useCustomerLanguage();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Duplicate items many times to ensure smooth endless forward scrolling during the session
  const displayItems = React.useMemo(() => {
    let arr: MenuProduct[] = [];
    if (items.length === 0) return arr;
    for (let i = 0; i < 20; i++) arr = [...arr, ...items];
    return arr;
  }, [items]);

  React.useEffect(() => {
    if (items.length <= 1) return;
    const el = scrollRef.current;
    if (!el) return;

    let intervalId: ReturnType<typeof setInterval>;

    const startAutoPlay = () => {
      // Clear any existing intervals to prevent duplicate triggers
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (!el) return;
        const itemWidth = el.clientWidth;
        const originalSetWidth = itemWidth * items.length;

        // Endless loop logic: jump backwards silently if scrolled too far
        if (el.scrollLeft >= originalSetWidth * 10) {
          el.style.scrollBehavior = 'auto'; // Turn off smooth scroll instantly
          el.scrollLeft -= originalSetWidth * 5; // Jump back 5 sets

          // Force a browser reflow/layout so scrollBehavior applies instantly
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions, no-void
          void el.offsetWidth;

          el.style.scrollBehavior = 'smooth'; // Turn smooth scroll back on
        }

        // Advance exactly one item
        el.scrollLeft += itemWidth;
      }, 3500);
    };

    startAutoPlay();

    // Pause auto-sliding when the user touches to avoid conflicting with active swiping
    const onTouchStart = () => clearInterval(intervalId);
    const onTouchEnd = () => startAutoPlay();

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('mousedown', onTouchStart, { passive: true });
    el.addEventListener('mouseup', onTouchEnd, { passive: true });

    return () => {
      clearInterval(intervalId);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousedown', onTouchStart);
      el.removeEventListener('mouseup', onTouchEnd);
    };
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 16, marginBottom: 8 }}>
      <p style={{
        fontSize: 17, fontWeight: 900, color: 'var(--app-text)',
        margin: '0 0 10px 16px', letterSpacing: '-0.02em',
      }}>
        Chegirmali taomlar
      </p>

      <div
        ref={scrollRef}
        className="scrollbar-hide"
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 4,
        }}
      >
        {displayItems.map((product, index) => (
          <div
            key={`${product.id}-${index}`}
            style={{
              flex: '0 0 100%',
              minWidth: '100%',
              scrollSnapAlign: 'start',
              paddingInline: 16,
              boxSizing: 'border-box'
            }}
          >
            <PromoBannerCard
              product={product}
              onClick={() => navigate(`/customer/product/${product.id}`)}
              formatText={formatText}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const PromoBannerCard: React.FC<{
  product: MenuProduct;
  onClick: () => void;
  formatText: (v: string) => string;
}> = ({ product, onClick, formatText }) => {
  const posterSrc = React.useMemo(() => getProductPosterUrl(product), [product]);
  const [imgSrc, setImgSrc] = React.useState(() =>
    getProductImageUrl(
      { id: product.id, name: product.name, imageUrl: product.imageUrl, categoryId: product.categoryId },
      product.categoryId,
    )
  );
  const promotion = React.useMemo(() => getProductPromotion(product), [product]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      style={{
        width: '100%',
        height: 160,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
        userSelect: 'none',
        background: 'linear-gradient(135deg, #222222 0%, #151515 100%)',
        transform: 'translateZ(0)', // Force hardware acceleration
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Left side text content */}
      <div style={{ flex: 1, padding: '20px 20px 20px 24px', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
        <h2 style={{
          color: '#ffffff',
          fontSize: 21,
          fontWeight: 800,
          lineHeight: 1.15,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          maxWidth: '180px'
        }}>
          {promotion.discountPercent ? `Chegirma: ${formatText(product.name)}` : formatText(product.name)}
        </h2>

        <p style={{
          color: '#a0a0a0',
          fontSize: 13,
          marginTop: 6,
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          maxWidth: '160px',
          fontWeight: 500
        }}>
          {formatText(getProductSecondaryText(product) || product.description || "Ajoyib taklif")}
        </p>

        {/* Price & Order Button Area */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{
            background: '#C2FF00', // Lime green like the reference image
            color: '#111',
            border: 'none',
            borderRadius: 20,
            padding: '7px 18px',
            fontSize: 13,
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(194, 255, 0, 0.25)',
            transform: 'translateZ(0)'
          }}>
            Savatga qo'shish
          </button>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 800, lineHeight: 1 }}>
              {product.price.toLocaleString()} s.
            </span>
            {promotion.oldPrice ? (
              <span style={{ color: '#888', fontSize: 11, textDecoration: 'line-through', fontWeight: 600, marginTop: 2 }}>
                {promotion.oldPrice.toLocaleString()} s.
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right side Image (masked as circle) */}
      <div style={{
        position: 'absolute',
        right: -25,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 175,
        height: 175,
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: '-10px 0 35px rgba(0,0,0,0.6)',
        zIndex: 5,
        backgroundColor: '#333'
      }}>
        <img
          src={imgSrc}
          alt={formatText(product.name)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => { if (imgSrc !== posterSrc) setImgSrc(posterSrc); }}
        />
      </div>

      {/* Decorative gradient behind image */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 200,
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 100%)',
        zIndex: 4,
        pointerEvents: 'none'
      }} />

      {/* Discount Badge */}
      {promotion.discountPercent && (
        <div style={{ position: 'absolute', top: 12, right: 'auto', left: 24, zIndex: 15 }}>
          <span style={{ background: '#C62020', color: '#fff', padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 900 }}>
            -{promotion.discountPercent}%
          </span>
        </div>
      )}
    </div>
  );
};

/* ── Main product card (grid) ────────────────────────────────────────────── */
const MenuProductCard: React.FC<{ product: MenuProduct }> = ({ product }) => {
  const navigate = useNavigate();
  const { formatText } = useCustomerLanguage();
  const { addToCart, updateQuantity, items } = useCartStore();
  const posterSrc = React.useMemo(() => getProductPosterUrl(product), [product]);
  const [imageSrc, setImageSrc] = React.useState(() =>
    getProductImageUrl({ id: product.id, name: product.name, imageUrl: product.imageUrl, categoryId: product.categoryId }, product.categoryId)
  );
  const promotion = React.useMemo(() => getProductPromotion(product), [product]);
  const available = productIsAvailable(product);
  const quantityInCart = items.find((item) => item.id === product.id)?.quantity || 0;

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
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/customer/product/${product.id}`); } }}
      className={`group relative flex flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.035] transition duration-200 active:scale-[0.985] ${available ? '' : 'opacity-60 grayscale'}`}
      style={{ minHeight: 266, height: '100%' }}
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

      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3" style={{ minHeight: 124 }}>
        <h3 className="line-clamp-1 text-[17px] font-black leading-tight tracking-[-0.03em] text-[#202020]">
          {formatText(product.name)}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[12.5px] font-medium leading-[17px] text-[#8c8c96]" style={{ minHeight: 34 }}>
          {formatText(getProductSecondaryText(product) || product.description || 'Mazali taom')}
        </p>
        <div className="mt-auto flex flex-col pt-3">
          <div className="mb-3 min-w-0">
            <p className="truncate text-[18px] font-black tracking-[-0.04em] text-[#202020]">
              {product.price.toLocaleString()} so'm
            </p>
            {promotion.oldPrice ? (
              <p className="mt-0.5 text-[11px] font-semibold text-slate-300 line-through">
                {promotion.oldPrice.toLocaleString()} so'm
              </p>
            ) : null}
          </div>
          {quantityInCart > 0 && available ? (
            <div className="flex w-full items-center justify-between mt-auto gap-1.5 rounded-full bg-white border border-slate-100 p-1 shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  updateQuantity(product.id, -1);
                }}
                className="flex h-9 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4F4F5] text-[#202020] transition active:scale-95 active:bg-[#C62020] active:text-white"
              >
                <Minus size={16} />
              </button>
              <span className="text-center text-[15px] font-black text-[#202020]">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAdd(e);
                }}
                className="flex h-9 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4F4F5] text-[#202020] transition active:scale-95 active:bg-[#C62020] active:text-white"
              >
                <Plus size={16} strokeWidth={2.7} />
              </button>
            </div>
          ) : (
            <button
              type="button" onClick={handleAdd} disabled={!available}
              className={`flex h-10 w-full shrink-0 items-center justify-center rounded-[14px] shadow-sm transition active:scale-95 ${available ? 'bg-[#C2FF00] text-[#111]' : 'bg-slate-200 text-slate-400'}`}
              aria-label="Savatga qo'shish"
            >
              <span className="font-bold text-[14px]">Savatga qo'shish</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

/* ── Bestsellers Carousel (Gorizontal Skroll) ───────────────────────────────────────── */
const BestsellersCarousel: React.FC<{ items: MenuProduct[] }> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 16, marginBottom: 8 }}>
      <p style={{
        fontSize: 17, fontWeight: 900, color: '#202020',
        margin: '0 0 10px 16px', letterSpacing: '-0.02em',
      }}>
        Eng ko'p sotilganlar
      </p>

      <div
        className="scrollbar-hide"
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 8,
          gap: 12,
          paddingInline: 16,
        }}
      >
        {items.map((product) => (
          <div
            key={`bestseller-${product.id}`}
            style={{
              flex: '0 0 calc(60% - 12px)',
              minWidth: 'calc(60% - 12px)',
              scrollSnapAlign: 'start',
            }}
          >
            <MenuProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── HomePage ─────────────────────────────────────────────────────────────── */
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { formatText } = useCustomerLanguage();
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
  const { data: products = [], isLoading: isProductsLoading } = useProducts();
  const [activeCategoryId, setActiveCategoryId] = React.useState('all');

  const sortedCategories = React.useMemo(() => sortCustomerCategories(categories), [categories]);
  const activeProducts = React.useMemo(() => products.filter((p) => p.isActive), [products]);

  // --- Banner data ---
  const discountedProducts = React.useMemo(() => {
    const list = activeProducts.filter((p) => p.isDiscounted || (p.oldPrice && p.oldPrice > p.price));
    return list.length > 0 ? list.slice(0, 10) : activeProducts.slice(0, 6);
  }, [activeProducts]);

  // --- Grid products ---
  const filteredProducts = React.useMemo(() => {
    return activeProducts
      .filter((p) => activeCategoryId === 'all' || p.categoryId === activeCategoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [activeCategoryId, activeProducts]);

  // --- Bestsellers Data ---
  const bestsellers = React.useMemo(() => {
    // Top 6 products as bestsellers
    return activeProducts.slice(0, 6);
  }, [activeProducts]);

  // 🚨 CRITICAL FIX: Asosiy sahifa uchun aynan Home-layout ga mos Skeleton yasaymiz.
  // Va faqatgina kesh umuman bo'sh bo'lsagina ko'rsatamiz.
  const isLoading = isCategoriesLoading || isProductsLoading;
  const hasData = categories.length > 0 && products.length > 0;

  if (isLoading && !hasData) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#202020' }}>
        {/* Skeleton Header */}
        <div className="flex min-h-[70px] items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),48px)]">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-4 w-32 rounded-md bg-slate-100 animate-pulse" />
          </div>
          <div className="h-7 w-16 rounded-full bg-slate-100 animate-pulse" />
        </div>
        {/* Skeleton Search */}
        <div className="px-4 pb-2">
          <div className="h-[46px] rounded-xl bg-slate-100 animate-pulse" />
        </div>
        {/* Skeleton Categories */}
        <div className="flex gap-2 px-4 py-3 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[38px] w-20 shrink-0 rounded-full bg-slate-100 animate-pulse" />
          ))}
        </div>
        {/* Skeleton Promo Banner */}
        <div className="px-4 mt-2 mb-4">
          <div className="h-5 w-40 rounded-md bg-slate-100 animate-pulse mb-3" />
          <div className="h-[160px] w-full rounded-[24px] bg-slate-100 animate-pulse" />
        </div>
        {/* Skeleton Products Grid */}
        <div className="px-4 mt-6">
          <div className="h-5 w-40 rounded-md bg-slate-100 animate-pulse mb-3" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-[142px] rounded-[18px] bg-slate-100 animate-pulse" />
                <div className="mt-1 h-4 w-3/4 rounded-md bg-slate-100 animate-pulse" />
                <div className="h-3 w-1/2 rounded-md bg-slate-100 animate-pulse" />
                <div className="mt-2 h-8 w-full rounded-[14px] bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#202020' }}>
      {/* ── Custom Flat Header ────────────────────────────────────── */}
      <div className="flex min-h-[70px] items-center justify-between bg-white px-4 pb-3 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f4f5] text-[#C62020]">
            <MapPin size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#202020] leading-tight">Chilonzor tumani, 19-kv...</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[#f4f4f5] px-3 py-1.5 text-[#202020]">
          <Clock size={14} className="text-[#C62020]" />
          <span className="text-[12px] font-black">30-45 daq</span>
        </div>
      </div>

      {/* ── Search Bar ───────────────────────────────────────────── */}
      <div className="px-4 pb-2">
        <div 
          onClick={() => navigate('/customer/search')}
          className="flex h-[46px] items-center gap-2 rounded-xl bg-[#f4f4f5] px-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
        >
          <Search size={19} className="text-[#8c8c96]" strokeWidth={2.5} />
          <span className="text-[15px] font-bold text-[#8c8c96]">Taomlarni izlash...</span>
        </div>
      </div>

      {/* ── Category filter pills (top) ─────────────────────── */}
      <div
        className="scrollbar-hide"
        style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          paddingInline: 16, paddingBottom: 8, paddingTop: 14,
        }}
      >
        <button
          onClick={() => setActiveCategoryId('all')}
          style={{
            height: 38, flexShrink: 0, borderRadius: 999, padding: '0 18px',
            fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer',
            background: activeCategoryId === 'all' ? '#C62020' : 'var(--app-card)',
            color: activeCategoryId === 'all' ? 'white' : 'var(--app-text)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
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

      {/* ── Chegirmali taomlar snap-scroll carousel ──────────────── */}
      <PromoBannerCarousel items={discountedProducts} />

      {/* ── Eng ko'p sotilganlar (Bestsellers) ────────────────── */}
      <BestsellersCarousel items={bestsellers} />

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
