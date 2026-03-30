declare global {
  interface Window {
    Telegram: any;
  }
}

type InitData = {
  query_id?: string;
  user?: any;
  auth_date?: string;
  hash?: string;
};

export function useTelegram() {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  const theme = tg?.colorScheme || 'light';

  const setTheme = (callback: (theme: string) => void) => {
    if (!tg) return;
    callback(tg.colorScheme || 'light');
    tg.onEvent('themeChanged', () => callback(tg.colorScheme || 'light'));
  };

  const initData: InitData = {
    query_id: tg?.initDataUnsafe?.query_id,
    user: tg?.initDataUnsafe?.user,
    auth_date: tg?.initDataUnsafe?.auth_date,
    hash: tg?.initDataUnsafe?.hash,
  };

  return {
    tg,
    user,
    theme,
    initData,
    rawInitData: tg?.initData || '',
    isTelegram: !!tg,
    expand: () => tg?.expand(),
    close: () => tg?.close(),
    ready: () => tg?.ready(),
    showBackButton: () => tg?.BackButton?.show(),
    hideBackButton: () => tg?.BackButton?.hide(),
    setMainButton: (text: string, onClick: () => void) => {
      tg?.MainButton.setText(text);
      tg?.MainButton.show();
      tg?.MainButton.onClick(onClick);
    },
    hideMainButton: () => tg?.MainButton?.hide(),
    setTheme,
  };
}
