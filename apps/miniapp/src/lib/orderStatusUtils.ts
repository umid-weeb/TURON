import { OrderStatus } from '../data/types';

export const getStatusLabel = (status: OrderStatus): string => {
  switch (status) {
    case 'NEW': return 'Yangi';
    case 'ACCEPTED': return 'Tasdiqlandi';
    case 'PREPARING': return 'Tayyorlanmoqda';
    case 'READY': return 'Tayyor';
    case 'PICKED_UP': return 'Kuryer oldi';
    case 'DELIVERING': return 'Yo‘lda';
    case 'DELIVERED': return 'Yetkazildi';
    case 'CANCELLED': return 'Bekor qilindi';
    default: return 'Noma\'lum';
  }
};

export const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case 'NEW': return 'slate';
    case 'ACCEPTED': return 'blue';
    case 'PREPARING': return 'amber';
    case 'READY': return 'orange';
    case 'PICKED_UP': return 'indigo';
    case 'DELIVERING': return 'purple';
    case 'DELIVERED': return 'emerald';
    case 'CANCELLED': return 'red';
    default: return 'slate';
  }
};

export const getStatusStep = (status: OrderStatus): number => {
  switch (status) {
    case 'NEW': return 0;
    case 'ACCEPTED': return 1;
    case 'PREPARING': return 2;
    case 'READY': return 3;
    case 'PICKED_UP': return 4;
    case 'DELIVERING': return 5;
    case 'DELIVERED': return 6;
    case 'CANCELLED': return -1;
    default: return 0;
  }
};

export const getNextStatus = (current: OrderStatus): OrderStatus | null => {
  switch (current) {
    case 'NEW': return 'ACCEPTED';
    case 'ACCEPTED': return 'PREPARING';
    case 'PREPARING': return 'READY';
    case 'READY': return 'PICKED_UP';
    case 'PICKED_UP': return 'DELIVERING';
    case 'DELIVERING': return 'DELIVERED';
    default: return null;
  }
};

export const ORDER_TRACKING_STEPS: StatusStep[] = [
  { id: 'NEW', label: 'Yaratildi', description: 'Buyurtmangiz qabul qilindi' },
  { id: 'ACCEPTED', label: 'Tasdiqlandi', description: 'Restoran buyurtmani tasdiqladi' },
  { id: 'PREPARING', label: 'Tayyorlanmoqda', description: 'Oshpazlarimiz taomni tayyorlashmoqda' },
  { id: 'READY', label: 'Tayyor', description: 'Taom tayyor, kuryerga topshirilmoqda' },
  { id: 'DELIVERING', label: 'Yetkazilmoqda', description: 'Buyurtmangiz manzilga qarab yo\'lga chiqdi' },
  { id: 'DELIVERED', label: 'Yetkazildi', description: 'Yoqimli ishtaha!' },
];
