import type { AdminCourierDirectoryItem } from '../../../data/types';

export type AdminCourierFilter = 'ALL' | 'ONLINE' | 'BUSY' | 'AVAILABLE' | 'INACTIVE';

export interface AdminCourierFilterOption {
  value: AdminCourierFilter;
  label: string;
  count: number;
}

export function formatLastSeen(value?: string | null) {
  if (!value) {
    return 'Hali yo\'q';
  }

  return new Date(value).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getCourierStatusMeta(courier: AdminCourierDirectoryItem) {
  if (!courier.isActive) {
    return { label: 'Nofaol', tone: 'danger' as const };
  }
  if (!courier.isOnline) {
    return { label: 'Oflayn', tone: 'neutral' as const };
  }
  if (courier.activeAssignments > 0) {
    return { label: 'Band', tone: 'warning' as const };
  }
  return { label: 'Bo\'sh', tone: 'success' as const };
}

export function sortCouriersForAdmin(couriers: AdminCourierDirectoryItem[]) {
  const rank = (courier: AdminCourierDirectoryItem) => {
    if (!courier.isActive) return 4;
    if (!courier.isOnline) return 3;
    if (courier.activeAssignments > 0) return 1;
    return 2;
  };

  return [...couriers].sort((left, right) => {
    const priority = rank(left) - rank(right);
    if (priority !== 0) return priority;

    if (left.activeAssignments !== right.activeAssignments) {
      return right.activeAssignments - left.activeAssignments;
    }

    if (left.completedToday !== right.completedToday) {
      return right.completedToday - left.completedToday;
    }

    return left.fullName.localeCompare(right.fullName, 'uz');
  });
}

export function matchesCourierSearch(courier: AdminCourierDirectoryItem, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return true;

  const values = [
    courier.fullName,
    courier.phoneNumber,
    courier.telegramUsername,
    courier.telegramId,
  ];

  return values.some((value) => value?.toLowerCase().includes(normalized));
}

export function matchesCourierFilter(courier: AdminCourierDirectoryItem, filter: AdminCourierFilter) {
  switch (filter) {
    case 'ONLINE':
      return courier.isActive && courier.isOnline;
    case 'BUSY':
      return courier.isActive && courier.isOnline && courier.activeAssignments > 0;
    case 'AVAILABLE':
      return courier.isActive && courier.isOnline && courier.activeAssignments === 0;
    case 'INACTIVE':
      return !courier.isActive || !courier.isOnline;
    case 'ALL':
    default:
      return true;
  }
}

export function resolveCourierFilter(rawValue: string | null): AdminCourierFilter {
  if (!rawValue) return 'ALL';
  const normalized = rawValue.toUpperCase() as AdminCourierFilter;
  return ['ALL', 'ONLINE', 'BUSY', 'AVAILABLE', 'INACTIVE'].includes(normalized) ? normalized : 'ALL';
}

export function buildCourierFilterOptions(couriers: AdminCourierDirectoryItem[]): AdminCourierFilterOption[] {
  const counts = couriers.reduce(
    (acc, courier) => {
      acc.ALL += 1;
      if (matchesCourierFilter(courier, 'ONLINE')) acc.ONLINE += 1;
      if (matchesCourierFilter(courier, 'BUSY')) acc.BUSY += 1;
      if (matchesCourierFilter(courier, 'AVAILABLE')) acc.AVAILABLE += 1;
      if (matchesCourierFilter(courier, 'INACTIVE')) acc.INACTIVE += 1;
      return acc;
    },
    { ALL: 0, ONLINE: 0, BUSY: 0, AVAILABLE: 0, INACTIVE: 0 },
  );

  return [
    { value: 'ALL', label: 'Hammasi', count: counts.ALL },
    { value: 'ONLINE', label: 'Onlayn', count: counts.ONLINE },
    { value: 'BUSY', label: 'Band', count: counts.BUSY },
    { value: 'AVAILABLE', label: 'Bo\'sh', count: counts.AVAILABLE },
    { value: 'INACTIVE', label: 'Nofaol', count: counts.INACTIVE },
  ];
}

export function buildCouriersSummary(couriers: AdminCourierDirectoryItem[]) {
  const total = couriers.length;
  const online = couriers.filter((courier) => courier.isActive && courier.isOnline).length;
  const busy = couriers.filter((courier) => courier.isActive && courier.isOnline && courier.activeAssignments > 0).length;
  const available = couriers.filter((courier) => courier.isActive && courier.isOnline && courier.activeAssignments === 0).length;
  const deliveredToday = couriers.reduce((sum, courier) => sum + courier.completedToday, 0);

  return { total, online, busy, available, deliveredToday };
}
