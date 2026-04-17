import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNavbar } from '../customer/CustomerComponents';
import { CustomerErrorBoundary } from '../ui/CustomerErrorBoundary';

const RED = '#C62020';
const HOME_PATH = '/customer';

// Only Profile manages its own header
const NO_HEADER_PATHS = [
  /^\/customer\/profile$/,
];

const HIDE_BOTTOM_NAV_PATHS = [
  /^\/customer\/checkout$/,
  /^\/customer\/order-success$/,
  /^\/customer\/orders\/[^/]+$/,
  /^\/customer\/support/,
  /^\/customer\/address\/map$/,
  /^\/customer\/orders\/[^/]+\/tracking$/,
];

/* ── Universal header — page title ─────────────────────────────── */
const getHeaderTitle = (pathname: string) => {
  if (pathname === '/customer') return 'Asosiy menyu';
  if (pathname.includes('/cart')) return 'Savat';
  if (pathname.includes('/orders')) return 'Buyurtmalarim';
  if (pathname.includes('/checkout')) return 'Buyurtmani rasmiylashtirish';
  if (pathname.includes('/category/')) return 'Kategoriya';
  if (pathname.includes('/product/')) return 'Taom haqida';
  if (pathname.includes('/profile')) return 'Profil';
  return 'Turon Kafe';
};

const AppHeader: React.FC<{ pathname: string }> = ({ pathname }) => (
  <div
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: `linear-gradient(135deg, #8B0000 0%, #C62020 55%, #E83535 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 'calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 12px)',
      paddingBottom: 12,
      minHeight: 'calc(60px + var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)))',
      boxShadow: '0 2px 12px rgba(150,0,0,0.3)',
    }}
  >
    <h1
      style={{
        margin: 0,
        fontSize: 18,
        fontWeight: 700,
        color: '#FFFFFF',
        letterSpacing: '0.02em',
        textShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    >
      {getHeaderTitle(pathname)}
    </h1>
  </div>
);

/* ── Layout ──────────────────────────────────────────────────────────────── */
const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const layoutVars: React.CSSProperties & Record<string, string> = {
    '--customer-nav-height': '72px',
    '--customer-nav-bottom-gap': 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
    '--customer-nav-top-edge': 'calc(env(safe-area-inset-bottom, 0px) + 82px)',
    '--customer-floating-cart-offset': 'calc(env(safe-area-inset-bottom, 0px) + 86px)',
    '--customer-sticky-panel-clearance': 'calc(env(safe-area-inset-bottom, 0px) + 160px)',
    '--customer-floating-content-clearance': 'calc(env(safe-area-inset-bottom, 0px) + 140px)',
  };

  const hideBottomNav = HIDE_BOTTOM_NAV_PATHS.some((p) => p.test(location.pathname));
  const showHeader = !NO_HEADER_PATHS.some((p) => p.test(location.pathname));
  const isHome = location.pathname === HOME_PATH;

  // ── Telegram BackButton: show on sub-pages, hide on home ─────────────────
  // NOTE: We do NOT call setHeaderColor so Telegram keeps its default color
  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    if (!tg?.BackButton) return;

    if (!isHome) {
      tg.BackButton.show();
      const handler = () => navigate(-1);
      tg.BackButton.onClick(handler);
      return () => { tg.BackButton.offClick(handler); };
    } else {
      tg.BackButton.hide();
    }
  }, [location.pathname, isHome, navigate]);

  return (
    <div
      style={{
        ...layoutVars,
        minHeight: '100vh',
        width: '100%',
        background: 'var(--app-bg)',
        color: 'var(--app-text)',
      }}
    >
      <div className="w-full">
        {showHeader && <AppHeader pathname={location.pathname} />}

        <main
          style={{
            position: 'relative',
            minHeight: '100dvh',
            paddingBottom: !hideBottomNav ? '88px' : 'env(safe-area-inset-bottom, 20px)',
          }}
        >
          <CustomerErrorBoundary>
            <Outlet />
          </CustomerErrorBoundary>
        </main>
      </div>

      {!hideBottomNav ? <BottomNavbar /> : null}
    </div>
  );
};

export default CustomerLayout;
