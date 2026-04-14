/**
 * AppBootstrapGate
 *
 * Responsibilities:
 *   1. Show the branded splash for at least MIN_SPLASH_MS so the user sees
 *      the Turon Kafesi loading animation.
 *   2. Authenticate the user (or use the cached session) so that every child
 *      page can rely on isAuthenticated + user being correct when it first
 *      renders — eliminating any flash-of-unauthenticated-content.
 *   3. Redirect to the role's home path once ready.
 *
 * Mobile reliability notes:
 *   • For returning users (any cached token) the app always opens after
 *     MIN_SPLASH_MS — auth refreshes silently in the background.
 *   • For new users the auth request is made with a dedicated AbortController
 *     so the TCP connection is force-cancelled on timeout (axios's built-in
 *     timeout only starts after TCP is established).
 *   • hasCachedAuth() is intentionally called via useAuthStore.getState()
 *     which reads the synchronously-hydrated zustand/persist store directly
 *     — no async hydration helper needed.
 */

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
/** Minimum time the splash screen is visible (keeps branding visible) */
const MIN_SPLASH_MS = 2_500;
/** Hard limit on auth for new users before we abort the TCP connection */
const AUTH_HARD_TIMEOUT_MS = 12_000;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

async function doAuthRequest(
  initDataStr: string,
  signal: AbortSignal,
): Promise<{ user: any; token: string }> {
  const { data } = await axios.post(
    `${API_URL}/auth/telegram`,
    { initData: initDataStr },
    { signal },
  );
  return data;
}

/**
 * Try to read initData immediately; if empty, poll window.Telegram.WebApp
 * for up to 5 s (20 × 250 ms).  Telegram injects initData synchronously on
 * real devices so the first call usually resolves in <1 ms.
 */
async function resolveInitData(
  initData: string | undefined,
  signal: AbortSignal,
): Promise<string | null> {
  if (initData) return initData;

  return new Promise<string | null>((resolve) => {
    let tries = 20;

    const poll = () => {
      if (signal.aborted) { resolve(null); return; }
      const fresh = window.Telegram?.WebApp?.initData;
      if (fresh) { resolve(fresh); return; }
      tries -= 1;
      if (tries <= 0) { resolve(null); return; }
      window.setTimeout(poll, 250);
    };

    poll();
  });
}

function isAbortLike(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === 'AbortError' ||
    err.name === 'CanceledError' ||
    err.message === 'aborted' ||
    err.message === 'canceled'
  );
}

function waitMs(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('aborted')); return; }
    let t: number | undefined;
    const onAbort = () => { window.clearTimeout(t); reject(new Error('aborted')); };
    t = window.setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function hasCachedAuth(): boolean {
  // useAuthStore.getState() reads the zustand store synchronously.
  // zustand/persist hydrates from localStorage synchronously (default storage),
  // so this is always accurate even on first render.
  const s = useAuthStore.getState();
  return s.isAuthenticated && !!s.user && !!s.token;
}

function fetchJson<T>(url: string): Promise<T> {
  return axios.get<T>(url, { timeout: 10_000 }).then((r) => r.data);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AppBootstrapGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initData } = useTelegram();
  const { setAuth, user, isAuthenticated, token } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  // Snapshot before any async work so we know the initial cached state
  const hadCachedRef = useRef(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const { signal } = ctrl;

    hadCachedRef.current = hasCachedAuth();
    setReady(false);
    setError(null);
    ensureTelegramMiniAppFullscreen();

    // Kick off menu prefetch — never blocks bootstrap
    void Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['menu', 'categories'],
        queryFn: () => fetchJson(`${API_URL}/menu/categories`),
        staleTime: 5 * 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['menu', 'products'],
        queryFn: () => fetchJson(`${API_URL}/menu/products`),
        staleTime: 5 * 60_000,
      }),
    ]);

    /**
     * Silently refresh auth for returning users.
     * Never throws, never calls setError — cached session stays valid.
     */
    const refreshSilently = () => {
      void (async () => {
        try {
          const id = await resolveInitData(initData, signal);
          if (!id || signal.aborted) return;
          const result = await doAuthRequest(id, signal);
          if (signal.aborted) return;
          const role = normalizeRole(result.user?.role);
          if (role) setAuth({ ...result.user, role }, result.token);
        } catch { /* silent */ }
      })();
    };

    /**
     * Blocking auth for first-time users.
     *
     * Uses a DEDICATED AbortController for the HTTP request so the TCP
     * connection is actually cancelled when our hard timer fires — axios's
     * own `timeout` option only starts ticking after TCP is established,
     * so a hanging SYN would otherwise block indefinitely.
     *
     * Never resolves successfully without setting auth in the store first.
     */
    const authenticateBlocking = async (): Promise<void> => {
      const reqCtrl = new AbortController();

      // Propagate component unmount → cancel request
      const onUnmount = () => reqCtrl.abort();
      signal.addEventListener('abort', onUnmount, { once: true });

      // Force-cancel TCP after hard timeout
      let timedOut = false;
      const hardTimer = window.setTimeout(() => { timedOut = true; reqCtrl.abort(); }, AUTH_HARD_TIMEOUT_MS);

      try {
        const id = await resolveInitData(initData, reqCtrl.signal);

        if (signal.aborted) return;

        if (!id) {
          throw new Error('Telegram muhiti topilmadi. Bot orqali kiring.');
        }

        const result = await doAuthRequest(id, reqCtrl.signal);

        if (signal.aborted) return;

        const role = normalizeRole(result.user?.role);
        if (!role) throw new Error("Foydalanuvchi roli aniqlanmadi.");

        // Auth succeeded — populate the store BEFORE we return so that
        // every child page that renders immediately after setReady(true)
        // already sees isAuthenticated = true.
        setAuth({ ...result.user, role }, result.token);
      } catch (err) {
        if (signal.aborted) return; // component unmounted — swallow silently

        // Our hard timer fired → emit a human-readable timeout message
        if (timedOut && isAbortLike(err)) {
          throw new Error('Ulanish vaqti tugadi. Internetni tekshirib, qayta urining.');
        }
        throw err;
      } finally {
        window.clearTimeout(hardTimer);
        signal.removeEventListener('abort', onUnmount);
      }
    };

    const bootstrap = async () => {
      if (hadCachedRef.current) {
        // ── Returning user ─────────────────────────────────────────────────
        // Show app after splash, refresh token silently in background.
        refreshSilently();
        await waitMs(MIN_SPLASH_MS, signal);
      } else {
        // ── First-time user ────────────────────────────────────────────────
        // Auth MUST complete before we call setReady so that RoleGuard sees
        // isAuthenticated = true on its very first render.
        // Both promises run in parallel; we wait for both to settle.
        await Promise.all([
          authenticateBlocking(),
          waitMs(MIN_SPLASH_MS, signal),
        ]);
      }

      if (!signal.aborted) {
        ensureTelegramMiniAppFullscreen();
        setReady(true);
      }
    };

    void bootstrap().catch((err: Error) => {
      if (!signal.aborted && !isAbortLike(err)) {
        setError(err.message || 'Tizimga ulanishda xato yuz berdi.');
      }
    });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // Redirect to role home once authenticated
  useEffect(() => {
    if (!ready || error || !isAuthenticated || !user) return;

    const role = normalizeRole(user.role);
    if (!role) { setError("Foydalanuvchi roli noto'g'ri."); return; }

    const redirect = resolveRoleEntryRedirect(role, location.pathname);
    if (redirect && redirect !== location.pathname) {
      navigate(redirect, { replace: true });
    }
  }, [ready, error, isAuthenticated, user, location.pathname, navigate]);

  if (error) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'linear-gradient(160deg,#0a0d18 0%,#141830 55%,#0a0d18 100%)',
        }}
      >
        <ErrorStateCard
          title="Xato"
          message={error}
          onRetry={() => { setReady(false); setError(null); setRetryKey((k) => k + 1); }}
        />
      </div>
    );
  }

  if (!ready) return <LoadingScreen />;

  return <>{children}</>;
};
