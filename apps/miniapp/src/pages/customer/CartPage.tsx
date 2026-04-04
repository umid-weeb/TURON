import React, { useEffect } from 'react';
import { ArrowLeft, ChevronRight, Clock, Minus, PackageCheck, Plus, Trash2, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CartItemCard, UpsellProductCard } from '../../components/customer/CustomerComponents';
import { EmptyCartState } from '../../components/customer/CheckoutComponents';
import { useAddresses } from '../../hooks/queries/useAddresses';
import { useProducts, useCategories } from '../../hooks/queries/useMenu';
import { useOrderQuote } from '../../hooks/queries/useOrders';
import { useAddressStore } from '../../store/useAddressStore';
import { useCartStore } from '../../store/useCartStore';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { tr } = useCustomerLanguage();
  const { items, updateQuantity, removeFromCart, clearCart, getSubtotal, getDiscount, appliedPromo, syncWithProducts, addToCart } = useCartStore();
  const { selectedAddressId } = useAddressStore();
  const { data: addresses = [] } = useAddresses();
  const { data: products = [], isLoading: isProductsLoading, isError: isProductsError } = useProducts();
  const { data: categories = [] } = useCategories();
  
  const [cutlery, setCutlery] = React.useState(true);

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

  const upsellProducts = React.useMemo(() => {
    if (!products.length) return [];
    // Filter for sauces, drinks, sides
    const keywords = ['sous', 'ichimlik', 'napitok', 'garnir', 'free', 'fri', 'kola', 'pepsi', 'fanta', 'sprite', 'chili'];
    return products.filter((p) => {
      const name = p.name.toLowerCase();
      const inCart = items.some((item) => item.id === p.id);
      return !inCart && keywords.some((kw) => name.includes(kw));
    }).slice(0, 8);
  }, [products, items]);

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
      style={{ paddingBottom: '200px' }}
    >
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#0b1220]/94 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex flex-col items-center">
            <h1 className="text-[17px] font-black text-white">Oqtepa Lavash</h1>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] font-bold">
              <span className="text-emerald-400">{totalPrice.toLocaleString()} so'm</span>
              <span className="text-white/20">•</span>
              <span className="flex items-center gap-1 text-white/40">
                <Clock size={12} />
                15-25 daq
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={clearCart}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/60"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <section className="px-4 pt-4">
        <div className="divide-y divide-white/[0.05]">
          {items.map((item) => (
            <CartItemCard
              key={item.id}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate('/customer')}
          className="mt-6 flex h-14 w-full items-center justify-center rounded-[16px] bg-white/[0.06] text-[15px] font-bold text-white transition-all active:scale-[0.985]"
        >
          Menyuni ochish
        </button>
      </section>

      {/* Tools / Cutlery Section */}
      <section className="mt-8 px-4">
        <div className="flex items-center justify-between rounded-[20px] bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/60">
              <Utensils size={20} />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] p-1">
              <button
                type="button"
                onClick={() => updateQuantity(items[0]?.id || '', Math.max(1, (items[0]?.quantity || 1) - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors active:bg-white/5"
              >
                <Minus size={14} />
              </button>
              <span className="min-w-[16px] text-center text-[14px] font-black text-white">{totalItems}</span>
              <button
                type="button"
                onClick={() => updateQuantity(items[0]?.id || '', (items[0]?.quantity || 1) + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors active:bg-white/5"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCutlery(!cutlery)}
            className={`relative h-7 w-12 rounded-full transition-all duration-300 ${cutlery ? 'bg-amber-400' : 'bg-white/10'}`}
          >
            <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${cutlery ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </section>

      {upsellProducts.length > 0 && (
        <section className="mt-10 overflow-hidden px-4">
          <h2 className="text-[20px] font-black tracking-tight text-white">Yana nimadir kerakmi?</h2>
          <div className="scrollbar-hide -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-6">
            {upsellProducts.map((p) => (
              <UpsellProductCard key={p.id} product={p} onAdd={addToCart} />
            ))}
          </div>
        </section>
      )}

      {/* Floating Action Section */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-end gap-3 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pointer-events-none">
        {/* Free Delivery Badge */}
        <div className="flex items-center gap-2.5 rounded-full bg-[#9333ea] px-5 py-2.5 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(147,51,234,0.3)] pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
            <PackageCheck size={13} />
          </div>
          <span>Bepul yetkazish</span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/customer/checkout')}
          className="flex items-center gap-4 rounded-full bg-[#facc15] py-4.5 pl-7 pr-4 font-black text-slate-950 shadow-[0_20px_40px_rgba(250,204,21,0.35)] transition-all active:scale-[0.96] pointer-events-auto group"
        >
          <span className="text-[17px] tracking-tight">To'lovga</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white transition-transform duration-300 group-hover:translate-x-1">
            <ChevronRight size={22} />
          </div>
        </button>
      </div>
    </div>
  );
};

export default CartPage;
