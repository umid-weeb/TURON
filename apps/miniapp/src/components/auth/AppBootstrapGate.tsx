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
const MIN_SPLASH_MS   = 2_500;   // burger always visible at least this long
const AUTH_TIMEOUT_MS = 8_000;   // max wait for /auth/telegram
const HARD_TIMEOUT_MS = 13_000;  // absolute max — then show retry

// ── Fetch helpers (raw axios, no auth needed for public endpoints) ────────────

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
    { timeout: AUTH_TIMEOUT_MS, signal },
  );
  return data;
}

async function resolveInitData(
  initData: string | undefined,
  signal: AbortSignal,
): Promise<string | null> {
  if (initData) return initData;

  return new Promise<string | null>((resolve) => {
    let tries = 4;
    const poll = () => {
      if (signal.aborted) return resolve(null);
      const d = window.Telegram?.WebApp?.initData;
      if (d) return resolve(d);
      if (--tries <= 0) return resolve(null);
      window.setTimeout(poll, 380);
    };
    poll();
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export const AppBootstrapGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initData } = useTelegram();
  const { setAuth, user, isAuthenticated, token } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [ready, setReady]       = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Snapshot session state at effect-run time so re-renders don't restart the flow
  const hasCachedRef = useRef(isAuthenticated && !!user && !!token);

  // ── Hard timeout ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (ready || error) return;
    const t = window.setTimeout(() => {
      setError("Ulanish vaqti tugadi. Internetni tekshirib, qayta urining.");
    }, HARD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [ready, error, retryKey]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    hasCachedRef.current = isAuthenticated && !!user && !!token;
    const hasCached = hasCachedRef.current;

    const controller = new AbortController();
    const { signal } = controller;

    setReady(false);
    setError(null);

    // 1. Auth flow
    const authPromise: Promise<void> = hasCached
      ? // Returning user: fire-and-forget silent refresh
        (async () => {
          const id = await resolveInitData(initData, signal);
          if (!id || signal.aborted) return;
          try {
            const result = await doAuthRequest(id, signal);
            if (signal.aborted) return;
            const role = normalizeRole(result.user?.role);
            if (role) setAuth({ ...result.user, role }, result.token);
            ensureTelegramMiniAppFullscreen();
          } catch { /* silent — cached token still works */ }
        })()
      : // New user: must succeed before showing the app
        (async () => {
          const id = await resolveInitData(initData, signal);
          if (signal.aborted) return;
          if (!id) throw new Error('Telegram muhiti topilmadi. Bot orqali kiring.');
          const result = await doAuthRequest(id, signal);
          if (signal.aborted) return;
          const role = normalizeRole(result.user?.role);
          if (!role) throw new Error("Foydalanuvchi roli qo'llab-quvvatlanmaydi");
          setAuth({ ...result.user, role }, result.token);
          ensureTelegramMiniAppFullscreen();
        })();

    // 2. Prefetch public menu data (runs immediately, no auth needed)
    const menuPromise = Promise.allSettled([
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

    // 3. Minimum splash so the burger animation is actually seen
    const splashPromise = new Promise<void>((r) => window.setTimeout(r, MIN_SPLASH_MS));

    // Show the app once: auth + splash done (menu finishes in background)
    Promise.all([authPromise, splashPromise])
      .then(() => {
        if (!signal.aborted) setReady(true);
        // Let menu finish quietly even if app is already shown
        void menuPromise;
      })
      .catch((err: Error) => {
        if (!signal.aborted) setError(err.message || 'Tizimga ulanishda xato yuz berdi.');
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // ── Navigate to correct route once ready ──────────────────────────────────
  useEffect(() => {
    if (!ready || error || !isAuthenticated || !user) return;
    const role = normalizeRole(user.role);
    if (!role) { setError("Foydalanuvchi roli noto'g'ri."); return; }
    const redirect = resolveRoleEntryRedirect(role, location.pathname);
    if (redirect && redirect !== location.pathname) {
      navigate(redirect, { replace: true });
    }
  }, [ready, error, isAuthenticated, user, location.pathname, navigate]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
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
