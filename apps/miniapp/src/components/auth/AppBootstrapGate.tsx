import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTelegram } from '../../hooks/useTelegram';
import { useAuthStore } from '../../store/useAuthStore';
import { normalizeRole, resolveRoleEntryRedirect } from '../../features/auth/roleRouting';
import { ErrorStateCard, LoadingScreen } from '../ui/FeedbackStates';

export const AppBootstrapGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tg, initData } = useTelegram();
  const { setAuth, user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  const bootstrap = useCallback(async (signal: AbortSignal): Promise<void> => {
    let initDataRetries = 4;

    const waitForInitData = (): Promise<string | null> =>
      new Promise((resolve) => {
        const check = () => {
          if (signal.aborted) return resolve(null);
          const data = initData;
          if (data) return resolve(data);
          if (initDataRetries <= 0) return resolve(null);
          initDataRetries -= 1;
          window.setTimeout(check, 500);
        };
        check();
      });

    const currentInitData = initData || (await waitForInitData());

    if (signal.aborted) return;

    if (!currentInitData) {
      setError('Telegram muhiti topilmadi. Iltimos, faqat bot orqali kiring.');
      setLoading(false);
      return;
    }

    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.post(
        `${apiUrl}/auth/telegram`,
        { initData: currentInitData },
        { timeout: 20000, signal },
      );

      if (signal.aborted) return;

      const { user: authUser, token } = response.data;
      const normalizedRole = normalizeRole(authUser?.role);

      if (!normalizedRole) {
        throw new Error("Foydalanuvchi roli qo'llab-quvvatlanmaydi");
      }

      setAuth({ ...authUser, role: normalizedRole }, token);
      tg?.ready?.();
      tg?.expand?.();
    } catch (err: any) {
      if (signal.aborted || axios.isCancel(err)) return;

      const isServiceUnavailable = err.response?.status === 503;
      const message = isServiceUnavailable
        ? "Xizmat vaqtincha ishlamayapti. Qayta urinib ko'ring."
        : err.response?.data?.error || err.message || "Tizimga ulanishda xato yuz berdi.";

      setError(message);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [initData, setAuth, tg]);

  const retryRef = useRef(retryKey);
  retryRef.current = retryKey;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void bootstrap(controller.signal);
    return () => controller.abort();
  }, [bootstrap, retryKey]);

  useEffect(() => {
    if (loading || error || !isAuthenticated || !user) return;

    const normalizedRole = normalizeRole(user.role);
    if (!normalizedRole) {
      setError("Foydalanuvchi roli noto'g'ri yoki qo'llab-quvvatlanmaydi.");
      return;
    }

    const redirectPath = resolveRoleEntryRedirect(normalizedRole, location.pathname);
    if (redirectPath && redirectPath !== location.pathname) {
      navigate(redirectPath, { replace: true });
    }
  }, [error, isAuthenticated, loading, location.pathname, navigate, user]);

  if (loading) {
    return <LoadingScreen message="Ishga tushirilmoqda..." />;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <ErrorStateCard
          title="Xato"
          message={error}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </div>
    );
  }

  return <>{children}</>;
};
