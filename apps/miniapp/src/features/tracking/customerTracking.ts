import { DeliveryStage, Order, OrderStatus } from '../../data/types';

export type CustomerTrackingLanguage = 'uz-latn' | 'uz-cyrl' | 'ru';

type CustomerTrackingPhase =
  | 'PENDING'
  | 'PREPARING'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED';

// ── Proximity thresholds (metres) ────────────────────────────────────────────
const PROXIMITY_VERY_NEAR_M = 50;
const PROXIMITY_NEAR_M = 500;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns estimated remaining metres from courier to customer during delivery,
 * or `null` if data is unavailable or phase is not yet in delivery.
 */
function getDeliveryProximityMeters(order: Order, phase: CustomerTrackingPhase): number | null {
  if (phase !== 'DELIVERING' && phase !== 'PICKED_UP') return null;

  const loc = order.tracking?.courierLocation;
  if (!loc) return null;

  // Prefer live route-based remaining distance reported by the courier app
  if (typeof loc.remainingDistanceKm === 'number' && loc.remainingDistanceKm >= 0) {
    return loc.remainingDistanceKm * 1000;
  }

  // Fall back to straight-line haversine distance
  const destLat = order.destinationLat;
  const destLng = order.destinationLng;
  if (typeof destLat === 'number' && typeof destLng === 'number') {
    return haversineMeters(loc.latitude, loc.longitude, destLat, destLng);
  }

  return null;
}

function getCourierFallbackLabel(language: CustomerTrackingLanguage) {
  if (language === 'ru') {
    return 'Курьер';
  }

  if (language === 'uz-cyrl') {
    return 'Курьер';
  }

  return 'Kuryer';
}

export function resolveCustomerTrackingPhase(order: Order): CustomerTrackingPhase {
  if (
    order.orderStatus === OrderStatus.CANCELLED ||
    order.courierAssignmentStatus === 'CANCELLED'
  ) {
    return 'CANCELLED';
  }

  if (
    order.orderStatus === OrderStatus.DELIVERED ||
    order.deliveryStage === DeliveryStage.DELIVERED ||
    order.courierAssignmentStatus === 'DELIVERED'
  ) {
    return 'DELIVERED';
  }

  if (
    order.deliveryStage === DeliveryStage.DELIVERING ||
    order.deliveryStage === DeliveryStage.ARRIVED_AT_DESTINATION ||
    order.courierAssignmentStatus === 'DELIVERING' ||
    order.orderStatus === OrderStatus.DELIVERING
  ) {
    return 'DELIVERING';
  }

  if (
    order.deliveryStage === DeliveryStage.PICKED_UP ||
    order.courierAssignmentStatus === 'PICKED_UP'
  ) {
    return 'PICKED_UP';
  }

  if (
    order.deliveryStage === DeliveryStage.ARRIVED_AT_RESTAURANT ||
    order.courierLastEventType === 'ARRIVED_AT_RESTAURANT'
  ) {
    return 'ARRIVED';
  }

  if (
    order.deliveryStage === DeliveryStage.GOING_TO_RESTAURANT ||
    order.courierAssignmentStatus === 'ACCEPTED' ||
    order.courierLastEventType === 'ACCEPTED'
  ) {
    return 'ACCEPTED';
  }

  if (order.courierAssignmentStatus === 'ASSIGNED' || Boolean(order.courierId)) {
    return 'ASSIGNED';
  }

  if (order.orderStatus === OrderStatus.PREPARING) {
    return 'PREPARING';
  }

  return 'PENDING';
}

function getStageLabel(
  phase: CustomerTrackingPhase,
  language: CustomerTrackingLanguage,
  proximityMeters: number | null,
) {
  // Proximity-aware override for DELIVERING phase
  if (phase === 'DELIVERING' && proximityMeters !== null) {
    if (proximityMeters <= PROXIMITY_VERY_NEAR_M) {
      if (language === 'ru') return 'Курьер прибыл!';
      if (language === 'uz-cyrl') return 'Курьер келди!';
      return 'Kuryer keldi!';
    }
    if (proximityMeters <= PROXIMITY_NEAR_M) {
      if (language === 'ru') return 'Почти здесь!';
      if (language === 'uz-cyrl') return 'Деярли етиб келди!';
      return 'Deyarli yetdi!';
    }
  }

  if (language === 'ru') {
    switch (phase) {
      case 'PREPARING':
        return 'Готовится';
      case 'ASSIGNED':
        return 'Принят';
      case 'ACCEPTED':
        return 'Едет в ресторан';
      case 'ARRIVED':
        return 'В ресторане';
      case 'PICKED_UP':
        return 'Еда получена';
      case 'DELIVERING':
        return 'В пути';
      case 'DELIVERED':
        return 'Доставлен';
      case 'CANCELLED':
        return 'Отменен';
      case 'PENDING':
      default:
        return 'Принят';
    }
  }

  if (language === 'uz-cyrl') {
    switch (phase) {
      case 'PREPARING':
        return 'Тайёрланмоқда';
      case 'ASSIGNED':
        return 'Қабул қилинди';
      case 'ACCEPTED':
        return 'Ресторанга кетмоқда';
      case 'ARRIVED':
        return 'Кафеда';
      case 'PICKED_UP':
        return 'Таом олинди';
      case 'DELIVERING':
        return 'Йўлда';
      case 'DELIVERED':
        return 'Топширилди';
      case 'CANCELLED':
        return 'Бекор қилинди';
      case 'PENDING':
      default:
        return 'Қабул қилинди';
    }
  }

  switch (phase) {
    case 'PREPARING':
      return 'Tayyorlanmoqda';
    case 'ASSIGNED':
      return 'Qabul qilindi';
    case 'ACCEPTED':
      return 'Restoranga ketmoqda';
    case 'ARRIVED':
      return 'Kafeda';
    case 'PICKED_UP':
      return 'Taom olindi';
    case 'DELIVERING':
      return "Yo'lda";
    case 'DELIVERED':
      return 'Topshirildi';
    case 'CANCELLED':
      return 'Bekor qilindi';
    case 'PENDING':
    default:
      return 'Qabul qilindi';
  }
}

function getHeroTitle(
  phase: CustomerTrackingPhase,
  language: CustomerTrackingLanguage,
) {
  if (language === 'ru') {
    switch (phase) {
      case 'PREPARING':
        return 'Заказ готовится';
      case 'ASSIGNED':
        return 'Курьер назначен';
      case 'ACCEPTED':
        return 'Курьер едет в ресторан';
      case 'ARRIVED':
        return 'Курьер в ресторане';
      case 'PICKED_UP':
        return 'Заказ у курьера';
      case 'DELIVERING':
        return 'Заказ в пути';
      case 'DELIVERED':
        return 'Заказ доставлен';
      case 'CANCELLED':
        return 'Заказ отменен';
      case 'PENDING':
      default:
        return 'Заказ принят';
    }
  }

  if (language === 'uz-cyrl') {
    switch (phase) {
      case 'PREPARING':
        return 'Таом тайёрланмоқда';
      case 'ASSIGNED':
        return 'Курьер бириктирилди';
      case 'ACCEPTED':
        return 'Курьер ресторанга кетмоқда';
      case 'ARRIVED':
        return 'Курьер ресторанда';
      case 'PICKED_UP':
        return 'Таом курьерда';
      case 'DELIVERING':
        return 'Буюртма йўлда';
      case 'DELIVERED':
        return 'Буюртма топширилди';
      case 'CANCELLED':
        return 'Буюртма бекор қилинди';
      case 'PENDING':
      default:
        return 'Буюртма қабул қилинди';
    }
  }

  switch (phase) {
    case 'PREPARING':
      return 'Taom tayyorlanmoqda';
    case 'ASSIGNED':
      return 'Kuryer biriktirildi';
    case 'ACCEPTED':
      return 'Kuryer restoranga ketmoqda';
    case 'ARRIVED':
      return 'Kuryer restoranda';
    case 'PICKED_UP':
      return 'Taom kuryerda';
    case 'DELIVERING':
      return "Buyurtma yo'lda";
    case 'DELIVERED':
      return 'Buyurtma topshirildi';
    case 'CANCELLED':
      return 'Buyurtma bekor qilindi';
    case 'PENDING':
    default:
      return 'Buyurtma qabul qilindi';
  }
}

function getStatusLine(
  phase: CustomerTrackingPhase,
  language: CustomerTrackingLanguage,
  courierLabel: string,
  proximityMeters: number | null,
) {
  // ── Proximity-aware overrides for DELIVERING ──────────────────────────────
  if (phase === 'DELIVERING' && proximityMeters !== null) {
    const m = Math.round(proximityMeters);

    if (proximityMeters <= PROXIMITY_VERY_NEAR_M) {
      if (language === 'ru') return `${courierLabel} уже у вашей двери!`;
      if (language === 'uz-cyrl') return `${courierLabel} eshigingiz oldida!`;
      return `${courierLabel} eshigingiz oldida!`;
    }

    if (proximityMeters <= PROXIMITY_NEAR_M) {
      const display = m >= 100 ? `${Math.round(m / 10) * 10} m` : `${m} m`;
      if (language === 'ru') return `${courierLabel} почти у вас — осталось ${display}!`;
      if (language === 'uz-cyrl') return `${courierLabel} deyarli yetib keldi — ${display} qoldi!`;
      return `${courierLabel} deyarli yetib keldi — ${display} qoldi!`;
    }

    // More than 500 m but we have live location — show encouraging message
    if (language === 'ru') return `${courierLabel} уже в пути и скоро будет у вас!`;
    if (language === 'uz-cyrl') return `${courierLabel} kelmoqda — tez yetib boradi!`;
    return `${courierLabel} kelmoqda — tez yetib boradi!`;
  }

  // ── Standard messages ─────────────────────────────────────────────────────
  if (language === 'ru') {
    switch (phase) {
      case 'PREPARING':
        return 'Ресторан готовит ваш заказ.';
      case 'ASSIGNED':
        return `${courierLabel} назначен на ваш заказ. Подтверждение ожидается.`;
      case 'ACCEPTED':
        return `${courierLabel} принял заказ и едет в ресторан.`;
      case 'ARRIVED':
        return `${courierLabel} прибыл в ресторан и забирает заказ.`;
      case 'PICKED_UP':
        return `${courierLabel} забрал еду и направляется к вам!`;
      case 'DELIVERING':
        return `${courierLabel} уже в пути к вашему адресу.`;
      case 'DELIVERED':
        return 'Заказ успешно доставлен.';
      case 'CANCELLED':
        return 'Заказ отменен.';
      case 'PENDING':
      default:
        return 'Заказ принят и ожидает подтверждения.';
    }
  }

  if (language === 'uz-cyrl') {
    switch (phase) {
      case 'PREPARING':
        return 'Ресторан буюртмангизни тайёрламоқда.';
      case 'ASSIGNED':
        return `${courierLabel} буюртмангизга бириктирилди. Қабул қилиши кутилмоқда.`;
      case 'ACCEPTED':
        return `${courierLabel} буюртмани қабул қилди ва ресторанга кетмоқда.`;
      case 'ARRIVED':
        return `${courierLabel} ресторанга етиб борди ва таомни олмоқда.`;
      case 'PICKED_UP':
        return `${courierLabel} таомни олди ва сизга қараб кетмоқда!`;
      case 'DELIVERING':
        return `${courierLabel} буюртмангизни олиб келмоқда.`;
      case 'DELIVERED':
        return 'Буюртма муваффақиятли етказилди.';
      case 'CANCELLED':
        return 'Буюртма бекор қилинди.';
      case 'PENDING':
      default:
        return 'Буюртма қабул қилинди ва тасдиқ кутилмоқда.';
    }
  }

  switch (phase) {
    case 'PREPARING':
      return 'Restoran buyurtmangizni tayyorlamoqda.';
    case 'ASSIGNED':
      return `${courierLabel} buyurtmangiz uchun biriktirildi. Qabul qilishi kutilmoqda.`;
    case 'ACCEPTED':
      return `${courierLabel} buyurtmani qabul qildi va restoranga ketmoqda.`;
    case 'ARRIVED':
      return `${courierLabel} kafega yetib bordi va taomni olayapti.`;
    case 'PICKED_UP':
      return `${courierLabel} taomni oldi va sizga qarab ketmoqda!`;
    case 'DELIVERING':
      return `${courierLabel} buyurtmangizni olib kelyapti.`;
    case 'DELIVERED':
      return 'Buyurtma muvaffaqiyatli yetkazildi.';
    case 'CANCELLED':
      return 'Buyurtma bekor qilindi.';
    case 'PENDING':
    default:
      return "Buyurtma qabul qilindi va tasdiq kutilmoqda.";
  }
}

export function getCustomerTrackingMeta(
  order: Order,
  language: CustomerTrackingLanguage,
) {
  const phase = resolveCustomerTrackingPhase(order);
  const courierLabel = order.courierName?.trim() || getCourierFallbackLabel(language);
  const isCourierAssigned = phase !== 'PENDING' && phase !== 'PREPARING' && phase !== 'CANCELLED';
  const isCourierEnRouteToCustomer =
    phase === 'PICKED_UP' || phase === 'DELIVERING' || phase === 'DELIVERED';

  const proximityMeters = getDeliveryProximityMeters(order, phase);
  const isVeryNear = proximityMeters !== null && proximityMeters <= PROXIMITY_VERY_NEAR_M;
  const isNear = proximityMeters !== null && proximityMeters <= PROXIMITY_NEAR_M;

  return {
    phase,
    courierLabel: isCourierAssigned ? courierLabel : null,
    stageLabel: getStageLabel(phase, language, proximityMeters),
    heroTitle: getHeroTitle(phase, language),
    statusLine: getStatusLine(phase, language, courierLabel, proximityMeters),
    showCourierMarker: isCourierAssigned,
    shouldUseCourierRouteOrigin:
      Boolean(order.tracking?.courierLocation) &&
      phase !== 'PENDING' &&
      phase !== 'PREPARING' &&
      phase !== 'CANCELLED',
    currentTarget: isCourierEnRouteToCustomer ? 'customer' : 'restaurant',
    isDelivered: phase === 'DELIVERED',
    isCancelled: phase === 'CANCELLED',
    /** Remaining metres from courier to customer (DELIVERING phase only, null if unavailable) */
    proximityMeters,
    /** True when courier is ≤ 500 m away */
    isNearArrival: isNear,
    /** True when courier is ≤ 50 m away — trigger haptic/notification */
    isArrivingNow: isVeryNear,
  };
}

export function getCustomerTrackingEtaFallbackMinutes(
  order: Order,
  routeEtaMinutes: number,
) {
  const phase = resolveCustomerTrackingPhase(order);
  const quotedEtaMinutes =
    typeof order.deliveryEtaMinutes === 'number' && order.deliveryEtaMinutes > 0
      ? order.deliveryEtaMinutes
      : null;

  if (phase === 'DELIVERED' || phase === 'CANCELLED') {
    return 0;
  }

  switch (phase) {
    case 'PENDING':
      return (quotedEtaMinutes ?? routeEtaMinutes) + 12;
    case 'PREPARING':
      return (quotedEtaMinutes ?? routeEtaMinutes) + 10;
    case 'ASSIGNED':
      return routeEtaMinutes + 8;
    case 'ACCEPTED':
      return routeEtaMinutes + 5;
    case 'ARRIVED':
      return routeEtaMinutes + 3;
    case 'PICKED_UP':
    case 'DELIVERING':
      return quotedEtaMinutes ?? routeEtaMinutes;
    default:
      return quotedEtaMinutes ?? routeEtaMinutes;
  }
}

export function getCustomerTrackingDistanceFallbackKm(
  order: Order,
  routeDistanceKm: number,
) {
  const phase = resolveCustomerTrackingPhase(order);

  if (
    (phase === 'PICKED_UP' || phase === 'DELIVERING') &&
    typeof order.deliveryDistanceMeters === 'number' &&
    order.deliveryDistanceMeters > 0
  ) {
    return order.deliveryDistanceMeters / 1000;
  }

  return routeDistanceKm;
}
