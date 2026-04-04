import React, { useEffect } from 'react';
import { ArrowLeft, ArrowRight, ReceiptText, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CartItemCard } from '../../components/customer/CustomerComponents';
import { EmptyCartState } from '../../components/customer/CheckoutComponents';
import OrderSummaryCard from '../../components/customer/OrderSummaryCard';
import { CustomerPromoInputCard } from '../../features/promo/components/CustomerPromoInputCard';
import { useAddresses } from '../../hooks/queries/useAddresses';
import { useProducts } from '../../hooks/queries/useMenu';
import { useOrderQuote } from '../../hooks/queries/useOrders';
import { useAddressStore } from '../../store/useAddressStore';
import { useCartStore } from '../../store/useCartStore';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart, getSubtotal, getDiscount, appliedPromo, syncWithProducts } = useCartStore();
  const { selectedAddressId } = useAddressStore();
  const { data: addresses = [] } = useAddresses();
  const { data: products = [], isLoading: isProductsLoading, isError: isProductsError } = useProducts();

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) || null;
  const quoteItems = items.map((item) => ({
    menuItemId: item.menuItemId ?? item.id,
    quantity: item.quantity,
  }));
  const orderQuoteQuery = useOrderQuote({
    items: quoteItems,
    deliveryAddressId: selectedAddress?.id ?? null,
    promoCode: appliedPromo?.code,
    enabled: Boolean(selectedAddress) && items.length > 0 && !isProductsLoading,
  });
  const orderQuote = orderQuoteQuery.data ?? null;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const merchandiseTotal = Math.max(0, subtotal - discount);
  const totalPrice = orderQuote?.total ?? merchandiseTotal;
  const hasUnavailableItems = items.some((item) => item.isAvailable === false);

  useEffect(() => {
    if (isProductsLoading || isProductsError) {
      return;
    }
    syncWithProducts(products);
  }, [isProductsError, isProductsLoading, products, syncWithProducts]);

  if (items.length === 0) {
    return <EmptyCartState />;
  }

  return (
    <div
      className="min-h-screen animate-in slide-in-from-right duration-300"
      style={{ paddingBottom: '320px' }} // Highly increased padding to ensure everything scrolls above the fixed panel
    >
      <section className="px-4 pb-5 pt-[calc(env(safe-area-inset-top,0px)+14px)]">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1 px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">Savat</p>
            <h1 className="mt-1.5 text-[1.9rem] font-black tracking-[-0.05em] text-white">Buyurtma xulosasi</h1>
            <p className="mt-2 text-[13px] leading-6 text-white/58">
              Taomlar, promokod va jami summa ixcham delivery oqimida ko'rsatiladi.
            </p>
          </div>

          <button
            type="button"
            onClick={clearCart}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-300/18 bg-rose-400/10 text-rose-200"
            title="Tozalash"
            aria-label="Tozalash"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </section>

      <section className="px-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[12px] border border-white/8 bg-white/[0.05] px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/34">Turi</p>
            <p className="mt-2 text-lg font-black text-white">{items.length}</p>
          </div>
          <div className="rounded-[12px] border border-white/8 bg-white/[0.05] px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/34">Soni</p>
            <p className="mt-2 text-lg font-black text-white">{totalItems}</p>
          </div>
          <div className="rounded-[12px] border border-amber-300/16 bg-amber-400/10 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/70">Jami</p>
            <p className="mt-2 text-lg font-black text-amber-100">{totalPrice.toLocaleString()} so'm</p>
          </div>
        </div>
      </section>

      <section className="space-y-3 px-4 pt-5">
        {items.map((item) => (
          <CartItemCard
            key={item.id}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
          />
        ))}
      </section>

      <section className="space-y-5 px-4 pt-5">
        <CustomerPromoInputCard subtotal={subtotal} />

        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/[0.06] text-white">
              <ReceiptText size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">Summary</p>
              <h2 className="mt-1 text-base font-black tracking-tight text-white">Buyurtma xulosasi</h2>
            </div>
          </div>

          <OrderSummaryCard quote={orderQuote} isQuoteLoading={orderQuoteQuery.isLoading} />
        </div>
      </section>

      <div
        className="fixed inset-x-0 z-40 px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 66px)' }}
      >
        <div className="mx-auto w-full max-w-[430px] rounded-[16px] border border-white/10 bg-[#111827]/94 p-3 shadow-[0_16px_32px_rgba(2,6,23,0.34)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/34">Jami summa</p>
              <p className="mt-1 text-[26px] font-black tracking-[-0.04em] text-white">{totalPrice.toLocaleString()} so'm</p>
              {!selectedAddress ? (
                <p className="mt-1 text-[11px] font-semibold text-white/48">
                  Yetkazish narxi checkoutda manzil bo'yicha hisoblanadi
                </p>
              ) : orderQuoteQuery.isError ? (
                <p className="mt-1 text-[11px] font-semibold text-rose-300">{orderQuoteQuery.error.message}</p>
              ) : null}
            </div>
            <div className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/62">
              {totalItems} ta
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (hasUnavailableItems) {
                window.alert("Savatda hozir mavjud bo'lmagan taomlar bor. Pozitsiyalarni tekshiring.");
                return;
              }

              navigate('/customer/checkout');
            }}
            disabled={isProductsLoading}
            className="flex h-[56px] w-full items-center justify-center gap-3 rounded-[6px] bg-white text-base font-black text-slate-950 shadow-xl transition-transform active:scale-[0.985] disabled:opacity-60"
          >
            <span>Buyurtmani tasdiqlash</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
