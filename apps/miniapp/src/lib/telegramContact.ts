import { api } from './api';
import { useAuthStore } from '../store/useAuthStore';

type TelegramPhoneCallbackPayload =
  | boolean
  | string
  | {
      status?: string;
      phone_number?: string;
      phoneNumber?: string;
      contact?: {
        phone_number?: string;
        phoneNumber?: string;
      };
      response_data?: {
        contact?: {
          phone_number?: string;
          phoneNumber?: string;
        };
      };
      response?: {
        phone_number?: string;
        phoneNumber?: string;
        contact?: {
          phone_number?: string;
          phoneNumber?: string;
        };
      };
    };

type CurrentUserPhoneResponse = {
  phoneNumber?: string | null;
};

export type TelegramPhoneRequestResult = {
  ok: boolean;
  shared: boolean;
  phoneNumber: string | null;
  status: 'received' | 'synced' | 'shared_without_phone' | 'cancelled' | 'unsupported' | 'failed';
  message: string;
  raw?: TelegramPhoneCallbackPayload | null;
};

type TelegramRequestMethod = (callback?: (response: TelegramPhoneCallbackPayload) => void) => void;

function getTelegramRequestMethod(): TelegramRequestMethod | null {
  const tg = window.Telegram?.WebApp;
  const requestMethod = tg?.requestContact || tg?.requestPhoneContact;

  if (typeof requestMethod !== 'function') {
    return null;
  }

  return requestMethod.bind(tg) as TelegramRequestMethod;
}

function extractPhoneNumber(payload: TelegramPhoneCallbackPayload | null | undefined): string | null {
  if (!payload) return null;

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return /\d/.test(trimmed) ? trimmed : null;
  }

  if (typeof payload === 'boolean') {
    return null;
  }

  const candidates = [
    payload.phone_number,
    payload.phoneNumber,
    payload.contact?.phone_number,
    payload.contact?.phoneNumber,
    payload.response_data?.contact?.phone_number,
    payload.response_data?.contact?.phoneNumber,
    payload.response?.phone_number,
    payload.response?.phoneNumber,
    payload.response?.contact?.phone_number,
    payload.response?.contact?.phoneNumber,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function didUserShareContact(payload: TelegramPhoneCallbackPayload | null | undefined): boolean {
  if (payload === true) return true;
  if (!payload) return false;

  if (extractPhoneNumber(payload)) {
    return true;
  }

  if (typeof payload === 'string') {
    return false;
  }

  const normalizedStatus = String(payload.status || '').trim().toLowerCase();
  if (!normalizedStatus) return false;

  return ['sent', 'shared', 'authorized', 'allowed', 'success', 'received'].some((marker) =>
    normalizedStatus.includes(marker),
  );
}

async function wait(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function readCurrentUserPhone(): Promise<string | null> {
  try {
    const profile = (await api.get('/users/me')) as CurrentUserPhoneResponse;
    const phoneNumber = typeof profile?.phoneNumber === 'string' && profile.phoneNumber.trim()
      ? profile.phoneNumber.trim()
      : null;

    useAuthStore.getState().updateUser({ phoneNumber });
    return phoneNumber;
  } catch {
    return null;
  }
}

async function pollServerForPhone(timeoutMs: number, intervalMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const phoneNumber = await readCurrentUserPhone();
    if (phoneNumber) {
      return phoneNumber;
    }

    await wait(intervalMs);
  }

  return null;
}

export async function requestTelegramPhoneContact(options?: {
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<TelegramPhoneRequestResult> {
  const requestMethod = getTelegramRequestMethod();

  if (!requestMethod) {
    return {
      ok: false,
      shared: false,
      phoneNumber: null,
      status: 'unsupported',
      message: "Telegram client raqam ulashishni qo'llab-quvvatlamadi. Raqamni qo'lda kiriting.",
      raw: null,
    };
  }

  try {
    const rawResponse = await new Promise<TelegramPhoneCallbackPayload | null>((resolve) => {
      let settled = false;

      const finish = (value: TelegramPhoneCallbackPayload | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      try {
        requestMethod((response) => finish(response));
      } catch {
        finish(null);
      }

      window.setTimeout(() => finish(null), 9_000);
    });

    const directPhoneNumber = extractPhoneNumber(rawResponse);
    if (directPhoneNumber) {
      return {
        ok: true,
        shared: true,
        phoneNumber: directPhoneNumber,
        status: 'received',
        message: "Raqam Telegramdan olindi.",
        raw: rawResponse,
      };
    }

    const shared = didUserShareContact(rawResponse);
    if (!shared) {
      return {
        ok: false,
        shared: false,
        phoneNumber: null,
        status: 'cancelled',
        message: "Raqam ulashish bekor qilindi. Istasangiz qo'lda kiriting.",
        raw: rawResponse,
      };
    }

    const syncedPhoneNumber = await pollServerForPhone(options?.timeoutMs ?? 4_500, options?.intervalMs ?? 350);
    if (syncedPhoneNumber) {
      return {
        ok: true,
        shared: true,
        phoneNumber: syncedPhoneNumber,
        status: 'synced',
        message: "Raqam Telegram orqali ulandi.",
        raw: rawResponse,
      };
    }

    return {
      ok: false,
      shared: true,
      phoneNumber: null,
      status: 'shared_without_phone',
      message: "Telegramga ruxsat berildi, lekin raqam hali kelmadi. Raqamni qo'lda kiriting.",
      raw: rawResponse,
    };
  } catch {
    return {
      ok: false,
      shared: false,
      phoneNumber: null,
      status: 'failed',
      message: "Telegramdan raqam olishda xatolik bo'ldi. Raqamni qo'lda kiriting.",
      raw: null,
    };
  }
}
