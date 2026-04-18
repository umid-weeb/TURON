import { useEffect, useState } from 'react';
import { checkAndRequestLocationPermission, getPermissionStatusMessage } from '../features/maps/geolocation';
import { useToast } from '../components/ui/Toast';

export type LocationPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'checking';

interface UseLocationPermissionOptions {
  autoRequest?: boolean; // Auto-request on mount
  onGranted?: () => void;
  onDenied?: () => void;
}

/**
 * Hook to request and track location permission status
 * Usage: Typically called once when app initializes
 */
export const useLocationPermission = (options: UseLocationPermissionOptions = {}) => {
  const { autoRequest = true, onGranted, onDenied } = options;
  const { showToast } = useToast();
  const [status, setStatus] = useState<LocationPermissionStatus>('checking');

  const requestPermission = async () => {
    setStatus('checking');
    try {
      const permissionStatus = await checkAndRequestLocationPermission();
      setStatus(permissionStatus);

      if (permissionStatus === 'granted') {
        showToast('Joylashuvga ruxsat berildi ✓', 'success');
        onGranted?.();
      } else if (permissionStatus === 'denied') {
        showToast(
          'Joylashuvga ruxsat berilmadi. Sozlamalardan ruxsat bering.',
          'error',
        );
        onDenied?.();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ruxsat so\'rashda xatolik yuz berdi';
      showToast(message, 'error');
      setStatus('prompt');
    }
  };

  useEffect(() => {
    if (autoRequest) {
      requestPermission();
    }
  }, [autoRequest]);

  return {
    status,
    message: status === 'checking' ? 'Ruxsat tekshirilmoqda...' : getPermissionStatusMessage(status as 'granted' | 'denied' | 'prompt' | 'unsupported'),
    requestPermission,
    isGranted: status === 'granted',
    isDenied: status === 'denied',
    isChecking: status === 'checking',
  };
};
