/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_MAPS_PROVIDER?: 'yandex' | 'none';
  readonly VITE_MAP_API_KEY?: string;
  readonly VITE_MAP_LANGUAGE?: string;
  readonly VITE_YMAPS3_KEY?: string;
  readonly VITE_YMAPS21_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Yandex Maps global namespace declarations
declare global {
  interface Window {
    ymaps3?: any;
    ymaps?: any;
  }
}

