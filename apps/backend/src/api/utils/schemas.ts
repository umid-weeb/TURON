import { z } from 'zod';
import { 
  UserRoleEnum, 
  LanguageEnum, 
  OrderStatusEnum, 
  PaymentMethodEnum, 
  PromoDiscountTypeEnum, 
  DeliveryStageEnum 
} from '@turon/shared';

// Common Schemas
export const UuidSchema = z.string().uuid();
export const IdParamSchema = z.object({ id: UuidSchema });
export const ThreadIdParamSchema = z.object({ threadId: UuidSchema });
export const AdminSupportSendSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

// Auth
export const TelegramAuthSchema = z.object({
  initData: z.string().min(1),
});

// Menu
export const CategorySchema = z.object({
  name: z.string().min(2),
  iconUrl: z.string().trim().optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const MenuItemSchema = z.object({
  categoryId: UuidSchema,
  name: z.string().min(2),
  description: z.string().max(1000).optional(),
  price: z.number().positive(),
  oldPrice: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  imageUrl: z.string().trim().optional().or(z.literal('')),
  weightText: z.string().trim().optional().or(z.literal('')),
  badgeText: z.string().trim().optional().or(z.literal('')),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  isDiscounted: z.boolean().optional(),
  discountPercent: z.number().int().min(1).max(99).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const ToggleActiveSchema = z.object({
  isActive: z.boolean(),
});

// Addresses
export const AddressSchema = z.object({
  title: z.string().optional(),
  address: z.string().min(5),
  note: z.string().max(300).optional(),
  latitude: z.number(),
  longitude: z.number(),
});

const MapCoordinateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

const MapModeSchema = z.enum(['driving', 'walking', 'bicycle', 'scooter', 'transit']);
const MapTrafficSchema = z.enum(['enabled', 'disabled']);

export const MapSuggestQuerySchema = z.object({
  text: z.string().trim().min(1),
  results: z.coerce.number().int().min(1).max(10).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export const MapResolveSuggestionSchema = z
  .object({
    uri: z.string().trim().optional(),
    text: z.string().trim().optional(),
  })
  .refine((value) => Boolean(value.uri || value.text), {
    message: 'uri yoki text yuborilishi kerak',
  });

export const MapReverseGeocodeSchema = MapCoordinateSchema;

export const MapRouteSchema = z.object({
  from: MapCoordinateSchema,
  to: MapCoordinateSchema,
  mode: MapModeSchema.optional(),
  traffic: MapTrafficSchema.optional(),
});

export const MapDistanceMatrixSchema = z.object({
  origins: z.array(MapCoordinateSchema).min(1).max(10),
  destinations: z.array(MapCoordinateSchema).min(1).max(10),
  mode: MapModeSchema.optional(),
  traffic: MapTrafficSchema.optional(),
});

// Orders
export const CreateOrderSchema = z.object({
  idempotencyKey: z.string().uuid('Invalid idempotency key format'),
  items: z.array(z.object({
    menuItemId: UuidSchema,
    quantity: z.number().int().positive(),
  })).min(1),
  deliveryAddressId: UuidSchema,
  paymentMethod: z.nativeEnum(PaymentMethodEnum),
  promoCode: z.string().optional(),
  note: z.string().optional(),
  /** Base64 data URL of the payment receipt image (card payments only) */
  receiptImageBase64: z.string().optional(),
});

export const QuoteOrderSchema = CreateOrderSchema.pick({
  items: true,
  deliveryAddressId: true,
  promoCode: true,
});

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatusEnum),
});

export const AssignCourierSchema = z.object({
  courierId: UuidSchema,
});

export const UpdateDeliveryStageSchema = z.object({
  stage: z.nativeEnum(DeliveryStageEnum),
});

export const TrackingLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  heading: z.number().min(0).max(360).optional(),
  speedKmh: z.number().min(0).optional(),
  remainingDistanceKm: z.number().min(0).optional(),
  remainingEtaMinutes: z.number().int().min(0).optional(),
  /** ISO-8601 timestamp when the GPS reading was taken on the device. Used for offline-sync staleness checks. */
  clientTimestamp: z.string().datetime().optional(),
});

export const UpdateCourierOperationalStatusSchema = z
  .object({
    isOnline: z.boolean().optional(),
    isAcceptingOrders: z.boolean().optional(),
  })
  .refine(
    (value) => typeof value.isOnline === 'boolean' || typeof value.isAcceptingOrders === 'boolean',
    {
      message: "Kamida bitta status maydoni yuborilishi kerak",
    },
  );

export const CourierProblemSchema = z.object({
  text: z.string().trim().min(5).max(500),
});

export const DeliverOrderSchema = z.object({
  gpsLatitude: z.number().min(-90).max(90),
  gpsLongitude: z.number().min(-180).max(180),
  gpsAccuracy: z.number().min(0).optional(),
  photoBase64: z.string().min(1000).optional(),
});

const WorkingHoursDaySchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean(),
});

export const RestaurantSettingsPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s\-]/g, ''))
      .pipe(z.string().regex(/^\+998\d{9}$/).or(z.literal('')))
      .optional(),
    addressText: z.string().trim().min(5).max(240).optional(),
    longitude: z.number().min(55).max(75).optional(),
    latitude: z.number().min(37).max(46).optional(),
    workingHours: z
      .object({
        mon: WorkingHoursDaySchema,
        tue: WorkingHoursDaySchema,
        wed: WorkingHoursDaySchema,
        thu: WorkingHoursDaySchema,
        fri: WorkingHoursDaySchema,
        sat: WorkingHoursDaySchema,
        sun: WorkingHoursDaySchema,
      })
      .optional(),
    isOpen: z.boolean().optional(),
    autoSchedule: z.boolean().optional(),
    logoUrl: z.string().trim().url().nullable().optional().or(z.literal('').optional()),
    closeReason: z.enum(['lunch_break', 'maintenance', 'holiday', 'manual']).nullable().optional(),
    autoReopenAt: z.string().datetime().nullable().optional().or(z.literal('').optional()),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Kamida bitta restoran sozlamasi yuborilishi kerak',
  });

export const AdminCreateCourierSchema = z.object({
  telegramId: z.coerce.bigint(),
  fullName: z.string().trim().min(3).max(120),
  phoneNumber: z.string().trim().max(32).optional().or(z.literal('')),
  telegramUsername: z.string().trim().max(64).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const AdminUpdateCourierSchema = z
  .object({
    fullName: z.string().trim().min(3).max(120).optional(),
    phoneNumber: z.string().trim().max(32).optional().or(z.literal('')),
    telegramUsername: z.string().trim().max(64).optional().or(z.literal('')),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      typeof value.fullName === 'string' ||
      typeof value.phoneNumber === 'string' ||
      typeof value.telegramUsername === 'string' ||
      typeof value.isActive === 'boolean',
    {
      message: "Kamida bitta kuryer maydoni yuborilishi kerak",
    },
  );

export const UpdateCourierProfileSchema = z
  .object({
    fullName: z.string().trim().min(3).max(120).optional(),
    phoneNumber: z.string().trim().max(32).optional().or(z.literal('')),
    telegramUsername: z.string().trim().max(64).optional().or(z.literal('')),
  })
  .refine(
    (value) =>
      typeof value.fullName === 'string' ||
      typeof value.phoneNumber === 'string' ||
      typeof value.telegramUsername === 'string',
    {
      message: "Kamida bitta profil maydoni yuborilishi kerak",
    },
  );

// Support
export const SupportThreadQuerySchema = z.object({
  orderId: UuidSchema.optional(),
});

export const SupportMessageSchema = z.object({
  orderId: UuidSchema.optional(),
  text: z.string().trim().min(1).max(2000),
  topic: z.string().trim().max(120).optional(),
});

// Promos
export const PromoCodeSchema = z.object({
  code: z.string().min(3).transform(val => val.toUpperCase()),
  title: z.string().trim().max(255).optional().or(z.literal('')),
  discountType: z.nativeEnum(PromoDiscountTypeEnum),
  discountValue: z.number().positive(),
  minOrderValue: z.number().min(0).default(0),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  usageLimit: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isFirstOrderOnly: z.boolean().optional(),
  targetUserId: UuidSchema.nullable().optional(),
});

export const ValidatePromoSchema = z.object({
  code: z.string().min(1).transform(val => val.toUpperCase()),
  subtotal: z.number().min(0),
  userId: UuidSchema.optional(),
});

export const RejectPaymentSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});
