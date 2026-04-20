import { 
  OrderStatusEnum as OrderStatus, 
  PaymentMethodEnum as PaymentMethod, 
  PaymentStatusEnum as PaymentStatus, 
  DeliveryStageEnum as DeliveryStage,
  PromoDiscountTypeEnum as DiscountType
} from '@turon/shared';

export { OrderStatus, PaymentMethod, PaymentStatus, DeliveryStage, DiscountType };

export interface ProductSnapshot {
  id: string;
  menuItemId?: string | null;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  weight?: string;
  oldPrice?: number;
  isAvailable?: boolean;
}

export interface CartItem extends ProductSnapshot {
  quantity: number;
}

export interface AppliedPromo {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  discountAmount?: number;
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

export interface CourierTrackingLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speedKmh?: number;
  remainingDistanceKm?: number;
  remainingEtaMinutes?: number;
  updatedAt: string;
}

export interface OrderTrackingState {
  isLive: boolean;
  lastEventAt: string;
  courierLocation?: CourierTrackingLocation;
}

export interface OrderQuote {
  subtotal: number;
  discount: number;
  merchandiseTotal: number;
  deliveryFee: number;
  total: number;
  deliveryDistanceMeters: number;
  deliveryEtaMinutes: number;
  deliveryFeeRuleCode: string;
  deliveryFeeBaseAmount: number;
  deliveryFeeExtraAmount: number;
  routeSource?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  deliveryDistanceMeters?: number | null;
  deliveryEtaMinutes?: number | null;
  deliveryFeeRuleCode?: string | null;
  deliveryFeeBaseAmount?: number | null;
  deliveryFeeExtraAmount?: number | null;
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
  courierTelegramId?: string | null;
  courierUsername?: string | null;
  deliveryStage?: DeliveryStage;
  verificationStatus?: boolean;
  verifiedByAdmin?: string;
  verifiedAt?: string;
  paymentReference?: string;
  externalTransactionId?: string;
  customerUserId?: string;
  customerName?: string;
  customerPhone?: string | null;
  courierPhone?: string | null;
  pickupLat?: number;
  pickupLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  courierAssignmentStatus?: string;
  courierLastEventType?: string | null;
  courierLastEventAt?: string | null;
  assignedAt?: string | null;
  acceptedAt?: string | null;
  tracking?: OrderTrackingState;
}

export interface CourierOrderPreview {
  id: string;
  assignmentId?: string | null;
  orderNumber: string;
  orderStatus: OrderStatus;
  deliveryStage?: DeliveryStage;
  courierAssignmentStatus?: string;
  total: number;
  deliveryFee: number;
  paymentMethod: PaymentMethod;
  restaurantName: string;
  distanceToRestaurantMeters?: number | null;
  etaToRestaurantMinutes?: number | null;
  customerName: string;
  destinationAddress: string;
  destinationArea: string;
  createdAt: string;
  assignedAt?: string | null;
  acceptedAt?: string | null;
  itemCount: number;
  latestCourierEventType?: string | null;
}

export interface CourierStatusSummary {
  courierId: string;
  isOnline: boolean;
  isAcceptingOrders: boolean;
  lastOnlineAt?: string | null;
  lastOfflineAt?: string | null;
  updatedAt: string;
  activeAssignments: number;
  completedToday: number;
  activeAssignment?: {
    assignmentId: string;
    orderId: string;
    orderNumber: string;
    assignmentStatus: string;
    orderStatus: OrderStatus;
  } | null;
}

export interface CourierTodayStats {
  courierId: string;
  dayStartAt: string;
  dayEndAt: string;
  completedCount: number;
  activeCount: number;
  deliveredOrderAmountTotal: number;
  deliveryFeesTotal: number;
  averageFulfillmentMinutes?: number | null;
  averageDeliveryLegMinutes?: number | null;
  firstDeliveredAt?: string | null;
  lastDeliveredAt?: string | null;
  payoutSummary: {
    isDefined: boolean;
    label: string;
  };
  recentCompletedOrders: Array<{
    assignmentId: string;
    orderId: string;
    orderNumber: string;
    deliveredAt: string;
    total: number;
    deliveryFee: number;
    paymentMethod: PaymentMethod;
    orderStatus: OrderStatus;
  }>;
}

export interface AdminCourierOption {
  id: string;
  fullName: string;
  phoneNumber: string;
  activeAssignments: number;
  isOnline?: boolean;
  isAcceptingOrders?: boolean;
  rank?: number;
  distanceMeters?: number | null;
  etaMinutes?: number | null;
  remainingDeliveryDistanceMeters?: number | null;
  isFree?: boolean;
  rankingSource?: string | null;
  hasLiveLocation?: boolean;
  liveLocationUpdatedAt?: string | null;
}

export interface AdminCourierDirectoryItem {
  id: string;
  telegramId: string;
  telegramUsername?: string | null;
  fullName: string;
  phoneNumber?: string | null;
  isActive: boolean;
  isOnline: boolean;
  isAcceptingOrders: boolean;
  activeAssignments: number;
  completedToday: number;
  totalDelivered: number;
  deliveryFeesToday: number;
  lastOnlineAt?: string | null;
  lastOfflineAt?: string | null;
  lastSeenAt?: string | null;
  currentOrderId?: string | null;
  createdAt: string;
  updatedAt: string;
  lastDeliveredAt?: string | null;
}

export interface CourierProfile {
  courierId: string;
  telegramId: string;
  telegramUsername?: string | null;
  fullName: string;
  phoneNumber?: string | null;
  isActive: boolean;
  isOnline: boolean;
  isAcceptingOrders: boolean;
  createdAt: string;
  updatedAt: string;
  lastOnlineAt?: string | null;
  lastOfflineAt?: string | null;
  lastSeenAt?: string | null;
  totalDeliveredCount: number;
  activeAssignments: number;
  completedToday: number;
  latestPresence?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
    orderId?: string | null;
  } | null;
  activeAssignment?: {
    assignmentId: string;
    orderId: string;
    orderNumber: string;
    assignmentStatus: string;
    orderStatus: OrderStatus;
  } | null;
  todayStats: CourierTodayStats;
}

export interface CourierHistoryEntry {
  assignmentId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  destinationAddress: string;
  assignmentStatus: string;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  total: number;
  deliveryFee: number;
  itemCount: number;
  note?: string | null;
  assignedAt: string;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
  deliveringAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  latestEventType?: string | null;
}

export interface PromoValidationResult {
  isValid: boolean;
  message: string;
  discountAmount: number;
  promo?: AppliedPromo;
}

export interface SupportMessage {
  id: string;
  senderRole: 'CUSTOMER' | 'ADMIN' | 'COURIER';
  senderLabel: string;
  text: string;
  channel: 'MINI_APP' | 'TELEGRAM';
  createdAt: string;
}

export interface SupportThread {
  id: string;
  orderId?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messages: SupportMessage[];
}
