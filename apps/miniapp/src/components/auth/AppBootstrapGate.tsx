import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTelegram } from '../../hooks/useTelegram';
import { useAuthStore } from '../../store/useAuthStore';
import { normalizeRole, resolveRoleEntryRedirect } from '../../features/auth/roleRouting';
import { ensureTelegramMiniAppFullscreen } from '../../lib/telegramMiniApp';
import { ErrorStateCard, LoadingScreen } from '../ui/FeedbackStates';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
// Hard cap: if still loading after this many ms, show a retry button
const HARD_TIMEOUT_MS = 10_000;
// Auth request timeout
const AUTH_TIMEOUT_MS = 8_000;

export const AppBootstrapGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initData } = useTelegram();
  const { setAuth, user, isAuthenticated, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Fast path: return user has a cached session ──────────────────────────
  // Show children immediately; silently refresh token in background.
  const hasCachedSession = isAuthenticated && !!user && !!token;

  const [loading, setLoading]   = useState(!hasCachedSession);
  const [error, setError]       = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // ── Hard timeout guard ───────────────────────────────────────────────────
  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => {
      setError("Ulanish vaqti tugadi. Internet aloqasini tekshirib, qayta urining.");
      setLoading(false);
    }, HARD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [loading, retryKey]);

  // ── Auth fetch ────────────────────────────────────────────────────────────
  const doAuth = useCallback(async (signal: AbortSignal): Promise<void> => {
    // Collect initData – Telegram may not have injected it yet
    let currentInitData = initData;
    if (!currentInitData) {
      currentInitData = await new Promise<string | null>((resolve) => {
        let tries = 3;
        const poll = () => {
          if (signal.aborted) return resolve(null);
          const d = window.Telegram?.WebApp?.initData;
          if (d) return resolve(d);
          if (--tries <= 0) return resolve(null);
          window.setTimeout(poll, 400);
        };
        poll();
      });
    }

    if (signal.aborted) return;

    if (!currentInitData) {
      setError('Telegram muhiti topilmadi. Iltimos, faqat bot orqali kiring.');
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.post(
        `${API_URL}/auth/telegram`,
        { initData: currentInitData },
        { timeout: AUTH_TIMEOUT_MS, signal },
      );

      if (signal.aborted) return;

      const normalizedRole = normalizeRole(data.user?.role);
      if (!normalizedRole) throw new Error("Foydalanuvchi roli qo'llab-quvvatlanmaydi");

      setAuth({ ...data.user, role: normalizedRole }, data.token);
      ensureTelegramMiniAppFullscreen();
    } catch (err: any) {
      if (signal.aborted || axios.isCancel(err)) return;
      const msg =
        err.response?.status === 503
          ? "Xizmat vaqtincha ishlamayapti. Qayta urinib ko'ring."
          : err.response?.data?.error || err.message || "Tizimga ulanishda xato yuz berdi.";
      setError(msg);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [initData, setAuth]);

  // ── Bootstrap effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (hasCachedSession) {
      // Background silent refresh — don't block UI
      const controller = new AbortController();
      void doAuth(controller.signal).catch(() => {/* silent */});
      return () => controller.abort();
    }

    // No cached session — full blocking bootstrap
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void doAuth(controller.signal);
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // ── Navigation after auth ─────────────────────────────────────────────────
  useEffect(() => {
    if (loading || error || !isAuthenticated || !user) return;
    const normalizedRole = normalizeRole(user.role);
    if (!normalizedRole) {
      setError("Foydalanuvchi roli noto'g'ri.");
      return;
    }
    const redirect = resolveRoleEntryRedirect(normalizedRole, location.pathname);
    if (redirect && redirect !== location.pathname) {
      navigate(redirect, { replace: true });
    }
  }, [error, isAuthenticated, loading, location.pathname, navigate, user]);

  // ── Render ────────────────────────────────────────────────────────────────

  // Fast path — cached session: show app immediately
  if (hasCachedSession && !error) return <>{children}</>;

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <ErrorStateCard
          title="Xato"
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            setRetryKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
};
