import type { Prisma } from '@prisma/client';
import {
  RESTAURANT_COORDINATES,
  DeliveryStageEnum,
  OrderStatusEnum,
  ProductAvailabilityEnum,
  UserRoleEnum,
} from '@turon/shared';
import { StatusService } from '../../../services/status.service.js';

export const RESTAURANT_COORDS = {
  latitude: RESTAURANT_COORDINATES.lat,
  longitude: RESTAURANT_COORDINATES.lng,
};

export const ACTIVE_ASSIGNMENT_STATUSES = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'] as const;

export const ORDER_LIST_INCLUDE = {
  user: {
    select: {
      fullName: true,
      phoneNumber: true,
    },
  },
  deliveryAddress: true,
  items: true,
  courierAssignments: {
    include: {
      courier: {
        select: {
          fullName: true,
        },
      },
      events: {
        orderBy: [
          { eventAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 1,
      },
    },
    orderBy: { assignedAt: 'desc' },
    take: 1, // Only need the latest for list
  },
} satisfies Prisma.OrderInclude;

export const ORDER_DETAIL_INCLUDE = {
  user: true,
  promoCode: true,
  payment: true,
  deliveryAddress: true,
  items: {
    include: {
      menuItem: {
        include: {
          category: true,
        },
      },
    },
  },
  courierAssignments: {
    include: {
      courier: true,
      events: {
        orderBy: [
          { eventAt: 'desc' },
          { createdAt: 'desc' },
        ],
      },
    },
    orderBy: { assignedAt: 'desc' },
  },
} satisfies Prisma.OrderInclude;

export const ORDER_INCLUDE = ORDER_DETAIL_INCLUDE;

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ORDER_DETAIL_INCLUDE;
}>;

export type OrderDispatchState =
  | 'UNASSIGNED'
  | 'SEARCHING'
  | 'MANUAL_ASSIGNMENT_REQUIRED'
  | 'AWAITING_COURIER_ACCEPTANCE'
  | 'COURIER_EN_ROUTE_TO_RESTAURANT'
  | 'COURIER_AT_RESTAURANT'
  | 'COURIER_PICKED_UP'
  | 'COURIER_DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED';

export function getActiveCourierAssignment(order: any) {
  return (
    order.courierAssignments?.find((assignment: any) =>
      StatusService.isActiveAssignmentStatus(assignment.status),
    ) || null
  );
}

function isActiveAssignmentForCourier(order: any, courierId: string) {
  const activeAssignment = getActiveCourierAssignment(order);
  return activeAssignment?.courierId === courierId;
}

function pickLocalizedText(record: any, fields: string[]) {
  for (const field of fields) {
    if (record?.[field]) {
      return record[field];
    }
  }

  return '';
}

function getLatestAssignment(order: any) {
  return order.courierAssignments?.[0] || null;
}

function getAssignmentEventReason(event: any): string | null {
  const payload = event?.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const reason = (payload as Record<string, unknown>).reason;
  return typeof reason === 'string' ? reason : null;
}

export function deriveDispatchState(order: any): OrderDispatchState {
  const latestAssignment = getLatestAssignment(order);
  const latestAssignmentEvent = latestAssignment?.events?.[0];
  const latestReason = getAssignmentEventReason(latestAssignmentEvent);

  if (order.status === OrderStatusEnum.CANCELLED) {
    return 'CANCELLED';
  }

  if (
    order.status === OrderStatusEnum.DELIVERED ||
    latestAssignment?.status === 'DELIVERED'
  ) {
    return 'DELIVERED';
  }

  if (
    latestAssignmentEvent?.eventType === 'ARRIVED_AT_DESTINATION' ||
    latestAssignment?.status === 'DELIVERING' ||
    order.status === OrderStatusEnum.DELIVERING
  ) {
    return 'COURIER_DELIVERING';
  }

  if (
    latestAssignmentEvent?.eventType === 'PICKED_UP' ||
    latestAssignment?.status === 'PICKED_UP'
  ) {
    return 'COURIER_PICKED_UP';
  }

  if (latestAssignmentEvent?.eventType === 'ARRIVED_AT_RESTAURANT') {
    return 'COURIER_AT_RESTAURANT';
  }

  if (
    latestAssignmentEvent?.eventType === 'ACCEPTED' ||
    latestAssignment?.status === 'ACCEPTED'
  ) {
    return 'COURIER_EN_ROUTE_TO_RESTAURANT';
  }

  if (latestAssignment?.status === 'ASSIGNED' || Boolean(order.courierId)) {
    return 'AWAITING_COURIER_ACCEPTANCE';
  }

  if (latestReason === 'manual_dispatch_required') {
    return 'MANUAL_ASSIGNMENT_REQUIRED';
  }

  if (
    latestAssignment?.status === 'REJECTED' ||
    latestReason === 'courier_response_timeout'
  ) {
    return 'SEARCHING';
  }

  return 'UNASSIGNED';
}

export function serializeAddress(address: any) {
  if (!address) {
    return undefined;
  }

  return {
    id: address.id,
    label: address.title || 'Boshqa',
    addressText: address.address,
    latitude: Number(address.latitude),
    longitude: Number(address.longitude),
    note: address.note || '',
    isDefault: address.isDefault ?? false,
    createdAt: address.createdAt.toISOString(),
    updatedAt: address.updatedAt.toISOString(),
  };
}

export function serializeOrderItem(item: any) {
  const menuItem = item.menuItem;
  const menuItemId = item.menuItemId ?? menuItem?.id ?? null;
  const isAvailable = Boolean(
    menuItem &&
      menuItem.isActive &&
      menuItem.availabilityStatus === ProductAvailabilityEnum.AVAILABLE &&
      menuItem.category?.isActive,
  );

  return {
    id: menuItemId || item.id,
    menuItemId,
    categoryId: menuItem?.categoryId || '',
    name: item.itemName || pickLocalizedText(menuItem, ['nameUz', 'nameRu']) || 'Taom',
    description: pickLocalizedText(menuItem, ['descriptionUz', 'descriptionRu']) || '',
    price: Number(item.priceAtOrder),
    image: item.imageUrl || menuItem?.imageUrl || '',
    quantity: item.quantity,
    isAvailable,
  };
}

export function serializeOrder(order: any) {
  const latestAssignment = getLatestAssignment(order);
  const courier = latestAssignment?.courier || order.courier;
  const latestAssignmentEvent = latestAssignment?.events?.[0];
  const dispatchState = deriveDispatchState(order);
  const dispatchFailureReason = getAssignmentEventReason(latestAssignmentEvent);

  return {
    id: order.id,
    orderNumber: String(order.orderNumber),
    items: (order.items || []).map(serializeOrderItem),
    subtotal: Number(order.subtotal),
    discount: Number(order.discountAmount || 0),
    deliveryFee: Number(order.deliveryFee),
    deliveryDistanceMeters:
      typeof order.deliveryDistanceMeters === 'number' ? order.deliveryDistanceMeters : null,
    deliveryEtaMinutes: typeof order.deliveryEtaMinutes === 'number' ? order.deliveryEtaMinutes : null,
    deliveryFeeRuleCode: order.deliveryFeeRuleCode || null,
    deliveryFeeBaseAmount:
      order.deliveryFeeBaseAmount !== null && order.deliveryFeeBaseAmount !== undefined
        ? Number(order.deliveryFeeBaseAmount)
        : null,
    deliveryFeeExtraAmount:
      order.deliveryFeeExtraAmount !== null && order.deliveryFeeExtraAmount !== undefined
        ? Number(order.deliveryFeeExtraAmount)
        : null,
    total: Number(order.totalAmount),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    promoCode: order.promoCode?.code,
    note: order.note || '',
    createdAt: order.createdAt.toISOString(),
    orderStatus: order.status,
    customerAddress: serializeAddress(order.deliveryAddress),
    courierId: latestAssignment?.courierId || order.courierId,
    courierName: courier?.fullName,
    courierTelegramId: courier?.telegramId ? String(courier.telegramId) : null,
    courierUsername: courier?.telegramUsername || null,
    deliveryStage: StatusService.mapAssignmentStatusToDeliveryStage(
      latestAssignment?.status,
      order.status as OrderStatusEnum,
      latestAssignmentEvent?.eventType,
    ),
    verificationStatus: order.paymentStatus === 'COMPLETED',
    verifiedByAdmin: order.payment?.verifiedByAdminId,
    verifiedAt: order.payment?.verifiedAt?.toISOString(),
    paymentReference: order.payment?.transactionRef,
    externalTransactionId: order.payment?.transactionRef,
    receiptImageUrl: order.payment?.receiptImageBase64 || null,
    customerName: order.user?.fullName,
    customerUserId: order.userId,
    customerPhone: order.user?.phoneNumber || undefined,
    restaurantName: order.restaurantName ?? RESTAURANT_COORDINATES.name,
    pickupLat: order.restaurantLat ? Number(order.restaurantLat) : RESTAURANT_COORDS.latitude,
    pickupLng: order.restaurantLon ? Number(order.restaurantLon) : RESTAURANT_COORDS.longitude,
    restaurantPhone: order.restaurantPhone ?? null,
    restaurantAddress: order.restaurantAddressText ?? RESTAURANT_COORDINATES.address,
    destinationLat: Number(order.destinationLat ?? order.deliveryAddress?.latitude ?? 0),
    destinationLng: Number(order.destinationLng ?? order.deliveryAddress?.longitude ?? 0),
    dispatchState,
    dispatchFailureReason,
    dispatchNeedsManualAssignment: dispatchState === 'MANUAL_ASSIGNMENT_REQUIRED',
    courierAssignmentStatus: latestAssignment?.status,
    courierLastEventType: latestAssignmentEvent?.eventType ?? null,
    courierLastEventAt: latestAssignmentEvent?.eventAt?.toISOString?.() ?? null,
    assignedAt: latestAssignment?.assignedAt?.toISOString?.() ?? null,
    acceptedAt: latestAssignment?.acceptedAt?.toISOString?.() ?? null,
    // Exposed so customers can call the courier and couriers can call the customer
    courierPhone: courier?.phoneNumber ?? null,
  };
}

export function hasOrderAccess(order: any, requester: any) {
  const isOwner = order.userId === requester.id;
  const isAdmin = requester.role === UserRoleEnum.ADMIN;
  const isAssignedCourier = isActiveAssignmentForCourier(order, requester.id);

  return isOwner || isAdmin || isAssignedCourier;
}

export function isOrderVisibleToRequester(order: any, requester: any) {
  if (requester.role === UserRoleEnum.ADMIN) {
    return true;
  }

  if (requester.role === UserRoleEnum.COURIER) {
    // Raw DB order (includes courierAssignments array) — use active assignment lookup
    if (Array.isArray(order.courierAssignments)) {
      return isActiveAssignmentForCourier(order, requester.id);
    }
    // Serialized order (no courierAssignments array) — check courierId + assignment status directly.
    // This path is hit by the SSE stream handler when publishOrderUpdate fires after auto-assignment.
    return (
      order.courierId === requester.id &&
      ACTIVE_ASSIGNMENT_STATUSES.includes(order.courierAssignmentStatus)
    );
  }

  return order.userId === requester.id;
}

export function serializeCourierOption(user: any) {
  const activeAssignments = (user.courierAssignments || []).filter((assignment: any) =>
    StatusService.isActiveAssignmentStatus(assignment.status),
  ).length;
  const operationalStatus = user.courierOperationalStatus;

  return {
    id: user.id,
    fullName: user.fullName || 'Kuryer',
    phoneNumber: user.phoneNumber || '',
    activeAssignments,
    isOnline: operationalStatus?.isOnline ?? false,
    isAcceptingOrders: operationalStatus?.isAcceptingOrders ?? false,
    operationalStatusUpdatedAt: operationalStatus?.updatedAt?.toISOString?.() ?? null,
  };
}
