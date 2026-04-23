import { requestTelegramPhoneContact } from '../lib/telegramContact';

declare global {
  interface Window {
    Telegram: any;
  }
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    initData: tg?.initData || '',
    expand: () => tg?.expand(),
    close: () => tg?.close(),
    ready: () => tg?.ready(),
    showBackButton: () => tg?.BackButton?.show(),
    hideBackButton: () => tg?.BackButton?.hide(),
    requestPhoneContact: async (callback: (shared: boolean, contact?: any) => void) => {
      const result = await requestTelegramPhoneContact();
      callback(result.shared, result.phoneNumber ? { phone_number: result.phoneNumber } : undefined);
    },
    onClose: (callback: () => void) => tg?.onEvent('viewportChanged', callback),
  };
}
