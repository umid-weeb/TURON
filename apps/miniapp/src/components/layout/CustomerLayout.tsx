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

/* ── Universal header — logo only, centered ─────────────────────────────── */
const AppHeader: React.FC = () => (
  <div
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: `linear-gradient(135deg, #8B0000 0%, #C62020 55%, #E83535 100%)`,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingTop: 'calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 8px)) + 10px)',
      paddingBottom: 14,
      minHeight: 'calc(90px + var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)))',
      boxShadow: '0 4px 20px rgba(150,0,0,0.4)',
    }}
  >
    <img
      src="/turon-logo.png"
      alt="Turon Kafesi"
      style={{
        height: 78,
        maxWidth: '72vw',
        objectFit: 'contain',
        filter:
          'brightness(0) invert(1) drop-shadow(0 0 12px rgba(255,200,200,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
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
        {showHeader && <AppHeader />}

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
