import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Map, Navigation, CheckCircle2 } from 'lucide-react';
import { useAddressStore } from '../../store/useAddressStore';
import { GeoLocationButton } from '../../components/customer/AddressComponents';
import { AppButton, AppInput } from '../../components/ui/GlobalComponents';

const AddressFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { draftAddress, updateDraft, saveAddress, clearDraft } = useAddressStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draftAddress) {
      navigate('/customer/addresses');
    }
  }, [draftAddress, navigate]);

  if (!draftAddress) return null;

  const handleSave = () => {
    if (!draftAddress.addressText?.trim()) {
      setError('Iltimos, manzilni to\'liq kiriting');
      return;
    }

    if (draftAddress.latitude && (draftAddress.latitude < -90 || draftAddress.latitude > 90)) {
      setError('Latitude -90 dan 90 gacha bo\'lishi kerak');
      return;
    }

    if (draftAddress.longitude && (draftAddress.longitude < -180 || draftAddress.longitude > 180)) {
      setError('Longitude -180 dan 180 gacha bo\'lishi kerak');
      return;
    }

    saveAddress(draftAddress);
    clearDraft();
    navigate('/customer/addresses');
  };

  const handleGetLocation = () => {
    setLoading(true);
    setError(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateDraft({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            // In a real app, we would reverse geocode here
            addressText: draftAddress.addressText || "Mening joylashuvim koordinatalari bo'yicha"
          });
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setError("Joylashuvni aniqlab bo'lmadi. Iltimos, ruxsat bering.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolokatsiya qo'llab-quvvatlanmaydi");
      setLoading(false);
    }
  };

  const labels = ['Uy', 'Ish', 'Boshqa'];

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {draftAddress.id ? "Manzilni tahrirlash" : "Yangi manzil"}
        </h2>
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">E'tibor bilan to'ldiring</p>
      </div>

      {/* Label Selection */}
      <div className="space-y-3">
        <label className="text-slate-400 text-[11px] font-black uppercase tracking-widest ml-1">Manzil turi</label>
        <div className="flex gap-3">
          {labels.map((l) => (
            <button
              key={l}
              onClick={() => updateDraft({ label: l })}
              className={`
                flex-1 h-12 rounded-2xl font-bold text-sm transition-all border-2
                ${draftAddress.label === l 
                  ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' 
                  : 'bg-white border-slate-100 text-slate-400'}
              `}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Address Input */}
      <div className="space-y-3">
        <label className="text-slate-400 text-[11px] font-black uppercase tracking-widest ml-1">To'liq manzil</label>
        <div className="relative">
          <textarea
            value={draftAddress.addressText || ''}
            onChange={(e) => updateDraft({ addressText: e.target.value })}
            placeholder="Ko'cha, uy raqami, mo'ljal..."
            className="w-full bg-white border-2 border-slate-100 rounded-[28px] p-5 pt-6 text-slate-900 font-bold placeholder:text-slate-300 focus:border-amber-500 focus:outline-none transition-colors min-h-[120px] shadow-sm"
          />
          <div className="absolute top-4 right-5 text-amber-500">
            <CheckCircle2 size={24} className={draftAddress.addressText ? 'opacity-100' : 'opacity-0'} />
          </div>
        </div>
      </div>

      {/* Manual Coordinates */}
      <div className="grid grid-cols-2 gap-3">
        <AppInput
          label="Latitude"
          type="number"
          value={draftAddress.latitude || ''}
          onChange={(e) => updateDraft({ latitude: Number(e.target.value) })}
          placeholder="41.2995"
          className="bg-white"
        />
        <AppInput
          label="Longitude"
          type="number"
          value={draftAddress.longitude || ''}
          onChange={(e) => updateDraft({ longitude: Number(e.target.value) })}
          placeholder="69.2401"
          className="bg-white"
        />
      </div>

      {/* Geolocation & Map actions */}
      <div className="grid grid-cols-1 gap-4">
        <GeoLocationButton 
          loading={loading} 
          onClick={handleGetLocation} 
          error={error} 
        />
        
        <button 
          onClick={() => navigate('/customer/address/map')}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest active:scale-98 transition-transform shadow-lg shadow-slate-200"
        >
          <Map size={20} />
          <span>Xaritadan tanlash</span>
        </button>
      </div>

      {/* Delivery Note */}
      <div className="space-y-3">
        <AppInput
          label="Kuryer uchun eslatma (ixtiyoriy)"
          type="text"
          value={draftAddress.note || ''}
          onChange={(e) => updateDraft({ note: e.target.value })}
          placeholder="Uy kodi, qavat, kirish yo'li..."
          className="bg-white font-bold placeholder:text-slate-300"
        />
      </div>

      {/* Save Button */}
      <div className="fixed bottom-24 left-0 right-0 px-6 z-40 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pt-10 pb-2">
        <AppButton
          onClick={handleSave}
          variant="primary"
          size="lg"
          fullWidth
          icon={<Save size={24} />}
          className="rounded-[24px]"
        >
          Manzilni saqlash
        </AppButton>
      </div>
    </div>
  );
};

export default AddressFormPage;
