import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTelegram } from '../../hooks/useTelegram';
import { useAuthStore } from '../../store/useAuthStore';
import { normalizeRole, resolveRoleEntryRedirect } from '../../features/auth/roleRouting';
import { ensureTelegramMiniAppFullscreen } from '../../lib/telegramMiniApp';
import { ErrorStateCard, LoadingScreen } from '../ui/FeedbackStates';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
const MIN_SPLASH_MS = 2_500;
/** Hard limit before we abort the TCP connection for new users */
const NEW_USER_HARD_TIMEOUT_MS = 12_000;

async function fetchPublicJson<T>(url: string): Promise<T> {
  const { data } = await axios.get<T>(url, { timeout: 10_000 });
  return data;
}

async function doAuthRequest(
  initDataStr: string,
  signal: AbortSignal,
): Promise<{ user: any; token: string }> {
  const { data } = await axios.post(
    `${API_URL}/auth/telegram`,
    { initData: initDataStr },
    { timeout: NEW_USER_HARD_TIMEOUT_MS, signal },
  );
  return data;
}

async function resolveInitData(
  initData: string | undefined,
  signal: AbortSignal,
): Promise<string | null> {
  if (initData) return initData;

  // Poll window.Telegram.WebApp.initData for up to 5 seconds (20 × 250 ms)
  return new Promise<string | null>((resolve) => {
    let tries = 20;

    const poll = () => {
      if (signal.aborted) {
        resolve(null);
        return;
      }
      const freshInitData = window.Telegram?.WebApp?.initData;
      if (freshInitData) {
        resolve(freshInitData);
        return;
      }
      tries -= 1;
      if (tries <= 0) {
        resolve(null);
        return;
      }
      window.setTimeout(poll, 250);
    };

    poll();
  });
}

function isAbortLikeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === 'AbortError' ||
    err.name === 'CanceledError' ||
    err.message === 'aborted' ||
    err.message === 'canceled'
  );
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('aborted')); return; }
    let timer: number | undefined;
    const onAbort = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      reject(new Error('aborted'));
    };
    timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Wait until the zustand persist store has hydrated from localStorage.
 * In most environments hydration is synchronous, but on some iOS WebViews
 * it can be deferred — we give it up to 300 ms before giving up.
 */
function waitForStoreHydration(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    // zustand/persist exposes _hasHydrated via the store's persist API
    const api = (useAuthStore as any).persist;

    if (!api || api.hasHydrated?.()) {
      resolve();
      return;
    }

    let resolved = false;

    const unsub = api.onFinishHydration?.(() => {
      if (!resolved) { resolved = true; resolve(); }
    });

    // Hard fallback: if persist API is unavailable or never fires, give up after 300 ms
    window.setTimeout(() => {
      if (!resolved) { resolved = true; resolve(); }
    }, 300);

    signal.addEventListener('abort', () => {
      if (!resolved) { resolved = true; unsub?.(); resolve(); }
    }, { once: true });
  });
}

function hasCachedAuth(): boolean {
  const state = useAuthStore.getState();
  return state.isAuthenticated && !!state.user && !!state.token;
}

export const AppBootstrapGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initData } = useTelegram();
  const { setAuth, user, isAuthenticated, token } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const hadCachedAuthRef = useRef(isAuthenticated && !!user && !!token);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setReady(false);
    setError(null);
    ensureTelegramMiniAppFullscreen();

    // ── Prefetch public menu data in background ───────────────────────────────
    void Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['menu', 'categories'],
        queryFn: () => fetchPublicJson(`${API_URL}/menu/categories`),
        staleTime: 5 * 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['menu', 'products'],
        queryFn: () => fetchPublicJson(`${API_URL}/menu/products`),
        staleTime: 5 * 60_000,
      }),
    ]);

    /**
     * Silently refresh auth in the background — never blocks the UI, never sets error.
     */
    const refreshInBackground = () => {
      void (async () => {
        try {
          const id = await resolveInitData(initData, signal);
          if (!id || signal.aborted) return;
          const result = await doAuthRequest(id, signal);
          if (signal.aborted) return;
          const role = normalizeRole(result.user?.role);
          if (role) setAuth({ ...result.user, role }, result.token);
        } catch {
          // Silent fail — cached session remains valid for this visit
        }
      })();
    };

    /**
     * Blocking auth for first-time users.
     *
     * Uses a dedicated AbortController so the TCP connection is force-cancelled
     * when the hard timeout fires — axios's built-in timeout only starts after
     * the connection is established, so a hanging TCP SYN would otherwise block
     * indefinitely.
     */
    const authenticateBlocking = async (): Promise<void> => {
      const authCtl = new AbortController();
      const authSignal = authCtl.signal;

      const onComponentAbort = () => authCtl.abort();
      signal.addEventListener('abort', onComponentAbort, { once: true });

      let timedOutByUs = false;
      const hardTimer = window.setTimeout(() => {
        timedOutByUs = true;
        authCtl.abort();
      }, NEW_USER_HARD_TIMEOUT_MS);

      try {
        const id = await resolveInitData(initData, authSignal);

        if (signal.aborted) return;

        if (!id) {
          throw new Error('Telegram muhiti topilmadi. Bot orqali kiring.');
        }

        const result = await doAuthRequest(id, authSignal);

        if (signal.aborted) return;

        const role = normalizeRole(result.user?.role);
        if (!role) throw new Error("Foydalanuvchi roli qo'llab-quvvatlanmaydi");

        setAuth({ ...result.user, role }, result.token);
      } catch (err) {
        if (signal.aborted) return;

        if (timedOutByUs && isAbortLikeError(err)) {
          throw new Error("Ulanish vaqti tugadi. Internetni tekshirib, qayta urining.");
        }

        throw err;
      } finally {
        window.clearTimeout(hardTimer);
        signal.removeEventListener('abort', onComponentAbort);
      }
    };

    // ── Main bootstrap ────────────────────────────────────────────────────────
    const bootstrap = async () => {
      // Wait for zustand to hydrate so hasCachedAuth() reads the real stored value
      await waitForStoreHydration(signal);

      if (signal.aborted) return;

      // Set the ref AFTER hydration so it reflects actual persisted state
      hadCachedAuthRef.current = hasCachedAuth();

      if (hadCachedAuthRef.current) {
        // ── Returning user: show app after splash, silently refresh auth ─────
        refreshInBackground();
        await wait(MIN_SPLASH_MS, signal);
      } else {
        // ── First-time user: must authenticate before showing app ─────────────
        await Promise.all([
          authenticateBlocking(),
          wait(MIN_SPLASH_MS, signal),
        ]);
      }

      if (!signal.aborted) {
        ensureTelegramMiniAppFullscreen();
        setReady(true);
      }
    };

    void bootstrap().catch((err: Error) => {
      if (!signal.aborted && !isAbortLikeError(err)) {
        setError(err.message || 'Tizimga ulanishda xato yuz berdi.');
      }
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // ── Role-based redirect after ready ──────────────────────────────────────────
  useEffect(() => {
    if (!ready || error || !isAuthenticated || !user) return;

    const role = normalizeRole(user.role);

    if (!role) {
      setError("Foydalanuvchi roli noto'g'ri.");
      return;
    }

    const redirect = resolveRoleEntryRedirect(role, location.pathname);

    if (redirect && redirect !== location.pathname) {
      navigate(redirect, { replace: true });
    }
  }, [ready, error, isAuthenticated, user, location.pathname, navigate]);

  if (error) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'linear-gradient(160deg,#0a0d18 0%,#141830 55%,#0a0d18 100%)',
          zIndex: 9999,
        }}
      >
        <ErrorStateCard
          title="Xato"
          message={error}
          onRetry={() => {
            setReady(false);
            setError(null);
            setRetryKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

  if (!ready) return <LoadingScreen />;

  return <>{children}</>;
};
