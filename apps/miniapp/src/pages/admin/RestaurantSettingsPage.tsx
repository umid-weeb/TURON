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
  CheckCircle2 as CheckCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  toLngLat,
  loadYandexMaps3,
} from '../../features/maps/yandex3';
import { fetchAddressSuggestions, reverseGeocodePin } from '../../features/maps/api';

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

function normalizeSettings(settings: any): RestaurantSettings {
  if (!settings) return FALLBACK_SETTINGS;
  return {
    ...FALLBACK_SETTINGS,
    ...settings,
    workingHours: { ...DEFAULT_WORKING_HOURS, ...(settings.workingHours || {}) },
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
    queryFn: async () => normalizeSettings(await api.get('/admin/restaurant/settings')),
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
    mutationFn: (data: Partial<RestaurantSettings>) => api.patch('/admin/restaurant/settings', data) as Promise<any>,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-restaurant-settings'], normalizeSettings(updated));
      queryClient.invalidateQueries({ queryKey: ['admin-restaurant-open-status'] });
    },
  });
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative h-7 w-[52px] rounded-full transition-all active:scale-95 ${
        checked ? 'bg-emerald-500 shadow-[0_8px_18px_rgba(16,185,129,0.28)]' : 'bg-slate-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  );
}

function AdminRestaurantMap({ value, onChange }: { value: RestaurantSettings; onChange: (patch: Partial<RestaurantSettings>) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const centerRef = useRef<{ lat: number; lng: number }>({ lat: value.latitude, lng: value.longitude });
  const pointerDownRef = useRef(false);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let disposed = false;
    async function initMap() {
      if (!containerRef.current) return;
      try {
        const ymaps3 = await loadYandexMaps3();
        if (disposed || !containerRef.current) return;
        const centerPin = { lat: value.latitude, lng: value.longitude };
        centerRef.current = centerPin;
        const map = new ymaps3.YMap(containerRef.current, {
          location: { center: toLngLat(centerPin), zoom: 16 },
          camera: { tilt: 35, azimuth: 0 },
          mode: 'vector',
          behaviors: ['drag', 'pinchZoom', 'pinchRotate', 'oneFingerZoom', 'dblClick', 'scrollZoom', 'mouseRotate', 'mouseTilt'],
        });
        map.addChild(new ymaps3.YMapDefaultSchemeLayer({ theme: 'light' }));
        if (ymaps3.YMapDefaultFeaturesLayer) map.addChild(new ymaps3.YMapDefaultFeaturesLayer({}));
        
        const pinEl = document.createElement('div');
        pinEl.style.cssText = 'width:20px;height:20px;border-radius:9999px;transform:translate(-50%,-50%);background:#C62020;border:4px solid #fff;box-shadow:0 10px 26px rgba(198,32,32,0.25);';
        const marker = new ymaps3.YMapMarker({ coordinates: toLngLat(centerPin), zIndex: 200 }, pinEl);
        map.addChild(marker);

        const listener = new ymaps3.YMapListener({
          onUpdate: (params: any) => {
            const center = params?.location?.center;
            if (!center || center.length < 2) return;
            centerRef.current = { lat: center[1], lng: center[0] };
            marker.update({ coordinates: center });
          },
        });
        map.addChild(listener);
        mapRef.current = map;
        markerRef.current = marker;
        setStatus('ready');
      } catch { if (!disposed) setStatus('error'); }
    }
    void initMap();
    return () => {
      disposed = true;
      if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const coords = toLngLat({ lat: value.latitude, lng: value.longitude });
    centerRef.current = { lat: value.latitude, lng: value.longitude };
    markerRef.current?.update?.({ coordinates: coords });
    mapRef.current?.update?.({ location: { center: coords, duration: 250 } });
  }, [value.latitude, value.longitude]);

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/70 bg-slate-100 shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
      <div
        ref={containerRef}
        className="h-[300px] w-full"
        onPointerDown={() => { pointerDownRef.current = true; }}
        onPointerUp={() => {
          if (!pointerDownRef.current) return;
          pointerDownRef.current = false;
          onChangeRef.current({ latitude: centerRef.current.lat, longitude: centerRef.current.lng });
          void reverseGeocodePin(centerRef.current).then(a => a && onChangeRef.current({ addressText: a }));
        }}
      />
      <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 shadow-lg backdrop-blur">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Nuqta</p>
        <p className="mt-1 truncate text-xs font-bold text-slate-700">{value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}</p>
      </div>
    </div>
  );
}

export default function RestaurantSettingsPage() {
  const { data, isLoading, isError, refetch } = useRestaurantSettings();
  const { data: openStatus } = useRestaurantOpenStatus();
  const updateMutation = useUpdateRestaurantSettings();

  const [tab, setTab] = useState<Tab>('basic');
  const [draft, setDraft] = useState<RestaurantSettings>(() => normalizeSettings(null));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !dirty) {
      setDraft(data);
      setDirty(false);
    }
  }, [data, dirty]);

  const validation = useMemo(() => {
    if (!draft) return { ok: false, message: 'Yuklanmoqda' };
    if (draft.name.trim().length < 2) return { ok: false, message: 'Nomi xato' };
    if (!isValidPhone(draft.phone)) return { ok: false, message: 'Raqam xato' };
    if (draft.addressText.trim().length < 5) return { ok: false, message: 'Manzil xato' };
    return { ok: true, message: 'Tayyor' };
  }, [draft]);

  const handleChange = (patch: Partial<RestaurantSettings>) => {
    setDraft((c) => ({ ...c, ...patch }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!validation.ok) return;
    const updated = await updateMutation.mutateAsync({ ...draft, phone: normalizeUzbekPhone(draft.phone) });
    setDraft(normalizeSettings(updated));
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const effectiveOpen = openStatus?.isOpen ?? draft.isOpen;

  if (isLoading && !draft.name) {
     return <div className="flex h-[300px] items-center justify-center text-slate-400">Yuklanmoqda...</div>;
  }

  return (
    <div className="admin-motion-up space-y-6 pb-[160px]">
      <div className="admin-hero-card rounded-[32px] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Restaurant Control</p>
            <h2 className="mt-2 truncate text-3xl font-black italic tracking-tighter text-white">
              {draft.name || 'Turon Kafesi'}
            </h2>
            <p className="mt-1 truncate text-xs font-bold text-white/50">{draft.addressText}</p>
            
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="admin-badge-sync bg-white/10 text-white/80 border border-white/5">
                <div className={`admin-status-dot ${effectiveOpen ? 'active' : ''}`} />
                <span>{effectiveOpen ? 'Ochiq' : 'Yopiq'}</span>
              </div>
              <div className="admin-badge-sync bg-emerald-500/20 text-emerald-300 border border-emerald-500/10">
                <Wifi size={12} />
                <span>Onlayn</span>
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => handleChange({ isOpen: !draft.isOpen })}
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all active:scale-90 ${
              effectiveOpen ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
            }`}
          >
            <Store size={24} />
          </button>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
             <Phone size={14} className="text-white/30" />
             <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-white/40">Telefon</p>
             <p className="mt-1 truncate text-[11px] font-bold text-white">{formatUzbekPhone(draft.phone) || '---'}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
             <Navigation size={14} className="text-white/30" />
             <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-white/40">Nuqta</p>
             <p className="mt-1 truncate text-[11px] font-bold text-white">{draft.latitude.toFixed(3)}, {draft.longitude.toFixed(3)}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
             <Clock3 size={14} className="text-white/30" />
             <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-white/40">Bugun</p>
             <p className="mt-1 truncate text-[11px] font-bold text-white">
                {openStatus?.today.open || '09:00'}
             </p>
          </div>
        </div>
      </div>

      <div className="admin-pill-tabs mx-auto max-w-[400px]">
        {(['basic', 'address', 'hours', 'status'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`admin-pill-tab ${tab === t ? 'active' : ''}`}>{TAB_LABELS[t]}</button>
        ))}
      </div>

      <div className="px-1">
        {tab === 'basic' && <BasicTab draft={draft} onChange={handleChange} />}
        {tab === 'address' && <AddressTab draft={draft} onChange={handleChange} />}
        {tab === 'hours' && <HoursTab draft={draft} onChange={handleChange} />}
        {tab === 'status' && <StatusTab draft={draft} openStatus={openStatus} onChange={handleChange} />}
      </div>

      {dirty && (
        <div className="admin-save-bar">
          <button
            type="button"
            onClick={handleSave}
            disabled={!validation.ok || updateMutation.isPending}
            className={`admin-btn-save ${updateMutation.isPending ? 'loading' : ''} ${!validation.ok ? 'opacity-50 grayscale' : ''}`}
          >
            {updateMutation.isPending ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
            <span>{saved ? "O'zgarishlar saqlandi" : updateMutation.isPending ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}</span>
          </button>
        </div>
      )}

      {saved && !dirty && (
        <div className="fixed top-24 left-0 right-0 z-[100] flex justify-center animate-in fade-in slide-in-from-top duration-300">
           <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2">
              <CheckCircle size={18} />
              <span className="text-sm font-black uppercase tracking-widest">Saqlandi</span>
           </div>
        </div>
      )}
    </div>
  );
}

function BasicTab({ draft, onChange }: { draft: RestaurantSettings; onChange: (p: Partial<RestaurantSettings>) => void }) {
  const phoneReady = isValidPhone(draft.phone);
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="admin-pro-card p-6">
        <div className="admin-input-group">
          <label className="admin-label">Restoran Nomi</label>
          <input value={draft.name} onChange={(e) => onChange({ name: e.target.value })} className="admin-input" placeholder="Turon Kafe" />
          <p className="mt-2 px-3 text-[10px] font-bold text-slate-400">Bu nom admin panelda ishlatiladi</p>
        </div>
        <div className="admin-input-group">
          <label className="admin-label">Restoran Telefoni</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={18} /></div>
            <input value={draft.phone} onChange={(e) => onChange({ phone: e.target.value })} className={`admin-input pl-12 ${phoneReady ? 'border-emerald-200 focus:border-emerald-500' : ''}`} inputMode="tel" placeholder="+998 90 123 45 67" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AddressTab({ draft, onChange }: { draft: RestaurantSettings; onChange: (p: Partial<RestaurantSettings>) => void }) {
  const [busy, setBusy] = useState<'search' | 'gps' | null>(null);
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="admin-pro-card p-6">
        <div className="admin-input-group">
          <label className="admin-label">Manzil Matni</label>
          <textarea value={draft.addressText} onChange={(e) => onChange({ addressText: e.target.value })} rows={2} className="admin-input resize-none" placeholder="Manzil..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={async () => {
              setBusy('search');
              try {
                const m: any = await fetchAddressSuggestions(`${draft.addressText}, Toshkent`, 1, { lat: draft.latitude, lng: draft.longitude });
                if (m[0]?.pin) onChange({ latitude: m[0].pin.lat, longitude: m[0].pin.lng, addressText: m[0].address || draft.addressText });
              } finally { setBusy(null); }
          }} className="h-12 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg">
            {busy === 'search' ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            Xaritada topish
          </button>
          <button type="button" onClick={() => {
              if (!navigator.geolocation) return;
              setBusy('gps');
                navigator.geolocation.getCurrentPosition(async p => {
                    const lat = p.coords.latitude;
                    const lng = p.coords.longitude;
                    onChange({ latitude: lat, longitude: lng });
                    const a = await reverseGeocodePin({ lat, lng });
                    if (a) onChange({ addressText: a });
                    setBusy(null);
                }, () => setBusy(null));
          }} className="h-12 rounded-2xl bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
            {busy === 'gps' ? <RefreshCw size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            GPS
          </button>
        </div>
      </div>
      <AdminRestaurantMap value={draft} onChange={onChange} />
    </div>
  );
}

function HoursTab({ draft, onChange }: { draft: RestaurantSettings; onChange: (p: Partial<RestaurantSettings>) => void }) {
  const updateDay = (day: DayKey, patch: Partial<WorkingHoursDay>) => {
    onChange({ workingHours: { ...draft.workingHours, [day]: { ...draft.workingHours[day], ...patch } } });
  };
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="admin-pro-card p-6">
        <div className="space-y-3">
          {DAY_ORDER.map((day) => {
            const item = draft.workingHours[day];
            return (
              <div key={day} className={`p-4 rounded-2xl border transition-all ${item.closed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900">{DAY_LABELS[day]}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{item.closed ? 'Yopiq' : `${item.open} — ${item.close}`}</p>
                  </div>
                  <Toggle checked={!item.closed} onChange={() => updateDay(day, { closed: !item.closed })} />
                </div>
                {!item.closed && (
                  <div className="mt-4 flex items-center gap-3">
                    <input type="time" value={item.open} onChange={(e) => updateDay(day, { open: e.target.value })} className="flex-1 bg-slate-50 border-none rounded-xl p-2 text-xs font-black text-center" />
                    <div className="w-2 h-0.5 bg-slate-200" />
                    <input type="time" value={item.close} onChange={(e) => updateDay(day, { close: e.target.value })} className="flex-1 bg-slate-50 border-none rounded-xl p-2 text-xs font-black text-center" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusTab({ draft, openStatus, onChange }: { draft: RestaurantSettings; openStatus?: RestaurantOpenStatus; onChange: (p: Partial<RestaurantSettings>) => void }) {
  const effectiveOpen = openStatus?.isOpen ?? draft.isOpen;
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className={`admin-pro-card p-8 text-center relative overflow-hidden ${effectiveOpen ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-1 w-24 rounded-b-full ${effectiveOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Restoran Holati</p>
        <h2 className={`text-5xl font-black italic tracking-tighter ${effectiveOpen ? 'text-emerald-600' : 'text-rose-600'}`}>
          {effectiveOpen ? 'OCHIQ' : 'YOPIQ'}
        </h2>
        <p className="mt-4 text-xs font-bold text-slate-500">{formatTodayLabel(openStatus)}</p>
      </div>
      <div className="admin-pro-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-900 italic">Avtomatik Jadval</p>
            <p className="text-[11px] font-bold text-slate-400 mt-1">Ish vaqti bo'yicha boshqarish</p>
          </div>
          <Toggle checked={draft.autoSchedule} onChange={() => onChange({ autoSchedule: !draft.autoSchedule })} />
        </div>
      </div>
    </div>
  );
}
