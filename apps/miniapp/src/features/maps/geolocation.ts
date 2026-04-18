import type { GeolocationOptions, UserGeolocation } from './MapProvider';

export type UserGeolocationErrorCode =
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export class UserGeolocationError extends Error {
  constructor(
    public readonly code: UserGeolocationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'UserGeolocationError';
  }
}

export function isBrowserGeolocationSupported() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export async function detectBrowserGeolocation(options: GeolocationOptions = {}): Promise<UserGeolocation> {
  if (!isBrowserGeolocationSupported()) {
    throw new UserGeolocationError('UNSUPPORTED', "Geolokatsiya qo'llab-quvvatlanmaydi.");
  }

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
  } = options;

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          pin: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          heading:
            typeof position.coords.heading === 'number' && Number.isFinite(position.coords.heading)
              ? position.coords.heading
              : null,
          speed:
            typeof position.coords.speed === 'number' && Number.isFinite(position.coords.speed)
              ? position.coords.speed
              : null,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new UserGeolocationError('PERMISSION_DENIED', "Joylashuv ruxsati berilmadi."));
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          reject(new UserGeolocationError('POSITION_UNAVAILABLE', "Joylashuvni aniqlab bo'lmadi."));
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new UserGeolocationError('TIMEOUT', "Joylashuvni aniqlash vaqti tugadi."));
          return;
        }

        reject(new UserGeolocationError('UNKNOWN', "Joylashuvni aniqlashda noma'lum xatolik yuz berdi."));
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      },
    );
  });
}

export function watchBrowserGeolocation(
  onChange: (location: UserGeolocation) => void,
  onError: (error: UserGeolocationError) => void,
  options: GeolocationOptions = {},
) {
  if (!isBrowserGeolocationSupported()) {
    onError(new UserGeolocationError('UNSUPPORTED', "Geolokatsiya qo'llab-quvvatlanmaydi."));
    return null;
  }

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
  } = options;

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onChange({
        pin: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        accuracy: position.coords.accuracy,
        heading:
          typeof position.coords.heading === 'number' && Number.isFinite(position.coords.heading)
            ? position.coords.heading
            : null,
        speed:
          typeof position.coords.speed === 'number' && Number.isFinite(position.coords.speed)
            ? position.coords.speed
            : null,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        onError(new UserGeolocationError('PERMISSION_DENIED', "Joylashuv ruxsati berilmadi."));
        return;
      }

      if (error.code === error.POSITION_UNAVAILABLE) {
        onError(new UserGeolocationError('POSITION_UNAVAILABLE', "Joylashuvni aniqlab bo'lmadi."));
        return;
      }

      if (error.code === error.TIMEOUT) {
        onError(new UserGeolocationError('TIMEOUT', "Joylashuvni aniqlash vaqti tugadi."));
        return;
      }

      onError(new UserGeolocationError('UNKNOWN', "Joylashuvni aniqlashda noma'lum xatolik yuz berdi."));
    },
    {
      enableHighAccuracy,
      timeout,
      maximumAge,
    },
  );

  return watchId;
}

export function stopWatchingBrowserGeolocation(watchId: number | null | undefined) {
  if (!isBrowserGeolocationSupported() || typeof watchId !== 'number') {
    return;
  }

  navigator.geolocation.clearWatch(watchId);
}

export function formatGeolocationAccuracy(accuracy?: number) {
  if (!accuracy || Number.isNaN(accuracy)) {
    return null;
  }

  return `${Math.round(accuracy)} m`;
}

/**
 * Check and request geolocation permission using modern Permissions API
 * @returns 'granted' | 'denied' | 'prompt' | 'unsupported'
 */
export async function checkAndRequestLocationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (!isBrowserGeolocationSupported()) {
    return 'unsupported';
  }

  // Check if Permissions API is available
  if (!navigator.permissions || !navigator.permissions.query) {
    // Fallback: try to get location which will trigger permission prompt
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            resolve('denied');
          } else {
            resolve('prompt');
          }
        },
        { timeout: 1000 }, // Quick timeout for permission check
      );
    });
  }

  try {
    // Check current permission status
    const permission = (await navigator.permissions.query({ name: 'geolocation' } as PermissionDescriptor)) as any;

    if (permission.status === 'granted') {
      return 'granted';
    }

    if (permission.status === 'denied') {
      return 'denied';
    }

    // Status is 'prompt' - request permission by attempting to get location
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            resolve('denied');
          } else {
            resolve('prompt');
          }
        },
        { timeout: 5000 },
      );
    });
  } catch {
    // If Permissions API fails, try to get location directly
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            resolve('denied');
          } else {
            resolve('prompt');
          }
        },
        { timeout: 1000 },
      );
    });
  }
}

/**
 * Get human-readable message for permission status
 */
export function getPermissionStatusMessage(status: 'granted' | 'denied' | 'prompt' | 'unsupported'): string {
  switch (status) {
    case 'granted':
      return 'Joylashuvga ruxsat berildi.';
    case 'denied':
      return 'Joylashuvga ruxsat berilmadi. Sozlamalardan ruxsat bering.';
    case 'prompt':
      return 'Joylashuvga ruxsat sorashi kerak.';
    case 'unsupported':
      return 'Geolokatsiya qo\'llab-quvvatlanmaydi.';
    default:
      return 'Noma\'lum holat.';
  }
}

export function getUserGeolocationErrorMessage(error: unknown) {
  if (error instanceof UserGeolocationError) {
    switch (error.code) {
      case 'UNSUPPORTED':
        return "Geolokatsiya qo'llab-quvvatlanmaydi.";
      case 'PERMISSION_DENIED':
        return "Joylashuv ruxsati berilmadi. Iltimos, ruxsat bering.";
      case 'POSITION_UNAVAILABLE':
        return "Joylashuvni aniqlab bo'lmadi. Internet va GPS holatini tekshiring.";
      case 'TIMEOUT':
        return "Joylashuvni aniqlash uzoq davom etdi. Qayta urinib ko'ring.";
      default:
        return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Joylashuvni aniqlab bo'lmadi.";
}
