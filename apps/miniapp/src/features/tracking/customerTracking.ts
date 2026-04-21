import { DeliveryStage, Order, OrderStatus } from '../../data/types';

export type CustomerTrackingLanguage = 'uz-latn' | 'uz-cyrl' | 'ru';

type CustomerTrackingPhase =
  | 'PENDING'
  | 'PREPARING'
  | 'REASSIGNING'
  | 'MANUAL_ASSIGNMENT_REQUIRED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED';

const PROXIMITY_VERY_NEAR_M = 50;
const PROXIMITY_NEAR_M = 500;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRadians(lat2 - lat1);
  const lonDelta = toRadians(lon2 - lon1);
  const leftLat = toRadians(lat1);
  const rightLat = toRadians(lat2);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(lonDelta / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDeliveryProximityMeters(order: Order, phase: CustomerTrackingPhase): number | null {
  if (phase !== 'DELIVERING' && phase !== 'PICKED_UP') {
    return null;
  }

  const courierLocation = order.tracking?.courierLocation;
  if (!courierLocation) {
    return null;
  }

  if (
    typeof courierLocation.remainingDistanceKm === 'number' &&
    courierLocation.remainingDistanceKm >= 0
  ) {
    return courierLocation.remainingDistanceKm * 1000;
  }

  if (typeof order.destinationLat === 'number' && typeof order.destinationLng === 'number') {
    return haversineMeters(
      courierLocation.latitude,
      courierLocation.longitude,
      order.destinationLat,
      order.destinationLng,
    );
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
  if (order.orderStatus === OrderStatus.CANCELLED) {
    return 'CANCELLED';
  }

  if (order.dispatchState === 'MANUAL_ASSIGNMENT_REQUIRED') {
    return 'MANUAL_ASSIGNMENT_REQUIRED';
  }

  if (order.dispatchState === 'SEARCHING') {
    return 'REASSIGNING';
  }

  if (
    order.orderStatus === OrderStatus.DELIVERED ||
    order.deliveryStage === DeliveryStage.DELIVERED ||
    order.courierAssignmentStatus === 'DELIVERED'
  ) {
    return 'DELIVERED';
  }

  if (
    order.dispatchState === 'COURIER_DELIVERING' ||
    order.deliveryStage === DeliveryStage.DELIVERING ||
    order.deliveryStage === DeliveryStage.ARRIVED_AT_DESTINATION ||
    order.courierAssignmentStatus === 'DELIVERING' ||
    order.orderStatus === OrderStatus.DELIVERING
  ) {
    return 'DELIVERING';
  }

  if (
    order.dispatchState === 'COURIER_PICKED_UP' ||
    order.deliveryStage === DeliveryStage.PICKED_UP ||
    order.courierAssignmentStatus === 'PICKED_UP'
  ) {
    return 'PICKED_UP';
  }

  if (
    order.dispatchState === 'COURIER_AT_RESTAURANT' ||
    order.deliveryStage === DeliveryStage.ARRIVED_AT_RESTAURANT ||
    order.courierLastEventType === 'ARRIVED_AT_RESTAURANT'
  ) {
    return 'ARRIVED';
  }

  if (
    order.dispatchState === 'COURIER_EN_ROUTE_TO_RESTAURANT' ||
    order.deliveryStage === DeliveryStage.GOING_TO_RESTAURANT ||
    order.courierAssignmentStatus === 'ACCEPTED' ||
    order.courierLastEventType === 'ACCEPTED'
  ) {
    return 'ACCEPTED';
  }

  if (
    order.dispatchState === 'AWAITING_COURIER_ACCEPTANCE' ||
    order.courierAssignmentStatus === 'ASSIGNED' ||
    Boolean(order.courierId)
  ) {
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
      case 'REASSIGNING':
        return 'Ищем другого курьера';
      case 'MANUAL_ASSIGNMENT_REQUIRED':
        return 'Оператор ищет курьера';
      case 'ASSIGNED':
        return 'Ожидает курьера';
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
      case 'REASSIGNING':
        return 'Янги курьер қидирилмоқда';
      case 'MANUAL_ASSIGNMENT_REQUIRED':
        return 'Оператор курьер қидиряпти';
      case 'ASSIGNED':
        return 'Курьер кутилмоқда';
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
    case 'REASSIGNING':
      return 'Yangi kuryer qidirilmoqda';
    case 'MANUAL_ASSIGNMENT_REQUIRED':
      return 'Operator kuryer qidirmoqda';
    case 'ASSIGNED':
      return 'Kuryer kutilmoqda';
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

function getHeroTitle(phase: CustomerTrackingPhase, language: CustomerTrackingLanguage) {
  if (language === 'ru') {
    switch (phase) {
      case 'PREPARING':
        return 'Заказ готовится';
      case 'REASSIGNING':
        return 'Ищем нового курьера';
      case 'MANUAL_ASSIGNMENT_REQUIRED':
        return 'Оператор подбирает курьера';
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
      case 'REASSIGNING':
        return 'Янги курьер қидирилмоқда';
      case 'MANUAL_ASSIGNMENT_REQUIRED':
        return 'Оператор курьер бириктирмоқда';
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
    case 'REASSIGNING':
      return 'Yangi kuryer qidirilmoqda';
    case 'MANUAL_ASSIGNMENT_REQUIRED':
      return 'Operator kuryer biriktirmoqda';
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
  if (phase === 'DELIVERING' && proximityMeters !== null) {
    const roundedMeters = Math.round(proximityMeters);

    if (proximityMeters <= PROXIMITY_VERY_NEAR_M) {
      if (language === 'ru') return `${courierLabel} уже у вашей двери!`;
      if (language === 'uz-cyrl') return `${courierLabel} эшигингиз олдида!`;
      return `${courierLabel} eshigingiz oldida!`;
    }

    if (proximityMeters <= PROXIMITY_NEAR_M) {
      const display = roundedMeters >= 100 ? `${Math.round(roundedMeters / 10) * 10} m` : `${roundedMeters} m`;
      if (language === 'ru') return `${courierLabel} почти у вас — осталось ${display}!`;
      if (language === 'uz-cyrl') return `${courierLabel} деярли етиб келди — ${display} қолди!`;
      return `${courierLabel} deyarli yetib keldi — ${display} qoldi!`;
    }

    if (language === 'ru') return `${courierLabel} уже в пути и скоро будет у вас!`;
    if (language === 'uz-cyrl') return `${courierLabel} келмоқда — тез етиб боради!`;
    return `${courierLabel} kelmoqda — tez yetib boradi!`;
  }

  if (language === 'ru') {
    switch (phase) {
      case 'PREPARING':
        return 'Ресторан готовит ваш заказ.';
      case 'REASSIGNING':
        return 'Предыдущий курьер не взял заказ. Мы уже ищем другого.';
      case 'MANUAL_ASSIGNMENT_REQUIRED':
        return 'Заказ сохранен. Оператор вручную подбирает курьера.';
      case 'ASSIGNED':
        return `${courierLabel} назначен на ваш заказ. Ожидаем подтверждение.`;
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
      case 'REASSIGNING':
        return 'Аввалги курьер қабул қилмади. Ҳозир бошқа курьер қидириляпти.';
      case 'MANUAL_ASSIGNMENT_REQUIRED':
        return 'Буюртмангиз сақланди. Оператор қўлда мос курьерни бириктиряпти.';
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
    case 'REASSIGNING':
      return 'Oldingi kuryer buyurtmani olmadi. Hozir boshqa kuryer qidirilyapti.';
    case 'MANUAL_ASSIGNMENT_REQUIRED':
      return "Buyurtmangiz saqlanib qolgan. Operator hozir mos kuryerni qo'lda biriktiryapti.";
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
      return 'Buyurtma qabul qilindi va tasdiq kutilmoqda.';
  }
}

export function getCustomerTrackingMeta(order: Order, language: CustomerTrackingLanguage) {
  const phase = resolveCustomerTrackingPhase(order);
  const courierLabel = order.courierName?.trim() || getCourierFallbackLabel(language);
  const isCourierAssigned = ![
    'PENDING',
    'PREPARING',
    'REASSIGNING',
    'MANUAL_ASSIGNMENT_REQUIRED',
    'CANCELLED',
  ].includes(phase);
  const isCourierAccepted =
    phase === 'ACCEPTED' ||
    phase === 'ARRIVED' ||
    phase === 'PICKED_UP' ||
    phase === 'DELIVERING' ||
    phase === 'DELIVERED';
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
    showCourierMarker: isCourierAccepted,
    shouldUseCourierRouteOrigin: Boolean(order.tracking?.courierLocation) && isCourierAccepted,
    currentTarget: isCourierEnRouteToCustomer ? 'customer' : 'restaurant',
    isAwaitingCourierAcceptance: phase === 'ASSIGNED',
    isCourierAccepted,
    isDelivered: phase === 'DELIVERED',
    isCancelled: phase === 'CANCELLED',
    isReassigning: phase === 'REASSIGNING',
    needsManualAssignment: phase === 'MANUAL_ASSIGNMENT_REQUIRED',
    proximityMeters,
    isNearArrival: isNear,
    isArrivingNow: isVeryNear,
  };
}

export function getCustomerTrackingEtaFallbackMinutes(order: Order, routeEtaMinutes: number) {
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
    case 'REASSIGNING':
      return (quotedEtaMinutes ?? routeEtaMinutes) + 10;
    case 'MANUAL_ASSIGNMENT_REQUIRED':
      return (quotedEtaMinutes ?? routeEtaMinutes) + 12;
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

export function getCustomerTrackingDistanceFallbackKm(order: Order, routeDistanceKm: number) {
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
