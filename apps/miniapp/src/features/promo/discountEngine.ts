import { AdminPromo, DiscountTypeEnum, PromoStatusEnum, PromoValidationResult } from './types';

export function getPromoStatus(promo: AdminPromo): PromoStatusEnum {
  const now = new Date();
  
  if (!promo.isActive) return PromoStatusEnum.INACTIVE;
  
  if (promo.usageLimit && promo.timesUsed >= promo.usageLimit) {
    return PromoStatusEnum.LIMIT_REACHED;
  }
  
  const start = new Date(promo.startDate);
  if (now < start) {
    return PromoStatusEnum.SCHEDULED;
  }
  
  if (promo.endDate) {
    const end = new Date(promo.endDate);
    if (now > end) {
      return PromoStatusEnum.EXPIRED;
    }
  }
  
  return PromoStatusEnum.ACTIVE;
}

export function validatePromo(promo: AdminPromo | undefined, subtotal: number): PromoValidationResult {
  if (!promo) {
    return {
      isValid: false,
      message: 'Ushbu promokod mavjud emas',
      discountAmount: 0,
    };
  }

  const status = getPromoStatus(promo);

  if (status === PromoStatusEnum.INACTIVE) {
    return { isValid: false, message: 'Ushbu promokod faol emas', discountAmount: 0, promo };
  }

  if (status === PromoStatusEnum.EXPIRED) {
    return { isValid: false, message: 'Promokodning muddati tugagan', discountAmount: 0, promo };
  }

  if (status === PromoStatusEnum.SCHEDULED) {
    return { isValid: false, message: 'Ushbu promokod hali ishga tushmagan', discountAmount: 0, promo };
  }

  if (status === PromoStatusEnum.LIMIT_REACHED) {
    return { isValid: false, message: 'Promokoddan foydalanish limiti tugagan', discountAmount: 0, promo };
  }

  if (subtotal < promo.minOrderValue) {
    return {
      isValid: false,
      message: `Promokod ishlashi uchun minimal buyurtma summasi ${promo.minOrderValue.toLocaleString()} so'm bo'lishi kerak`,
      discountAmount: 0,
      promo,
    };
  }

  // Calculate discount safely
  let discountAmount = 0;
  if (promo.discountType === DiscountTypeEnum.FIXED) {
    discountAmount = promo.discountValue;
  } else if (promo.discountType === DiscountTypeEnum.PERCENTAGE) {
    const percentage = Math.min(100, Math.max(0, promo.discountValue));
    discountAmount = Math.floor(subtotal * (percentage / 100));
  }

  // Never let discount exceed subtotal
  discountAmount = Math.min(subtotal, discountAmount);

  return {
    isValid: true,
    message: "Promokod muvaffaqiyatli qo'llanildi!",
    discountAmount,
    promo,
  };
}
