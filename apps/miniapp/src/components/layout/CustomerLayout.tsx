import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNavbar, FloatingCartBar, HeaderBar } from '../customer/CustomerComponents';
import { PullToRefreshIndicator } from '../customer/PullToRefreshIndicator';
import { CustomerErrorBoundary } from '../ui/CustomerErrorBoundary';
import { useCartStore } from '../../store/useCartStore';
import { useOrdersRealtimeSync } from '../../hooks/queries/useOrders';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { MiniAppCloseButton } from '../telegram/MiniAppCloseButton';

const IMMERSIVE_CUSTOMER_PATHS = [
  /^\/customer$/,
  /^\/customer\/search$/,
  /^\/customer\/favorites$/,
  /^\/customer\/category\/[^/]+$/,
  /^\/customer\/cart$/,
  /^\/customer\/checkout$/,
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
];

const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const { items } = useCartStore();
  const { connectionState, isConnected } = useOrdersRealtimeSync();
  const { tr } = useCustomerLanguage();
  const layoutVars: React.CSSProperties & Record<string, string> = {
    '--customer-nav-height': '62px',
    '--customer-nav-bottom-gap': 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
    '--customer-nav-top-edge': 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
    '--customer-floating-cart-offset':
      'calc(env(safe-area-inset-bottom, 0px) + 78px)',
    '--customer-sticky-panel-clearance':
      'calc(env(safe-area-inset-bottom, 0px) + 168px)',
    '--customer-floating-content-clearance':
      'calc(env(safe-area-inset-bottom, 0px) + 146px)',
  };

  const isImmersiveRoute = IMMERSIVE_CUSTOMER_PATHS.some((pattern) => pattern.test(location.pathname));
  const hideBottomNav = HIDE_BOTTOM_NAV_PATHS.some((pattern) => pattern.test(location.pathname));
  const showFloatingCart =
    items.length > 0 &&
    !NO_FLOATING_CART_PATHS.some((pattern) => pattern.test(location.pathname));

  const syncBadgeClass = isConnected
    ? 'border-emerald-300/18 bg-emerald-400/10 text-emerald-200'
    : connectionState === 'reconnecting' || connectionState === 'connecting'
      ? 'border-amber-300/18 bg-amber-400/10 text-amber-200'
      : 'border-white/8 bg-white/[0.06] text-white/48';

  const syncLabel = isConnected
    ? tr('sync.live')
    : connectionState === 'reconnecting'
      ? tr('sync.reconnecting')
      : connectionState === 'connecting'
        ? tr('sync.connecting')
        : tr('sync.idle');

  const getPageTitle = () => {
    const path = location.pathname;

    if (path === '/customer/orders') return tr('title.orders');
    if (path.includes('/customer/addresses')) return tr('title.addresses');
    if (path.includes('/customer/address/new')) return tr('title.newAddress');
    if (path.includes('/customer/address/map')) return tr('title.map');
    if (path === '/customer/profile') return tr('title.profile');
    if (path === '/customer/order-success') return tr('title.confirmation');
    if (path.includes('/customer/notifications')) return tr('title.notifications');
    if (path.includes('/customer/support')) return tr('title.support');
    if (path.includes('/customer/product')) return tr('title.product');
    return tr('brand');
  };

  return (
    <div
      className="min-h-screen w-full bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.35),transparent_28%),linear-gradient(180deg,#05070d_0%,#0a0f19_55%,#0c111d_100%)] text-white"
      style={layoutVars}
    >
      <PullToRefreshIndicator />

      <div className="mx-auto w-full max-w-[430px]">
        {!isImmersiveRoute ? (
          <HeaderBar
            title={getPageTitle()}
            showBack={location.pathname !== '/customer'}
            rightSlot={
              <div className="flex items-center gap-2">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${syncBadgeClass}`}>
                  <span className={`h-2 w-2 rounded-full ${isConnected ? 'animate-pulse bg-emerald-300' : 'bg-current/50'}`} />
                  <span>{syncLabel}</span>
                </div>
                <MiniAppCloseButton />
              </div>
            }
          />
        ) : null}

        <main
          className={`
            relative min-h-screen
            ${!isImmersiveRoute ? 'px-4 pt-4' : ''}
            ${showFloatingCart ? 'pb-[140px]' : (!hideBottomNav ? 'pb-[88px]' : 'pb-[env(safe-area-inset-bottom,20px)]')}
          `}
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
