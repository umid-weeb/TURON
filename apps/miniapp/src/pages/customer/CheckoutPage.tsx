import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/useCartStore';
import { useCheckoutStore } from '../../store/useCheckoutStore';
import { useAddressStore } from '../../store/useAddressStore';
import { usePromoStore } from '../../store/usePromoStore';
import { CheckoutSectionCard, CheckoutNoteField, EmptyCartState } from '../../components/customer/CheckoutComponents';
import { SelectedAddressCard } from '../../components/customer/AddressComponents';
import PaymentMethodSelector from '../../components/customer/PaymentMethodSelector';
import OrderSummaryCard from '../../components/customer/OrderSummaryCard';
import { CustomerPromoInputCard } from '../../features/promo/components/CustomerPromoInputCard';
import { CheckCircle2, Plus, Loader2, ChevronLeft } from 'lucide-react';
import { useCreateOrder } from '../../hooks/queries/useOrders';

const stepNames = ['Manzil', 'To’lov', 'Tekshir'];

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const { items, getSubtotal, appliedPromo, clearCart } = useCartStore();
  const { paymentMethod, note, resetCheckout } = useCheckoutStore();
  const { getSelectedAddress, setInitialDraft } = useAddressStore();
  const { incrementPromoUsage } = usePromoStore();
  const createOrderMutation = useCreateOrder();

  const selectedAddress = getSelectedAddress();
  const subtotal = getSubtotal();

  if (items.length === 0) {
    return <EmptyCartState />;
  }

  const hasAddress = Boolean(selectedAddress);
  const canContinueStep = step === 1 ? hasAddress : true;

  const handleAddNewAddress = () => {
    setInitialDraft();
    navigate('/customer/address/new');
  };

  const handleNextStep = () => {
    if (!canContinueStep) {
      return;
    }
    if (step < 3) {
      setStep((prev) => prev + 1);
      return;
    }

    if (!selectedAddress || !paymentMethod || createOrderMutation.isPending) return;

    const payload = {
      items: items.map((item) => ({ menuItemId: item.id, quantity: item.quantity })),
      deliveryAddressId: selectedAddress.id,
      paymentMethod,
      promoCode: appliedPromo?.code,
      note: note || selectedAddress.note,
    };

    createOrderMutation.mutate(payload, {
      onSuccess: (order: any) => {
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        if (appliedPromo) {
          incrementPromoUsage(appliedPromo.id);
        }

        clearCart();
        resetCheckout();

        navigate('/customer/order-success', { state: { order } });
      },
      onError: (error: any) => {
        alert(error.message || 'Buyurtma berishda xatolik yuz berdi');
      },
    });
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    } else {
      navigate('/customer/cart');
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-44 px-1">
      <div className="flex items-center justify-between gap-2">
        <button onClick={handleBack} className="w-10 h-10 grid place-items-center rounded-xl bg-gray-100 text-gray-600 active:scale-95 transition-transform">
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 grid grid-cols-3 gap-2">
          {stepNames.map((label, index) => {
            const idx = index + 1;
            const active = idx === step;
            return (
              <div key={label} className={`p-2 rounded-xl border text-[11px] font-black uppercase tracking-wide text-center ${active ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-gray-200 text-gray-500'}`}>
                {label}
              </div>
            );
          })}
        </div>

        <div className="w-10" />
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-gray-900">Yetkazib berish manzili</h2>
          {selectedAddress ? (
            <SelectedAddressCard
              address={selectedAddress}
              actionLabel="O'zgartirish"
              onAction={() => navigate('/customer/addresses')}
            />
          ) : (
            <button
              onClick={handleAddNewAddress}
              className="w-full h-20 bg-amber-50 border-2 border-dashed border-amber-200 rounded-[28px] flex items-center justify-center gap-3 text-amber-600 font-black active:bg-amber-100 transition-all"
            >
              <Plus size={24} />
              Manzil qo'shish
            </button>
          )}

          {!hasAddress && <p className="text-red-500 text-sm font-black">Yetkazib berish manzili talab qilinadi.</p>}
        </div>
      )}

      {step === 2 && (
        <CheckoutSectionCard title="To'lov usuli">
          <PaymentMethodSelector />
        </CheckoutSectionCard>
      )}

      {step === 3 && (
        <>
          <CheckoutSectionCard title="Buyurtma tafsilotlari">
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-500 text-xs w-6">{item.quantity}x</span>
                    <span className="font-bold text-gray-700">{item.name}</span>
                  </div>
                  <span className="font-black text-gray-900">{(item.price * item.quantity).toLocaleString()} so'm</span>
                </div>
              ))}
            </div>
          </CheckoutSectionCard>

          <CheckoutSectionCard title="Yetkazib berish eslatmasi">
            <CheckoutNoteField />
          </CheckoutSectionCard>

          <CustomerPromoInputCard subtotal={subtotal} />
          <OrderSummaryCard />
        </>
      )}

      <div className="fixed bottom-24 left-0 right-0 px-6 z-40 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pt-10 pb-2">
        <button
          onClick={handleNextStep}
          disabled={!canContinueStep || createOrderMutation.isPending}
          className="w-full h-16 bg-amber-600 text-white rounded-[28px] font-black text-lg shadow-2xl shadow-amber-200 active:bg-amber-700 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
        >
          {createOrderMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              <span>Yuborilmoqda...</span>
            </>
          ) : (
            <span>{step < 3 ? 'Keyingi bosqich' : 'Buyurtmani tasdiqlash'}</span>
          )}
        </button>

        {!hasAddress && step === 1 && (
          <p className="text-center text-red-500 text-[10px] uppercase font-black tracking-widest mt-3 animate-pulse">
            Manzil tanlang, keyin davom eting.
          </p>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
