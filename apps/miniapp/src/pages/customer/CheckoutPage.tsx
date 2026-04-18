import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, LocateFixed, MapPin, MapPinOff, Phone, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
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
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/api';
import { createRouteInfoFromMeters } from '../../features/maps/route';

// ── Location permission denied card ──────────────────────────────────────────

function LocationPermissionCard({ onRetry }: { onRetry: () => void }) {
  // Detect browser for tailored instructions
  const ua = navigator.userAgent;
  const isChrome  = /Chrome/.test(ua) && !/Edg|OPR/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari  = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isEdge    = /Edg/.test(ua);

  let steps: string;
  if (isChrome || isEdge)  steps = "Manzil satridagi 🔒 belgini bosing → «Sayt sozlamalari» → «Joylashuv» → «Ruxsat»";
  else if (isFirefox)      steps = "Manzil satridagi qalqon belgini bosing → «Ruxsatlar» → «Joylashuvga ruxsat bering»";
  else if (isSafari)       steps = "Safari → Sozlamalar → Veb-saytlar → Joylashuv → Ruxsat bering";
  else                     steps = "Brauzer sozlamalarida ushbu sayt uchun joylashuvga ruxsat bering";

  return (
    <div className="mt-3 rounded-[16px] border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <MapPinOff size={16} className="text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-black text-slate-900">Joylashuv ruxsati kerak</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{steps}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[12px] bg-amber-400 text-[12px] font-black text-slate-950 active:scale-[0.97] transition-transform"
      >
        <LocateFixed size={13} />
        Qayta urinish
      </button>
    </div>
  );
}

// ── Phone entry modal ─────────────────────────────────────────────────────────

function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('998')) return `+${d}`;
  if (d.length === 10 && d.startsWith('0')) return `+998${d.slice(1)}`;
  if (d.length === 9) return `+998${d}`;
  return null;
}

interface PhoneModalProps {
  onSaved: (phone: string) => void;
  onClose: () => void;
}

function PhoneModal({ onSaved, onClose }: PhoneModalProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const updateUser = useAuthStore((s) => s.updateUser);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = normalizePhone(value);
    if (!normalized) {
      setError("Noto'g'ri format. Masalan: +998 90 123 45 67");
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch('/users/me/phone', { phone: normalized }) as { phoneNumber: string };
      updateUser({ phoneNumber: res.phoneNumber });
      onSaved(res.phoneNumber);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[390px] rounded-t-[28px] bg-white px-5 pt-6 pb-8 shadow-2xl">
        {/* Handle + close */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <Phone size={22} className="text-amber-500" />
            </div>
            <h2 className="text-[18px] font-black text-slate-900">Telefon raqam kerak</h2>
            <p className="mt-1 text-[13px] font-medium text-slate-500">
              Yetkazish uchun kuryer siz bilan bog'lanishi kerak
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 active:scale-95"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="mb-4">
            <input
              ref={inputRef}
              type="tel"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); }}
              placeholder="+998 90 123 45 67"
              className={`h-14 w-full rounded-[14px] border px-4 text-[15px] font-bold outline-none transition-colors ${error
                ? 'border-red-300 bg-red-50 text-red-700 placeholder:text-red-300'
                : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white'
                }`}
            />
            {error && (
              <p className="mt-2 text-[12px] font-semibold text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || !value.trim()}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-amber-500 text-[14px] font-black text-white shadow-lg shadow-amber-200 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : null}
            {saving ? 'Saqlanmoqda...' : 'Tasdiqlash va buyurtma berish'}
          </button>
        </form>
      </div>
    </div>
  );
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { items, getSubtotal, getDiscount, appliedPromo, clearCart, setPromo, syncWithProducts } = useCartStore();
  const { paymentMethod, note, receiptImage, resetCheckout } = useCheckoutStore();
  const { selectedAddressId, selectAddress, setInitialDraft } = useAddressStore();
  const createOrderMutation = useCreateOrder();
  const autoDetectAddressMutation = useAutoDetectAndSaveAddress();
  const { data: addresses = [], isLoading: isAddressesLoading } = useAddresses();
  const { data: products = [], isLoading: isProductsLoading, isError: isProductsError } = useProducts();
  const [addressHint, setAddressHint] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [locationPermDenied, setLocationPermDenied] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  // Holds the payload to re-submit after user saves their phone
  const pendingPayloadRef = useRef<object | null>(null);

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

    // Require receipt image when paying by card
    if (paymentMethod === 'MANUAL_TRANSFER' && !receiptImage) {
      showToast("Iltimos, to'lov chekini (screenshot) yuklang.", 'warning');
      return;
    }

    if (isProductsLoading) {
      showToast("Savat yangilanmoqda. Bir ozdan so'ng urinib ko'ring.", 'warning');
      return;
    }

    const unavailableItems = items.filter((item) => item.isAvailable === false || !(item.menuItemId ?? item.id));
    if (unavailableItems.length > 0) {
      showToast("Ba'zi taomlar hozir mavjud emas. Savatni tekshiring.", 'warning');
      navigate('/customer/cart');
      return;
    }

    if (appliedPromo && discount === 0) {
      setPromo(null);
      showToast("Bu savat uchun promokod amal qilmadi.", 'warning');
      return;
    }

    if (orderQuoteQuery.isError) {
      showToast(orderQuoteQuery.error.message || 'Yetkazish narxi hisoblanmadi', 'error');
      return;
    }

    if (!orderQuote || orderQuoteQuery.isLoading) {
      showToast("Yetkazish narxi hisoblanmoqda. Bir ozdan so'ng urinib ko'ring.", 'info');
      return;
    }

    const payload = {
      idempotencyKey: crypto.randomUUID(),
      items: quoteItems,
      deliveryAddressId: selectedAddress.id,
      paymentMethod,
      promoCode: discount > 0 ? appliedPromo?.code : undefined,
      note: note || selectedAddress.note,
      receiptImageBase64: paymentMethod === 'MANUAL_TRANSFER' ? receiptImage : undefined,
    };

    pendingPayloadRef.current = payload;

    createOrderMutation.mutate(payload, {
      onSuccess: (order) => {
        pendingPayloadRef.current = null;
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
        clearCart();
        resetCheckout();
        navigate(`/customer/order-success?orderId=${order.id}`, { state: { order } });
      },
      onError: (error: Error) => {
        // Backend: phone number missing — show the quick-entry modal
        if ((error as any).code === 'PHONE_REQUIRED') {
          setShowPhoneModal(true);
          return;
        }
        pendingPayloadRef.current = null;
        showToast(error.message || 'Buyurtmani yaratishda xatolik yuz berdi', 'error');
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

  const handleAutoDetectAddress = async () => {
    setAddressHint(null);
    setAddressError(null);
    setLocationPermDenied(false);

    // Pre-check permission using Permissions API (desktop browsers support this).
    // If already denied, show the instruction card immediately — no need to call
    // getCurrentPosition and get an instant silent error.
    if (navigator.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' } as PermissionDescriptor);
        if (perm.state === 'denied') {
          setLocationPermDenied(true);
          return;
        }
      } catch {
        // Permissions API not available in this browser — proceed normally
      }
    }

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
          // Permission was denied during the request (user clicked Block in the dialog)
          const msg = error.message ?? '';
          if (msg.toLowerCase().includes('ruxsat') || msg.toLowerCase().includes('permission')) {
            setLocationPermDenied(true);
          } else {
            setAddressError(msg);
          }
        },
      },
    );
  };

  return (
    <div
      className="min-h-screen bg-[#f6f6f7] text-[#202020] animate-in slide-in-from-right duration-300"
      style={{ paddingBottom: '140px' }}
    >
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 px-4 backdrop-blur-xl">
        <div className="mx-auto flex h-[56px] w-full max-w-[430px] items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/customer/cart')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 px-3 text-center">
            <h1 className="text-[17px] font-black tracking-tight text-slate-950">Buyurtma yakuni</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-[430px] px-4 pb-6 pt-4 space-y-3">
        {/* Delivery Address Section */}
        <section className="rounded-[24px] bg-white px-4 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.035]">
          <div className="mb-3">
            <p className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#a0a0a8]">Yetkazish</p>
            <h3 className="mt-1.5 text-[18px] font-black text-slate-950">Manzilni tanlang</h3>
          </div>

          {selectedAddress ? (
            <SelectedAddressCard
              address={selectedAddress}
              actionLabel="O'zgartirish"
              onAction={handleSelectAddress}
              routeInfo={routeInfo}
            />
          ) : (
            <button
              type="button"
              onClick={handleSelectAddress}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white text-sm font-bold text-slate-950 transition-all active:scale-[0.97]"
            >
              <MapPin size={18} />
              <span>Manzil tanlash</span>
            </button>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { void handleAutoDetectAddress(); }}
              disabled={autoDetectAddressMutation.isPending}
              className="flex h-10 items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-950 transition-transform active:scale-[0.97] disabled:opacity-60"
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
              className="flex h-10 items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-950 transition-transform active:scale-[0.97]"
            >
              <MapPin size={14} />
              <span>Xaritada</span>
            </button>
          </div>

          {isAddressesLoading ? (
            <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              <span>Yuklanmoqda</span>
            </div>
          ) : null}

          {addressHint && !addressError ? (
            <p className="mt-3 text-[11px] font-semibold text-emerald-600">{addressHint}</p>
          ) : null}

          {locationPermDenied ? (
            <LocationPermissionCard onRetry={handleAutoDetectAddress} />
          ) : addressError ? (
            <p className="mt-3 text-[11px] font-semibold text-red-600">{addressError}</p>
          ) : null}

          {orderQuoteQuery.isError ? (
            <p className="mt-3 text-[11px] font-semibold text-red-600">{orderQuoteQuery.error.message}</p>
          ) : null}
        </section>

        {appliedPromo ? (
          <CheckoutSectionCard title="Chegirma kodi">
            <CustomerPromoInputCard subtotal={subtotal} compact />
          </CheckoutSectionCard>
        ) : null}

        {/* Order Summary Section */}
        <section className="rounded-[24px] bg-white px-4 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.035]">
          <div className="mb-3">
            <p className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#a0a0a8]">Hisob-kitob</p>
            <h3 className="mt-1.5 text-[18px] font-black text-slate-950">Buyurtma xulosasi</h3>
          </div>
          <OrderSummaryCard
            routeInfo={routeInfo}
            quote={orderQuote}
            isQuoteLoading={orderQuoteQuery.isLoading}
            compact
          />
        </section>

        {/* Payment Method Section */}
        <section className="rounded-[24px] bg-white px-4 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.035]">
          <div className="mb-3">
            <p className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#a0a0a8]">To'lov</p>
            <h3 className="mt-1.5 text-[18px] font-black text-slate-950">To'lov usuli</h3>
          </div>
          <PaymentMethodSelector />
        </section>
      </main>
      {/* ── Phone entry modal — shown when backend rejects with PHONE_REQUIRED ── */}
      {showPhoneModal && (
        <PhoneModal
          onSaved={() => {
            setShowPhoneModal(false);
            // Re-submit the order now that we have a phone number
            if (pendingPayloadRef.current) {
              createOrderMutation.mutate(pendingPayloadRef.current as any, {
                onSuccess: (order) => {
                  pendingPayloadRef.current = null;
                  if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                  }
                  clearCart();
                  resetCheckout();
                  navigate(`/customer/order-success?orderId=${order.id}`, { state: { order } });
                },
                onError: (err: Error) => {
                  pendingPayloadRef.current = null;
                  showToast(err.message || 'Buyurtmani yaratishda xatolik yuz berdi', 'error');
                },
              });
            }
          }}
          onClose={() => setShowPhoneModal(false)}
        />
      )}

      <div
        className="fixed inset-x-0 z-40 px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        <div className="mx-auto flex h-[56px] w-full max-w-[430px] items-center rounded-[20px] bg-white shadow-lg shadow-black/10">
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={
              !paymentMethod ||
              !selectedAddress ||
              createOrderMutation.isPending ||
              isProductsLoading ||
              orderQuoteQuery.isLoading ||
              !orderQuote ||
              (paymentMethod === 'MANUAL_TRANSFER' && !receiptImage)
            }
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-black text-white shadow-sm transition-transform active:scale-[0.97] disabled:opacity-50"
          >
            {createOrderMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Yuborilmoqda...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>{paymentMethod === 'MANUAL_TRANSFER' ? "To'lov qildim" : 'Tasdiqlash'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
