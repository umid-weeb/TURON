import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Store,
  TimerReset,
  Wifi,
  XCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  loadYandexMaps,
  reverseGeocodeCoordinates,
} from '../../features/maps/yandex';
import type { MapPin as MapPoint } from '../../features/maps/MapProvider';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Tab = 'basic' | 'address' | 'hours' | 'status';

interface WorkingHoursDay {
  open: string;
  close: string;
  closed: boolean;
}

type WorkingHours = Record<DayKey, WorkingHoursDay>;

interface RestaurantSettings {
  name: string;
  phone: string;
  addressText: string;
  longitude: number;
  latitude: number;
  workingHours: WorkingHours;
  isOpen: boolean;
  autoSchedule: boolean;
}

interface RestaurantOpenStatus {
  isOpen: boolean;
  reason: 'manual' | 'schedule' | 'schedule_closed';
  dayKey: DayKey;
  today: WorkingHoursDay;
  nextChange: string | null;
}

const DEFAULT_WORKING_HOURS: WorkingHours = {
  mon: { open: '09:00', close: '22:00', closed: false },
  tue: { open: '09:00', close: '22:00', closed: false },
  wed: { open: '09:00', close: '22:00', closed: false },
  thu: { open: '09:00', close: '22:00', closed: false },
  fri: { open: '09:00', close: '23:00', closed: false },
  sat: { open: '10:00', close: '23:00', closed: false },
  sun: { open: '10:00', close: '21:00', closed: false },
};

const FALLBACK_SETTINGS: RestaurantSettings = {
  name: 'Turon Kafe',
  phone: '',
  addressText: "Yangi Sergeli ko'chasi, 11",
  longitude: 69.240562,
  latitude: 41.311081,
  workingHours: DEFAULT_WORKING_HOURS,
  isOpen: true,
  autoSchedule: false,
};

const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Dushanba',
  tue: 'Seshanba',
  wed: 'Chorshanba',
  thu: 'Payshanba',
  fri: 'Juma',
  sat: 'Shanba',
  sun: 'Yakshanba',
};

const TAB_LABELS: Record<Tab, string> = {
  basic: 'Asosiy',
  address: 'Manzil',
  hours: 'Ish vaqti',
  status: 'Holat',
};

function normalizeUzbekPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('998')) return `+${digits.slice(0, 12)}`;
  return `+998${digits.slice(0, 9)}`;
}

function formatUzbekPhone(value: string) {
  const normalized = normalizeUzbekPhone(value);
  const digits = normalized.replace(/\D/g, '');

  if (digits.length !== 12) return value;
  return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
}

function isValidPhone(value: string) {
  return /^\+998\d{9}$/.test(normalizeUzbekPhone(value));
}

function normalizeSettings(settings: RestaurantSettings): RestaurantSettings {
  return {
    ...settings,
    workingHours: {
      ...DEFAULT_WORKING_HOURS,
      ...(settings.workingHours || {}),
    },
  };
}

function formatTodayLabel(status?: RestaurantOpenStatus) {
  if (!status) return 'Jadval tekshirilmoqda';
  if (status.today.closed) return `${DAY_LABELS[status.dayKey]} yopiq`;
  return `${DAY_LABELS[status.dayKey]}: ${status.today.open} - ${status.today.close}`;
}

function useRestaurantSettings() {
  return useQuery<RestaurantSettings>({
    queryKey: ['admin-restaurant-settings'],
    queryFn: async () => normalizeSettings((await api.get('/admin/restaurant/settings')) as RestaurantSettings),
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 30_000,
  });
}

function useRestaurantOpenStatus() {
  return useQuery<RestaurantOpenStatus>({
    queryKey: ['admin-restaurant-open-status'],
    queryFn: async () => (await api.get('/admin/restaurant/open-status')) as RestaurantOpenStatus,
    refetchInterval: 60_000,
    retry: 1,
  });
}

function useUpdateRestaurantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<RestaurantSettings>) =>
      api.patch('/admin/restaurant/settings', data) as Promise<RestaurantSettings>,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-restaurant-settings'], normalizeSettings(updated));
      queryClient.invalidateQueries({ queryKey: ['admin-restaurant-open-status'] });
    },
  });
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative h-7 w-[52px] rounded-full transition-all active:scale-95 ${
        checked ? 'bg-emerald-500 shadow-[0_8px_18px_rgba(16,185,129,0.28)]' : 'bg-slate-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-2 block text-[11px] font-semibold text-slate-400">{hint}</span> : null}
    </label>
  );
}

function AdminRestaurantMap({
  value,
  onChange,
}: {
  value: RestaurantSettings;
  onChange: (patch: Partial<RestaurantSettings>) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let disposed = false;

    const setPoint = async (coords: number[], withReverseGeocode: boolean) => {
      const [latitude, longitude] = coords;
      onChangeRef.current({ latitude, longitude });

      if (withReverseGeocode) {
        const address = await reverseGeocodeCoordinates({ lat: latitude, lng: longitude });
        if (address) onChangeRef.current({ addressText: address });
      }
    };

    async function initMap() {
      if (!containerRef.current) return;

      try {
        const ymaps = await loadYandexMaps();
        if (disposed || !containerRef.current) return;

        const center = [value.latitude, value.longitude];
        const map = new ymaps.Map(
          containerRef.current,
          {
            center,
            zoom: 16,
            controls: ['zoomControl', 'geolocationControl'],
          },
          {
            suppressMapOpenBlock: true,
          },
        );

        const marker = new ymaps.Placemark(
          center,
          {
            hintContent: value.name || 'Restoran',
            balloonContent: value.addressText || 'Restoran manzili',
          },
          {
            draggable: true,
            preset: 'islands#redIcon',
            iconColor: '#ef4444',
          },
        );

        marker.events.add('dragend', () => {
          const coords = marker.geometry.getCoordinates();
          void setPoint(coords, true);
        });

        map.events.add('click', (event: any) => {
          const coords = event.get('coords');
          marker.geometry.setCoordinates(coords);
          void setPoint(coords, true);
        });

        map.behaviors.enable(['drag', 'multiTouch', 'multiTouchZoom']);
        map.geoObjects.add(marker);

        mapRef.current = map;
        markerRef.current = marker;
        setStatus('ready');
      } catch {
        if (!disposed) setStatus('error');
      }
    }

    void initMap();

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const coords = [value.latitude, value.longitude];
    markerRef.current?.geometry?.setCoordinates?.(coords);
    mapRef.current?.setCenter?.(coords, undefined, { duration: 250 });
  }, [value.latitude, value.longitude]);

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/70 bg-slate-100 shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
      <div ref={containerRef} className="h-[300px] w-full" />

      {status !== 'ready' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 px-6 text-center text-white backdrop-blur-sm">
          {status === 'loading' ? (
            <>
              <RefreshCw className="mb-3 animate-spin text-emerald-300" size={26} />
              <p className="text-sm font-black">Yandex xarita yuklanmoqda</p>
              <p className="mt-1 text-xs text-white/60">Marker siljitilganda manzil avtomatik yangilanadi</p>
            </>
          ) : (
            <>
              <MapPin className="mb-3 text-rose-300" size={28} />
              <p className="text-sm font-black">Xarita yuklanmadi</p>
              <p className="mt-1 text-xs text-white/60">
                Koordinata: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
              </p>
            </>
          )}
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 shadow-lg backdrop-blur">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Tanlangan nuqta</p>
        <p className="mt-1 truncate text-xs font-bold text-slate-700">
          {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
        </p>
      </div>
    </div>
  );
}

function BasicTab({
  draft,
  onChange,
}: {
  draft: RestaurantSettings;
  onChange: (patch: Partial<RestaurantSettings>) => void;
}) {
  const normalizedPhone = normalizeUzbekPhone(draft.phone);
  const phoneReady = isValidPhone(draft.phone);

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/75 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <Field label="Restoran nomi" hint="Bu nom admin panelda va kuryer order sahifasida ishlatiladi">
          <input
            value={draft.name}
            onChange={(event) => onChange({ name: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-bold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="Turon Kafe"
          />
        </Field>

        <div className="mt-4">
          <Field
            label="Restoran telefoni"
            hint="Kuryer restoranga ketayotganda aynan shu raqamga SIM orqali qo'ng'iroq qiladi"
          >
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
              phoneReady ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'
            }`}>
              <Phone size={18} className={phoneReady ? 'text-emerald-600' : 'text-rose-500'} />
              <input
                value={draft.phone}
                onChange={(event) => onChange({ phone: event.target.value })}
                onBlur={() => onChange({ phone: normalizedPhone })}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-black text-slate-900 outline-none"
                inputMode="tel"
                placeholder="+998901234567"
              />
            </div>
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-[24px] border p-4 ${
          phoneReady ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
        }`}>
          <ShieldCheck size={20} className={phoneReady ? 'text-emerald-600' : 'text-rose-500'} />
          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Call tayyorligi</p>
          <p className={`mt-1 text-sm font-black ${phoneReady ? 'text-emerald-700' : 'text-rose-700'}`}>
            {phoneReady ? formatUzbekPhone(normalizedPhone) : 'Telefon kerak'}
          </p>
        </div>
        <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4">
          <Store size={20} className="text-blue-600" />
          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Snapshot</p>
          <p className="mt-1 text-sm font-black text-blue-700">Yangi orderlarga yoziladi</p>
        </div>
      </div>
    </div>
  );
}

function AddressTab({
  draft,
  onChange,
}: {
  draft: RestaurantSettings;
  onChange: (patch: Partial<RestaurantSettings>) => void;
}) {
  const [busy, setBusy] = useState<'search' | 'gps' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locateByAddress = async () => {
    if (draft.addressText.trim().length < 5) {
      setError("Manzil kamida 5 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    setBusy('search');
    setError(null);

    try {
      const ymaps = await loadYandexMaps();
      const result = await ymaps.geocode(`${draft.addressText}, Toshkent`, { results: 1 });
      const first = result.geoObjects.get(0);
      const coords = first?.geometry?.getCoordinates?.();

      if (!coords) throw new Error('coords_not_found');

      const address = first?.getAddressLine?.() || draft.addressText;
      onChange({ latitude: coords[0], longitude: coords[1], addressText: address });
    } catch {
      setError("Bu manzil xaritada topilmadi. Marker orqali qo'lda belgilang.");
    } finally {
      setBusy(null);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Brauzer geolocation funksiyasini qo'llamaydi.");
      return;
    }

    setBusy('gps');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const pin: MapPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        onChange({ latitude: pin.lat, longitude: pin.lng });

        const address = await reverseGeocodeCoordinates(pin);
        if (address) onChange({ addressText: address });
        setBusy(null);
      },
      () => {
        setError("Joylashuvni aniqlab bo'lmadi. Telegram/Browser ruxsatini tekshiring.");
        setBusy(null);
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/75 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <Field label="Manzil matni" hint="Inputdan qidirish yoki xaritada markerga bosib/siljitib tanlash mumkin">
          <textarea
            value={draft.addressText}
            onChange={(event) => onChange({ addressText: event.target.value })}
            rows={2}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="Yangi Sergeli ko'chasi, 11"
          />
        </Field>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void locateByAddress()}
            disabled={busy !== null}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-xs font-black text-white shadow-lg transition active:scale-95 disabled:opacity-60"
          >
            {busy === 'search' ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            Xaritada topish
          </button>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={busy !== null}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 transition active:scale-95 disabled:opacity-60"
          >
            {busy === 'gps' ? <RefreshCw size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            GPS
          </button>
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {error}
          </div>
        ) : null}
      </div>

      <AdminRestaurantMap value={draft} onChange={onChange} />
    </div>
  );
}

function HoursTab({
  draft,
  onChange,
}: {
  draft: RestaurantSettings;
  onChange: (patch: Partial<RestaurantSettings>) => void;
}) {
  const updateDay = (day: DayKey, patch: Partial<WorkingHoursDay>) => {
    onChange({
      workingHours: {
        ...draft.workingHours,
        [day]: { ...draft.workingHours[day], ...patch },
      },
    });
  };

  const applyEveryday = () => {
    const next = DAY_ORDER.reduce((acc, day) => {
      acc[day] = { open: '09:00', close: '22:00', closed: false };
      return acc;
    }, {} as WorkingHours);
    onChange({ workingHours: next });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/75 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-black text-slate-950">Haftalik ish vaqti</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Auto-jadval yoqilganda server shu jadvalni tekshiradi.</p>
          </div>
          <button
            type="button"
            onClick={applyEveryday}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 active:scale-95"
          >
            09-22
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {DAY_ORDER.map((day) => {
            const item = draft.workingHours[day];
            return (
              <div
                key={day}
                className={`rounded-[22px] border p-3 transition ${
                  item.closed ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-800">{DAY_LABELS[day]}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                      {item.closed ? 'Dam olish kuni' : `${item.open} - ${item.close}`}
                    </p>
                  </div>
                  <Toggle checked={!item.closed} onChange={() => updateDay(day, { closed: !item.closed })} />
                </div>

                {!item.closed ? (
                  <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <input
                      type="time"
                      value={item.open}
                      onChange={(event) => updateDay(day, { open: event.target.value })}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-blue-300 focus:bg-white"
                    />
                    <span className="text-xs font-black text-slate-300">to</span>
                    <input
                      type="time"
                      value={item.close}
                      onChange={(event) => updateDay(day, { close: event.target.value })}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-blue-300 focus:bg-white"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusTab({
  draft,
  openStatus,
  onChange,
}: {
  draft: RestaurantSettings;
  openStatus?: RestaurantOpenStatus;
  onChange: (patch: Partial<RestaurantSettings>) => void;
}) {
  const effectiveOpen = openStatus?.isOpen ?? draft.isOpen;

  return (
    <div className="space-y-4">
      <div className={`rounded-[30px] border p-5 shadow-[0_18px_44px_rgba(15,23,42,0.09)] ${
        effectiveOpen
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
          : 'border-rose-200 bg-gradient-to-br from-rose-50 to-white'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Hozirgi holat</p>
            <p className={`mt-2 text-3xl font-black ${effectiveOpen ? 'text-emerald-700' : 'text-rose-700'}`}>
              {effectiveOpen ? 'Ochiq' : 'Yopiq'}
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">
              {formatTodayLabel(openStatus)}
            </p>
          </div>
          <div className={`rounded-3xl p-4 ${effectiveOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {effectiveOpen ? <Wifi size={26} /> : <XCircle size={26} />}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/75 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-900">Jadval bo'yicha avtomatik</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Yoqilsa, restoran holati ish vaqti bo'yicha hisoblanadi.
            </p>
          </div>
          <Toggle checked={draft.autoSchedule} onChange={() => onChange({ autoSchedule: !draft.autoSchedule })} />
        </div>
      </div>

      <div className={`rounded-[28px] border p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)] ${
        draft.autoSchedule ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-white/75 bg-white'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-900">Qo'lda ochish/yopish</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Auto-jadval o'chirilganida ishlaydi.
            </p>
          </div>
          <Toggle
            checked={draft.isOpen}
            disabled={draft.autoSchedule}
            onChange={() => onChange({ isOpen: !draft.isOpen })}
          />
        </div>
      </div>

      <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <TimerReset size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-black text-amber-900">Server tekshiruvi</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-amber-800/80">
              Keyingi o'zgarish: {openStatus?.nextChange ?? "qo'lda boshqariladi"}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantSettingsPage() {
  const { data, isLoading, isError, refetch } = useRestaurantSettings();
  const { data: openStatus } = useRestaurantOpenStatus();
  const updateMutation = useUpdateRestaurantSettings();

  const [tab, setTab] = useState<Tab>('basic');
  const [draft, setDraft] = useState<RestaurantSettings>(() => normalizeSettings(FALLBACK_SETTINGS));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !dirty) {
      setDraft(normalizeSettings(data));
      setDirty(false);
    }
  }, [data, dirty]);

  const validation = useMemo(() => {
    if (!draft) return { ok: false, message: 'Maʼlumot yuklanmoqda' };
    if (draft.name.trim().length < 2) return { ok: false, message: 'Restoran nomini kiriting' };
    if (!isValidPhone(draft.phone)) return { ok: false, message: "Telefon +998XXXXXXXXX formatida bo'lishi kerak" };
    if (draft.addressText.trim().length < 5) return { ok: false, message: 'Restoran manzilini kiriting' };
    if (draft.longitude < 55 || draft.longitude > 75 || draft.latitude < 37 || draft.latitude > 46) {
      return { ok: false, message: "Koordinata O'zbekiston hududida bo'lishi kerak" };
    }
    return { ok: true, message: 'Saqlashga tayyor' };
  }, [draft]);

  const handleChange = (patch: Partial<RestaurantSettings>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!validation.ok) return;

    const payload: RestaurantSettings = {
      ...draft,
      name: draft.name.trim(),
      phone: normalizeUzbekPhone(draft.phone),
      addressText: draft.addressText.trim(),
    };

    const updated = await updateMutation.mutateAsync(payload);
    setDraft(normalizeSettings(updated));
    setDirty(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const effectiveOpen = openStatus?.isOpen ?? draft.isOpen;
  const initialSyncing = isLoading && !data;

  return (
    <div className="space-y-5 pb-6">
      {initialSyncing ? (
        <div className="rounded-[24px] border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black text-blue-700">
          <div className="flex items-center gap-2">
            <RefreshCw size={15} className="animate-spin" />
            Sozlamalar serverdan sinxronlanmoqda. Sahifa ishlashga tayyor.
          </div>
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <XCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-amber-900">Backend sozlamalari vaqtincha kelmadi</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-amber-800/80">
                Sahifa default qiymatlar bilan ochildi. Internet yoki backend tiklanganda qayta yuklab olamiz.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-2xl bg-amber-600 px-3 py-2 text-[11px] font-black text-white active:scale-95"
            >
              Qayta
            </button>
          </div>
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-[32px] bg-slate-950 p-5 text-white shadow-[0_22px_52px_rgba(15,23,42,0.28)]">
        <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-emerald-400/25 blur-2xl" />
        <div className="absolute -bottom-16 left-4 h-36 w-36 rounded-full bg-blue-500/25 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">Restaurant Control</p>
              <h2 className="mt-2 truncate text-2xl font-black tracking-tight">{draft.name || 'Turon Kafe'}</h2>
              <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-white/62">{draft.addressText}</p>
            </div>
            <span className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-black ${
              effectiveOpen ? 'bg-emerald-400 text-slate-950' : 'bg-rose-400 text-white'
            }`}>
              {effectiveOpen ? 'Ochiq' : 'Yopiq'}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <Phone size={16} className="text-emerald-300" />
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Telefon</p>
              <p className="mt-1 truncate text-xs font-black">{formatUzbekPhone(draft.phone)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <Navigation size={16} className="text-blue-300" />
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Nuqta</p>
              <p className="mt-1 truncate text-xs font-black">{draft.latitude.toFixed(3)}, {draft.longitude.toFixed(3)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <Clock3 size={16} className="text-amber-300" />
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Bugun</p>
              <p className="mt-1 truncate text-xs font-black">{openStatus?.today.closed ? 'Yopiq' : openStatus?.today.open ?? '--:--'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+78px)] z-20 -mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2 rounded-[24px] border border-white/80 bg-white/90 p-2 shadow-[0_12px_34px_rgba(15,23,42,0.1)] backdrop-blur-xl">
          {(Object.keys(TAB_LABELS) as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-[18px] px-4 py-2.5 text-xs font-black transition-all active:scale-95 ${
                tab === item
                  ? 'bg-slate-950 text-white shadow-lg'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {TAB_LABELS[item]}
            </button>
          ))}
        </div>
      </div>

      {tab === 'basic' ? <BasicTab draft={draft} onChange={handleChange} /> : null}
      {tab === 'address' ? <AddressTab draft={draft} onChange={handleChange} /> : null}
      {tab === 'hours' ? <HoursTab draft={draft} onChange={handleChange} /> : null}
      {tab === 'status' ? <StatusTab draft={draft} openStatus={openStatus} onChange={handleChange} /> : null}

      <div
        className="sticky z-30 rounded-[26px] border border-white/80 bg-white/95 p-3 shadow-[0_18px_46px_rgba(15,23,42,0.18)] backdrop-blur-xl"
        style={{ bottom: 'calc(env(safe-area-inset-bottom,0px) + 94px)' }}
      >
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <p className={`text-xs font-black ${validation.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
            {validation.message}
          </p>
          <p className="text-[11px] font-black text-slate-400">
            {dirty ? "O'zgarish bor" : saved ? 'Saqlandi' : 'Sinxron'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!validation.ok || updateMutation.isPending || !dirty}
          className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-[20px] text-sm font-black transition active:scale-[0.99] ${
            saved
              ? 'bg-emerald-600 text-white'
              : !validation.ok || !dirty
                ? 'bg-slate-200 text-slate-500'
                : 'bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.25)]'
          }`}
        >
          {updateMutation.isPending ? <RefreshCw size={17} className="animate-spin" /> : <Save size={17} />}
          {saved ? 'Saqlandi' : updateMutation.isPending ? 'Saqlanmoqda...' : 'Sozlamalarni saqlash'}
        </button>
      </div>
    </div>
  );
}
