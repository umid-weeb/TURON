import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useTelegram } from '../../hooks/useTelegram';
import { useAuthStore } from '../../store/useAuthStore';
import { UserRoleEnum } from '@turon/shared';
import { LoadingScreen, ErrorStateCard } from '../ui/FeedbackStates';

export const AppBootstrapGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initData, ready, expand, user: telegramUser, theme, setTheme, isTelegram, rawInitData } = useTelegram();
  const { setAuth, user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(!isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const [webAppTheme, setWebAppTheme] = useState(theme || 'light');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function bootstrap() {
      if (!initData) {
        // Fallback for non-telegram local development handling
        if (!isTelegram) {
          setError(null); // no blocking in local dev for now; allow flow
          return;
        }

        setError('Telegram muhiti topilmadi. Iltimos, faqat bot orqali kiring.');
        setLoading(false);
        return;
      }

      try {
        const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
        const response = await axios.post(`${apiUrl}/auth/telegram`, { initData });
        
        const { user: authUser, token } = response.data;
        setAuth(authUser, token);

        // If telegram identity is present, override user info to include it for role routing and API verification
        if (telegramUser) {
          setAuth({ ...authUser, telegramId: telegramUser.id.toString(), firstName: telegramUser.first_name, lastName: telegramUser.last_name }, token);
        }

        setTheme((incomingTheme) => {
          setWebAppTheme(incomingTheme || 'light');
          document.documentElement.classList.toggle('dark', incomingTheme === 'dark');
        });

        ready();
        expand();
        
        // Auto-redirect ONLY if coming into the exact root path
        if (location.pathname === '/') {
          if (authUser.role === UserRoleEnum.ADMIN) navigate('/admin', { replace: true });
          else if (authUser.role === UserRoleEnum.COURIER) navigate('/courier', { replace: true });
          else navigate('/customer', { replace: true });
        }
        
      } catch (err: any) {
        setError(err.response?.data?.error || 'Tizimga ulanishda xato yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      } finally {
        setLoading(false);
      }
    }

    if (!isAuthenticated) {
      bootstrap();
    } else {
      setLoading(false);
      // Already authed, ensure root redirect pushes to correct role dashboard
      if (location.pathname === '/') {
        if (user?.role === UserRoleEnum.ADMIN) navigate('/admin', { replace: true });
        else if (user?.role === UserRoleEnum.COURIER) navigate('/courier', { replace: true });
        else navigate('/customer', { replace: true });
      }
    }
  }, [initData, isAuthenticated, user, navigate, ready, expand, setAuth, location.pathname]);

  if (loading) return <LoadingScreen message="Turon Tizimi Ishga Tushirilmoqda..." />;
  if (error) return (
     <div className="h-screen flex items-center justify-center p-6 bg-slate-50">
       <ErrorStateCard title="Avtorizatsiya xatosi" message={error} onRetry={() => window.location.reload()} />
     </div>
  );

  return (
    <div className={webAppTheme === 'dark' ? 'dark' : ''}>
      {children}
    </div>
  );
};
