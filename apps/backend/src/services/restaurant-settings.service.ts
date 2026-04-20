import { prisma } from '../lib/prisma.js';
import { RESTAURANT_COORDINATES } from '@turon/shared';

export interface WorkingHoursDay {
  open: string;  // "HH:MM"
  close: string; // "HH:MM"
  closed: boolean;
}

export interface WorkingHours {
  mon: WorkingHoursDay;
  tue: WorkingHoursDay;
  wed: WorkingHoursDay;
  thu: WorkingHoursDay;
  fri: WorkingHoursDay;
  sat: WorkingHoursDay;
  sun: WorkingHoursDay;
}

export interface RestaurantSettings {
  name: string;
  phone: string;
  addressText: string;
  longitude: number;
  latitude: number;
  workingHours: WorkingHours;
  isOpen: boolean;
  autoSchedule: boolean;
}

export interface RestaurantOpenStatus {
  isOpen: boolean;
  reason: 'manual' | 'schedule' | 'schedule_closed';
  dayKey: keyof WorkingHours;
  today: WorkingHoursDay;
  nextChange: string | null;
}

const DEFAULT_WORKING_HOURS: WorkingHours = {
  mon: { open: '09:00', close: '22:00', closed: false },
  tue: { open: '09:00', close: '22:00', closed: false },
  wed: { open: '09:00', close: '22:00', closed: false },
  thu: { open: '09:00', close: '22:00', closed: false },
  fri: { open: '09:00', close: '22:00', closed: false },
  sat: { open: '10:00', close: '22:00', closed: false },
  sun: { open: '10:00', close: '21:00', closed: false },
};

const DEFAULTS: RestaurantSettings = {
  name: RESTAURANT_COORDINATES.name,
  phone: '',
  addressText: RESTAURANT_COORDINATES.address,
  longitude: RESTAURANT_COORDINATES.lng,
  latitude: RESTAURANT_COORDINATES.lat,
  workingHours: DEFAULT_WORKING_HOURS,
  isOpen: true,
  autoSchedule: true,
};

let storageReadyPromise: Promise<void> | null = null;
let storageWarningLogged = false;

async function ensureRestaurantSettingsStorage() {
  if (!storageReadyPromise) {
    storageReadyPromise = prisma.$executeRawUnsafe(`
      create extension if not exists pgcrypto;

      create table if not exists public.restaurant_settings (
        id          uuid        primary key default gen_random_uuid(),
        key         text        not null,
        value       text        not null,
        data_type   text        not null default 'string',
        updated_at  timestamptz not null default now(),
        updated_by  uuid        references public.users(id) on delete set null,
        constraint restaurant_settings_key_key unique (key),
        constraint restaurant_settings_key_not_blank check (btrim(key) <> ''),
        constraint restaurant_settings_data_type_valid check (data_type in ('string', 'number', 'json', 'boolean'))
      );

      alter table public.restaurant_settings
        add column if not exists data_type text not null default 'string',
        add column if not exists updated_at timestamptz not null default now(),
        add column if not exists updated_by uuid;

      create index if not exists idx_restaurant_settings_key on public.restaurant_settings(key);
    `).then(() => undefined).catch((error) => {
      storageReadyPromise = null;
      throw error;
    });
  }

  return storageReadyPromise;
}

async function getSetting(key: string): Promise<string | null> {
  try {
    await ensureRestaurantSettingsStorage();
    const row = await prisma.restaurantSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch (error) {
    if (!storageWarningLogged) {
      storageWarningLogged = true;
      console.warn('[restaurant-settings] Storage unavailable; using defaults:', error);
    }

    return null;
  }
}

async function setSetting(key: string, value: string, dataType: string, updatedById?: string) {
  await ensureRestaurantSettingsStorage();

  await prisma.restaurantSetting.upsert({
    where: { key },
    update: { value, dataType, updatedById: updatedById ?? null },
    create: { key, value, dataType, updatedById: updatedById ?? null },
  });
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, '');
}

export async function getRestaurantSettings(): Promise<RestaurantSettings> {
  const [name, phone, addressText, longitude, latitude, workingHoursRaw, isOpenRaw, autoScheduleRaw] =
    await Promise.all([
      getSetting('name'),
      getSetting('phone'),
      getSetting('address_text'),
      getSetting('longitude'),
      getSetting('latitude'),
      getSetting('working_hours'),
      getSetting('is_open'),
      getSetting('auto_schedule'),
    ]);

  let workingHours = DEFAULTS.workingHours;
  if (workingHoursRaw) {
    try { workingHours = JSON.parse(workingHoursRaw); } catch {}
  }

  return {
    name: name ?? DEFAULTS.name,
    phone: phone ?? DEFAULTS.phone,
    addressText: addressText ?? DEFAULTS.addressText,
    longitude: longitude ? parseFloat(longitude) : DEFAULTS.longitude,
    latitude: latitude ? parseFloat(latitude) : DEFAULTS.latitude,
    workingHours,
    isOpen: isOpenRaw !== null ? isOpenRaw === 'true' : DEFAULTS.isOpen,
    autoSchedule: autoScheduleRaw !== null ? autoScheduleRaw === 'true' : DEFAULTS.autoSchedule,
  };
}

export interface PatchRestaurantSettings {
  name?: string;
  phone?: string;
  addressText?: string;
  longitude?: number;
  latitude?: number;
  workingHours?: WorkingHours;
  isOpen?: boolean;
  autoSchedule?: boolean;
}

export async function patchRestaurantSettings(
  patch: PatchRestaurantSettings,
  updatedById?: string,
) {
  const tasks: Promise<void>[] = [];

  if (patch.name !== undefined)
    tasks.push(setSetting('name', patch.name, 'string', updatedById));
  if (patch.phone !== undefined)
    tasks.push(setSetting('phone', normalizePhone(patch.phone), 'string', updatedById));
  if (patch.addressText !== undefined)
    tasks.push(setSetting('address_text', patch.addressText, 'string', updatedById));
  if (patch.longitude !== undefined)
    tasks.push(setSetting('longitude', String(patch.longitude), 'number', updatedById));
  if (patch.latitude !== undefined)
    tasks.push(setSetting('latitude', String(patch.latitude), 'number', updatedById));
  if (patch.workingHours !== undefined)
    tasks.push(setSetting('working_hours', JSON.stringify(patch.workingHours), 'json', updatedById));
  if (patch.isOpen !== undefined)
    tasks.push(setSetting('is_open', String(patch.isOpen), 'boolean', updatedById));
  if (patch.autoSchedule !== undefined)
    tasks.push(setSetting('auto_schedule', String(patch.autoSchedule), 'boolean', updatedById));

  await Promise.all(tasks);
  return getRestaurantSettings();
}

function getTashkentDate(date = new Date()) {
  const utcOffset = 5 * 60; // minutes
  return new Date(date.getTime() + utcOffset * 60 * 1000);
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isWithinWindow(currentMin: number, openMin: number, closeMin: number) {
  if (closeMin <= openMin) {
    return currentMin >= openMin || currentMin < closeMin;
  }

  return currentMin >= openMin && currentMin < closeMin;
}

/** Returns detailed open/closed status (respects auto_schedule). */
export async function getRestaurantOpenStatus(): Promise<RestaurantOpenStatus> {
  const settings = await getRestaurantSettings();

  const dayMap: Record<number, keyof WorkingHours> = {
    0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
  };
  const local = getTashkentDate();
  const dayKey = dayMap[local.getUTCDay()];
  const dayHours = settings.workingHours[dayKey];

  if (!settings.autoSchedule) {
    return {
      isOpen: settings.isOpen,
      reason: 'manual',
      dayKey,
      today: dayHours,
      nextChange: null,
    };
  }

  if (dayHours.closed) {
    return {
      isOpen: false,
      reason: 'schedule_closed',
      dayKey,
      today: dayHours,
      nextChange: null,
    };
  }

  const currentMin = local.getUTCHours() * 60 + local.getUTCMinutes();
  const openMin = toMinutes(dayHours.open);
  const closeMin = toMinutes(dayHours.close);
  const isOpen = isWithinWindow(currentMin, openMin, closeMin);

  return {
    isOpen,
    reason: 'schedule',
    dayKey,
    today: dayHours,
    nextChange: isOpen ? dayHours.close : dayHours.open,
  };
}

/** Returns true if the restaurant is currently open (respects auto_schedule). */
export async function isRestaurantOpen(): Promise<boolean> {
  return (await getRestaurantOpenStatus()).isOpen;
}
