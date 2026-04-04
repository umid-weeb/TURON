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
    requestPhoneContact: (callback: (shared: boolean, contact?: any) => void) => {
      if (!tg?.requestPhoneContact) {
        callback(false);
        return;
      }
      tg.requestPhoneContact((response: any) => {
        if (response?.status === 'sent') {
          callback(true, response.response_data?.contact);
        } else {
          callback(false);
        }
      });
    },
    onClose: (callback: () => void) => tg?.onEvent('viewportChanged', callback),
  };
}
