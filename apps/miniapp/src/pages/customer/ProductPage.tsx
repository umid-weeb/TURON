import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react';
import { ProductAvailabilityEnum } from '@turon/shared';
import { EmptyState } from '../../components/customer/CustomerComponents';
import { useProductById, useProducts } from '../../hooks/queries/useMenu';
import { useCartStore } from '../../store/useCartStore';
import { getProductImageUrl, getProductPosterUrl } from '../../features/menu/placeholders';
import { getProductPromotion, getProductSecondaryText } from '../../features/menu/customerCatalog';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { useFavoritesStore } from '../../store/useFavoritesStore';

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProductById(id || '');
  const { addToCart, items } = useCartStore();
  const { formatText } = useCustomerLanguage();
  const { favoriteProductIds, toggleProductFavorite } = useFavoritesStore();
  const { data: allProducts = [] } = useProducts();

  const existingItem = items.find((item) => item.id === id);
  const [quantity, setQuantity] = useState(existingItem?.quantity || 1);
  const [scrolled, setScrolled] = useState(false);
  const posterSrc = useMemo(() => (product ? getProductPosterUrl(product) : ''), [product]);
  const [imageSrc, setImageSrc] = useState('');

  const similarProducts = useMemo(() => {
    if (!product || allProducts.length === 0) return [];
    return allProducts
      .filter((p) => p.categoryId === product.categoryId && p.id !== product.id && p.isActive)
      .slice(0, 10);
  }, [product, allProducts]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!product) {
      setImageSrc('');
      return;
    }

    setImageSrc(
      getProductImageUrl({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
      }),
    );
  }, [product]);

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-4 animate-pulse">
        <div className="h-[280px] rounded-[12px] bg-white/[0.05]" />
        <div className="h-24 rounded-[12px] bg-white/[0.05]" />
        <div className="h-36 rounded-[12px] bg-white/[0.05]" />
      </div>
    );
  }

  if (isError || !product) {
    return <EmptyState message="Taom topilmadi" subMessage="Mahsulotni qayta ochib ko'ring." />;
  }

  const isAvailable = product.isActive && product.availability === ProductAvailabilityEnum.AVAILABLE;
  const isTemporarilyUnavailable = product.availability === ProductAvailabilityEnum.TEMPORARILY_UNAVAILABLE;
  const promotion = getProductPromotion(product);
  const isFavorite = favoriteProductIds.includes(product.id);

  const handleAddToCart = () => {
    if (!isAvailable) {
      return;
    }

    addToCart(
      {
        id: product.id,
        menuItemId: product.id,
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        price: product.price,
        image: imageSrc || product.imageUrl,
        isAvailable: true,
      },
      quantity,
    );

    navigate('/customer/cart');
  };

  return (
    <div className="relative min-h-screen bg-[#f6f6f7] text-[#202020] animate-in fade-in duration-300">
      {/* ── Background Arc ─────────────────────────────── */}
      <div
        className="absolute inset-x-0 top-0 z-0 bg-[#C62020] animate-in slide-in-from-top-full duration-700 ease-out"
        style={{
          height: 380,
          borderBottomLeftRadius: '100% 40%',
          borderBottomRightRadius: '100% 40%',
          boxShadow: '0 8px 30px rgba(198, 32, 32, 0.4)',
        }}
      />

      {/* ── Header Nav (Sticky) ────────────────────────── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled ? 'bg-[#C62020] shadow-md' : 'bg-transparent'
        }`}
      >
        <div
          className="mx-auto flex w-full max-w-[430px] items-center justify-between px-4 pb-2"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition active:scale-90"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          
          <div className="flex-1 text-center font-black text-white opacity-0 transition-opacity duration-300" style={{ opacity: scrolled ? 1 : 0 }}>
            {product.name}
          </div>

          <button
            type="button"
            onClick={() => toggleProductFavorite(product.id)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition active:scale-90"
          >
            <Heart size={20} strokeWidth={2.5} className={isFavorite ? 'fill-current text-white' : ''} />
          </button>
        </div>
      </header>

      {/* ── Floating Image container ───────────────────── */}
      <div className="relative z-10 mx-auto mt-[calc(env(safe-area-inset-top,0px)+60px)] flex w-full max-w-[340px] items-center justify-center px-6 animate-in slide-in-from-top-12 duration-700 ease-out fill-mode-both" style={{ height: 260 }}>
        <img
          src={imageSrc}
          alt={formatText(product.name)}
          className="max-h-full max-w-full object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.45)]"
          onError={() => {
            if (imageSrc !== posterSrc) {
              setImageSrc(posterSrc);
            }
          }}
        />
        {/* Badges / Promotion floaters over image optionally */}
        <div className="absolute right-4 top-0 flex flex-col gap-2">
          {promotion.kind === 'discount' && promotion.discountPercent ? (
            <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.05em] text-[#C62020] shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
              -{promotion.discountPercent}%
            </span>
          ) : promotion.badgeLabel ? (
            <span className="rounded-full bg-[#111827] px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.05em] text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
              {promotion.badgeLabel}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Main content card ──────────────────────────── */}
      <main className="relative z-10 mx-auto mt-8 max-w-[430px]">
        {/* We use a white background for info, mimicking the attached modern references */}
        <div className="rounded-t-[36px] bg-white px-6 pb-[calc(110px+env(safe-area-inset-bottom,0px))] pt-8 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] min-h-[50vh]">
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.04em] text-[#202020]">
            {formatText(product.name)}
          </h1>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-[22px] font-black tracking-[-0.03em] text-[#C62020]">
              {product.price.toLocaleString()} so'm
            </p>
            {promotion.oldPrice ? (
              <p className="pb-[3px] text-[14px] font-semibold text-[#9a9aa3] line-through">
                {promotion.oldPrice.toLocaleString()}
              </p>
            ) : null}
          </div>

          <div className="mt-6 border-b border-dashed border-slate-200 pb-6">
            <p className="text-[14px] font-black uppercase tracking-[0.1em] text-[#8c8c96]">
              Tarkibi / Ma'lumot
            </p>
            <p className="mt-2 text-[15px] font-medium leading-[1.65] text-[#202020]">
              {formatText(product.description) || getProductSecondaryText(product)}
            </p>
            {product.weight ? (
              <span className="mt-4 inline-flex items-center rounded-full bg-[#f4f4f5] px-3 py-1.5 text-[12px] font-black uppercase tracking-wider text-[#9a9aa3]">
                Vazni: {formatText(product.weight)}
              </span>
            ) : null}
          </div>

          <div className="mt-5 border-b border-dashed border-slate-200 pb-5">

          {/* ── Similar Products Section ────────────────────── */}
          {similarProducts.length > 0 && (
            <div className="mt-10 overflow-hidden">
              <p className="text-[18px] font-black tracking-[-0.03em] text-[#202020]">
                Shunga o'xshash taomlar
              </p>
              <div
                className="scrollbar-hide mt-4 flex gap-3 overflow-x-auto pb-4"
                style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
              >
                {similarProducts.map((simProd) => {
                  const simImg = getProductImageUrl({
                    id: simProd.id, name: simProd.name, imageUrl: simProd.imageUrl, categoryId: simProd.categoryId
                  }, simProd.categoryId);
                  
                  return (
                    <div
                      key={simProd.id}
                      onClick={() => navigate(`/customer/product/${simProd.id}`)}
                      role="button"
                      tabIndex={0}
                      className="w-[140px] shrink-0 scroll-snap-align-start rounded-[18px] bg-[#f8f8f9] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.04)] ring-1 ring-black/5"
                    >
                      <div className="h-[90px] w-full overflow-hidden rounded-[12px] bg-white">
                        <img src={simImg} alt={formatText(simProd.name)} className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-3 line-clamp-1 text-[13px] font-black tracking-[-0.02em] text-[#202020]">
                        {formatText(simProd.name)}
                      </p>
                      <p className="mt-1 text-[13px] font-black text-[#C62020] tracking-tight">
                        {simProd.price.toLocaleString()} s.
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </div>
      </main>

      {/* ── Sticky Checkout Action ─────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white/96 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-12px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex h-[84px] w-full max-w-[430px] items-center justify-between gap-4 px-5">
          {/* Quantity Controls */}
          <div className="flex h-[52px] w-[130px] shrink-0 items-center justify-between rounded-full bg-[#f4f4f5] px-[6px] shadow-inner">
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={!isAvailable}
              className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white text-[#202020] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition active:scale-90"
            >
              <span className="text-[22px] font-black leading-none mb-1">-</span>
            </button>
            <span className="text-[18px] font-black text-[#202020]">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((current) => current + 1)}
              disabled={!isAvailable}
              className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#C62020] text-white shadow-[0_2px_8px_rgba(198,32,32,0.3)] transition active:scale-90 cursor-pointer"
            >
              <span className="text-[22px] font-black leading-none mb-1">+</span>
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isAvailable}
            className={`flex flex-1 h-[52px] items-center justify-center gap-2 rounded-full font-black text-[15px] transition-transform active:scale-[0.96] ${
              isAvailable
                ? 'bg-[#C62020] text-white shadow-[0_8px_20px_rgba(198,32,32,0.25)]'
                : 'bg-[#e5e7eb] text-[#8c8c96] shadow-none'
            }`}
          >
            {isAvailable ? (
              <>
                Savatga • {(product.price * quantity).toLocaleString()}
              </>
            ) : (
              'Tugagan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
