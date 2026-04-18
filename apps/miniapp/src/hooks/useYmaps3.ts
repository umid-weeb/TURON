import { useEffect, useState } from 'react';

/**
 * ymaps3 (Yandex Maps API v3) ni yuklaydi.
 * v3 da xarita render, 3D perspektiva, azimuth rotation bor.
 *
 * Qaytaradi:
 *  - ymaps3: API instance (ready bo'lgandan keyin)
 *  - ready: boolean — API fully loaded
 *  - error: string | null
 */
export function useYmaps3(apiKey: string) {
  const [ymaps3, setYmaps3] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Allaqachon window da bor bo'lsa — ro'yxatdan o'tkazish
    const globalWindow = window as any;
    if (globalWindow.ymaps3) {
      try {
        globalWindow.ymaps3.ready.then(() => {
          setYmaps3(globalWindow.ymaps3);
          setReady(true);
          setError(null);
        });
      } catch (err) {
        setError(`ymaps3 initialization error: ${err}`);
      }
      return;
    }

    // Script tag qo'shish
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=uz_UZ`;
    script.async = true;

    script.onload = () => {
      if (globalWindow.ymaps3) {
        try {
          globalWindow.ymaps3.ready.then(() => {
            setYmaps3(globalWindow.ymaps3);
            setReady(true);
            setError(null);
          });
        } catch (err) {
          setError(`ymaps3 ready error: ${err}`);
        }
      } else {
        setError('ymaps3 not loaded');
      }
    };

    script.onerror = () => {
      setError('Failed to load ymaps3 script');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: script ni o'chirishdek yo'q (API global qo'llab-quvvatlanmoqda)
    };
  }, [apiKey]);

  return { ymaps3, ready, error };
}
