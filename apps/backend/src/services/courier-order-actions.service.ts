import type { Prisma } from '@prisma/client';
import { NotificationTypeEnum, OrderStatusEnum, UserRoleEnum } from '@turon/shared';
import { prisma } from '../lib/prisma.js';
import { ORDER_INCLUDE, getActiveCourierAssignment } from '../api/modules/orders/order-helpers.js';
import { InAppNotificationsService } from './in-app-notifications.service.js';
import { StatusService } from './status.service.js';

type DbClient = Prisma.TransactionClient | typeof prisma;

export type CourierActionName =
  | 'ACCEPT'
  | 'ARRIVE_RESTAURANT'
  | 'PICKUP'
  | 'START_DELIVERY'
  | 'ARRIVE_DESTINATION'
  | 'DELIVER'
  | 'REPORT_PROBLEM';

interface ActionMutationPlan {
  assignmentStatus?: string;
  orderStatus?: OrderStatusEnum;
  eventType: string;
  assignmentUpdate?: Record<string, unknown>;
  orderUpdate?: Record<string, unknown>;
  payload?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  adminNotification?: {
    title: string;
    message: string;
  };
  customerNotification?: {
    type: NotificationTypeEnum;
    title: string;
    message: string;
  };
}

export interface PerformCourierActionInput {
  orderId: string;
  courierId: string;
  actorUserId?: string;
  action: CourierActionName;
  problemText?: string;
  db?: DbClient;
}

export interface PerformCourierActionResult {
  order: any;
  eventId: string;
  eventType: string;
  assignmentId: string;
  before: {
    orderStatus: string;
    assignmentStatus: string;
    deliveryStage: string;
    latestEventType: string | null;
  };
  after: {
    orderStatus: string;
    assignmentStatus: string;
    deliveryStage: string;
    latestEventType: string;
  };
}

function getLatestAssignmentEvent(assignment: any) {
  return assignment?.events?.[0] ?? null;
}

async function getAccessibleAssignment(orderId: string, courierId: string, db: DbClient) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: ORDER_INCLUDE as any,
  });

  if (!order) {
    throw new Error('Buyurtma topilmadi');
  }

  const assignment = getActiveCourierAssignment(order);
  if (!assignment || assignment.courierId !== courierId) {
    throw new Error('Ruxsat etilmadi');
  }

  return { order, assignment };
}

async function runWriteTransaction<T>(db: DbClient, callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  if ('$transaction' in db) {
    return db.$transaction(callback);
  }

  return callback(db);
}

function buildActionMutationPlan(input: {
  action: CourierActionName;
  order: any;
  assignment: any;
  problemText?: string;
}) {
  const { action, order, assignment, problemText } = input;
  const now = new Date();
  const latestEvent = getLatestAssignmentEvent(assignment);

  switch (action) {
    case 'ACCEPT': {
      if (assignment.status !== 'ASSIGNED') {
        throw new Error("Buyurtmani qabul qilish uchun u hali biriktirilgan holatda bo'lishi kerak");
      }

      return {
        eventType: 'ACCEPTED',
        assignmentStatus: 'ACCEPTED',
        assignmentUpdate: {
          status: 'ACCEPTED' as any,
          acceptedAt: assignment.acceptedAt || now,
        },
        orderUpdate: {
          courierId: assignment.courierId,
        },
        customerNotification: {
          type: NotificationTypeEnum.ORDER_STATUS_UPDATE,
          title: 'Kuryer buyurtmani qabul qildi',
          message: `${assignment.courier?.fullName || 'Kuryer'} #${String(order.orderNumber)} buyurtma uchun yo'lga chiqdi`,
        },
      } satisfies ActionMutationPlan;
    }
    case 'ARRIVE_RESTAURANT': {
      if (assignment.status !== 'ACCEPTED') {
        throw new Error("Restoranga yetdim deyishdan oldin buyurtmani qabul qiling");
      }

      if (latestEvent?.eventType === 'ARRIVED_AT_RESTAURANT') {
        throw new Error("Restoranga yetganingiz allaqachon qayd etilgan");
      }

      return {
        eventType: 'ARRIVED_AT_RESTAURANT',
        assignmentStatus: 'ACCEPTED',
        assignmentUpdate: {
          acceptedAt: assignment.acceptedAt || now,
        },
        orderUpdate: {
          courierId: assignment.courierId,
        },
      } satisfies ActionMutationPlan;
    }
    case 'PICKUP': {
      if (assignment.status !== 'ACCEPTED') {
        throw new Error("Taomni olishdan oldin buyurtmani qabul qiling");
      }

      return {
        eventType: 'PICKED_UP',
        assignmentStatus: 'PICKED_UP',
        orderStatus: OrderStatusEnum.DELIVERING,
        assignmentUpdate: {
          status: 'PICKED_UP' as any,
          acceptedAt: assignment.acceptedAt || now,
          pickedUpAt: assignment.pickedUpAt || now,
        },
        orderUpdate: {
          status: OrderStatusEnum.DELIVERING as any,
          courierId: assignment.courierId,
        },
        customerNotification: {
          type: NotificationTypeEnum.ORDER_STATUS_UPDATE,
          title: 'Taom restorandan olindi',
          message: `#${String(order.orderNumber)} buyurtma mijozga olib chiqildi`,
        },
      } satisfies ActionMutationPlan;
    }
    case 'START_DELIVERY': {
      if (assignment.status !== 'PICKED_UP') {
        throw new Error("Yo'lga chiqishdan oldin taom olingan bo'lishi kerak");
      }

      return {
        eventType: 'DELIVERING',
        assignmentStatus: 'DELIVERING',
        orderStatus: OrderStatusEnum.DELIVERING,
        assignmentUpdate: {
          status: 'DELIVERING' as any,
          acceptedAt: assignment.acceptedAt || now,
          pickedUpAt: assignment.pickedUpAt || now,
          deliveringAt: assignment.deliveringAt || now,
        },
        orderUpdate: {
          status: OrderStatusEnum.DELIVERING as any,
          courierId: assignment.courierId,
        },
        customerNotification: {
          type: NotificationTypeEnum.ORDER_STATUS_UPDATE,
          title: "Buyurtma yo'lda",
          message: `#${String(order.orderNumber)} buyurtma siz tomonga olib kelinmoqda`,
        },
      } satisfies ActionMutationPlan;
    }
    case 'ARRIVE_DESTINATION': {
      if (assignment.status !== 'DELIVERING') {
        throw new Error("Mijoz manziliga yetdim deyishdan oldin yo'lga chiqing");
      }

      if (latestEvent?.eventType === 'ARRIVED_AT_DESTINATION') {
        throw new Error("Mijoz manziliga yetganingiz allaqachon qayd etilgan");
      }

      return {
        eventType: 'ARRIVED_AT_DESTINATION',
        assignmentStatus: 'DELIVERING',
        orderStatus: OrderStatusEnum.DELIVERING,
        assignmentUpdate: {
          acceptedAt: assignment.acceptedAt || now,
          pickedUpAt: assignment.pickedUpAt || now,
          deliveringAt: assignment.deliveringAt || now,
        },
        orderUpdate: {
          status: OrderStatusEnum.DELIVERING as any,
          courierId: assignment.courierId,
        },
      } satisfies ActionMutationPlan;
    }
    case 'DELIVER': {
      if (assignment.status !== 'DELIVERING') {
        throw new Error("Buyurtmani topshirishdan oldin yo'lga chiqqan bo'lishingiz kerak");
      }

      return {
        eventType: 'DELIVERED',
        assignmentStatus: 'DELIVERED',
        orderStatus: OrderStatusEnum.DELIVERED,
        assignmentUpdate: {
          status: 'DELIVERED' as any,
          acceptedAt: assignment.acceptedAt || now,
          pickedUpAt: assignment.pickedUpAt || now,
          deliveringAt: assignment.deliveringAt || now,
          deliveredAt: assignment.deliveredAt || now,
        },
        orderUpdate: {
          status: OrderStatusEnum.DELIVERED as any,
          courierId: assignment.courierId,
        },
        customerNotification: {
          type: NotificationTypeEnum.SUCCESS,
          title: 'Buyurtma topshirildi',
          message: `#${String(order.orderNumber)} buyurtma muvaffaqiyatli topshirildi`,
        },
      } satisfies ActionMutationPlan;
    }
    case 'REPORT_PROBLEM': {
      const message = problemText?.trim();
      if (!message) {
        throw new Error("Muammo matnini yozing");
      }

      if (!StatusService.isActiveAssignmentStatus(assignment.status)) {
        throw new Error("Faol bo'lmagan topshiriq uchun muammo yuborib bo'lmaydi");
      }

      return {
        eventType: 'PROBLEM_REPORTED',
        assignmentStatus: assignment.status,
        orderStatus: order.status as OrderStatusEnum,
        payload: {
          message,
        },
        adminNotification: {
          title: 'Kuryer muammo yubordi',
          message: `#${String(order.orderNumber)} bo'yicha: ${message}`,
        },
      } satisfies ActionMutationPlan;
    }
    default:
      throw new Error("Noma'lum kuryer amali");
  }
}

export class CourierOrderActionsService {
  static async perform(input: PerformCourierActionInput): Promise<PerformCourierActionResult> {
    const db = input.db ?? prisma;
    const { order, assignment } = await getAccessibleAssignment(input.orderId, input.courierId, db);
    const latestEvent = getLatestAssignmentEvent(assignment);
    const currentStage = StatusService.mapAssignmentStatusToDeliveryStage(
      assignment.status,
      order.status as OrderStatusEnum,
      latestEvent?.eventType,
    );
    const mutationPlan = buildActionMutationPlan({
      action: input.action,
      order,
      assignment,
      problemText: input.problemText,
    });

    const now = new Date();

    const transactionResult = await runWriteTransaction(db, async (tx) => {
      if (mutationPlan.assignmentUpdate && Object.keys(mutationPlan.assignmentUpdate).length > 0) {
        await tx.courierAssignment.update({
          where: { id: assignment.id },
          data: mutationPlan.assignmentUpdate as any,
        });
      }

      if (mutationPlan.orderUpdate && Object.keys(mutationPlan.orderUpdate).length > 0) {
        await tx.order.update({
          where: { id: order.id },
          data: mutationPlan.orderUpdate as any,
        });
      }

      const createdEvent = await tx.courierAssignmentEvent.create({
        data: {
          assignmentId: assignment.id,
          orderId: order.id,
          courierId: assignment.courierId,
          eventType: mutationPlan.eventType as any,
          eventAt: now,
          payload: mutationPlan.payload ?? undefined,
          actorUserId: input.actorUserId ?? null,
        },
      });

      if (mutationPlan.adminNotification) {
        await InAppNotificationsService.notifyAdmins(
          {
            type: NotificationTypeEnum.WARNING,
            title: mutationPlan.adminNotification.title,
            message: mutationPlan.adminNotification.message,
            relatedOrderId: order.id,
          },
          tx,
        );
      }

      if (mutationPlan.customerNotification) {
        await InAppNotificationsService.notifyUser(
          {
            userId: order.userId,
            roleTarget: UserRoleEnum.CUSTOMER,
            type: mutationPlan.customerNotification.type,
            title: mutationPlan.customerNotification.title,
            message: mutationPlan.customerNotification.message,
            relatedOrderId: order.id,
          },
          tx,
        );
      }

      const refreshedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: ORDER_INCLUDE as any,
      });

      if (!refreshedOrder) {
        throw new Error('Buyurtma topilmadi');
      }

      const refreshedAssignment = getActiveCourierAssignment(refreshedOrder) ??
        refreshedOrder.courierAssignments.find((item: any) => item.id === assignment.id);
      const refreshedLatestEvent = refreshedAssignment?.events?.[0];
      const nextStage = StatusService.mapAssignmentStatusToDeliveryStage(
        refreshedAssignment?.status,
        refreshedOrder.status as OrderStatusEnum,
        refreshedLatestEvent?.eventType,
      );

      return {
        createdEvent,
        refreshedOrder,
        refreshedAssignment,
        refreshedLatestEvent,
        nextStage,
      };
    });

    return {
      order: transactionResult.refreshedOrder,
      eventId: transactionResult.createdEvent.id,
      eventType: mutationPlan.eventType,
      assignmentId: assignment.id,
      before: {
        orderStatus: order.status,
        assignmentStatus: assignment.status,
        deliveryStage: currentStage,
        latestEventType: latestEvent?.eventType ?? null,
      },
      after: {
        orderStatus: transactionResult.refreshedOrder.status,
        assignmentStatus: transactionResult.refreshedAssignment?.status ?? mutationPlan.assignmentStatus ?? assignment.status,
        deliveryStage: transactionResult.nextStage,
        latestEventType: transactionResult.refreshedLatestEvent?.eventType ?? mutationPlan.eventType,
      },
    };
  }
}
