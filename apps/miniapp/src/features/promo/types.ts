export enum DiscountTypeEnum {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FIXED = 'FIXED_AMOUNT',
}

export enum PromoStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  SCHEDULED = 'SCHEDULED',
  LIMIT_REACHED = 'LIMIT_REACHED',
}

export interface AdminPromo {
  id: string;
  code: string;
  title?: string;
  description?: string;
  discountType: DiscountTypeEnum;
  discountValue: number;
  minOrderValue: number;
  startDate: string; // ISO String
  endDate?: string; // ISO String (optional)
  usageLimit?: number; // 0 or undefined means unlimited
  timesUsed: number;
  isActive: boolean;
  isFirstOrderOnly: boolean;
  targetUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromoValidationResult {
  isValid: boolean;
  message: string;
  discountAmount: number;
  promo?: Pick<AdminPromo, 'id' | 'code' | 'title' | 'discountType' | 'discountValue' | 'minOrderValue'>;
}

export interface PromoFormData {
  code: string;
  title: string;
  description: string;
  discountType: DiscountTypeEnum;
  discountValue: number;
  minOrderValue: number;
  startDate: string; // YYYY-MM-DD format for inputs
  endDate: string; // YYYY-MM-DD
  usageLimit: number; // 0 for unlimited
  isActive: boolean;
  isFirstOrderOnly: boolean;
  targetUserId: string; // empty string means null
}

export interface PromoFilterState {
  statusFilter: 'all' | 'active' | 'inactive' | 'expired';
  discountTypeFilter: 'all' | DiscountTypeEnum;
  searchQuery: string;
}
