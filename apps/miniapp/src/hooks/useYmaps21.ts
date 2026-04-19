import { useEffect, useState } from 'react';

/**
 * ymaps 2.1 (Yandex Maps API v2.1) ni yuklaydi.
 * v2.1 da multiRouter mavjud — marshrut hisoblash uchun.
 *
 * Qaytaradi:
 *  - ymaps: API instance (ready bo'lgandan keyin)
 *  - ready: boolean — API fully loaded
 *  - error: string | null
 */
export function useYmaps21(apiKey: string) {
  const [ymaps, setYmaps] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Allaqachon window da bor bo'lsa
    const globalWindow = window as any;
    if (globalWindow.ymaps) {
      try {
        globalWindow.ymaps.ready(() => {
          setYmaps(globalWindow.ymaps);
          setReady(true);
          setError(null);
        });
      } catch (err) {
        setError(`ymaps 2.1 initialization error: ${err}`);
      }
      return;
    }

    // Script tag qo'shish
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=uz_UZ&load=package.full`;
    script.async = true;

    script.onload = () => {
      if (globalWindow.ymaps) {
        try {
          globalWindow.ymaps.ready(() => {
            setYmaps(globalWindow.ymaps);
            setReady(true);
            setError(null);
          });
        } catch (err) {
          setError(`ymaps 2.1 ready error: ${err}`);
        }
      } else {
        setError('ymaps 2.1 not loaded');
      }
    };

    script.onerror = () => {
      setError('Failed to load ymaps 2.1 script');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: script ni o'chirishdek yo'q
    };
  }, [apiKey]);

  return { ymaps, ready, error };
}
