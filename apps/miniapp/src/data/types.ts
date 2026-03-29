import { Product } from './mockData';

export type DeliveryStage = 
  | 'IDLE' 
  | 'ACCEPTED' 
  | 'ARRIVED_AT_RESTAURANT' 
  | 'PICKED_UP' 
  | 'ON_THE_WAY' 
  | 'DELIVERED';

export type OrderStatus = 
  | 'NEW' 
  | 'ACCEPTED' 
  | 'PREPARING' 
  | 'READY' 
  | 'PICKED_UP' 
  | 'DELIVERING' 
  | 'DELIVERED' 
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'PENDING_VERIFICATION';

export type PaymentMethod = 'CASH' | 'ONLINE' | 'CARD_ON_DELIVERY';

export interface CartItem extends Product {
  quantity: number;
}

export type DiscountType = 'PERCENT' | 'FIXED';

export interface Promo {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number;
  minSubtotal?: number;
}

export interface Address {
  id: string;
  label: string; // e.g., 'Uy', 'Ish', 'Boshqa'
  addressText: string;
  latitude: number;
  longitude: number;
  note?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  promoCode?: string;
  note?: string;
  createdAt: string;
  orderStatus: OrderStatus;
  customerAddress?: Address;
  courierId?: string;
  courierName?: string;
}

export interface PromoValidationResult {
  isValid: boolean;
  message: string;
  promo?: Promo;
}
