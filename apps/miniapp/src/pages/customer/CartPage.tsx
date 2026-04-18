import React from 'react';
import { Loader2, Minus, Plus, ShoppingCart, Tag, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CartItem } from '../../data/types';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { getCartItemImageUrl, getProductPosterUrl } from '../../features/menu/placeholders';
import { useValidatePromo } from '../../hooks/queries/usePromos';
import { useAddresses } from '../../hooks/queries/useAddresses';
import { useProducts } from '../../hooks/queries/useMenu';
import { useOrderQuote } from '../../hooks/queries/useOrders';
import { useAddressStore } from '../../store/useAddressStore';
import { useCartStore } from '../../store/useCartStore';

const formatMoney = (value: number) => `${Math.max(0, Math.round(value)).toLocaleString()} so'm`;

const buttonStyles = `
  bg-[#C62020] text-white
  hover:bg-[#A51A1A] active:bg-[#8B1515]
  transition-transform active:scale-95
`;

const CartProductCard: React.FC<{
  item: CartItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}> = ({ item, onUpdateQuantity, onRemove }) => {
  const { formatText } = useCustomerLanguage();
  const posterSrc = React.useMemo(() => getProductPosterUrl(item), [item]);
  const [imageSrc, setImageSrc] = React.useState(() => getCartItemImageUrl(item));

  React.useEffect(() => {
    setImageSrc(getCartItemImageUrl(item));
  }, [item]);

  return (
    <article className="relative flex min-h-[112px] gap-3 rounded-[18px] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.035]">
      <div className="h-[86px] w-[86px] shrink-0 overflow-hidden rounded-[16px] bg-slate-100">
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

      <div className="min-w-0 flex-1 pr-8">
        <h3 className="line-clamp-1 text-[16px] font-black leading-5 tracking-[-0.03em] text-[#202020]">
          {formatText(item.name)}
        </h3>
        <p className="mt-1 text-[14px] font-extrabold tracking-[-0.03em] text-[#c3a26d]">
          {formatMoney(item.price)}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, -1)}
            className={buttonStyles}
          >
            <Minus size={16} />
          </button>
          <span className="text-[14px] font-bold text-[#202020]">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, 1)}
            className={buttonStyles}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#C62020] text-white shadow-md transition-transform active:scale-90"
      >
        <Trash2 size={16} />
      </button>
    </article>
  );
};

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatText } = useCustomerLanguage();
  const {
    items,
    updateQuantity,
    removeFromCart,
    getSubtotal,
    getDiscount,
    appliedPromo,
    setPromo,
    syncWithProducts,
    clearCart,
  } = useCartStore();
  const { selectedAddressId } = useAddressStore();
  const { data: addresses = [] } = useAddresses();
  const { data: products = [], isLoading: isProductsLoading, isError: isProductsError } = useProducts();
  const validatePromoMutation = useValidatePromo();
  const [promoCode, setPromoCode] = React.useState(appliedPromo?.code ?? '');
  const [promoFeedback, setPromoFeedback] = React.useState<{ success: boolean; message: string } | null>(null);

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) || null;
  const subtotal = getSubtotal();
  const discount = getDiscount();
  const quoteItems = React.useMemo(
    () => items.map((item) => ({ menuItemId: item.menuItemId ?? item.id, quantity: item.quantity })),
    [items],
  );

  const orderQuoteQuery = useOrderQuote({
    items: quoteItems,
    deliveryAddressId: selectedAddress?.id ?? null,
    promoCode: appliedPromo?.code,
    enabled: Boolean(selectedAddress) && items.length > 0 && !isProductsLoading,
  });

  const deliveryFee = orderQuoteQuery.data?.deliveryFee ?? null;
  const isQuoteLoading = orderQuoteQuery.isLoading || orderQuoteQuery.isFetching;
  // Total without delivery when quote not yet loaded — avoids showing wrong placeholder amount
  const totalPrice = orderQuoteQuery.data?.total ?? Math.max(0, subtotal - discount);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  React.useEffect(() => {
    if (!isProductsLoading && !isProductsError) {
      syncWithProducts(products);
    }
  }, [isProductsError, isProductsLoading, products, syncWithProducts]);

  React.useEffect(() => {
    if (appliedPromo) {
      setPromoCode(appliedPromo.code);
    }
  }, [appliedPromo]);

  React.useEffect(() => {
    if (!appliedPromo || subtotal >= appliedPromo.minOrderValue) {
      return;
    }

    setPromo(null);
    setPromoFeedback({
      success: false,
      message: `Promokod ishlashi uchun minimal summa ${formatMoney(appliedPromo.minOrderValue)} bo'lishi kerak`,
    });
  }, [appliedPromo, setPromo, subtotal]);

  const handleApplyPromo = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = promoCode.trim();
    if (!code || validatePromoMutation.isPending) {
      return;
    }

    try {
      const result = await validatePromoMutation.mutateAsync({ code, subtotal });
      setPromoFeedback({ success: result.isValid, message: result.message });

      if (result.isValid && result.promo) {
        setPromo({ ...result.promo, discountAmount: result.discountAmount });
        setPromoCode(result.promo.code);
        return;
      }

      setPromo(null);
    } catch (error) {
      setPromo(null);
      setPromoFeedback({
        success: false,
        message: error instanceof Error ? error.message : 'Promokod tekshirilmadi',
      });
    }
  };

  const handlePromoAction = (event: React.FormEvent) => {
    if (appliedPromo) {
      event.preventDefault();
      setPromo(null);
      setPromoCode('');
      setPromoFeedback(null);
      return;
    }

    void handleApplyPromo(event);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] text-[#202020]">
        <main className="mx-auto flex min-h-[calc(100dvh-160px)] max-w-[430px] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-[#202020] shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
            <ShoppingCart size={34} strokeWidth={2.3} />
          </div>
          <h2 className="mt-5 text-[24px] font-black tracking-[-0.05em]">Savat bo'sh</h2>
          <p className="mt-2 max-w-[260px] text-[14px] font-semibold leading-6 text-[#8c8c96]">
            Menyudan yoqqan taomlaringizni tanlang, keyin buyurtmani shu yerda yakunlaymiz.
          </p>
          <button
            type="button"
            onClick={() => navigate('/customer')}
            className="mt-6 h-12 rounded-full px-8 text-[15px] font-black text-white shadow-[0_14px_28px_rgba(198,32,32,0.3)] transition active:scale-95"
            style={{ background: '#C62020' }}
          >
            Menyuga qaytish
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#202020]">
      <main className="px-4 pb-[calc(env(safe-area-inset-bottom,0px)+190px)] pt-4">

        <div className="mb-4 mt-2 flex items-center justify-between px-1">
          <h2 className="text-[22px] font-black tracking-tight text-[#202020]">Savatingiz</h2>
          <button
            type="button"
            onClick={() => clearCart()}
            className="flex items-center gap-1.5 rounded-full bg-red-50/50 px-3 py-1.5 text-[13px] font-black tracking-[-0.02em] text-[#C62020] transition active:scale-[0.97]"
          >
            <Trash2 size={16} strokeWidth={2.5} />
            O'chirish
          </button>
        </div>

        <section className="space-y-3">
          {items.map((item) => (
            <CartProductCard
              key={item.id}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
            />
          ))}
        </section>

        <form
          onSubmit={handlePromoAction}
          className="mt-8 rounded-[22px] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.035]"
        >
          <div className="flex h-12 items-center gap-2">
            <label className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-[16px] bg-[#f4f4f5] px-4 text-[#9a9aa3]">
              <Tag size={18} strokeWidth={2.2} />
              <input
                value={promoCode}
                onChange={(event) => {
                  setPromoCode(event.target.value.toUpperCase());
                  setPromoFeedback(null);
                }}
                disabled={Boolean(appliedPromo)}
                placeholder="Promo kod"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-bold uppercase text-[#202020] outline-none placeholder:normal-case placeholder:text-[#9a9aa3] disabled:text-[#202020]"
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              disabled={(!promoCode.trim() && !appliedPromo) || validatePromoMutation.isPending}
              className={`flex h-full min-w-[106px] items-center justify-center rounded-[16px] px-4 text-[15px] font-black transition active:scale-95 ${validatePromoMutation.isPending || (!promoCode.trim() && !appliedPromo)
                  ? 'bg-[#e5e7eb] text-[#9a9aa3]'
                  : 'bg-[#C62020] text-white shadow-sm'
                }`}
            >
              {validatePromoMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : appliedPromo ? (
                'Bekor'
              ) : (
                "Qo'llash"
              )}
            </button>
          </div>
          {promoFeedback ? (
            <p
              className={`mt-3 rounded-[14px] px-3 py-2 text-[12px] font-bold ${promoFeedback.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                }`}
            >
              {formatText(promoFeedback.message)}
            </p>
          ) : null}
        </form>

        <section className="mt-8 rounded-[22px] bg-white px-4 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.035]">
          <div className="space-y-3 text-[15px] font-semibold text-[#8c8c96]">
            <div className="flex items-center justify-between gap-3">
              <span>Mahsulotlar</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex items-center justify-between gap-3 text-emerald-600">
                <span>Chegirma</span>
                <span>-{formatMoney(discount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span>Yetkazib berish</span>
              {isQuoteLoading ? (
                <span className="flex items-center gap-1.5 text-amber-500">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Hisoblanmoqda...</span>
                </span>
              ) : deliveryFee === 0 ? (
                <span className="font-black text-emerald-600">Bepul!</span>
              ) : deliveryFee !== null ? (
                <span>{formatMoney(deliveryFee)}</span>
              ) : (
                <span className="text-[#b0b0b8]">
                  {selectedAddress ? 'Hisoblanmoqda...' : 'Manzil tanlangach'}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="text-[18px] font-black tracking-[-0.04em]">Jami</p>
              <p className="mt-1 text-[12px] font-semibold text-[#9a9aa3]">{totalItems} ta mahsulot</p>
            </div>
            <p className="text-[24px] font-black tracking-[-0.06em]">
              {!orderQuoteQuery.data && selectedAddress && deliveryFee === null ? '≈ ' : ''}
              {formatMoney(totalPrice)}
            </p>
          </div>
        </section>
      </main>

      <div
        className="fixed inset-x-0 z-40 border-t border-slate-200/80 bg-white/96 px-4 py-3 shadow-[0_-16px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl"
        style={{ bottom: 'calc(74px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto">
          <button
            type="button"
            onClick={() => navigate('/customer/checkout')}
            disabled={items.some((item) => item.isAvailable === false)}
            className="flex h-[58px] w-full items-center justify-center rounded-[18px] bg-[#C62020] text-[16px] font-black text-white shadow-[0_16px_28px_rgba(198,32,32,0.25)] transition active:scale-[0.985] disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            Buyurtma berish
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
