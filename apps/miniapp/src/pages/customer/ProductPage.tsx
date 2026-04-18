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
    <div className="relative min-h-screen bg-white text-[#202020] animate-in fade-in duration-300 pb-[100px]">
      
      {/* ── Product Header Image ── */}
      <div className="relative w-full overflow-hidden bg-gray-100 aspect-square max-h-[420px]">
        <img
          src={imageSrc}
          alt={formatText(product.name)}
          className="h-full w-full object-cover"
          onError={() => {
            if (imageSrc !== posterSrc) setImageSrc(posterSrc);
          }}
        />
        {/* Subtle top gradient for icons */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

        {/* Top Controls */}
        <div 
          className="absolute inset-x-0 top-0 flex items-center justify-between px-5"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-sm transition active:scale-90 text-white"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => toggleProductFavorite(product.id)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-sm transition active:scale-90 text-white"
          >
            <Heart size={20} strokeWidth={2.5} className={isFavorite ? 'fill-[#C62020] text-[#C62020]' : ''} />
          </button>
        </div>

        {/* Badges on Top Left (under Back button) */}
        <div className="absolute left-5 flex flex-col gap-2 items-start pointer-events-none" 
             style={{ top: 'calc(env(safe-area-inset-top, 0px) + 72px)', zIndex: 10 }}>
           {promotion?.kind === 'new' && (
              <span className="rounded-[8px] bg-sky-500 px-3 py-1 text-[13px] font-black uppercase tracking-wider text-white shadow-md">
                Yangi
              </span>
           )}
           {promotion?.discountPercent && (
              <span className="rounded-[8px] bg-[#C62020] px-3 py-1 text-[14px] font-black tracking-wider text-white shadow-md">
                -{promotion.discountPercent}%
              </span>
           )}
        </div>
      </div>

      {/* ── Main Content (Pure Flow, No Container overlapping) ── */}
      <main className="px-5 pt-6 pb-6">
        
        {/* Title and Price Row */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[26px] font-black leading-tight tracking-tight text-[#202020] flex-1">
            {formatText(product.name)}
          </h1>
          <div className="flex flex-col items-end shrink-0 pt-1">
             {promotion?.oldPrice ? (
               <>
                 <span className="text-[14px] font-bold text-gray-500 line-through decoration-[#C62020] decoration-[2px] mb-0.5">
                   {promotion.oldPrice.toLocaleString()} s.
                 </span>
                 <span className="text-[22px] font-black text-[#202020]">
                   {product.price.toLocaleString()} s.
                 </span>
               </>
             ) : (
                <span className="text-[22px] font-black text-[#202020]">
                  {product.price.toLocaleString()} s.
                </span>
             )}
          </div>
        </div>

        {/* Description Row */}
        <div className="mt-4">
          <p className="text-[15px] leading-[1.6] text-gray-500 font-medium whitespace-pre-wrap">
            {formatText(product.description) || getProductSecondaryText(product)}
            {product.weight && <span className="block mt-1">Vazni: {formatText(product.weight)}</span>}
          </p>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mt-12 border-t border-gray-100 pt-8">
            <h3 className="text-[18px] font-black tracking-tight text-[#202020]">
              Shunga o'xshash taomlar
            </h3>
            <div className="scrollbar-hide mt-5 flex gap-4 overflow-x-auto pb-4 px-1" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
              {similarProducts.map((simProd) => {
                const simImg = getProductImageUrl({
                  id: simProd.id, name: simProd.name, imageUrl: simProd.imageUrl, categoryId: simProd.categoryId
                }, simProd.categoryId);
                
                return (
                  <div
                    key={simProd.id}
                    onClick={() => navigate(`/customer/product/${simProd.id}`)}
                    className="w-[130px] shrink-0 active:scale-95 transition-transform"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="h-[130px] w-full overflow-hidden rounded-[20px] bg-[#f8f8f9] shadow-sm">
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

      {/* ── Cart Controls (Bottom of Page, Flow Layout so it comes AFTER similar products as requested) ── */}
      <div className="px-5 pb-[env(safe-area-inset-bottom,20px)] mt-4">
        <div className="flex h-[60px] w-full rounded-[20px] bg-[#f8f8f9] border border-gray-100 shadow-sm overflow-hidden p-1.5">
          
          {/* Quantity Controls */}
          <div className="flex h-full items-center justify-between rounded-[16px] bg-white shadow-sm px-2 min-w-[130px]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={!isAvailable || quantity <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-gray-100 text-[#202020] transition active:scale-95 disabled:opacity-40"
            >
              <span className="text-[20px] font-bold leading-none pb-[2px]">-</span>
            </button>
            <span className="w-8 text-center text-[18px] font-black text-[#C62020]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              disabled={!isAvailable}
              className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-gray-100 text-[#202020] transition active:scale-95 disabled:opacity-40"
            >
              <span className="text-[20px] font-bold leading-none pb-[2px]">+</span>
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isAvailable}
            className={`flex h-full flex-1 cursor-pointer items-center justify-center rounded-[16px] font-black text-[15px] transition-transform active:scale-[0.98] ml-1.5 ${
              isAvailable
                ? 'bg-[#C62020] text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {isAvailable ? `Savatga • ${(product.price * quantity).toLocaleString()} s.` : 'Tugagan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
