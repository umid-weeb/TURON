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

export const ORDER_INCLUDE = {
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

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

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
  const latestAssignment = order.courierAssignments?.[0];
  const courier = latestAssignment?.courier || order.courier;
  const latestAssignmentEvent = latestAssignment?.events?.[0];

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
    customerName: order.user?.fullName,
    customerUserId: order.userId,
    customerPhone: order.user?.phoneNumber || undefined,
    pickupLat: RESTAURANT_COORDS.latitude,
    pickupLng: RESTAURANT_COORDS.longitude,
    destinationLat: Number(order.destinationLat ?? order.deliveryAddress?.latitude ?? 0),
    destinationLng: Number(order.destinationLng ?? order.deliveryAddress?.longitude ?? 0),
    courierAssignmentStatus: latestAssignment?.status,
    courierLastEventType: latestAssignmentEvent?.eventType ?? null,
    courierLastEventAt: latestAssignmentEvent?.eventAt?.toISOString?.() ?? null,
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
    return isActiveAssignmentForCourier(order, requester.id);
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
