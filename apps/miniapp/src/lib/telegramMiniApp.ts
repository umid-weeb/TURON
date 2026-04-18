type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  close?: () => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  platform?: string;
  onEvent?: (eventType: string, eventHandler: (event?: unknown) => void) => void;
  offEvent?: (eventType: string, eventHandler: (event?: unknown) => void) => void;
};

let isInitialized = false;
let cleanupTouchGuard: (() => void) | null = null;
let cleanupZoomGuard: (() => void) | null = null;

/**
 * CRITICAL: requestFullscreen() causes Telegram to fire viewportChanged.
 * If the viewportChanged handler calls requestFullscreen() again we get:
 *   requestFullscreen → viewportChanged → requestFullscreen → viewportChanged → ...
 * On iOS WKWebView this infinite transition loop renders content normally
 * but SWALLOWS EVERY TOUCH EVENT — the app looks alive but nothing responds.
 *
 * Guard: enforce a 3 s minimum between actual requestFullscreen() calls.
 */
let lastFullscreenRequestAt = 0;
const FULLSCREEN_COOLDOWN_MS = 3_000;

const PULL_TO_REFRESH_THRESHOLD_PX = 75;

function getTelegramWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

function safeCall(action: (() => void) | undefined) {
  try {
    action?.();
  } catch {
    // Telegram WebApp API calls are best-effort — older clients may no-op or throw.
  }
}

function isMobileTelegramClient(webApp: TelegramWebApp) {
  const platform = (webApp.platform || '').toLowerCase();

  if (['ios', 'android', 'android_x'].includes(platform)) {
    return true;
  }

  if (['tdesktop', 'macos', 'weba', 'webk', 'web', 'unknown'].includes(platform)) {
    return false;
  }

  return window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ?? false;
}

function syncTelegramClientMode(webApp: TelegramWebApp) {
  document.documentElement.dataset.tgClient = isMobileTelegramClient(webApp) ? 'mobile' : 'desktop';
}

function getDocumentScrollElement(): HTMLElement {
  return (document.scrollingElement || document.documentElement) as HTMLElement;
}

function getFallbackScrollTarget(): HTMLElement {
  const root = document.querySelector<HTMLElement>('[data-tg-scroll-root]');

  if (root && root.scrollHeight > root.clientHeight + 1) {
    return root;
  }

  return getDocumentScrollElement();
}

function getScrollableParent(target: EventTarget | null): HTMLElement {
  if (!(target instanceof Element)) return getFallbackScrollTarget();

  let element: Element | null = target;

  while (element && element !== document.body) {
    if (element instanceof HTMLElement) {
      const style = window.getComputedStyle(element);
      const canScrollY =
        /(auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;

      if (canScrollY) {
        return element;
      }
    }

    element = element.parentElement;
  }

  return getFallbackScrollTarget();
}

function installIosOverscrollGuard() {
  if (cleanupTouchGuard) return cleanupTouchGuard;

  let startY = 0;
  let startX = 0;
  let pullStartedAtTop = false;
  let pullRefreshArmed = false;

  const onTouchStart = (event: TouchEvent) => {
    startY = event.touches[0]?.clientY ?? 0;
    startX = event.touches[0]?.clientX ?? 0;
    const scrollTarget = getScrollableParent(event.target);
    pullStartedAtTop = scrollTarget.scrollTop <= 0;
    pullRefreshArmed = false;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;

    const scrollTarget = getScrollableParent(event.target);
    const currentY = event.touches[0]?.clientY ?? startY;
    const currentX = event.touches[0]?.clientX ?? startX;
    const deltaY = currentY - startY;
    const deltaX = currentX - startX;

    // If gesture is primarily horizontal, don't interfere — let native horizontal scroll work.
    if (Math.abs(deltaX) > Math.abs(deltaY) * 0.75) return;

    const isSwipingDown = deltaY > 0;
    const atTop = scrollTarget.scrollTop <= 0;

    if (isSwipingDown && atTop && pullStartedAtTop) {
      const progress = Math.min(deltaY / PULL_TO_REFRESH_THRESHOLD_PX, 1.15);
      window.dispatchEvent(new CustomEvent('turon:pull-progress', { detail: { progress } }));

      if (deltaY >= PULL_TO_REFRESH_THRESHOLD_PX) {
        pullRefreshArmed = true;
      }
    }

    // No event.preventDefault() — scroll is never blocked.
  };

  const resetTouchState = () => {
    if (pullRefreshArmed) {
      window.dispatchEvent(new CustomEvent('turon:pull-refresh'));
    } else {
      window.dispatchEvent(new CustomEvent('turon:pull-cancel'));
    }

    startY = 0;
    startX = 0;
    pullStartedAtTop = false;
    pullRefreshArmed = false;
  };

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: true });
  document.addEventListener('touchend', resetTouchState, { passive: true });
  document.addEventListener('touchcancel', resetTouchState, { passive: true });

  cleanupTouchGuard = () => {
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', resetTouchState);
    document.removeEventListener('touchcancel', resetTouchState);
    cleanupTouchGuard = null;
  };

  return cleanupTouchGuard;
}

function installIosZoomGuard() {
  if (cleanupZoomGuard) return cleanupZoomGuard;

  const preventMultiTouchZoom = (event: TouchEvent) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  };

  const preventGestureZoom = (event: Event) => {
    event.preventDefault();
  };

  document.addEventListener('touchmove', preventMultiTouchZoom, { passive: false });
  document.addEventListener('gesturestart', preventGestureZoom, { passive: false });
  document.addEventListener('gesturechange', preventGestureZoom, { passive: false });
  document.addEventListener('gestureend', preventGestureZoom, { passive: false });

  cleanupZoomGuard = () => {
    document.removeEventListener('touchmove', preventMultiTouchZoom);
    document.removeEventListener('gesturestart', preventGestureZoom);
    document.removeEventListener('gesturechange', preventGestureZoom);
    document.removeEventListener('gestureend', preventGestureZoom);
    cleanupZoomGuard = null;
  };

  return cleanupZoomGuard;
}

/** Update --tg-header-safe CSS var so content doesn't hide under Telegram's buttons */
function updateHeaderSafeArea() {
  const wa = window.Telegram?.WebApp as any;
  // contentSafeAreaInset is available from Bot API 8.0+
  const top: number =
    wa?.contentSafeAreaInset?.top ??
    wa?.safeAreaInset?.top ??
    0;
  document.documentElement.style.setProperty('--tg-header-safe', `${top}px`);
}

/**
 * Request fullscreen with a cooldown guard.
 *
 * Every requestFullscreen() call fires viewportChanged. Without this guard the
 * viewportChanged handler would call back into requestFullscreen() and create
 * an infinite loop that permanently blocks touch input on iOS WKWebView.
 */
function requestFullscreenGuarded(webApp: TelegramWebApp) {
  const now = Date.now();
  if (now - lastFullscreenRequestAt < FULLSCREEN_COOLDOWN_MS) return;
  lastFullscreenRequestAt = now;
  safeCall(() => webApp.requestFullscreen?.());
}

/**
 * Safe to call any time — updates client mode tag + safe area.
 * Does NOT call requestFullscreen() so it is safe to use as a
 * viewportChanged handler without causing a re-entrancy loop.
 */
export function ensureTelegramMiniAppFullscreen() {
  const webApp = getTelegramWebApp();
  if (!webApp) return;

  safeCall(() => webApp.ready?.());
  syncTelegramClientMode(webApp);

  if (isMobileTelegramClient(webApp)) {
    requestFullscreenGuarded(webApp);
    safeCall(() => webApp.expand?.());
  } else {
    safeCall(() => webApp.exitFullscreen?.());
  }

  updateHeaderSafeArea();
}

export function initializeTelegramMiniApp() {
  if (isInitialized || typeof window === 'undefined') return;

  const webApp = getTelegramWebApp();
  if (!webApp) return;
  isInitialized = true;

  // One-time setup
  safeCall(() => webApp.ready?.());
  syncTelegramClientMode(webApp);

  // disableVerticalSwipes — called ONCE here, never repeated on viewport changes
  safeCall(() => webApp.disableVerticalSwipes?.());

  // Initial fullscreen request (guarded — inline script in index.html already
  // called ready()+expand() but not requestFullscreen, so this is the first call)
  if (isMobileTelegramClient(webApp)) {
    requestFullscreenGuarded(webApp);
    safeCall(() => webApp.expand?.());
  } else {
    safeCall(() => webApp.exitFullscreen?.());
  }

  updateHeaderSafeArea();

  /**
   * viewportChanged must NEVER call requestFullscreen().
   *
   * requestFullscreen() → viewportChanged → requestFullscreen() → ...
   * is an infinite loop that freezes ALL touch input on iOS WKWebView.
   *
   * Safe actions on viewport change: expand() + update safe area only.
   */
  const onViewportChanged = () => {
    safeCall(() => webApp.expand?.());
    updateHeaderSafeArea();
  };
  safeCall(() => webApp.onEvent?.('viewportChanged', onViewportChanged));

  // If fullscreen explicitly fails, retry once after cooldown expires
  safeCall(() => webApp.onEvent?.('fullscreenFailed', () => {
    const app = getTelegramWebApp();
    if (app && isMobileTelegramClient(app)) {
      // Force the cooldown to expire so the next guarded call goes through
      lastFullscreenRequestAt = 0;
      requestFullscreenGuarded(app);
    }
  }));

  safeCall(() => webApp.onEvent?.('safeAreaChanged', updateHeaderSafeArea));
  safeCall(() => webApp.onEvent?.('contentSafeAreaChanged', updateHeaderSafeArea));

  // On app focus/resume re-check fullscreen — guarded, so no-op within cooldown
  window.addEventListener('focus', ensureTelegramMiniAppFullscreen);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ensureTelegramMiniAppFullscreen();
  });

  installIosOverscrollGuard();
  installIosZoomGuard();
}

export function closeTelegramMiniApp() {
  safeCall(() => getTelegramWebApp()?.close?.());
}
