import { AppEventEnum, NotificationTypeEnum, UserRoleEnum } from '@turon/shared';

export interface AppNotification {
  id: string;
  roleTarget: UserRoleEnum;
  userId?: string; // Optional for user-specific targeting
  type: NotificationTypeEnum;
  event?: AppEventEnum | null;
  title: string;
  message: string;
  relatedOrderId?: string;
  isRead: boolean;
  createdAt: string;
  actionRoute?: string;
}

export type EventPayload = {
  orderId?: string;
  orderNumber?: string;
  total?: number;
  customerName?: string;
  courierName?: string;
  status?: string;
  paymentMethod?: string;
  reason?: string;
  timestamp: string;
};

export type EventSubscriber = (event: AppEventEnum, payload: EventPayload) => void;
