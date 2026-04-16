import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNavbar, FloatingCartBar } from '../customer/CustomerComponents';
import { CustomerErrorBoundary } from '../ui/CustomerErrorBoundary';
import { useCartStore } from '../../store/useCartStore';

// Pages that manage their own header + full-width layout (no HeaderBar, no padding)
const IMMERSIVE_CUSTOMER_PATHS = [
  /^\/customer$/,
  /^\/customer\/search$/,
  /^\/customer\/favorites$/,
  /^\/customer\/menu$/,
  /^\/customer\/profile$/,
  /^\/customer\/category\/[^/]+$/,
  /^\/customer\/cart$/,
  /^\/customer\/checkout$/,
  /^\/customer\/orders$/,
  /^\/customer\/orders\/[^/]+$/,
  /^\/customer\/address\/map$/,
  /^\/customer\/orders\/[^/]+\/tracking$/,
];

const HIDE_BOTTOM_NAV_PATHS = [
  /^\/customer\/checkout$/,
  /^\/customer\/order-success$/,
  /^\/customer\/orders\/[^/]+$/,
  /^\/customer\/support/,
  /^\/customer\/address\/map$/,
  /^\/customer\/orders\/[^/]+\/tracking$/,
];

const NO_FLOATING_CART_PATHS = [
  /^\/customer\/cart$/,
  /^\/customer\/checkout$/,
  /^\/customer\/order-success$/,
  /^\/customer\/orders\/[^/]+\/tracking$/,
  /^\/customer\/product\/[^/]+$/,
  /^\/customer\/addresses/,
  /^\/customer\/address\//,
  /^\/customer\/orders\/[^/]+$/,
  /^\/customer\/profile$/,
  /^\/customer\/menu$/,
];

const HOME_PATH = '/customer';

const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { items } = useCartStore();

  const layoutVars: React.CSSProperties & Record<string, string> = {
    '--customer-nav-height': '88px',
    '--customer-nav-bottom-gap': 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
    '--customer-nav-top-edge': 'calc(env(safe-area-inset-bottom, 0px) + 98px)',
    '--customer-floating-cart-offset': 'calc(env(safe-area-inset-bottom, 0px) + 102px)',
    '--customer-sticky-panel-clearance': 'calc(env(safe-area-inset-bottom, 0px) + 182px)',
    '--customer-floating-content-clearance': 'calc(env(safe-area-inset-bottom, 0px) + 160px)',
  };

  const isImmersiveRoute = IMMERSIVE_CUSTOMER_PATHS.some((p) => p.test(location.pathname));
  const hideBottomNav = HIDE_BOTTOM_NAV_PATHS.some((p) => p.test(location.pathname));
  const showFloatingCart =
    items.length > 0 &&
    !NO_FLOATING_CART_PATHS.some((p) => p.test(location.pathname));

  const isHome = location.pathname === HOME_PATH;

  // ── Telegram BackButton: show on sub-pages, hide on home ──────────────────
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    if (!isHome) {
      tg.BackButton.show();
      const handler = () => navigate(-1);
      tg.BackButton.onClick(handler);
      return () => {
        tg.BackButton.offClick(handler);
      };
    } else {
      tg.BackButton.hide();
    }
  }, [location.pathname, isHome, navigate]);

  return (
    <div
      className="min-h-screen w-full text-white"
      style={{
        ...layoutVars,
        background: 'var(--app-bg)',
        color: 'var(--app-text)',
      }}
    >
      <div className="mx-auto w-full max-w-[430px]">
        <main
          style={{
            position: 'relative',
            minHeight: '100vh',
            paddingBottom: showFloatingCart
              ? '140px'
              : !hideBottomNav
                ? '88px'
                : 'env(safe-area-inset-bottom, 20px)',
          }}
        >
          <CustomerErrorBoundary>
            <Outlet />
          </CustomerErrorBoundary>
        </main>
      </div>

      <FloatingCartBar hidden={!showFloatingCart} />
      {!hideBottomNav ? <BottomNavbar /> : null}
    </div>
  );
};

export default CustomerLayout;
