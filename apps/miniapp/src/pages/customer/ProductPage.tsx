import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingBag, Star } from 'lucide-react';
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
    <div className="relative min-h-screen bg-white text-[#202020] animate-in fade-in duration-300 overflow-x-hidden">
      {/* ── Product Header Image ── */}
      <div className="relative w-full overflow-hidden bg-[#f4f4f5]" style={{ height: '42vh', minHeight: 320 }}>
        <img
          src={imageSrc}
          alt={formatText(product.name)}
          className="h-full w-full object-cover animate-in fade-in duration-700"
          onError={() => {
            if (imageSrc !== posterSrc) setImageSrc(posterSrc);
          }}
        />
        {/* Subtle top gradient for icons */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

        {/* Top Controls */}
        <div 
          className="absolute inset-x-0 top-0 flex items-center justify-between px-5"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition active:scale-90 text-[#202020]"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => toggleProductFavorite(product.id)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition active:scale-90 text-[#202020]"
          >
            <Heart size={20} strokeWidth={2.5} className={isFavorite ? 'fill-[#C62020] text-[#C62020]' : ''} />
          </button>
        </div>
      </div>

      {/* ── Main Content Card ── */}
      <main className="relative z-10 mx-auto -mt-8 max-w-[430px] min-h-[60vh] rounded-t-[32px] bg-white px-6 pb-[120px] pt-8 shadow-[0_-8px_20px_rgba(0,0,0,0.04)]">
        {/* Title and Rating */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-[24px] font-black leading-tight tracking-tight text-[#202020]">
              {formatText(product.name)}
            </h1>
            {product.weight ? (
              <p className="mt-1 text-[13px] font-medium text-gray-500">
                {formatText(product.weight)}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 shrink-0 h-[32px]">
            <Star size={14} className="fill-[#C62020] text-[#C62020]" />
            <span className="text-[13px] font-bold text-[#202020]">4.9</span>
            <span className="text-[11px] font-medium text-gray-500">(1.2k)</span>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8">
          <h3 className="text-[16px] font-black tracking-tight text-[#202020]">
            Tarkibi
          </h3>
          <p className="mt-3 text-[14px] leading-[1.65] text-gray-500">
            {formatText(product.description) || getProductSecondaryText(product)}
          </p>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mt-10 border-t border-dashed border-gray-200 pt-8 mt-12">
            <h3 className="text-[16px] font-black tracking-tight text-[#202020]">
              Shunga o'xshash taomlar
            </h3>
            <div className="scrollbar-hide mt-4 flex gap-4 overflow-x-auto pb-4 px-1" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
              {similarProducts.map((simProd) => {
                const simImg = getProductImageUrl({
                  id: simProd.id, name: simProd.name, imageUrl: simProd.imageUrl, categoryId: simProd.categoryId
                }, simProd.categoryId);
                
                return (
                  <div
                    key={simProd.id}
                    onClick={() => navigate(`/customer/product/${simProd.id}`)}
                    className="w-[124px] shrink-0 active:scale-95 transition-transform"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="h-[124px] w-full overflow-hidden rounded-[20px] bg-[#f8f8f9] shadow-sm">
                      <img src={simImg} alt={formatText(simProd.name)} className="h-full w-full object-cover" />
                    </div>
                    <p className="mt-3 line-clamp-1 text-[14px] font-bold tracking-tight text-[#202020]">
                      {formatText(simProd.name)}
                    </p>
                    <p className="mt-1 text-[14px] font-black text-[#C62020]">
                      {simProd.price.toLocaleString()} s.
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Sticky Bottom Checkout ── */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex h-[90px] w-full max-w-[430px] items-center justify-between px-6 gap-5">
          {/* Quantity Controls */}
          <div className="flex flex-col gap-1.5 w-[105px] shrink-0">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-1">Miqdor</p>
            <div className="flex h-11 w-full items-center justify-between rounded-full bg-[#f4f4f5] px-[4px] shadow-inner">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                disabled={!isAvailable}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#202020] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition active:scale-90 disabled:opacity-50"
              >
                <span className="text-[20px] font-black leading-none mb-[2px]">-</span>
              </button>
              <span className="text-[16px] font-black text-[#202020]">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((current) => current + 1)}
                disabled={!isAvailable}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C62020] text-white shadow-[0_2px_8px_rgba(198,32,32,0.3)] transition active:scale-90 disabled:opacity-50 cursor-pointer"
              >
                <span className="text-[20px] font-black leading-none mb-[2px]">+</span>
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <div className="flex flex-col flex-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-auto pr-2">Umumiy narx</p>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!isAvailable}
              className={`mt-1 flex h-[44px] w-full items-center justify-center gap-2 rounded-full font-black text-[15px] transition-transform active:scale-[0.97] ${
                isAvailable
                  ? 'bg-[#C62020] text-white shadow-[0_8px_20px_rgba(198,32,32,0.25)]'
                  : 'bg-[#e5e7eb] text-[#8c8c96] shadow-none'
              }`}
            >
              {isAvailable ? (
                <>
                  <ShoppingBag size={18} strokeWidth={2.5} />
                  Savatga 
                  <span className="opacity-80 font-bold ml-1">
                    {(product.price * quantity).toLocaleString()}
                  </span>
                </>
              ) : (
                'Tugagan'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
