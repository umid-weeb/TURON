import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Search, X, Minus, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductAvailabilityEnum } from '@turon/shared';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import {
  getProductImageUrl,
  getProductPosterUrl,
} from '../../features/menu/placeholders';
import {
  getProductPromotion,
  getProductSecondaryText,
} from '../../features/menu/customerCatalog';
import type { MenuProduct } from '../../features/menu/types';
import { useProducts } from '../../hooks/queries/useMenu';
import { useCartStore } from '../../store/useCartStore';

/* ── Search history helpers ─────────────────────────────────────────────── */
const HISTORY_KEY = 'turon-search-history';
const MAX_HISTORY = 10;

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(items: string[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch { /* noop */ }
}
function addToHistory(query: string, current: string[]): string[] {
  const term = query.trim();
  if (!term) return current;
  const filtered = current.filter((h) => h.toLowerCase() !== term.toLowerCase());
  return [term, ...filtered].slice(0, MAX_HISTORY);
}

/* ── Fuzzy matching ─────────────────────────────────────────────────────── */
const normalize = (v: string) =>
  v.toLowerCase().trim().replace(/[\u00B4`']/g, '').replace(/\s+/g, ' ');

function fuzzyMatch(hay: string, needle: string): boolean {
  if (hay.includes(needle)) return true;
  let pi = 0;
  for (let i = 0; i < hay.length && pi < needle.length; i++) {
    if (hay[i] === needle[pi]) pi++;
  }
  return pi === needle.length;
}

const productIsAvailable = (p: MenuProduct) =>
  p.isActive && p.availability === ProductAvailabilityEnum.AVAILABLE;

/* ── Debounce hook ─────────────────────────────────────────────────────── */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/* ── Popular searches ─────────────────────────────────────────────────────── */
const POPULAR_SEARCHES = [
  { label: 'Burger', query: 'Burger' },
  { label: 'Lavash', query: 'Lavash' },
  { label: 'Pitsa', query: 'Pitsa' },
  { label: 'Ichimliklar', query: 'Ichimliklar' },
];

/* ── Product Card (Home sahifadagi MenuProductCard kabi) ─────────────────────────────────── */
const SearchProductCard: React.FC<{ product: MenuProduct }> = ({ product }) => {
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

/* ── Page ─────────────────────────────────────────────────────────────────── */
const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatText } = useCustomerLanguage();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>(loadHistory);
  const { data: products = [], isLoading, isFetching } = useProducts();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const hasData = products.length > 0;

  const debouncedQuery = useDebounce(query, 200);
  const normalizedQuery = useMemo(() => normalize(debouncedQuery), [debouncedQuery]);

  const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products]);

  const filtered = useMemo(() => {
    if (!normalizedQuery) return [];
    return activeProducts
      .filter((p) => {
        const hay = normalize(`${p.name} ${p.description ?? ''} ${p.weight ?? ''} ${p.weightText ?? ''}`);
        return fuzzyMatch(hay, normalizedQuery);
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [activeProducts, normalizedQuery]);

  const commitSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = addToHistory(trimmed, history);
    setHistory(updated);
    saveHistory(updated);
  }, [history]);

  const applyHistory = (term: string) => {
    setQuery(term);
    commitSearch(term);
    inputRef.current?.focus();
  };

  const removeHistory = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = history.filter((h) => h !== term);
    setHistory(updated);
    saveHistory(updated);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') commitSearch(query);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [query, commitSearch]);

  const showHistory = !query.trim() && history.length > 0;
  const showResults = !!query.trim();

  // 🚨 CRITICAL FIX: Skeleton faqatgina kesh bo'sh bo'lsa chiqadi (0ms latency).
  if (isLoading && !hasData) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#202020' }}>
        {/* Header Skeleton */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            background: `linear-gradient(135deg, #8B0000 0%, #C62020 55%, #E83535 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 'calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 12px)',
            paddingBottom: 12,
            paddingInline: 16,
            minHeight: 'calc(60px + var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)))',
            boxShadow: '0 2px 12px rgba(150,0,0,0.3)',
          }}
        >
          <div className="h-9 w-9 rounded-full bg-white/20 animate-pulse" />
          <div className="h-5 w-24 rounded-md bg-white/20 animate-pulse" />
          <div style={{ width: 36 }} />
        </div>

        {/* Search Input Skeleton */}
        <div style={{ background: '#ffffff', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div className="h-[44px] w-full rounded-xl bg-slate-100 animate-pulse" />
        </div>

        <div className="px-4 py-6">
          <div className="h-4 w-32 rounded-md bg-slate-100 animate-pulse mb-4" />
          <div className="flex gap-2 mb-8">
             <div className="h-10 w-24 rounded-xl bg-slate-100 animate-pulse" />
             <div className="h-10 w-20 rounded-xl bg-slate-100 animate-pulse" />
             <div className="h-10 w-28 rounded-xl bg-slate-100 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[266px] rounded-[18px] bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#202020' }}>
      {/* ── Header: Turon Kafe sarlavhasi va orqaga qaytish tugmasi ─────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: `linear-gradient(135deg, #8B0000 0%, #C62020 55%, #E83535 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 'calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 12px)',
          paddingBottom: 12,
          paddingInline: 16,
          minHeight: 'calc(60px + var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)))',
          boxShadow: '0 2px 12px rgba(150,0,0,0.3)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition active:scale-90"
          aria-label="Orqaga qaytish"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '0.02em',
            textShadow: '0 1px 3px rgba(0,0,0,0.2)',
            flex: 1,
            textAlign: 'center',
          }}
        >
          Qidiruv
        </h1>
        <div style={{ width: 36 }} />
      </div>

      {/* ── Search Input ─────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44, background: '#f4f4f5', borderRadius: 12, padding: '0 12px', cursor: 'text' }}>
          <Search size={18} strokeWidth={2.5} style={{ color: '#8c8c96', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => commitSearch(query)}
            placeholder="Taomlarni izlash..."
            style={{ flex: 1, minWidth: 0, height: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 15, fontWeight: 600, color: '#202020' }}
            autoComplete="off"
            autoFocus
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c8c96', padding: 0, display: 'flex' }}>
              <X size={18} strokeWidth={2.5} />
            </button>
          ) : null}
        </label>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main style={{ padding: '16px 16px 100px' }}>
        {/* Orqa fonda yangilanayotganini bildiruvchi kichik indikator */}
        {isFetching && hasData && (
          <div className="flex justify-center pb-4">
            <span className="text-[10px] font-bold text-slate-400 animate-pulse uppercase tracking-widest">
              Yangilanmoqda...
            </span>
          </div>
        )}

        {!showResults && (
          <>
            {/* ── Tarix ─────────────────────────────────────────── */}
            {showHistory && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tarix</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {history.slice(0, 5).map((term) => (
                    <button key={term} type="button" onClick={() => applyHistory(term)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: '14px 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <Clock size={16} style={{ color: '#9ca3af', flexShrink: 0 }} strokeWidth={2} />
                      <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#202020' }}>
                        {term}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => removeHistory(e, term)}
                        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4, display: 'flex' }}
                        aria-label="O'chirish"
                      >
                        <X size={16} strokeWidth={2} />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Ommabop qidiruvlar ─────────────────────────────────────────── */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ommabop qidiruvlar</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {POPULAR_SEARCHES.map((item) => (
                  <button
                    key={item.query}
                    onClick={() => applyHistory(item.query)}
                    type="button"
                    style={{
                      borderRadius: 12,
                      background: '#f3f4f6',
                      color: '#202020',
                      fontSize: 14,
                      fontWeight: 600,
                      padding: '12px 18px',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                    }}
                    onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                    onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Results Grid (2 columns) ───────────────────────────────────────── */}
        {showResults && (
          <>
            {filtered.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {filtered.map((product) => (
                  <SearchProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 60, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: 24, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c96', marginBottom: 20 }}>
                  <Search size={40} strokeWidth={1.5} />
                </div>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#202020', margin: 0, marginBottom: 8 }}>Hech narsa topilmadi</p>
                <p style={{ fontSize: 14, color: '#8c8c96', lineHeight: 1.6, maxWidth: 280 }}>
                  "{query}" ni qidiruv bo'yicha natija yo'q. Boshqa so'z yoki terminni sinab ko'ring.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
