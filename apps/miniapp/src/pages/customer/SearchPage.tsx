import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
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

const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[\u00B4`']/g, '')
    .replace(/\s+/g, ' ');

const productIsAvailable = (product: MenuProduct) =>
  product.isActive && product.availability === ProductAvailabilityEnum.AVAILABLE;

/* ── Product card ─────────────────────────────────────────────────────────── */
const SearchProductCard: React.FC<{ product: MenuProduct }> = ({ product }) => {
  const navigate = useNavigate();
  const { formatText } = useCustomerLanguage();
  const addToCart = useCartStore((state) => state.addToCart);
  const posterSrc = React.useMemo(() => getProductPosterUrl(product), [product]);
  const [imageSrc, setImageSrc] = React.useState(() =>
    getProductImageUrl(
      { id: product.id, name: product.name, imageUrl: product.imageUrl, categoryId: product.categoryId },
      product.categoryId,
    ),
  );
  const promotion = React.useMemo(() => getProductPromotion(product), [product]);
  const available = productIsAvailable(product);

  React.useEffect(() => {
    setImageSrc(
      getProductImageUrl(
        { id: product.id, name: product.name, imageUrl: product.imageUrl, categoryId: product.categoryId },
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
      image: getCartItemImageUrl({ id: product.id, name: product.name, image: imageSrc }),
      isAvailable: true,
    });
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/customer/product/${product.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/customer/product/${product.id}`); }
      }}
      style={{
        borderRadius: 18,
        background: 'var(--app-card)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
        overflow: 'hidden',
        cursor: 'pointer',
        opacity: available ? 1 : 0.6,
        filter: available ? 'none' : 'grayscale(1)',
        transition: 'transform 0.15s',
      }}
    >
      <div style={{ position: 'relative', height: 140, background: '#f1f1f1' }}>
        <img
          src={imageSrc}
          alt={formatText(product.name)}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => { if (imageSrc !== posterSrc) setImageSrc(posterSrc); }}
        />
        {promotion.badgeLabel ? (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            background: promotion.kind === 'discount' ? '#10b981' : '#0ea5e9',
            color: 'white', borderRadius: 999, padding: '3px 10px',
            fontSize: 10, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {promotion.badgeLabel}
          </span>
        ) : null}
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h3 style={{ fontSize: 15, fontWeight: 900, color: 'var(--app-text)', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {formatText(product.name)}
        </h3>
        <p style={{ fontSize: 12, color: 'var(--app-muted)', margin: 0, fontWeight: 500 }}>
          {formatText(getProductSecondaryText(product) || product.description || 'Mazali taom')}
        </p>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--app-text)', margin: 0 }}>
              {product.price.toLocaleString()} so'm
            </p>
            {promotion.oldPrice ? (
              <p style={{ fontSize: 11, color: 'var(--app-muted)', textDecoration: 'line-through', margin: 0 }}>
                {promotion.oldPrice.toLocaleString()} so'm
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!available}
            style={{
              width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: available ? 'pointer' : 'not-allowed',
              background: available ? '#202124' : '#e5e7eb', color: available ? 'white' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)', flexShrink: 0,
            }}
            aria-label="Savatga qo'shish"
          >
            <Plus size={20} strokeWidth={2.7} />
          </button>
        </div>
      </div>
    </article>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */
const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const { data: products = [], isLoading } = useProducts();

  const normalizedQuery = normalize(query);

  const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products]);

  // Fuzzy subsequence matching — same algo as HomePage
  const filtered = useMemo(() => {
    if (!normalizedQuery) return activeProducts.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const nq = normalizedQuery;
    return activeProducts
      .filter((product) => {
        const hay = normalize(`${product.name} ${product.description ?? ''} ${product.weight ?? ''} ${product.weightText ?? ''}`);
        // exact substring
        if (hay.includes(nq)) return true;
        // subsequence
        let pi = 0;
        for (let i = 0; i < hay.length && pi < nq.length; i++) {
          if (hay[i] === nq[pi]) pi++;
        }
        return pi === nq.length;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [activeProducts, normalizedQuery]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', color: 'var(--app-text)' }}>

      {/* ── Sticky search bar ────── */}
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
          height: 46, background: 'var(--app-input-bg, #F0F0F3)',
          borderRadius: 14, padding: '0 14px', cursor: 'text',
        }}>
          <Search size={19} strokeWidth={2.2} style={{ color: 'var(--app-muted)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mahsulot nomini yozing..."
            style={{
              flex: 1, minWidth: 0, height: '100%',
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: 15, fontWeight: 600, color: 'var(--app-text)',
            }}
            autoComplete="off"
            autoFocus
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-muted)', padding: 0, display: 'flex' }}>
              ✕
            </button>
          ) : null}
        </label>
      </div>

      <main style={{ padding: '16px 16px 100px' }}>
        {/* Result count hint */}
        {query ? (
          <p style={{ fontSize: 13, color: 'var(--app-muted)', fontWeight: 600, marginBottom: 12 }}>
            "{query}" uchun {filtered.length} ta natija
          </p>
        ) : null}

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 240, borderRadius: 18, background: 'var(--app-card)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {filtered.map((product) => (
              <SearchProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 40, textAlign: 'center', padding: '40px 20px', borderRadius: 18, background: 'var(--app-card)' }}>
            <Search size={40} style={{ margin: '0 auto 12px', color: 'var(--app-muted)' }} />
            <p style={{ fontSize: 17, fontWeight: 900, color: 'var(--app-text)', margin: 0 }}>Hech narsa topilmadi</p>
            <p style={{ fontSize: 13, color: 'var(--app-muted)', marginTop: 8, lineHeight: 1.5 }}>
              Boshqacha yozib ko'ring yoki asosiy menyudan tanlang.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
