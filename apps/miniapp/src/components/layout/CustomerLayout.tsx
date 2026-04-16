import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNavbar } from '../customer/CustomerComponents';
import { CustomerErrorBoundary } from '../ui/CustomerErrorBoundary';
import { useCartStore } from '../../store/useCartStore';
import { ChevronLeft } from 'lucide-react';

const RED = '#C62020';
const HOME_PATH = '/customer';

// Profile manages its own header — skip universal header here
const NO_HEADER_PATHS = [
  /^\/customer\/profile$/,
  /^\/customer$/,   // Home has own hero section
];

const HIDE_BOTTOM_NAV_PATHS = [
  /^\/customer\/checkout$/,
  /^\/customer\/order-success$/,
  /^\/customer\/orders\/[^/]+$/,
  /^\/customer\/support/,
  /^\/customer\/address\/map$/,
  /^\/customer\/orders\/[^/]+\/tracking$/,
];

/* ── Universal red header with centered logo ─────────────────────────────── */
const AppHeader: React.FC<{ showBack: boolean }> = ({ showBack }) => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: `linear-gradient(135deg, #9B0000 0%, ${RED} 60%, #E53535 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        boxShadow: '0 2px 12px rgba(150,0,0,0.35)',
      }}
    >
      {showBack && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white',
          }}
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Turon logo centered */}
      <img
        src="/turon-logo.png"
        alt="Turon Kafesi"
        style={{
          height: 38,
          maxWidth: 160,
          objectFit: 'contain',
          filter: 'brightness(0) invert(1)', // make logo white
          userSelect: 'none',
        }}
      />
    </div>
  );
};

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

  // ── Telegram: set header color red & manage BackButton ───────────────────
  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    if (!tg) return;

    // Make Telegram's native top bar red
    try { tg.setHeaderColor?.(RED); } catch { /* noop */ }
    try { tg.setBackgroundColor?.('#F9FAFB'); } catch { /* noop */ }
  }, []);

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
        {/* Universal red header with logo */}
        {showHeader && (
          <AppHeader showBack={!isHome && location.pathname !== HOME_PATH} />
        )}

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
