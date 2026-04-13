type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  requestFullscreen?: () => void;
  close?: () => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  onEvent?: (eventType: string, eventHandler: (event?: unknown) => void) => void;
  offEvent?: (eventType: string, eventHandler: (event?: unknown) => void) => void;
};

let isInitialized = false;
let cleanupTouchGuard: (() => void) | null = null;

const FULLSCREEN_RETRY_DELAYS_MS = [0, 80, 240, 700, 1500];
const PULL_TO_REFRESH_THRESHOLD_PX = 92;

function getTelegramWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

function safeCall(action: (() => void) | undefined) {
  try {
    action?.();
  } catch {
    // Telegram WebApp API calls are best-effort because older clients may no-op or throw.
  }
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
  let pullStartedAtTop = false;
  let pullRefreshTriggered = false;

  const onTouchStart = (event: TouchEvent) => {
    startY = event.touches[0]?.clientY ?? 0;
    const scrollTarget = getScrollableParent(event.target);
    pullStartedAtTop = scrollTarget.scrollTop <= 0;
    pullRefreshTriggered = false;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;

    const scrollTarget = getScrollableParent(event.target);
    const currentY = event.touches[0]?.clientY ?? startY;
    const deltaY = currentY - startY;
    const isSwipingDown = deltaY > 0;
    const isSwipingUp = deltaY < 0;
    const atTop = scrollTarget.scrollTop <= 0;
    const atBottom =
      Math.ceil(scrollTarget.scrollTop + scrollTarget.clientHeight) >= scrollTarget.scrollHeight;

    if (isSwipingDown && atTop) {
      // Keep the familiar pull-down refresh behavior without letting iOS/Telegram
      // convert the same gesture into Mini App minimize/close.
      if (
        pullStartedAtTop &&
        !pullRefreshTriggered &&
        deltaY >= PULL_TO_REFRESH_THRESHOLD_PX
      ) {
        pullRefreshTriggered = true;
        window.location.reload();
      }

      event.preventDefault();
      return;
    }

    // Only block the bottom boundary bounce that can trigger Telegram's close gesture on iOS.
    // Normal scrolling inside scrollable containers remains untouched.
    if (isSwipingUp && atBottom) {
      event.preventDefault();
    }
  };

  const resetTouchState = () => {
    startY = 0;
    pullStartedAtTop = false;
    pullRefreshTriggered = false;
  };

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
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

export function ensureTelegramMiniAppFullscreen() {
  const webApp = getTelegramWebApp();
  if (!webApp) return;

  // Bot API 8.0+ gives true fullscreen; expand remains the safe fallback for older clients.
  safeCall(() => webApp.ready?.());
  safeCall(() => webApp.requestFullscreen?.());
  safeCall(() => webApp.expand?.());
  safeCall(() => webApp.disableVerticalSwipes?.());
}

function scheduleFullscreenRetries() {
  FULLSCREEN_RETRY_DELAYS_MS.forEach((delayMs) => {
    window.setTimeout(ensureTelegramMiniAppFullscreen, delayMs);
  });
}

export function initializeTelegramMiniApp() {
  if (isInitialized || typeof window === 'undefined') return;

  const webApp = getTelegramWebApp();
  if (!webApp) return;
  isInitialized = true;

  // Signal readiness first, then repeatedly ask Telegram for a stable fullscreen viewport.
  // Some iOS/Android clients recalculate the viewport after first paint or after launch source changes.
  scheduleFullscreenRetries();
  safeCall(() => webApp.enableClosingConfirmation?.());

  // Telegram can recalculate the viewport during keyboard/orientation changes.
  safeCall(() => webApp.onEvent?.('viewportChanged', ensureTelegramMiniAppFullscreen));
  safeCall(() => webApp.onEvent?.('fullscreenFailed', scheduleFullscreenRetries));
  window.addEventListener('focus', scheduleFullscreenRetries);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleFullscreenRetries();
  });
  installIosOverscrollGuard();
}

export function closeTelegramMiniApp() {
  safeCall(() => getTelegramWebApp()?.close?.());
}
