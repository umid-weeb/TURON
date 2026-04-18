import React from 'react';
import {
  Briefcase,
  Check,
  Clock3,
  Edit2,
  Home,
  MapPin,
  MessageCircle,
  Navigation,
  Route,
  Trash2,
} from 'lucide-react';
import type { Address } from '../../data/types';
import type { RouteInfo } from '../../features/maps/MapProvider';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';

export const AddressCard: React.FC<{
  address: Address;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ address, isSelected, onSelect, onEdit, onDelete }) => {
  const { formatText } = useCustomerLanguage();
  const Icon = address.label === 'Uy' ? Home : address.label === 'Ish' ? Briefcase : MapPin;

  return (
    <div
      className={`rounded-[12px] border p-3 transition-all ${isSelected ? 'border-amber-300/20 bg-amber-400/10' : 'border-white/8 bg-[#111827]'
        }`}
      onClick={() => onSelect(address.id)}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[12px] ${isSelected ? 'bg-white text-slate-950' : 'bg-white/[0.06] text-white'}`}>
          <Icon size={24} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-black tracking-tight text-white">{formatText(address.label)}</h4>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/36">
                Yetkazish nuqtasi
              </p>
            </div>
            {isSelected ? (
              <div className="rounded-full bg-amber-300 p-1 text-slate-950">
                <Check size={14} strokeWidth={4} />
              </div>
            ) : null}
          </div>

          <p className="text-sm leading-6 text-white/62">{formatText(address.addressText)}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(address.id);
              }}
              className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/72"
            >
              <span className="flex items-center gap-1.5">
                <Edit2 size={12} />
                Tahrirlash
              </span>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(address.id);
              }}
              className="rounded-full border border-rose-300/18 bg-rose-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-rose-200"
            >
              <span className="flex items-center gap-1.5">
                <Trash2 size={12} />
                O'chirish
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SelectedAddressCard: React.FC<{
  address: Address;
  onAction: () => void;
  actionLabel: string;
  routeInfo?: RouteInfo | null;
}> = ({ address, onAction, actionLabel, routeInfo }) => {
  const { formatText } = useCustomerLanguage();

  return (
    <div className="rounded-[20px] bg-[#f4f4f5] p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-red-50 text-[#C62020]">
          <MapPin size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black tracking-tight text-slate-950">{formatText(address.label)}</h4>
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600 line-clamp-2">{formatText(address.addressText)}</p>

          {address.note ? (
            <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
              <MessageCircle size={11} />
              <span className="truncate">{formatText(address.note)}</span>
            </div>
          ) : null}

          {routeInfo ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Route size={11} />
                  {routeInfo.distance}
                </span>
              </div>
              <div className="rounded-full border border-emerald-300/40 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                <span className="flex items-center gap-1.5">
                  <Clock3 size={11} />
                  {routeInfo.eta}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onAction}
          aria-label={actionLabel}
          title={actionLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#202020] shadow-sm transition-colors active:scale-95 active:bg-[#C62020] active:text-white"
        >
          <Edit2 size={16} />
        </button>
      </div>
    </div>
  );
};

export const AddressEmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="rounded-[12px] border border-white/8 bg-[#111827] px-8 py-12 text-center">
    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[16px] border border-white/8 bg-white/[0.06] text-white/78">
      <Navigation size={40} />
    </div>
    <h3 className="text-2xl font-black tracking-tight text-white">Manzil hali qo'shilmagan</h3>
    <p className="mt-3 text-sm leading-7 text-white/56">
      Checkout boshlanishidan oldin qulay yetkazish nuqtasini bir marta saqlab qo'ying.
    </p>
    <button
      type="button"
      onClick={onAdd}
      className="mt-8 inline-flex h-12 items-center gap-3 rounded-[12px] bg-white px-6 text-sm font-black uppercase tracking-[0.14em] text-slate-950"
    >
      <MapPin size={18} />
      <span>Manzil qo'shish</span>
    </button>
  </div>
);

export const GeoLocationButton: React.FC<{
  loading: boolean;
  onClick: () => void;
  error?: string | null;
  hint?: string | null;
  disabled?: boolean;
}> = ({ loading, onClick, error, hint, disabled = false }) => (
  <div className="w-full">
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex h-12 w-full items-center justify-center gap-3 rounded-[12px] border text-sm font-black uppercase tracking-[0.14em] transition-all ${loading || disabled
          ? 'border-white/8 bg-white/[0.04] text-white/36'
          : 'border-white/10 bg-white text-slate-950 shadow-[0_18px_36px_rgba(255,255,255,0.08)]'
        }`}
    >
      {loading ? (
        <>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Aniqlanmoqda...</span>
        </>
      ) : (
        <>
          <Navigation size={20} />
          <span>Joylashuvimni aniqlash</span>
        </>
      )}
    </button>
    {hint && !error ? <p className="mt-2 text-center text-[11px] font-semibold text-emerald-300">{hint}</p> : null}
    {error ? <p className="mt-2 text-center text-[11px] font-semibold text-rose-300">{error}</p> : null}
  </div>
);
