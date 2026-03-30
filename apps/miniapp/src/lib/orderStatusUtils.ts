import { OrderStatus } from '../data/types';

export interface StatusStep {
  id: OrderStatus;
  label: string;
  description: string;
}

export const getStatusLabel = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.PENDING: return 'Yangi';
    case OrderStatus.PREPARING: return 'Tayyorlanmoqda';
    case OrderStatus.READY_FOR_PICKUP: return 'Tayyor';
    case OrderStatus.DELIVERING: return 'Yo‘lda';
    case OrderStatus.DELIVERED: return 'Yetkazildi';
    case OrderStatus.CANCELLED: return 'Bekor qilindi';
    default: return 'Noma\'lum';
  }
};

export const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.PENDING: return 'slate';
    case OrderStatus.PREPARING: return 'amber';
    case OrderStatus.READY_FOR_PICKUP: return 'orange';
    case OrderStatus.DELIVERING: return 'purple';
    case OrderStatus.DELIVERED: return 'emerald';
    case OrderStatus.CANCELLED: return 'red';
    default: return 'slate';
  }
};

export const getStatusStep = (status: OrderStatus): number => {
  switch (status) {
    case OrderStatus.PENDING: return 0;
    case OrderStatus.PREPARING: return 1;
    case OrderStatus.READY_FOR_PICKUP: return 2;
    case OrderStatus.DELIVERING: return 3;
    case OrderStatus.DELIVERED: return 4;
    case OrderStatus.CANCELLED: return -1;
    default: return 0;
  }
};

export const getNextStatus = (current: OrderStatus): OrderStatus | null => {
  switch (current) {
    case OrderStatus.PENDING: return OrderStatus.PREPARING;
    case OrderStatus.PREPARING: return OrderStatus.READY_FOR_PICKUP;
    case OrderStatus.READY_FOR_PICKUP: return OrderStatus.DELIVERING;
    case OrderStatus.DELIVERING: return OrderStatus.DELIVERED;
    default: return null;
  }
};

export const ORDER_TRACKING_STEPS: StatusStep[] = [
  { id: OrderStatus.PENDING, label: 'Yaratildi', description: 'Buyurtmangiz qabul qilindi' },
  { id: OrderStatus.PREPARING, label: 'Tasdiqlandi', description: 'Restoran buyurtmani tasdiqladi va tayyorlashni boshladi' },
  { id: OrderStatus.READY_FOR_PICKUP, label: 'Tayyor', description: 'Taom tayyor, kuryerga topshirilmoqda' },
  { id: OrderStatus.DELIVERING, label: 'Yetkazilmoqda', description: 'Buyurtmangiz manzilga qarab yo\'lga chiqdi' },
  { id: OrderStatus.DELIVERED, label: 'Yetkazildi', description: 'Yoqimli ishtaha!' },
];
