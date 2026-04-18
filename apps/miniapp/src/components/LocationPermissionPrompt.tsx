import React, { useEffect } from 'react';
import { MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLocationPermission } from '../hooks/useLocationPermission';

interface LocationPermissionPromptProps {
  onGranted?: () => void;
  onDenied?: () => void;
  autoRequest?: boolean;
}

/**
 * Component that requests location permission on app load
 * Shows status and allows manual retry
 */
export const LocationPermissionPrompt: React.FC<LocationPermissionPromptProps> = ({
  onGranted,
  onDenied,
  autoRequest = true,
}) => {
  const { status, isGranted, isDenied, isChecking, requestPermission } = useLocationPermission({
    autoRequest,
    onGranted,
    onDenied,
  });

  // Auto-hide when granted or denied
  useEffect(() => {
    if (isGranted || isDenied) {
      // Could auto-hide after a delay here if needed
    }
  }, [isGranted, isDenied]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="h-6 w-6 text-blue-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Joylashuvni Aniqlash
          </h2>
        </div>

        {/* Status Content */}
        {isChecking && (
          <div className="space-y-4">
            <div className="flex justify-center py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-blue-500 dark:border-slate-700 dark:border-t-blue-400" />
            </div>
            <p className="text-center text-sm text-slate-600 dark:text-slate-300">
              Ruxsatni tekshirilmoqda...
            </p>
          </div>
        )}

        {isGranted && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <p className="text-center text-sm text-slate-700 dark:text-slate-200">
              ✅ Joylashuvga ruxsat berildi!
              <br />
              <span className="text-xs text-slate-500">
                Endi buyurtma qabul qila olasiz.
              </span>
            </p>
          </div>
        )}

        {isDenied && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <p className="text-center text-sm text-slate-700 dark:text-slate-200">
              ⚠️ Joylashuvga ruxsat berilmadi
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              Buyurtma qabul qilish uchun joylashuvni aniqlashga ruxsat berishingiz kerak.
              <br />
              <br />
              <strong>Sozlamalardan ruxsat bering:</strong>
              <br />
              📱 iPhone: Settings → Telegram → Location
              <br />
              🤖 Android: Settings → Apps → TURON → Permissions → Location
            </p>
            <button
              onClick={requestPermission}
              className="w-full rounded-lg bg-blue-500 px-4 py-3 font-medium text-white hover:bg-blue-600 transition-colors dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Qayta Urinish
            </button>
          </div>
        )}

        {status === 'unsupported' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-yellow-500" />
            </div>
            <p className="text-center text-sm text-slate-700 dark:text-slate-200">
              ⚠️ Joylashuvni aniqlash qo'llab-quvvatlanmaydi
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sizning brauzer joylashuvni aniqlashni qo'llab-quvvatlamaydi.
              Yangi brauzer versiyasiga yangilang.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!isGranted && (
          <div className="mt-4 flex gap-2">
            {isDenied && (
              <button
                onClick={() => { window.location.href = 'tel:+998'; }}
                className="flex-1 rounded-lg bg-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 text-sm"
              >
                Sozlamalar
              </button>
            )}
            {isChecking && (
              <button
                disabled
                className="flex-1 rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500 text-sm cursor-not-allowed"
              >
                Kutilmoqda...
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
