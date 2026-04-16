import type { RouteStep } from './MapProvider';

type RouteDirection = NonNullable<RouteStep['action']>;

export function mapYandexActionToDirection(action?: string | null): RouteDirection {
  const normalized = action?.trim().toLowerCase() ?? '';

  if (normalized.includes('right')) {
    return 'right';
  }

  if (normalized.includes('left')) {
    return 'left';
  }

  return 'straight';
}
