import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// Determine API base URL (can be env-driven)
function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }

  throw new Error('Production build uchun VITE_API_URL majburiy. Qiymat: https://turonkafe.duckdns.org');
}

const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
 timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor for Auth Token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor for Error Handling
api.interceptors.response.use(
  (response) => {
    const payload = response.data;

    if (typeof payload === 'string' && /<!doctype html|<html[\s>]/i.test(payload.trim().slice(0, 200))) {
      return Promise.reject(
        new Error("API manzili noto'g'ri sozlangan. VITE_API_URL yoki /api proxy backendga ulanmagan."),
      );
    }

    return payload;
  },
  (error) => {
    // Transform system errors into human-readable Uzbek messages
    const responseData = error.response?.data;
    const validationMessage = Array.isArray(error.response?.data?.issues)
      ? error.response.data.issues.map((issue: { message?: string }) => issue.message).filter(Boolean).join(', ')
      : null;
    const stringPayload =
      typeof responseData === 'string' ? responseData.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
    const fallbackServerMessage = error.response
      ? `Server ${error.response.status} xatosi. Iltimos, qayta urinib ko'ring.`
      : null;
    const message =
      validationMessage ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      stringPayload ||
      (!error.response
        ? "Server bilan aloqa uzildi. Internetni tekshirib yana urinib ko'ring."
        : fallbackServerMessage || 'Tizim xatosi. Iltimos birozdan so\'ng urunib ko\'ring.');
    const apiError = new Error(message) as Error & { code?: string };
    // Preserve machine-readable code (e.g. PHONE_REQUIRED) so callers can branch
    if (responseData?.code) apiError.code = responseData.code;
    return Promise.reject(apiError);
  }
);
