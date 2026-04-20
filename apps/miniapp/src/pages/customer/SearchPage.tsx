import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Search, ArrowUpLeft, X, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductAvailabilityEnum } from '@turon/shared';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import {
  getCartItemImageUrl,
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

/* ── Product card ─────────────────────────────────────────────────────── */
const SearchProductCard: React.FC<{ product: MenuProduct }> = ({ product }) => {
  const navigate = useNavigate();
  const { formatText } = useCustomerLanguage();
  const { addToCart, updateQuantity, items } = useCartStore();
  const posterSrc = React.useMemo(() => getProductPosterUrl(product), [product]);
  const [imageSrc, setImageSrc] = React.useState(() =>
    getProductImageUrl(
      { id: product.id, name: product.name, imageUrl: product.imageUrl, categoryId: product.categoryId },
      product.categoryId,
    ),
  );
  const promotion = React.useMemo(() => getProductPromotion(product), [product]);
  const available = productIsAvailable(product);
  const quantityInCart = items.find((item) => item.id === product.id)?.quantity || 0;

  React.useEffect(() => {
    setImageSrc(
      getProductImageUrl(
        { id: product.id, name: product.name, imageUrl: product.imageUrl, categoryId: product.categoryId },
        product.categoryId,
      ),
    );
  }, [product]);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!available) return;
    addToCart({
      id: product.id, menuItemId: product.id, categoryId: product.categoryId,
      name: product.name, description: product.description, price: product.price,
      image: getCartItemImageUrl({ id: product.id, name: product.name, image: imageSrc }),
      isAvailable: true,
    });
  };

  return (
    <article
      role="button" tabIndex={0}
      onClick={() => navigate(`/customer/product/${product.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/customer/product/${product.id}`); } }}
      style={{
        borderRadius: 16, background: 'var(--app-card)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden',
        cursor: 'pointer', opacity: available ? 1 : 0.6,
        filter: available ? 'none' : 'grayscale(1)',
      }}
    >
      <div style={{ position: 'relative', height: 130, background: '#f1f1f1' }}>
        <img
          src={imageSrc} alt={formatText(product.name)} loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => { if (imageSrc !== posterSrc) setImageSrc(posterSrc); }}
        />
        {promotion.badgeLabel ? (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            background: promotion.kind === 'discount' ? '#10b981' : '#0ea5e9',
            color: 'white', borderRadius: 999, padding: '3px 9px',
            fontSize: 10, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{promotion.badgeLabel}</span>
        ) : null}
      </div>
      <div style={{ padding: '10px 12px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 900, color: 'var(--app-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {formatText(product.name)}
        </h3>
        <p style={{ fontSize: 11, color: 'var(--app-muted)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {formatText(getProductSecondaryText(product) || product.description || '')}
        </p>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--app-text)', margin: 0 }}>
              {product.price.toLocaleString()} so'm
            </p>
            {promotion.oldPrice ? (
              <p style={{ fontSize: 10, color: 'var(--app-muted)', textDecoration: 'line-through', margin: 0 }}>
                {promotion.oldPrice.toLocaleString()} so'm
              </p>
            ) : null}
          </div>
          {quantityInCart > 0 && available ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffffee', borderRadius: 999, padding: '4px 6px' }}>
              <button type="button" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateQuantity(product.id, -1);
              }}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F4F4F5', color: '#202020', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Minus size={16} />
              </button>
              <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 900, color: '#202020' }}>{quantityInCart}</span>
              <button type="button" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdd(e);
              }}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#C62020', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Plus size={16} strokeWidth={2.7} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={handleAdd} disabled={!available}
              style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none',
                cursor: available ? 'pointer' : 'not-allowed',
                background: available ? '#C62020' : '#e5e7eb',
                color: available ? 'white' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)', flexShrink: 0,
              }}
              aria-label="Savatga qo'shish"
            >
              <Plus size={18} strokeWidth={2.7} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

/* ── Hooks & Data ─────────────────────────────────────────────────────────── */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const POPULAR_SEARCHES = [
  { label: 'Burger', query: 'Burger' },
  { label: 'Lavash', query: 'Lavash' },
  { label: 'Pitsa', query: 'Pitsa' },
  { label: 'Ichimliklar', query: 'Ichimliklar' },
];

const SearchResultRow: React.FC<{ product: MenuProduct }> = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const imageSrc = React.useMemo(
    () => getProductImageUrl(
      { id: product.id, name: product.name, imageUrl: product.imageUrl, categoryId: product.categoryId },
      product.categoryId,
    ),
    [product],
  );

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: product.id,
      menuItemId: product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      price: product.price,
      image: getCartItemImageUrl({ id: product.id, name: product.name, image: imageSrc }),
      isAvailable: true,
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/customer/product/${product.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/customer/product/${product.id}`); } }}
      className="w-full rounded-[18px] border border-[#e5e7eb] bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
      style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
    >
      <img
        src={imageSrc}
        alt={product.name}
        className="h-12 w-12 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-medium text-[#111827]">{product.name}</div>
        <div className="mt-1 text-sm text-[#6b7280]">{product.price.toLocaleString()} so'm</div>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#34d399] text-white shadow-sm"
        style={{ flexShrink: 0 }}
        aria-label="Savatga qo'shish"
      >
        <Plus size={20} strokeWidth={3} />
      </button>
    </div>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */
const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>(loadHistory);
  const { data: products = [], isLoading } = useProducts();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);
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

  // Save to history when user stops typing (on blur or Enter)
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

  const clearHistory = () => { setHistory([]); saveHistory([]); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') commitSearch(query);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [query, commitSearch]);

  const showHistory = !query.trim() && history.length > 0;
  const showResults = !!query.trim();

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#202020' }}>
      {/* ── Search bar ─────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#ffffff', padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, height: 46, background: '#f4f4f5', borderRadius: 14, padding: '0 14px', cursor: 'text' }}>
          <Search size={19} strokeWidth={2.5} style={{ color: '#8c8c96', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => commitSearch(query)}
            placeholder="Taomlarni izlash..."
            style={{ flex: 1, minWidth: 0, height: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, color: '#202020' }}
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

      <main style={{ padding: '4px 16px 100px' }}>
        {!showResults && (
          <>
            {/* ── History ─────────────────────────────── */}
            {showHistory && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>Tarix</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <Clock size={16} style={{ color: '#9ca3af', flexShrink: 0 }} strokeWidth={2.2} />
                      <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                        {term}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => removeHistory(e, term)}
                        style={{ color: '#9ca3af', display: 'flex', padding: 4 }}
                        aria-label="O'chirish"
                      >
                        <X size={16} strokeWidth={2.2} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Popular Searches ─────────────────────────────── */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>Ommabop qidiruvlar</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {POPULAR_SEARCHES.map((item) => (
                  <button
                    key={item.query}
                    onClick={() => applyHistory(item.query)}
                    type="button"
                    style={{
                      borderRadius: 999,
                      background: '#f3f4f6',
                      color: '#111827',
                      fontSize: 14,
                      fontWeight: 600,
                      padding: '10px 16px',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Results ───────────────────────────────────────────── */}
        {showResults && (
          <>
            {isLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ height: 220, borderRadius: 16, background: '#f4f4f5' }} />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {filtered.map((product) => (
                  <SearchResultRow key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c96', marginBottom: 16 }}>
                  <Search size={32} strokeWidth={2.5} />
                </div>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#202020', margin: 0 }}>Hech narsa topilmadi</p>
                <p style={{ fontSize: 14, color: '#8c8c96', marginTop: 8, lineHeight: 1.5, maxWidth: 260 }}>
                  Boshqacha yozib ko'ring yoki boshqa nom qidiring.
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
