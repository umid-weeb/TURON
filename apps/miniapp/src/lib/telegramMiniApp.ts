type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  onEvent?: (eventType: string, eventHandler: () => void) => void;
  offEvent?: (eventType: string, eventHandler: () => void) => void;
};

let isInitialized = false;
let cleanupTouchGuard: (() => void) | null = null;

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

function getScrollableParent(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return document.querySelector<HTMLElement>('[data-tg-scroll-root]');

  const root = document.querySelector<HTMLElement>('[data-tg-scroll-root]');
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

  return root;
}

function installIosOverscrollGuard() {
  if (cleanupTouchGuard) return cleanupTouchGuard;

  let startY = 0;

  const onTouchStart = (event: TouchEvent) => {
    startY = event.touches[0]?.clientY ?? 0;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;

    const scrollTarget = getScrollableParent(event.target);
    if (!scrollTarget) {
      event.preventDefault();
      return;
    }

    const currentY = event.touches[0]?.clientY ?? startY;
    const deltaY = currentY - startY;
    const isSwipingDown = deltaY > 0;
    const isSwipingUp = deltaY < 0;
    const atTop = scrollTarget.scrollTop <= 0;
    const atBottom =
      Math.ceil(scrollTarget.scrollTop + scrollTarget.clientHeight) >= scrollTarget.scrollHeight;

    // Only block the boundary bounce that can trigger Telegram's close gesture on iOS.
    // Normal scrolling inside scrollable containers remains untouched.
    if ((isSwipingDown && atTop) || (isSwipingUp && atBottom)) {
      event.preventDefault();
    }
  };

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });

  cleanupTouchGuard = () => {
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onTouchMove);
    cleanupTouchGuard = null;
  };

  return cleanupTouchGuard;
}

export function initializeTelegramMiniApp() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  const webApp = getTelegramWebApp();
  if (!webApp) return;

  const forceFullscreen = () => {
    safeCall(() => webApp.expand?.());
    safeCall(() => webApp.disableVerticalSwipes?.());
  };

  // Signal readiness first, then immediately request the most stable Telegram viewport.
  safeCall(() => webApp.ready?.());
  forceFullscreen();
  safeCall(() => webApp.enableClosingConfirmation?.());

  // Telegram can recalculate the viewport during keyboard/orientation changes.
  safeCall(() => webApp.onEvent?.('viewportChanged', forceFullscreen));
  installIosOverscrollGuard();
}

export function closeTelegramMiniApp() {
  safeCall(() => getTelegramWebApp()?.close?.());
}
