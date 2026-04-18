import { useEffect, useState } from 'react';
import { checkAndRequestLocationPermission, getPermissionStatusMessage } from '../features/maps/geolocation';
import { useToast } from '../components/ui/Toast';

export type LocationPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'checking';

interface UseLocationPermissionOptions {
  autoRequest?: boolean;
  onGranted?: () => void;
  onDenied?: () => void;
}

export const useLocationPermission = (options: UseLocationPermissionOptions = {}) => {
  const { autoRequest = true, onGranted, onDenied } = options;
  const { showToast } = useToast();
  const [status, setStatus] = useState<LocationPermissionStatus>('checking');

  const requestPermission = async () => {
    setStatus('checking');
    try {
      // Check current state first — if already granted, set silently (no toast)
      if (navigator.permissions?.query) {
        try {
          const perm = await navigator.permissions.query({ name: 'geolocation' } as PermissionDescriptor);
          if (perm.state === 'granted') {
            setStatus('granted');
            onGranted?.();
            return;
          }
          if (perm.state === 'denied') {
            setStatus('denied');
            onDenied?.();
            return;
          }
        } catch {
          // Permissions API not available, fall through
        }
      }

      // State is 'prompt' — trigger native dialog, show toast only on result
      const permissionStatus = await checkAndRequestLocationPermission();
      setStatus(permissionStatus);

      if (permissionStatus === 'granted') {
        showToast('Joylashuvga ruxsat berildi ✓', 'success');
        onGranted?.();
      } else if (permissionStatus === 'denied') {
        onDenied?.();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ruxsat so'rashda xatolik yuz berdi";
      showToast(message, 'error');
      setStatus('prompt');
    }
  };

  useEffect(() => {
    if (autoRequest) {
      void requestPermission();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    message: status === 'checking' ? 'Ruxsat tekshirilmoqda...' : getPermissionStatusMessage(status as 'granted' | 'denied' | 'prompt' | 'unsupported'),
    requestPermission,
    isGranted: status === 'granted',
    isDenied: status === 'denied',
    isChecking: status === 'checking',
  };
};
