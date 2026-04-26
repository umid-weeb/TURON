import type { Order } from '../data/types';

// Industry reference: Yandex Eats 15min PENDING, Uber Eats 10-15min, Uzum 30min
// This app uses manual admin flow, so thresholds are longer:
//   PENDING  → 2h  (no admin accepted it)
//   Active statuses → 8h (stuck in pipeline)
export const STALE_PENDING_MS = 2 * 60 * 60 * 1000;
export const STALE_ACTIVE_MS = 8 * 60 * 60 * 1000;
export const STALE_NOTIFICATION_MS = 2 * 60 * 60 * 1000;

const STALE_THRESHOLD_BY_STATUS: Partial<Record<string, number>> = {
  PENDING: STALE_PENDING_MS,
  PREPARING: STALE_ACTIVE_MS,
  READY_FOR_PICKUP: STALE_ACTIVE_MS,
  DELIVERING: STALE_ACTIVE_MS,
};

export function isOrderStale(order: Order): boolean {
  const threshold = STALE_THRESHOLD_BY_STATUS[order.orderStatus];
  if (!threshold) return false; // DELIVERED, CANCELLED are terminal — never stale
  return Date.now() - new Date(order.createdAt).getTime() > threshold;
}

export function getStaleAgeLabel(order: Order): string {
  const ageMs = Date.now() - new Date(order.createdAt).getTime();
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days} kun oldin`;
  return `${hours} soat oldin`;
}

export function isNotificationStale(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > STALE_NOTIFICATION_MS;
}
