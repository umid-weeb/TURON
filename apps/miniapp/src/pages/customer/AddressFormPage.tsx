import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAddressStore } from '../../store/useAddressStore';
import { useCreateAddress, useUpdateAddress } from '../../hooks/queries/useAddresses';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';

const AddressFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useCustomerLanguage();
  const { draftAddress, updateDraft, clearDraft, selectAddress } = useAddressStore();
  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();
  const [error, setError] = useState<string | null>(null);
  const returnTo = typeof location.state?.returnTo === 'string' ? location.state.returnTo : null;
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [intercom, setIntercom] = useState('');
  const [courierNote, setCourierNote] = useState('');

  const copy =
    language === 'ru'
      ? {
          badge: 'Adres',
          editTitle: 'Redaktirovanie adresa',
          newTitle: 'Novyi adres',
          subtitle: 'Utochnite detali dostavki.',
          type: 'Tip adresa',
          fullAddress: 'Polnyi adres',
          fullAddressPlaceholder: 'Ulitsa, dom, orientir...',
          entrance: "Pod'ezd",
          floor: 'Etazh',
          apartment: 'Kvartira',
          intercom: 'Domofon',
          note: "Komentariy dlya kur'era",
          notePlaceholder: "Izoh uchun matn...",
          saving: 'Sohranyaetsya...',
          save: 'Sohranit adres',
          addressRequired: 'Iltimos, toliq manzilni kiriting',
          home: 'Uy',
          work: 'Ish',
          other: 'Boshqa',
        }
      : language === 'uz-cyrl'
        ? {
            badge: 'Манзил',
            editTitle: 'Манзилни таҳрирлаш',
            newTitle: 'Янги манзил',
            subtitle: 'Етказиш учун керакли майдонларни тўлдиринг.',
            type: 'Манзил тури',
            fullAddress: 'Тўлиқ манзил',
            fullAddressPlaceholder: 'Кўча, уй, мўлжал...',
            entrance: "Подъезд",
            floor: 'Қават',
            apartment: 'Квартира',
            intercom: 'Домофон',
            note: 'Курьер учун изоҳ',
            notePlaceholder: 'Курьерга изоҳ ёзинг...',
            saving: 'Сақланмоқда...',
            save: 'Манзилни сақлаш',
            addressRequired: 'Илтимос, тўлиқ манзилни киритинг',
            home: 'Уй',
            work: 'Иш',
            other: 'Бошқа',
          }
        : {
            badge: 'Manzil',
            editTitle: 'Manzilni tahrirlash',
            newTitle: 'Yangi manzil',
            subtitle: "Yetkazish uchun kerakli maydonlarni to'ldiring.",
            type: 'Manzil turi',
            fullAddress: "To'liq manzil",
            fullAddressPlaceholder: "Ko'cha, uy, mo'ljal...",
            entrance: "Pod'ezd",
            floor: 'Qavat',
            apartment: 'Kvartira',
            intercom: 'Domofon',
            note: 'Kuryer uchun izoh',
            notePlaceholder: "Kuryerga qo'shimcha izoh yozing",
            saving: 'Saqlanmoqda...',
            save: 'Manzilni saqlash',
            addressRequired: "Iltimos, manzilni to'liq kiriting",
            home: 'Uy',
            work: 'Ish',
            other: 'Boshqa',
          };

  useEffect(() => {
    if (!draftAddress) {
      navigate('/customer/addresses', { replace: true, state: { returnTo } });
    }
  }, [draftAddress, navigate, returnTo]);

  useEffect(() => {
    if (!draftAddress?.note) {
      return;
    }
    const read = (label: string) => {
      const regex = new RegExp(`${label}:\\s*([^;]+)`, 'i');
      const found = draftAddress.note?.match(regex);
      return found ? found[1].trim() : '';
    };
    setEntrance(read("Pod'ezd"));
    setFloor(read('Qavat'));
    setApartment(read('Kvartira'));
    setIntercom(read('Domofon'));
    const noteMatch = draftAddress.note.match(/Izoh:\s*([^;]+)$/i);
    if (noteMatch) {
      setCourierNote(noteMatch[1].trim());
    }
  }, [draftAddress]);

  if (!draftAddress) {
    return null;
  }

  const isSaving = createAddressMutation.isPending || updateAddressMutation.isPending;

  const handleSave = () => {
    if (!draftAddress.addressText?.trim()) {
      setError(copy.addressRequired);
      return;
    }

    setError(null);

    const parts = [
      entrance ? `Pod'ezd: ${entrance}` : null,
      floor ? `Qavat: ${floor}` : null,
      apartment ? `Kvartira: ${apartment}` : null,
      intercom ? `Domofon: ${intercom}` : null,
      courierNote ? `Izoh: ${courierNote}` : null,
    ].filter(Boolean);

    const payload = {
      title: draftAddress.label || copy.home,
      address: draftAddress.addressText.trim(),
      note: parts.length ? parts.join('; ') : undefined,
      latitude: draftAddress.latitude || 41.2995,
      longitude: draftAddress.longitude || 69.2401,
    };

    const onSuccess = (savedAddress: { id: string }) => {
      selectAddress(savedAddress.id);
      clearDraft();
      if (returnTo) {
        navigate(returnTo, { replace: true });
        return;
      }
      navigate('/customer/addresses');
    };

    const onError = (mutationError: Error) => {
      setError(mutationError.message);
    };

    if (draftAddress.id) {
      updateAddressMutation.mutate({ id: draftAddress.id, data: payload }, { onSuccess, onError });
      return;
    }

    createAddressMutation.mutate(payload, { onSuccess, onError });
  };

  const labels = [copy.home, copy.work, copy.other];

  return (
    <div
      className="min-h-screen animate-in fade-in slide-in-from-bottom duration-300"
      style={{ paddingBottom: 'calc(var(--customer-nav-top-edge, 78px) + 96px)' }}
    >
      <header className="sticky top-0 z-20 bg-[#0b1220]/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">{copy.badge}</p>
            <h2 className="mt-1 text-lg font-black text-white">{draftAddress.id ? copy.editTitle : copy.newTitle}</h2>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-white/58">{copy.subtitle}</p>
      </header>

      <section className="space-y-4 px-4 pt-4">
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{copy.type}</label>
          <div className="grid grid-cols-3 gap-2">
            {labels.map((label) => (
              <button
                key={label}
                onClick={() => updateDraft({ label })}
                className={`h-10 rounded-[12px] border text-xs font-black transition-all ${
                  draftAddress.label === label
                    ? 'border-amber-300/40 bg-amber-400/20 text-amber-100'
                    : 'border-white/8 bg-white/[0.04] text-white/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{copy.fullAddress}</label>
          <textarea
            value={draftAddress.addressText || ''}
            onChange={(event) => updateDraft({ addressText: event.target.value })}
            placeholder={copy.fullAddressPlaceholder}
            className="min-h-[96px] w-full rounded-[12px] border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold text-white outline-none placeholder:text-white/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{copy.entrance}</label>
            <input
              value={entrance}
              onChange={(event) => setEntrance(event.target.value)}
              className="h-11 w-full rounded-[12px] border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{copy.floor}</label>
            <input
              value={floor}
              onChange={(event) => setFloor(event.target.value)}
              className="h-11 w-full rounded-[12px] border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{copy.apartment}</label>
            <input
              value={apartment}
              onChange={(event) => setApartment(event.target.value)}
              className="h-11 w-full rounded-[12px] border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{copy.intercom}</label>
            <input
              value={intercom}
              onChange={(event) => setIntercom(event.target.value)}
              className="h-11 w-full rounded-[12px] border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{copy.note}</label>
          <textarea
            value={courierNote}
            onChange={(event) => setCourierNote(event.target.value)}
            placeholder={copy.notePlaceholder}
            className="min-h-[84px] w-full rounded-[12px] border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold text-white outline-none placeholder:text-white/30"
          />
        </div>

        {error ? (
          <div className="rounded-[12px] border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200">
            {error}
          </div>
        ) : null}
      </section>

      <div
        className="fixed inset-x-0 z-40 px-4"
        style={{ bottom: 'var(--customer-floating-cart-offset, calc(env(safe-area-inset-bottom, 0px) + 88px))' }}
      >
        <div className="mx-auto flex h-[72px] w-full max-w-[430px] items-center rounded-[14px] border border-white/10 bg-[#111827]/94 px-3 shadow-[0_16px_32px_rgba(2,6,23,0.34)] backdrop-blur-xl">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-white text-sm font-black text-slate-950 transition-transform active:scale-[0.985] disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{copy.saving}</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>{copy.save}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressFormPage;
