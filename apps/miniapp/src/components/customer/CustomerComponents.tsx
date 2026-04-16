import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Headphones,
  Home,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  User,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react';
import { ProductAvailabilityEnum, ProductBadgeEnum, UserRoleEnum } from '@turon/shared';
import type { CartItem, ProductSnapshot } from '../../data/types';
import type { MenuCategory, MenuProduct } from '../../features/menu/types';
import {
  getCartItemImageUrl,
  getCategoryImageUrl,
  getCategoryPosterUrl,
  getProductImageUrl,
  getProductPosterUrl,
} from '../../features/menu/placeholders';
import {
  getCustomerCategoryLabel,
  getProductPromotion,
  getProductSecondaryText,
} from '../../features/menu/customerCatalog';
import { useCartStore } from '../../store/useCartStore';
import NotificationBadge from '../../features/notifications/components/NotificationBadge';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';

type DisplayProduct = MenuProduct | ProductSnapshot;

export interface PromoBannerSlide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta?: string;
  gradient: string;
}

export interface HomePromoStripItem {
  id: string;
  label: string;
  targetPath: string;
}

const isMenuProduct = (product: DisplayProduct): product is MenuProduct =>
  'availability' in product && 'isActive' in product;

const getDisplayProductImage = (product: DisplayProduct) =>
  'imageUrl' in product ? product.imageUrl : product.image;

function getBadgeLabel(badge: ProductBadgeEnum | undefined) {
  if (badge === ProductBadgeEnum.NEW) return 'Yangi';
  if (badge === ProductBadgeEnum.POPULAR) return 'Top';
  if (badge === ProductBadgeEnum.DISCOUNT) return 'Aksiya';
  return null;
}

function getProductAvailabilityLabel(product: DisplayProduct) {
  if (!isMenuProduct(product)) {
    return null;
  }

  if (product.availability === ProductAvailabilityEnum.TEMPORARILY_UNAVAILABLE) {
    return "Vaqtincha yo'q";
  }

  if (product.availability === ProductAvailabilityEnum.OUT_OF_STOCK) {
    return 'Tugagan';
  }

  return null;
}

export const BannerCarousel: React.FC<{
  slides: PromoBannerSlide[];
}> = ({ slides }) => (
  <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
    {slides.map((slide) => (
      <article
        key={slide.id}
        className={`min-w-[286px] snap-start overflow-hidden rounded-[12px] border border-white/8 p-4 text-white shadow-[0_14px_32px_rgba(2,6,23,0.24)] ${slide.gradient}`}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/64">{slide.eyebrow}</p>
        <h3 className="mt-2 max-w-[240px] text-[26px] font-black leading-[1.02] tracking-[-0.04em]">
          {slide.title}
        </h3>
        <p className="mt-2 max-w-[250px] text-[13px] leading-6 text-white/78">{slide.subtitle}</p>
        {slide.cta ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
            <span>{slide.cta}</span>
            <ChevronRight size={14} />
          </div>
        ) : null}
      </article>
    ))}
  </div>
);

export const CategoryTabs: React.FC<{
  tabs: Array<{ id: string; label: string }>;
  activeId: string;
  onSelect: (id: string) => void;
}> = ({ tabs, activeId, onSelect }) => (
  <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
    {tabs.map((tab) => {
      const isActive = tab.id === activeId;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={`shrink-0 rounded-full px-3.5 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${isActive
            ? 'bg-white text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.08)]'
            : 'border border-white/8 bg-white/[0.05] text-white/62'
            }`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

export const CategoryCard: React.FC<{ category: MenuCategory }> = ({ category }) => {
  const { formatText } = useCustomerLanguage();
  const posterSrc = React.useMemo(() => getCategoryPosterUrl(category), [category]);
  const [imageSrc, setImageSrc] = React.useState(() => getCategoryImageUrl(category));

  React.useEffect(() => {
    setImageSrc(getCategoryImageUrl(category));
  }, [category]);

  return (
    <NavLink
      to={`/customer/category/${category.id}`}
      className="group block min-w-[98px] overflow-hidden rounded-[12px] border border-white/8 bg-white/[0.05] p-2 text-left shadow-[0_12px_24px_rgba(2,6,23,0.18)]"
    >
      <img
        src={imageSrc}
        alt={formatText(getCustomerCategoryLabel(category.name))}
        className="h-16 w-full rounded-[10px] object-cover transition duration-500 group-hover:scale-[1.04]"
        onError={() => {
          if (imageSrc !== posterSrc) {
            setImageSrc(posterSrc);
          }
        }}
      />
      <div className="px-1 pb-0.5 pt-2">
        <p className="line-clamp-2 text-[12px] font-black leading-tight text-white">
          {formatText(getCustomerCategoryLabel(category.name))}
        </p>
      </div>
    </NavLink>
  );
};

export const HomePromoStrip: React.FC<{ items: HomePromoStripItem[] }> = ({ items }) => {
  const navigate = useNavigate();
  if (!items.length) return null;

  const looped = [...items, ...items];

  return (
    <div className="relative h-[50px] overflow-hidden">
      <style>{`
        @keyframes turon-home-strip {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 4px)); }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-[#0b1220] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-[#0b1220] to-transparent" />
      <div
        className="flex w-max gap-2"
        style={{ animation: 'turon-home-strip 20s linear infinite' }}
      >
        {looped.map((item, index) => (
          <button
            key={`${item.id}-${index}`}
            type="button"
            onClick={() => navigate(item.targetPath)}
            className="flex h-[50px] items-center rounded-[12px] border border-white/8 bg-[#111827] px-3 text-[13px] font-semibold text-white/90 shadow-[0_10px_18px_rgba(2,6,23,0.18)]"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export const HomeProductRailCard: React.FC<{ product: DisplayProduct }> = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { formatText } = useCustomerLanguage();
  const rawImage = getDisplayProductImage(product);
  const posterSrc = React.useMemo(() => getProductPosterUrl(product), [product]);
  const [imageSrc, setImageSrc] = React.useState(() =>
    getProductImageUrl(
      {
        id: product.id,
        name: product.name,
        imageUrl: rawImage,
        categoryId: product.categoryId,
      },
      product.categoryId,
    ),
  );
  const isAvailable = isMenuProduct(product)
    ? product.isActive && product.availability === ProductAvailabilityEnum.AVAILABLE
    : product.isAvailable !== false;
  const promotion = isMenuProduct(product) ? getProductPromotion(product) : null;
  const secondaryText = isMenuProduct(product)
    ? getProductSecondaryText(product)
    : formatText(product.description).slice(0, 54);

  React.useEffect(() => {
    setImageSrc(
      getProductImageUrl(
        {
          id: product.id,
          name: product.name,
          imageUrl: rawImage,
          categoryId: product.categoryId,
        },
        product.categoryId,
      ),
    );
  }, [product, rawImage]);

  const handleAdd = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAvailable) return;
    addToCart({
      id: product.id,
      menuItemId: 'menuItemId' in product ? product.menuItemId ?? product.id : product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      price: product.price,
      image: imageSrc,
      isAvailable: true,
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/customer/product/${product.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/customer/product/${product.id}`);
        }
      }}
      className={`flex h-[220px] w-[160px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[12px] border border-white/8 bg-[#111827] p-[10px] text-left shadow-[0_12px_24px_rgba(2,6,23,0.18)] transition-transform active:scale-[0.985] ${!isAvailable ? 'opacity-70' : ''
        }`}
    >
      <div className="relative h-[100px] overflow-hidden rounded-[10px]">
        <img
          src={imageSrc}
          alt={formatText(product.name)}
          className="h-full w-full object-cover"
          onError={() => {
            if (imageSrc !== posterSrc) {
              setImageSrc(posterSrc);
            }
          }}
        />
        {promotion?.kind === 'discount' && promotion.discountPercent ? (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-black text-emerald-950">
            -{promotion.discountPercent}%
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!isAvailable}
          className={`absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full shadow-[0_10px_18px_rgba(2,6,23,0.22)] ${isAvailable ? 'bg-white text-slate-950' : 'bg-slate-500/60 text-white/60'
            }`}
        >
          <Plus size={16} strokeWidth={2.8} />
        </button>
      </div>

      <div className="flex flex-1 flex-col pt-2.5">
        <h3 className="line-clamp-2 text-[14px] font-bold leading-[1.15] text-white">
          {formatText(product.name)}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.2] text-white/52">
          {formatText(secondaryText)}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-white">
              {product.price.toLocaleString()} so'm
            </p>
            {promotion?.oldPrice ? (
              <p className="mt-0.5 text-[12px] font-medium text-white/34 line-through">
                {promotion.oldPrice.toLocaleString()} so'm
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export const HomeProductRail: React.FC<{ products: DisplayProduct[] }> = ({ products }) => (
  <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
    {products.map((product) => (
      <HomeProductRailCard key={product.id} product={product} />
    ))}
  </div>
);

export const ProductCard: React.FC<{ product: DisplayProduct }> = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart, items } = useCartStore();
  const { formatText } = useCustomerLanguage();
  const rawImage = getDisplayProductImage(product);
  const posterSrc = React.useMemo(() => getProductPosterUrl(product), [product]);
  const [imageSrc, setImageSrc] = React.useState(() =>
    getProductImageUrl(
      {
        id: product.id,
        name: product.name,
        imageUrl: rawImage,
        categoryId: product.categoryId,
      },
      product.categoryId,
    ),
  );
  const quantityInCart = items.find((item) => item.id === product.id)?.quantity || 0;
  const availabilityLabel = getProductAvailabilityLabel(product);
  const badgeLabel = isMenuProduct(product) ? getBadgeLabel(product.badge) : null;
  const isAvailable = isMenuProduct(product)
    ? product.isActive && product.availability === ProductAvailabilityEnum.AVAILABLE
    : product.isAvailable !== false;
  const subtext = isMenuProduct(product)
    ? product.weight || formatText(product.description).slice(0, 48)
    : formatText(product.description).slice(0, 48);

  React.useEffect(() => {
    setImageSrc(
      getProductImageUrl(
        {
          id: product.id,
          name: product.name,
          imageUrl: rawImage,
          categoryId: product.categoryId,
        },
        product.categoryId,
      ),
    );
  }, [product, rawImage]);

  const promotion = isMenuProduct(product) ? getProductPromotion(product) : null;

  const handleAdd = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAvailable) {
      return;
    }

    addToCart({
      id: product.id,
      menuItemId: 'menuItemId' in product ? product.menuItemId ?? product.id : product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      price: product.price,
      image: imageSrc,
      isAvailable: true,
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/customer/product/${product.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/customer/product/${product.id}`);
        }
      }}
      className={`group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[12px] border border-white/8 bg-[#111827] text-left shadow-[0_14px_28px_rgba(2,6,23,0.24)] transition-transform active:scale-[0.985] ${!isAvailable ? 'opacity-70' : ''
        }`}
    >
      <div className="relative overflow-hidden">
        <img
          src={imageSrc}
          alt={formatText(product.name)}
          className="h-36 w-full object-cover transition duration-500 group-hover:scale-105"
          onError={() => {
            if (imageSrc !== posterSrc) {
              setImageSrc(posterSrc);
            }
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.02)_0%,rgba(2,6,23,0.72)_100%)]" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {promotion?.kind === 'discount' && promotion.discountPercent ? (
            <span className="rounded-full bg-emerald-400 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-950">
              -{promotion.discountPercent}%
            </span>
          ) : badgeLabel ? (
            <span className="rounded-full border border-white/12 bg-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-md">
              {badgeLabel}
            </span>
          ) : promotion?.badgeLabel ? (
            <span className="rounded-full border border-white/12 bg-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-md">
              {promotion.badgeLabel}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!isAvailable}
          className={`absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full shadow-[0_10px_18px_rgba(2,6,23,0.32)] transition-transform active:scale-95 ${!isAvailable
            ? 'bg-slate-500/60 text-white/65'
            : 'bg-white text-slate-950'
            }`}
        >
          <Plus size={20} strokeWidth={2.7} />
        </button>

        {quantityInCart > 0 && isAvailable ? (
          <div className="absolute bottom-3 left-3 rounded-full border border-amber-300/20 bg-amber-400/14 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100 backdrop-blur-md">
            Savatda {quantityInCart}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="min-h-[60px]">
          <h3 className="line-clamp-2 text-[14px] font-black leading-tight tracking-tight text-white">
            {formatText(product.name)}
          </h3>
          {subtext || (isMenuProduct(product) ? getProductSecondaryText(product) : null) ? (
            <p className="mt-1.5 line-clamp-1 text-[11px] font-semibold text-white/48">
              {subtext || (isMenuProduct(product) ? getProductSecondaryText(product) : '')}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-[15px] font-black tracking-tight text-white">{product.price.toLocaleString()} so'm</p>
            {promotion?.oldPrice ? (
              <p className="mt-1 text-[11px] font-semibold text-white/32 line-through">{promotion.oldPrice.toLocaleString()} so'm</p>
            ) : availabilityLabel ? (
              <p className="mt-1 text-[11px] font-semibold text-rose-300">{availabilityLabel}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export const QuantitySelector: React.FC<{
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
}> = ({ quantity, onIncrease, onDecrease }) => (
  <div className="flex items-center rounded-full border border-white/10 bg-white/[0.05] p-1.5">
    <button
      type="button"
      onClick={onDecrease}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white transition-transform active:scale-90"
    >
      <Minus size={18} />
    </button>
    <span className="min-w-[56px] px-4 text-center text-lg font-black text-white">{quantity}</span>
    <button
      type="button"
      onClick={onIncrease}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-950 transition-transform active:scale-90"
    >
      <Plus size={18} />
    </button>
  </div>
);

export const ProductGrid: React.FC<{ products: DisplayProduct[] }> = ({ products }) => (
  <div className="grid grid-cols-2 gap-3">
    {products.map((product) => (
      <ProductCard key={product.id} product={product} />
    ))}
  </div>
);

export const UpsellProductCard: React.FC<{
  product: DisplayProduct;
  onAdd: (product: any) => void;
}> = ({ product, onAdd }) => {
  const { formatText } = useCustomerLanguage();
  const rawImage = getDisplayProductImage(product);
  const posterSrc = React.useMemo(() => getProductPosterUrl(product), [product]);
  const [imageSrc, setImageSrc] = React.useState(() =>
    getProductImageUrl(
      {
        id: product.id,
        name: product.name,
        imageUrl: rawImage,
        categoryId: product.categoryId,
      },
      product.categoryId,
    ),
  );

  React.useEffect(() => {
    setImageSrc(
      getProductImageUrl(
        {
          id: product.id,
          name: product.name,
          imageUrl: rawImage,
          categoryId: product.categoryId,
        },
        product.categoryId,
      ),
    );
  }, [product, rawImage]);

  return (
    <div className="relative flex min-h-[140px] w-full flex-col items-center justify-between rounded-[12px] bg-[#2D2D2D] p-2.5 text-center transition-all hover:bg-[#333333] active:scale-[0.96]">
      <div className="aspect-square w-full max-w-[80px] overflow-hidden rounded-[8px] bg-[#1A1A1A]">
        <img
          src={imageSrc}
          alt={formatText(product.name)}
          className="h-full w-full object-cover"
          onError={() => {
            if (imageSrc !== posterSrc) {
              setImageSrc(posterSrc);
            }
          }}
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center pt-2">
        <p className="line-clamp-2 text-[11px] font-medium leading-[13px] text-[#FFFFFF]">{formatText(product.name)}</p>
        <p className="mt-1 text-[13px] font-bold text-[#FFFFFF]">{product.price.toLocaleString()} so'm</p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd({
            id: product.id,
            menuItemId: 'menuItemId' in product ? product.menuItemId ?? product.id : product.id,
            categoryId: product.categoryId,
            name: product.name,
            description: product.description,
            price: product.price,
            image: imageSrc,
            isAvailable: true,
          });
        }}
        className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#FFD700] text-[#1A1A1A] shadow-lg transition-all hover:bg-[#FFC400] active:scale-90"
      >
        <Plus size={16} strokeWidth={3} />
      </button>
    </div>
  );
};

export const CartItemCard: React.FC<{
  item: CartItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}> = ({ item, onUpdateQuantity }) => {
  const { formatText } = useCustomerLanguage();
  const posterSrc = React.useMemo(() => getProductPosterUrl(item), [item]);
  const [imageSrc, setImageSrc] = React.useState(() => getCartItemImageUrl(item));

  React.useEffect(() => {
    setImageSrc(getCartItemImageUrl(item));
  }, [item]);

  return (
    <div className="flex gap-3 border-b border-[#333333] bg-[#1A1A1A] px-4 py-4">
      <div className="h-[80px] w-[80px] shrink-0 overflow-hidden rounded-[8px] bg-[#2D2D2D]">
        <img
          src={imageSrc}
          alt={formatText(item.name)}
          className="h-full w-full object-cover"
          onError={() => {
            if (imageSrc !== posterSrc) {
              setImageSrc(posterSrc);
            }
          }}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h4 className="line-clamp-2 text-[16px] font-semibold leading-[20px] text-[#FFFFFF]">
            {formatText(item.name)}
          </h4>
          <p className="mt-0.5 text-[12px] text-[#A0A0A0]">
            {item.weight || "180 g"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-[#10B981]">
            {(item.price * item.quantity).toLocaleString()} so'm
          </span>
          {item.oldPrice ? (
            <span className="text-[12px] text-[#707070] line-through">
              {(item.oldPrice * item.quantity).toLocaleString()} so'm
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-end">
        <div className="flex h-8 min-w-[84px] items-center justify-between rounded-[8px] bg-[#2D2D2D] px-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, -1)}
            className="flex h-6 w-6 items-center justify-center text-[#FFFFFF] transition-opacity hover:opacity-80 active:scale-90"
          >
            <Minus size={16} strokeWidth={2.5} />
          </button>
          <span className="text-[14px] font-bold text-[#FFFFFF]">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, 1)}
            className="flex h-6 w-6 items-center justify-center text-[#FFFFFF] transition-opacity hover:opacity-80 active:scale-90"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const FloatingCartBar: React.FC<{
  hidden?: boolean;
}> = ({ hidden = false }) => {
  const navigate = useNavigate();
  const { items, getFinalTotal } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const [pulse, setPulse] = React.useState(false);
  const prevTotalRef = React.useRef(totalItems);

  React.useEffect(() => {
    if (totalItems > prevTotalRef.current) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 420);
      prevTotalRef.current = totalItems;
      return () => window.clearTimeout(t);
    }
    prevTotalRef.current = totalItems;
  }, [totalItems]);

  if (hidden || totalItems === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 z-40"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 78px)' }}
    >
      <div className="mx-auto w-full max-w-[360px] px-4">
        <button
          type="button"
          onClick={() => navigate('/customer/cart')}
          className={`flex h-[42px] w-full items-center justify-between rounded-[6px] border border-white/10 bg-slate-900/98 px-3.5 text-white shadow-2xl backdrop-blur-xl transition-all active:scale-[0.99] ${pulse ? 'scale-[1.025] border-amber-300/30' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-[4px] text-slate-950 transition-colors ${pulse ? 'bg-amber-300' : 'bg-white'}`}>
              <ShoppingBag size={14} />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Savat:</p>
              <p className="text-[12.5px] font-black">{totalItems} ta mahsulot</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-[14px] font-black text-amber-300">{getFinalTotal(0).toLocaleString()} so'm</p>
            <ChevronRight size={14} className="text-white/40" />
          </div>
        </button>
      </div>
    </div>
  );
};

export const TrackingBottomSheet: React.FC<{
  eta: string;
  distance: string;
  statusLine: string;
  activePanel: 'address' | 'order' | null;
  onTogglePanel: (panel: 'address' | 'order') => void;
  onSupport: () => void;
  addressContent: React.ReactNode;
  orderContent: React.ReactNode;
}> = ({ eta, distance, statusLine, activePanel, onTogglePanel, onSupport, addressContent, orderContent }) => (
  <div className="mt-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]">
    <div className="overflow-hidden rounded-[14px] border border-white/10 bg-slate-950/88 shadow-[0_18px_36px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
      <div className="px-3.5 pt-2.5">
        <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-white/10" />
        <div className="rounded-[12px] border border-white/8 bg-white/[0.05] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Taxminiy yetib kelish</p>
          <div className="mt-2.5 flex items-start justify-between gap-2.5">
            <div>
              <p className="text-[24px] font-black leading-none tracking-[-0.05em] text-white">{eta}</p>
              <p className="mt-2 max-w-[230px] text-[12px] font-semibold leading-5 text-white/72">{statusLine}</p>
            </div>
            <div className="rounded-[12px] border border-white/8 bg-slate-950/55 px-3 py-2 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Masofa</p>
              <p className="mt-1.5 text-[15px] font-black text-white">{distance}</p>
            </div>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onSupport}
            className="flex flex-col items-center justify-center gap-1 rounded-[12px] border border-white/8 bg-white/[0.06] px-2 py-2.5 text-center text-white transition-transform active:scale-[0.98]"
          >
            <Headphones size={16} className="text-white/85" />
            <span className="text-[10px] font-black">Support</span>
          </button>
          <button
            type="button"
            onClick={() => onTogglePanel('address')}
            className={`flex flex-col items-center justify-center gap-1 rounded-[12px] border px-2 py-2.5 text-center transition-transform active:scale-[0.98] ${activePanel === 'address'
              ? 'border-amber-300/24 bg-amber-400/14 text-amber-100'
              : 'border-white/8 bg-white/[0.06] text-white'
              }`}
          >
            <Home size={16} className={activePanel === 'address' ? 'text-amber-100' : 'text-white/85'} />
            <span className="text-[10px] font-black">Manzil</span>
          </button>
          <button
            type="button"
            onClick={() => onTogglePanel('order')}
            className={`flex flex-col items-center justify-center gap-1 rounded-[12px] border px-2 py-2.5 text-center transition-transform active:scale-[0.98] ${activePanel === 'order'
              ? 'border-sky-300/24 bg-sky-400/14 text-sky-100'
              : 'border-white/8 bg-white/[0.06] text-white'
              }`}
          >
            <ClipboardList size={16} className={activePanel === 'order' ? 'text-sky-100' : 'text-white/85'} />
            <span className="text-[10px] font-black">Buyurtma</span>
          </button>
        </div>
      </div>

      {activePanel ? (
        <div className="mt-3 border-t border-white/8 bg-white/[0.03] px-3.5 py-3">
          {activePanel === 'address' ? addressContent : orderContent}
        </div>
      ) : null}
    </div>
  </div>
);

export const HeaderBar: React.FC<{ title: string; showBack?: boolean; rightSlot?: React.ReactNode }> = ({
  title,
  showBack,
  rightSlot,
}) => {
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-40 border-b border-white/6 bg-[#060914]/88 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}
    >
      <div className="mx-auto flex h-[56px] w-full max-w-[430px] items-center gap-3 px-4">
        {showBack ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.06] text-white"
          >
            <ChevronLeft size={18} />
          </button>
        ) : null}
        <h1 className="flex-1 truncate text-base font-black tracking-tight text-white">{title}</h1>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </header>
  );
};

export const BottomNavbar: React.FC = () => {
  const { getTotalItems } = useCartStore();
  const cartCount = getTotalItems();
  const navigate = useNavigate();

  const RED = '#C62020';

  const leftItems = [
    { icon: Home, label: 'Bosh sahifa', path: '/customer' },
    { icon: Search, label: 'Qidiruv', path: '/customer/search' },
  ];

  const rightItems = [
    { icon: UtensilsCrossed, label: 'Menyu', path: '/customer/menu' },
    { icon: User, label: 'Profil', path: '/customer/profile', isNotification: true },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[80]"
      style={{ background: `linear-gradient(135deg, ${RED} 0%, #9B0000 100%)` }}
    >
      <div
        className="mx-auto flex w-full max-w-[430px] items-end justify-between px-2"
        style={{
          height: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        }}
      >
        {/* LEFT */}
        <div className="flex flex-1 items-end justify-around pb-1">
          {leftItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-[3px] px-3 py-1 transition-all active:scale-90"
                style={{ textDecoration: 'none' }}
              >
                <Icon size={22} strokeWidth={2} color="white" />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'white', lineHeight: 1 }}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>

        {/* CENTER: elevated cart */}
        <div className="relative flex flex-col items-center" style={{ marginBottom: 10 }}>
          <button
            onClick={() => navigate('/customer/cart')}
            type="button"
            className="relative flex items-center justify-center rounded-full transition-transform active:scale-90"
            style={{
              width: 60, height: 60,
              background: 'white',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              border: `4px solid ${RED}`,
              marginTop: -28,
              color: RED,
            }}
          >
            <ShoppingCart size={26} strokeWidth={2.2} />
            {cartCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex items-center justify-center rounded-full text-white"
                style={{
                  height: 18, minWidth: 18, fontSize: 9, fontWeight: 900,
                  background: RED, border: '2px solid white', padding: '0 2px',
                }}
              >
                {cartCount}
              </span>
            )}
          </button>
          <span style={{ marginTop: 3, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.75)', lineHeight: 1 }}>
            Savat
          </span>
        </div>

        {/* RIGHT */}
        <div className="flex flex-1 items-end justify-around pb-1">
          {rightItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-[3px] px-3 py-1 transition-all active:scale-90"
                style={{ textDecoration: 'none' }}
              >
                <div style={{ position: 'relative' }}>
                  <Icon size={22} strokeWidth={2} color="white" />
                  {item.isNotification ? <NotificationBadge role={UserRoleEnum.CUSTOMER} /> : null}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'white', lineHeight: 1 }}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export const LoadingSkeleton: React.FC = () => (
  <div className="space-y-5 px-4 py-5">
    <div className="h-32 animate-pulse rounded-[12px] bg-white/[0.05]" />
    <div className="h-24 animate-pulse rounded-[12px] bg-white/[0.05]" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-56 animate-pulse rounded-[12px] bg-white/[0.05]" />
      <div className="h-56 animate-pulse rounded-[12px] bg-white/[0.05]" />
    </div>
  </div>
);

export const EmptyState: React.FC<{ message: string; subMessage?: string; action?: React.ReactNode }> = ({
  message,
  subMessage,
  action,
}) => (
  <div className="flex flex-col items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.04] px-6 py-12 text-center">
    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[16px] border border-white/8 bg-white/[0.06] text-white/74">
      <PackageCheck size={34} />
    </div>
    <h3 className="text-2xl font-black tracking-tight text-white">{message}</h3>
    {subMessage ? <p className="mt-3 max-w-[260px] text-sm leading-6 text-white/58">{subMessage}</p> : null}
    {action ? <div className="mt-6">{action}</div> : null}
  </div>
);
