import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, LocateFixed, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SelectedAddressCard } from '../../components/customer/AddressComponents';
import PaymentMethodSelector from '../../components/customer/PaymentMethodSelector';
import OrderSummaryCard from '../../components/customer/OrderSummaryCard';
import { CheckoutSectionCard, EmptyCartState } from '../../components/customer/CheckoutComponents';
import { CustomerPromoInputCard } from '../../features/promo/components/CustomerPromoInputCard';
import { useAddresses, useAutoDetectAndSaveAddress } from '../../hooks/queries/useAddresses';
import { useProducts } from '../../hooks/queries/useMenu';
import { useCreateOrder, useOrderQuote } from '../../hooks/queries/useOrders';
import { useAddressStore } from '../../store/useAddressStore';
import { useCartStore } from '../../store/useCartStore';
import { useCheckoutStore } from '../../store/useCheckoutStore';
import { createRouteInfoFromMeters } from '../../features/maps/route';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, getSubtotal, getDiscount, appliedPromo, clearCart, setPromo, syncWithProducts } = useCartStore();
  const { paymentMethod, note, resetCheckout } = useCheckoutStore();
  const { selectedAddressId, selectAddress, setInitialDraft } = useAddressStore();
  const createOrderMutation = useCreateOrder();
  const autoDetectAddressMutation = useAutoDetectAndSaveAddress();
  const { data: addresses = [], isLoading: isAddressesLoading } = useAddresses();
  const { data: products = [], isLoading: isProductsLoading, isError: isProductsError } = useProducts();
  const [addressHint, setAddressHint] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const subtotal = getSubtotal();
  const discount = getDiscount();
  const quoteItems = items.map((item) => ({
    menuItemId: item.menuItemId ?? item.id,
    quantity: item.quantity,
  }));
  const orderQuoteQuery = useOrderQuote({
    items: quoteItems,
    deliveryAddressId: selectedAddress?.id ?? null,
    promoCode: appliedPromo?.code,
    enabled: Boolean(selectedAddress) && !isProductsLoading && items.length > 0,
  });
  const orderQuote = orderQuoteQuery.data ?? null;
  const routeInfo =
    orderQuote &&
    typeof orderQuote.deliveryDistanceMeters === 'number' &&
    typeof orderQuote.deliveryEtaMinutes === 'number'
      ? createRouteInfoFromMeters(orderQuote.deliveryDistanceMeters, orderQuote.deliveryEtaMinutes * 60)
      : null;

  useEffect(() => {
    if (isProductsLoading || isProductsError) {
      return;
    }
    syncWithProducts(products);
  }, [isProductsError, isProductsLoading, products, syncWithProducts]);

  useEffect(() => {
    if (addresses.length === 0) {
      if (selectedAddressId) {
        selectAddress(null);
      }
      return;
    }

    const hasSelectedAddress = addresses.some((address) => address.id === selectedAddressId);
    if (!selectedAddressId || !hasSelectedAddress) {
      selectAddress(addresses[0].id);
    }
  }, [addresses, selectedAddressId, selectAddress]);

  if (items.length === 0) {
    return <EmptyCartState />;
  }

  const handleConfirmOrder = async () => {
    if (!selectedAddress || !paymentMethod) {
      return;
    }

    if (isProductsLoading) {
      window.alert('Savat yangilanmoqda. Bir ozdan song yana urinib koring.');
      return;
    }

    const unavailableItems = items.filter((item) => item.isAvailable === false || !(item.menuItemId ?? item.id));
    if (unavailableItems.length > 0) {
      window.alert("Bazi taomlar hozir mavjud emas. Savatni tekshiring.");
      navigate('/customer/cart');
      return;
    }

    if (appliedPromo && discount === 0) {
      setPromo(null);
      window.alert('Bu savat uchun promokod qayta tasdiqlanmadi.');
      return;
    }

    if (orderQuoteQuery.isError) {
      window.alert(orderQuoteQuery.error.message || 'Yetkazish narxi hisoblanmadi');
      return;
    }

    if (!orderQuote || orderQuoteQuery.isLoading) {
      window.alert("Yetkazish narxi hali hisoblanmadi. Bir ozdan so'ng yana urinib ko'ring.");
      return;
    }

    const payload = {
      items: quoteItems,
      deliveryAddressId: selectedAddress.id,
      paymentMethod,
      promoCode: discount > 0 ? appliedPromo?.code : undefined,
      note: note || selectedAddress.note,
    };

    createOrderMutation.mutate(payload, {
      onSuccess: (order) => {
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        clearCart();
        resetCheckout();
        navigate(`/customer/order-success?orderId=${order.id}`, { state: { order } });
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Buyurtmani yaratishda xatolik yuz berdi');
      },
    });
  };

  const handleSelectAddress = () => {
    navigate('/customer/addresses', { state: { returnTo: '/customer/checkout' } });
  };

  const handleMapSelection = () => {
    setInitialDraft(selectedAddress ?? undefined);
    navigate('/customer/address/map', { state: { returnTo: '/customer/checkout' } });
  };

  const handleAutoDetectAddress = () => {
    setAddressHint(null);
    setAddressError(null);

    autoDetectAddressMutation.mutate(
      {
        currentAddresses: addresses,
        preferredLabel: selectedAddress?.label || (addresses.length === 0 ? 'Uy' : 'Boshqa'),
      },
      {
        onSuccess: (result) => {
          setAddressHint(result.hint);
        },
        onError: (error) => {
          setAddressError(error.message);
        },
      },
    );
  };

  return (
    <div
      className="min-h-screen animate-in slide-in-from-right duration-300"
      style={{ paddingBottom: '140px' }}
    >
      <section className="px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/customer/cart')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-[1.5rem] font-black tracking-[-0.05em] text-white">Buyurtma yakuni</h1>
            <p className="mt-0.5 text-[11px] leading-tight text-white/45">
              Kod, to'lov va manzilni tekshiring.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2.5 px-4">
        <CheckoutSectionCard title="Yetkazish manzili">
          {selectedAddress ? (
            <SelectedAddressCard
              address={selectedAddress}
              actionLabel="Saqlangan manzillar"
              onAction={handleSelectAddress}
              routeInfo={routeInfo}
            />
          ) : (
            <button
              type="button"
              onClick={handleSelectAddress}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.04] text-sm font-bold text-white"
            >
              <MapPin size={18} />
              <span>Manzil tanlash</span>
            </button>
          )}

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleAutoDetectAddress}
              disabled={autoDetectAddressMutation.isPending}
              className="flex h-10 items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black text-white transition-transform active:scale-[0.985] disabled:opacity-60"
            >
              {autoDetectAddressMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <LocateFixed size={14} />
              )}
              <span>Topish</span> 
            </button>

            <button
              type="button"
              onClick={handleMapSelection}
              className="flex h-10 items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black text-white transition-transform active:scale-[0.985]"
            >
              <MapPin size={14} />
              <span>Xaritadan qidirish</span>
            </button>
          </div>

          {isAddressesLoading ? (
            <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              <Loader2 size={14} className="animate-spin" />
              <span>Manzillar yuklanmoqda</span>
            </div>
          ) : null}

          {addressHint && !addressError ? (
            <p className="mt-3 text-[11px] font-semibold text-emerald-300">{addressHint}</p>
          ) : null}

          {addressError ? (
            <p className="mt-3 text-[11px] font-semibold text-rose-300">{addressError}</p>
          ) : null}

          {orderQuoteQuery.isError ? (
            <p className="mt-3 text-[11px] font-semibold text-rose-300">{orderQuoteQuery.error.message}</p>
          ) : null}
        </CheckoutSectionCard>

        <CheckoutSectionCard title="Chegirma kodi">
          <CustomerPromoInputCard subtotal={subtotal} compact />
        </CheckoutSectionCard>

        <CheckoutSectionCard title="Buyurtma xulosasi">
          <OrderSummaryCard
            routeInfo={routeInfo}
            quote={orderQuote}
            isQuoteLoading={orderQuoteQuery.isLoading}
            compact
          />
        </CheckoutSectionCard>

        <CheckoutSectionCard title="To'lov usuli">
          <PaymentMethodSelector />
        </CheckoutSectionCard>
      </section>

      <div
        className="fixed inset-x-0 z-40 px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }}
      >
        <div className="mx-auto flex h-[72px] w-full max-w-[430px] items-center rounded-[6px] border border-white/10 bg-[#111827]/94 px-3 shadow-[0_16px_32px_rgba(2,6,23,0.34)] backdrop-blur-xl">
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={
              !paymentMethod ||
              !selectedAddress ||
              createOrderMutation.isPending ||
              isProductsLoading ||
              orderQuoteQuery.isLoading ||
              !orderQuote
            }
            className="flex h-12 w-full items-center justify-center gap-3 rounded-[6px] bg-white text-sm font-black text-slate-950 shadow-xl transition-transform active:scale-[0.985] disabled:opacity-60"
          >
            {createOrderMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Yuborilmoqda...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                <span>Tasdiqlash</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
