import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2 as CheckCircle,
  Clock3,
  ImagePlus,
  LocateFixed,
  Navigation,
  Phone,
  RefreshCw,
  Save,
  Search,
  Store,
  Wifi,
  XCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { toLngLat, loadYandexMaps3 } from '../../features/maps/yandex3';
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
  logoUrl?: string | null;
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
  logoUrl: null,
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

const DAY_INDEX_MAP: Record<number, DayKey> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

function getTodayKey(): DayKey {
  return DAY_INDEX_MAP[new Date().getDay()];
}

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

function normalizeSettings(settings: unknown): RestaurantSettings {
  if (!settings || typeof settings !== 'object') return FALLBACK_SETTINGS;
  const s = settings as Partial<RestaurantSettings>;
  return {
    ...FALLBACK_SETTINGS,
    ...s,
    workingHours: {
      ...DEFAULT_WORKING_HOURS,
      ...(s.workingHours && typeof s.workingHours === 'object'
        ? (s.workingHours as Partial<WorkingHours>)
        : {}),
    },
  };
}

function formatTodayLabel(status?: RestaurantOpenStatus) {
  if (!status) return 'Jadval tekshirilmoqda';
  if (status.today.closed) return `${DAY_LABELS[status.dayKey]} yopiq`;
  return `${DAY_LABELS[status.dayKey]}: ${status.today.open} – ${status.today.close}`;
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
    mutationFn: (data: Partial<RestaurantSettings>) =>
      api.patch('/admin/restaurant/settings', data) as Promise<unknown>,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-restaurant-settings'], normalizeSettings(updated));
      queryClient.invalidateQueries({ queryKey: ['admin-restaurant-open-status'] });
    },
  });
}

/* ── Toggle ─────────────────────────────────────────────────── */

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
      className={`relative h-7 w-[52px] rounded-full border transition-all active:scale-95 ${
        checked
          ? 'border-emerald-500/30 bg-emerald-500 shadow-[0_8px_18px_rgba(16,185,129,0.28)]'
          : 'border-white/8 bg-white/10'
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

/* ── Logo Upload ─────────────────────────────────────────────── */

function LogoUpload({
  logoUrl,
  onChange,
}: {
  logoUrl?: string | null;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = (await api.post('/admin/restaurant/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })) as { url: string };
      onChange(res.url);
    } catch {
      // keep preview; server upload failed silently
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = previewUrl ?? logoUrl;

  return (
    <div className="admin-input-group">
      <label className="admin-label">Logo</label>
      <div
        role="button"
        tabIndex={0}
        className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[18px] border-2 border-dashed transition-all ${
          dragOver
            ? 'border-[var(--admin-pro-primary)] bg-[rgba(245,166,35,0.08)]'
            : 'border-[var(--admin-pro-line)] bg-[rgba(255,255,255,0.04)]'
        }`}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Logo"
            className="h-16 w-16 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--admin-pro-text-muted)]">
            <ImagePlus size={28} />
            <p className="text-[11px] font-bold">Logo yuklash (suring yoki bosing)</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[16px] bg-black/50">
            <RefreshCw size={22} className="animate-spin text-[var(--admin-pro-primary)]" />
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/* ── Map ─────────────────────────────────────────────────────── */

function AdminRestaurantMap({
  value,
  onChange,
}: {
  value: RestaurantSettings;
  onChange: (patch: Partial<RestaurantSettings>) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<{ update: (o: { coordinates: [number, number] }) => void } | null>(null);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const centerRef = useRef<{ lat: number; lng: number }>({
    lat: value.latitude,
    lng: value.longitude,
  });
  const pointerDownRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (!containerRef.current) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ymaps3 = await loadYandexMaps3() as any;
        if (disposed || !containerRef.current) return;

        const centerPin = { lat: value.latitude, lng: value.longitude };
        centerRef.current = centerPin;

        const map = new ymaps3.YMap(containerRef.current, {
          location: { center: toLngLat(centerPin), zoom: 16 },
          camera: { tilt: 30, azimuth: 0 },
          mode: 'vector',
          behaviors: ['drag', 'pinchZoom', 'pinchRotate', 'oneFingerZoom', 'dblClick', 'scrollZoom', 'mouseRotate', 'mouseTilt'],
        });

        map.addChild(new ymaps3.YMapDefaultSchemeLayer({ theme: 'dark' }));
        if (ymaps3.YMapDefaultFeaturesLayer) {
          map.addChild(new ymaps3.YMapDefaultFeaturesLayer({}));
        }

        // Lollipop pin
        const pinEl = document.createElement('div');
        pinEl.style.cssText =
          'display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;';
        pinEl.innerHTML = `
          <div class="admin-pin-drop" style="
            width:28px;height:28px;border-radius:50%;
            background:linear-gradient(135deg,#F5A623 0%,#E8900D 100%);
            border:3px solid rgba(255,255,255,0.92);
            box-shadow:0 6px 18px rgba(245,166,35,0.55),0 2px 8px rgba(0,0,0,0.35);
          "></div>
          <div style="
            width:3px;height:22px;
            background:linear-gradient(to bottom,rgba(24,16,10,0.8),rgba(24,16,10,0.15));
            border-radius:0 0 3px 3px;margin-top:-1px;
          "></div>
        `;

        const marker = new ymaps3.YMapMarker(
          { coordinates: toLngLat(centerPin), zIndex: 200 },
          pinEl,
        );
        map.addChild(marker);

        const listener = new ymaps3.YMapListener({
          onUpdate: (params: { location?: { center?: [number, number] } }) => {
            const center = params?.location?.center;
            if (!center || center.length < 2) return;
            centerRef.current = { lat: center[1], lng: center[0] };
            marker.update({ coordinates: center });
          },
        });
        map.addChild(listener);

        mapRef.current = map;
        markerRef.current = marker as typeof markerRef.current;
        setStatus('ready');
      } catch {
        if (!disposed) setStatus('error');
      }
    }

    void initMap();

    return () => {
      disposed = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (mapRef.current) { (mapRef.current as any).destroy?.(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const coords = toLngLat({ lat: value.latitude, lng: value.longitude });
    centerRef.current = { lat: value.latitude, lng: value.longitude };
    markerRef.current?.update?.({ coordinates: coords });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mapRef.current as any)?.update?.({ location: { center: coords, duration: 250 } });
  }, [value.latitude, value.longitude]);

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-[var(--admin-pro-line)] bg-[var(--admin-pro-card-bg)] shadow-[var(--admin-pro-shadow)]">
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <RefreshCw size={22} className="animate-spin text-[var(--admin-pro-primary)]" />
        </div>
      )}
      {status === 'error' && (
        <div className="flex h-[300px] items-center justify-center text-[var(--admin-pro-text-muted)]">
          <XCircle size={20} className="mr-2" />
          <span className="text-xs font-bold">Xarita yuklanmadi</span>
        </div>
      )}
      <div
        ref={containerRef}
        className="h-[300px] w-full"
        onPointerDown={() => {
          pointerDownRef.current = true;
        }}
        onPointerUp={() => {
          if (!pointerDownRef.current) return;
          pointerDownRef.current = false;
          onChangeRef.current({
            latitude: centerRef.current.lat,
            longitude: centerRef.current.lng,
          });
          void reverseGeocodePin(centerRef.current).then(
            (a) => a && onChangeRef.current({ addressText: a }),
          );
        }}
      />
      <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-[var(--admin-pro-line)] bg-[rgba(14,14,22,0.88)] px-3 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--admin-pro-text-muted)]">
          Koordinata
        </p>
        <p className="mt-0.5 truncate text-xs font-bold text-[var(--admin-pro-text)]">
          {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
        </p>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */

export default function RestaurantSettingsPage() {
  const { data, isLoading } = useRestaurantSettings();
  const { data: openStatus } = useRestaurantOpenStatus();
  const updateMutation = useUpdateRestaurantSettings();

  const [tab, setTab] = useState<Tab>('basic');
  const [draft, setDraft] = useState<RestaurantSettings>(() => normalizeSettings(null));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !dirty) {
      setDraft(data);
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
    const updated = await updateMutation.mutateAsync({
      ...draft,
      phone: normalizeUzbekPhone(draft.phone),
    });
    setDraft(normalizeSettings(updated));
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const effectiveOpen = openStatus?.isOpen ?? draft.isOpen;

  if (isLoading && !draft.name) {
    return (
      <div className="admin-pro-card admin-pro-card-muted flex h-[300px] items-center justify-center text-[var(--admin-pro-text-muted)]">
        <RefreshCw size={20} className="animate-spin mr-2" />
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="admin-motion-up space-y-5 pb-[160px]">

      {/* Hero */}
      <div className="admin-hero-card rounded-[32px] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[rgba(24,16,10,0.45)]">
              Restoran boshqaruvi
            </p>
            <h2 className="mt-1.5 truncate text-[28px] font-black italic tracking-tight text-[#18100A]">
              {draft.name || 'Turon Kafe'}
            </h2>
            <p className="mt-0.5 truncate text-xs font-bold text-[rgba(24,16,10,0.5)]">
              {draft.addressText}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <div
                className="admin-badge-sync border"
                style={{
                  background: effectiveOpen ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                  borderColor: effectiveOpen ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)',
                  color: effectiveOpen ? '#065f46' : '#7f1d1d',
                }}
              >
                <div
                  className="admin-status-dot"
                  style={{
                    background: effectiveOpen ? '#10b981' : '#ef4444',
                    boxShadow: effectiveOpen
                      ? '0 0 8px rgba(16,185,129,0.7)'
                      : '0 0 8px rgba(239,68,68,0.7)',
                  }}
                />
                <span className="font-black">{effectiveOpen ? 'Ochiq' : 'Yopiq'}</span>
              </div>
              <div
                className="admin-badge-sync border"
                style={{
                  background: 'rgba(16,185,129,0.1)',
                  borderColor: 'rgba(16,185,129,0.15)',
                  color: '#065f46',
                }}
              >
                <Wifi size={12} />
                <span>Onlayn</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleChange({ isOpen: !draft.isOpen })}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg transition-all active:scale-90 ${
              effectiveOpen
                ? 'bg-[rgba(0,0,0,0.15)] text-[#18100A]'
                : 'bg-[rgba(239,68,68,0.18)] text-rose-800'
            }`}
          >
            <Store size={24} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)] p-3">
            <Phone size={14} className="text-[rgba(24,16,10,0.4)]" />
            <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-[rgba(24,16,10,0.4)]">
              Telefon
            </p>
            <p className="mt-1 truncate text-[11px] font-bold text-[#18100A]">
              {formatUzbekPhone(draft.phone) || '---'}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)] p-3">
            <Navigation size={14} className="text-[rgba(24,16,10,0.4)]" />
            <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-[rgba(24,16,10,0.4)]">
              Nuqta
            </p>
            <p className="mt-1 truncate text-[11px] font-bold text-[#18100A]">
              {draft.latitude.toFixed(3)}, {draft.longitude.toFixed(3)}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)] p-3">
            <Clock3 size={14} className="text-[rgba(24,16,10,0.4)]" />
            <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-[rgba(24,16,10,0.4)]">
              Bugun
            </p>
            <p className="mt-1 truncate text-[11px] font-bold text-[#18100A]">
              {openStatus?.today.open || '09:00'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-pill-tabs mx-auto max-w-[400px]">
        {(['basic', 'address', 'hours', 'status'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`admin-pill-tab ${tab === t ? 'active' : ''}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-0.5">
        {tab === 'basic' && <BasicTab draft={draft} onChange={handleChange} />}
        {tab === 'address' && <AddressTab draft={draft} onChange={handleChange} />}
        {tab === 'hours' && <HoursTab draft={draft} onChange={handleChange} />}
        {tab === 'status' && (
          <StatusTab draft={draft} openStatus={openStatus} onChange={handleChange} />
        )}
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="admin-save-bar">
          <button
            type="button"
            onClick={handleSave}
            disabled={!validation.ok || updateMutation.isPending}
            className={`admin-btn-save ${updateMutation.isPending ? 'loading' : ''} ${
              !validation.ok ? 'opacity-50 grayscale' : ''
            }`}
          >
            {updateMutation.isPending ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            <span>
              {updateMutation.isPending
                ? 'Saqlanmoqda...'
                : saved
                  ? "O'zgarishlar saqlandi"
                  : 'Sozlamalarni saqlash'}
            </span>
          </button>
        </div>
      )}

      {/* Success toast */}
      {saved && !dirty && (
        <div className="fixed left-0 right-0 top-24 z-[100] flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 shadow-2xl">
            <CheckCircle size={18} className="text-white" />
            <span className="text-sm font-black uppercase tracking-widest text-white">Saqlandi</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Basic Tab ───────────────────────────────────────────────── */

function BasicTab({
  draft,
  onChange,
}: {
  draft: RestaurantSettings;
  onChange: (p: Partial<RestaurantSettings>) => void;
}) {
  const phoneReady = isValidPhone(draft.phone);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="admin-pro-card p-6">
        <LogoUpload
          logoUrl={draft.logoUrl}
          onChange={(url) => onChange({ logoUrl: url })}
        />

        <div className="admin-input-group">
          <label className="admin-label">Restoran Nomi</label>
          <input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="admin-input"
            placeholder="Turon Kafe"
          />
        </div>

        <div className="admin-input-group mb-0">
          <label className="admin-label">Restoran Telefoni</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--admin-pro-text-muted)]">
              <Phone size={18} />
            </div>
            <input
              value={draft.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              className={`admin-input pl-12 ${
                phoneReady ? 'border-emerald-500/40 focus:border-emerald-500/70' : ''
              }`}
              inputMode="tel"
              placeholder="+998 90 123 45 67"
            />
            {phoneReady && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <CheckCircle size={18} className="text-emerald-400" />
              </div>
            )}
          </div>
          <p className="mt-2 px-3 text-[10px] font-bold text-[var(--admin-pro-text-muted)]">
            Format: +998 XX XXX XX XX
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Address Tab ─────────────────────────────────────────────── */

function AddressTab({
  draft,
  onChange,
}: {
  draft: RestaurantSettings;
  onChange: (p: Partial<RestaurantSettings>) => void;
}) {
  const [busy, setBusy] = useState<'search' | 'gps' | null>(null);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="admin-pro-card p-6">
        <div className="admin-input-group">
          <label className="admin-label">Manzil Matni</label>
          <textarea
            value={draft.addressText}
            onChange={(e) => onChange({ addressText: e.target.value })}
            rows={2}
            className="admin-input resize-none"
            placeholder="Ko'cha, bino raqami..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={async () => {
              setBusy('search');
              try {
                const m = (await fetchAddressSuggestions(
                  `${draft.addressText}, Toshkent`,
                  1,
                  { lat: draft.latitude, lng: draft.longitude },
                )) as Array<{ pin?: { lat: number; lng: number }; address?: string }>;
                if (m[0]?.pin) {
                  onChange({
                    latitude: m[0].pin.lat,
                    longitude: m[0].pin.lng,
                    addressText: m[0].address ?? draft.addressText,
                  });
                }
              } finally {
                setBusy(null);
              }
            }}
            className="admin-pro-button-primary flex h-12 items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            {busy === 'search' ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Xaritada topish
          </button>

          <button
            type="button"
            onClick={() => {
              if (!navigator.geolocation) return;
              setBusy('gps');
              navigator.geolocation.getCurrentPosition(
                async (p) => {
                  const lat = p.coords.latitude;
                  const lng = p.coords.longitude;
                  onChange({ latitude: lat, longitude: lng });
                  const a = await reverseGeocodePin({ lat, lng });
                  if (a) onChange({ addressText: a });
                  setBusy(null);
                },
                () => setBusy(null),
              );
            }}
            className="admin-pro-button-secondary flex h-12 items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            {busy === 'gps' ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <LocateFixed size={16} />
            )}
            GPS
          </button>
        </div>
      </div>

      <AdminRestaurantMap value={draft} onChange={onChange} />
    </div>
  );
}

/* ── Hours Tab ───────────────────────────────────────────────── */

function HoursTab({
  draft,
  onChange,
}: {
  draft: RestaurantSettings;
  onChange: (p: Partial<RestaurantSettings>) => void;
}) {
  const todayKey = getTodayKey();
  const allOpen = DAY_ORDER.every((d) => !draft.workingHours[d].closed);

  const updateDay = (day: DayKey, patch: Partial<WorkingHoursDay>) => {
    onChange({
      workingHours: { ...draft.workingHours, [day]: { ...draft.workingHours[day], ...patch } },
    });
  };

  const toggleAll = () => {
    const closed = allOpen;
    const newHours = { ...draft.workingHours };
    DAY_ORDER.forEach((d) => {
      newHours[d] = { ...newHours[d], closed };
    });
    onChange({ workingHours: newHours });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Bulk toggle */}
      <div className="admin-pro-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-[var(--admin-pro-text)]">Barcha kunlar</p>
            <p className="text-[11px] font-bold text-[var(--admin-pro-text-muted)] mt-0.5">
              Barchasini bir vaqtda yoqish / o'chirish
            </p>
          </div>
          <Toggle checked={allOpen} onChange={toggleAll} />
        </div>
      </div>

      {/* Day cards */}
      <div className="admin-pro-card p-5">
        <div className="space-y-3">
          {DAY_ORDER.map((day) => {
            const item = draft.workingHours[day];
            const isToday = day === todayKey;

            return (
              <div
                key={day}
                className={`rounded-2xl border p-4 transition-all ${
                  isToday
                    ? 'border-[rgba(245,166,35,0.45)] bg-[rgba(245,166,35,0.07)]'
                    : item.closed
                      ? 'border-[var(--admin-pro-line)] bg-[rgba(255,255,255,0.02)] opacity-55'
                      : 'border-[var(--admin-pro-line)] bg-[rgba(255,255,255,0.04)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-xs font-black ${
                          isToday
                            ? 'text-[var(--admin-pro-primary)]'
                            : 'text-[var(--admin-pro-text)]'
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </p>
                      {isToday && (
                        <span className="rounded-full bg-[rgba(245,166,35,0.18)] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--admin-pro-primary)]">
                          Bugun
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] font-bold text-[var(--admin-pro-text-muted)]">
                      {item.closed ? 'Yopiq' : `${item.open} — ${item.close}`}
                    </p>
                  </div>
                  <Toggle
                    checked={!item.closed}
                    onChange={() => updateDay(day, { closed: !item.closed })}
                  />
                </div>

                {!item.closed && (
                  <div className="mt-4 flex items-center gap-3">
                    <input
                      type="time"
                      value={item.open}
                      onChange={(e) => updateDay(day, { open: e.target.value })}
                      className="flex-1 rounded-xl border border-[var(--admin-pro-line)] bg-[rgba(255,255,255,0.06)] p-2.5 text-center text-xs font-black text-[var(--admin-pro-text)] [color-scheme:dark]"
                    />
                    <div className="h-px w-3 bg-[var(--admin-pro-line)]" />
                    <input
                      type="time"
                      value={item.close}
                      onChange={(e) => updateDay(day, { close: e.target.value })}
                      className="flex-1 rounded-xl border border-[var(--admin-pro-line)] bg-[rgba(255,255,255,0.06)] p-2.5 text-center text-xs font-black text-[var(--admin-pro-text)] [color-scheme:dark]"
                    />
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

/* ── Status Tab ──────────────────────────────────────────────── */

const CLOSE_REASONS = [
  { value: 'manual', label: "Qo'lda yopildi" },
  { value: 'maintenance', label: "Ta'mirlash" },
  { value: 'holiday', label: 'Dam olish kuni' },
  { value: 'other', label: 'Boshqa sabab' },
] as const;

function StatusTab({
  draft,
  openStatus,
  onChange,
}: {
  draft: RestaurantSettings;
  openStatus?: RestaurantOpenStatus;
  onChange: (p: Partial<RestaurantSettings>) => void;
}) {
  const effectiveOpen = openStatus?.isOpen ?? draft.isOpen;
  const [closeReason, setCloseReason] = useState<string>('manual');

  const handleToggle = () => {
    onChange({ isOpen: !draft.isOpen });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">

      {/* Big status display */}
      <div
        className={`admin-pro-card relative overflow-hidden p-8 text-center ${
          effectiveOpen
            ? 'border-emerald-500/20'
            : 'border-rose-500/20'
        }`}
      >
        <div
          className={`absolute left-1/2 top-0 h-1.5 w-28 -translate-x-1/2 rounded-b-full ${
            effectiveOpen ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />

        {/* Glow blob */}
        <div
          className="absolute left-1/2 top-6 h-32 w-32 -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: effectiveOpen
              ? 'rgba(16,185,129,0.12)'
              : 'rgba(239,68,68,0.12)',
          }}
        />

        <p className="relative text-[10px] font-black uppercase tracking-[0.25em] text-[var(--admin-pro-text-muted)]">
          Restoran holati
        </p>

        <h2
          className={`relative mt-3 text-[56px] font-black italic leading-none tracking-tight ${
            effectiveOpen ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {effectiveOpen ? 'OCHIQ' : 'YOPIQ'}
        </h2>

        <p className="relative mt-4 text-xs font-bold text-[var(--admin-pro-text-muted)]">
          {formatTodayLabel(openStatus)}
        </p>

        {/* Big toggle button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`relative mx-auto mt-6 flex h-14 w-full max-w-[200px] items-center justify-center gap-3 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            effectiveOpen
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
          }`}
        >
          {effectiveOpen ? <XCircle size={20} /> : <CheckCircle size={20} />}
          {effectiveOpen ? 'Yopish' : 'Ochish'}
        </button>
      </div>

      {/* Close reason (shows when restaurant is set to closed) */}
      {!draft.isOpen && (
        <div className="admin-pro-card p-5">
          <label className="admin-label">Yopish sababi</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {CLOSE_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setCloseReason(r.value)}
                className={`rounded-xl border px-3 py-2.5 text-left text-[11px] font-bold transition-all active:scale-95 ${
                  closeReason === r.value
                    ? 'border-[var(--admin-pro-primary)] bg-[rgba(245,166,35,0.1)] text-[var(--admin-pro-primary)]'
                    : 'border-[var(--admin-pro-line)] bg-[rgba(255,255,255,0.04)] text-[var(--admin-pro-text-muted)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Auto schedule */}
      <div className="admin-pro-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black italic text-[var(--admin-pro-text)]">
              Avtomatik Jadval
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-[var(--admin-pro-text-muted)]">
              Ish vaqti bo'yicha avtomatik boshqarish
            </p>
          </div>
          <Toggle
            checked={draft.autoSchedule}
            onChange={() => onChange({ autoSchedule: !draft.autoSchedule })}
          />
        </div>
        {draft.autoSchedule && (
          <div className="mt-4 rounded-xl border border-[rgba(245,166,35,0.2)] bg-[rgba(245,166,35,0.06)] px-3 py-2.5">
            <p className="text-[11px] font-bold text-[var(--admin-pro-primary)]">
              Jadval yoqilgan — ish vaqti bo'yicha avtomatik ochiladi/yopiladi
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
