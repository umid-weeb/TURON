import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, LocateFixed, MapPin, Phone, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { SelectedAddressCard } from '../../components/customer/AddressComponents';
import PaymentMethodSelector from '../../components/customer/PaymentMethodSelector';
import OrderSummaryCard from '../../components/customer/OrderSummaryCard';
import { CheckoutSectionCard, EmptyCartState } from '../../components/customer/CheckoutComponents';
import { CustomerPromoInputCard } from '../../features/promo/components/CustomerPromoInputCard';
import { OrderProcessingOverlay } from '../../hooks/OrderProcessingOverlay';
import { useAddresses, useAutoDetectAndSaveAddress } from '../../hooks/queries/useAddresses';
import { useProducts } from '../../hooks/queries/useMenu';
import { useCreateOrder, useOrderQuote } from '../../hooks/queries/useOrders';
import { useAddressStore } from '../../store/useAddressStore';
import { useCartStore } from '../../store/useCartStore';
import { useCheckoutStore } from '../../store/useCheckoutStore';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/api';
import { createRouteInfoFromMeters } from '../../features/maps/route';

// ── Phone helpers ─────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('998')) return `+${d}`;
  if (d.length === 10 && d.startsWith('0')) return `+998${d.slice(1)}`;
  if (d.length === 9) return `+998${d}`;
  return null;
}

// ── Inline phone entry (shown when user has no phone) ────────────────────────

function InlinePhoneEntry() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const updateUser = useAuthStore((s) => s.updateUser);

  const handleRequestTelegramPhone = () => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.requestPhoneContact) {
      setError("Telegram kontakt so'rashni qo'llab-quvvatlamadi. Raqamni qo'lda kiriting.");
      return;
    }
    tg.requestPhoneContact((response: any) => {
      const phone = response?.response_data?.contact?.phone_number;
      const normalized = phone ? normalizePhone(phone) : null;
      if (response?.status === 'sent' && normalized) {
        setValue(normalized);
        setError('');
      } else {
        setError("Telefon olinmadi. Raqamni qo'lda kiriting.");
      }
    });
  };

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
    } catch (err: any) {
      setError(err?.response?.data?.error || "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-4">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#C62020]">
          <Phone size={17} className="text-white" />
        </div>
        <div>
          <p className="text-[14px] font-black text-slate-900">Telefon raqam kerak</p>
          <p className="text-[11px] font-medium text-slate-500">Kuryer siz bilan bog'lanishi uchun</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRequestTelegramPhone}
        className="mb-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-[13px] border border-red-200 bg-white text-[12px] font-black text-[#C62020] transition-colors active:scale-[0.98]"
      >
        <Phone size={15} />
        <span>Telegramdan raqamni olish</span>
      </button>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2">
        <input
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          placeholder="+998 90 123 45 67"
          className={`h-11 flex-1 rounded-[13px] border px-3 text-[14px] font-bold outline-none transition-colors ${
            error
              ? 'border-red-300 bg-red-100 text-red-700 placeholder:text-red-300'
              : 'border-red-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#C62020]'
          }`}
        />
        <button
          type="submit"
          disabled={saving || !value.trim()}
          className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[13px] bg-[#C62020] px-4 text-[12px] font-black text-white transition-all active:scale-[0.97] disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-[11px] font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
}

// ── Phone entry modal (fallback) ──────────────────────────────────────────────

interface PhoneModalProps {
  onSaved: (phone: string) => void;
  onClose: () => void;
}

function PhoneModal({ onSaved, onClose }: PhoneModalProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const updateUser = useAuthStore((s) => s.updateUser);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncKeyboardInset = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        setKeyboardInset(0);
        return;
      }
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(inset);
    };

    syncKeyboardInset();
    window.visualViewport?.addEventListener('resize', syncKeyboardInset);
    window.visualViewport?.addEventListener('scroll', syncKeyboardInset);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 250);

    return () => {
      window.clearTimeout(focusTimer);
      window.visualViewport?.removeEventListener('resize', syncKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', syncKeyboardInset);
    };
  }, []);

  const handleRequestTelegramPhone = () => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.requestPhoneContact) {
      setError("Telegram kontakt so'rashni qo'llab-quvvatlamadi. Raqamni qo'lda kiriting.");
      return;
    }

    tg.requestPhoneContact((response: any) => {
      const phone = response?.response_data?.contact?.phone_number;
      const normalized = phone ? normalizePhone(phone) : null;
      if (response?.status === 'sent' && normalized) {
        setValue(normalized);
        setError('');
      } else {
        setError("Telefon olinmadi. Raqamni qo'lda kiriting.");
      }
    });
  };

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
      className="fixed inset-0 z-[400] flex items-end justify-center px-3"
      style={{
        background: 'rgba(2,6,23,0.62)',
        backdropFilter: 'blur(8px)',
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${keyboardInset}px + 10px)`,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="max-h-[min(620px,calc(100dvh-24px))] w-full max-w-[430px] overflow-y-auto rounded-[24px] bg-white px-5 pb-5 pt-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
        {/* Handle + close */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-red-50">
              <Phone size={22} className="text-[#C62020]" />
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

        <button
          type="button"
          onClick={handleRequestTelegramPhone}
          className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-red-100 bg-red-50 text-[13px] font-black text-[#C62020] active:scale-[0.98]"
        >
          <Phone size={17} />
          <span>Telegramdan raqamni olish</span>
        </button>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="mb-4">
            <input
              ref={inputRef}
              type="tel"
              inputMode="tel"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); }}
              placeholder="+998 90 123 45 67"
              className={`h-14 w-full rounded-[14px] border px-4 text-[16px] font-bold outline-none transition-colors ${error
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
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-[#C62020] text-[14px] font-black text-white shadow-lg shadow-red-200 transition-all active:scale-[0.98] disabled:opacity-50"
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
  const user = useAuthStore((s) => s.user);
  const hasPhone = Boolean(user?.phoneNumber);
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

    // If already denied, show the small hint immediately. For "prompt" state we
    // just call the mutation directly — the browser will show its native dialog.
    if (navigator.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' } as PermissionDescriptor);
        if (perm.state === 'denied') {
          setLocationPermDenied(true);
          return;
        }
        // "prompt" → fall through and let getCurrentPosition trigger the native dialog
      } catch {
        // Permissions API not available — proceed normally
      }
    }

    autoDetectAddressMutation.mutate(
      {
        currentAddresses: addresses,
        preferredLabel: selectedAddress?.label || (addresses.length === 0 ? 'Uy' : 'Boshqa'),
      },
      {
        onSuccess: (result) => {
          setLocationPermDenied(false);
          setAddressHint(result.hint);
        },
        onError: (error) => {
          // Permission was denied in the native browser dialog
          const msg = error.message ?? '';
          if (msg.toLowerCase().includes('ruxsat') || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
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
      className="bg-white min-h-screen text-[#202020] animate-in slide-in-from-right duration-300"
      style={{ paddingBottom: '140px' }}
    >


      <main className="mx-auto max-w-[430px] px-5 pb-6 pt-2">
        {/* Phone entry — shown inline when user hasn't set a phone number yet */}
        {!hasPhone && (
          <section className="pt-4 pb-5 border-b border-slate-100">
            <InlinePhoneEntry />
          </section>
        )}

        {/* Delivery Address Section */}
        <section className="py-5 border-b border-slate-100 last:border-none">
          <h3 className="mb-3 text-[18px] font-black tracking-tight text-[#202020]">Yetkazish manzili</h3>

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
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#f4f4f5] text-sm font-bold text-[#202020] transition-colors active:bg-slate-200"
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
              className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#f4f4f5] px-3 text-[12px] font-black text-[#202020] transition-colors active:bg-slate-200 disabled:opacity-60"
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
              className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#f4f4f5] px-3 text-[12px] font-black text-[#202020] transition-colors active:bg-slate-200"
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
            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              Brauzer sozlamalarida joylashuvga ruxsat bering, so'ng qayta bosing
            </p>
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
        <section className="py-5 border-b border-slate-100 last:border-none">
          <h3 className="mb-3 text-[18px] font-black tracking-tight text-[#202020]">Buyurtma xulosasi</h3>
          <OrderSummaryCard
            routeInfo={routeInfo}
            quote={orderQuote}
            isQuoteLoading={orderQuoteQuery.isLoading}
            compact
          />
        </section>

        {/* Payment Method Section */}
        <section className="py-5 border-b border-slate-100 last:border-none">
          <h3 className="mb-3 text-[18px] font-black tracking-tight text-[#202020]">To'lov usuli</h3>
          <PaymentMethodSelector />
        </section>
      </main>
      <OrderProcessingOverlay isVisible={createOrderMutation.isPending} />

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
              !hasPhone ||
              !paymentMethod ||
              !selectedAddress ||
              createOrderMutation.isPending ||
              isProductsLoading ||
              orderQuoteQuery.isLoading ||
              !orderQuote ||
              (paymentMethod === 'MANUAL_TRANSFER' && !receiptImage)
            }
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#C62020] text-[15px] font-black text-white shadow-md transition-transform active:scale-[0.97] disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
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
