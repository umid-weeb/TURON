/**
 * Telefon qo'ng'irog'ini ishga tushirish uchun yagona utility.
 *
 * Telegram Mini App ichida ham, oddiy mobil brauzerda ham,
 * desktop Telegram'da ham to'g'ri ishlaydi.
 *
 * window.confirm — ishlatilmaydi: Telegram WebView'da bloklanadi.
 */
export function initiateCall(phoneNumber: string | null | undefined): void {
  if (!phoneNumber) return;

  // Faqat raqamlar, +, #, * qoldirish (xavfsiz sanitizatsiya)
  const cleaned = phoneNumber.replace(/[^\d+*#]/g, '');
  if (!cleaned) return;

  const tg = (window as any).Telegram?.WebApp;

  // Telegram Mini App bo'lsa — openLink orqali dialer ochiladi
  if (tg?.openLink) {
    tg.openLink(`tel:${cleaned}`);
    return;
  }

  // Oddiy brauzer / mobil
  window.location.href = `tel:${cleaned}`;
}

/** Telegram username bo'lsa t.me deep link ochadi */
export function openTelegramProfile(username: string | null | undefined): void {
  if (!username) return;
  const clean = username.startsWith('@') ? username.slice(1) : username;
  const url = `https://t.me/${clean}`;
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
