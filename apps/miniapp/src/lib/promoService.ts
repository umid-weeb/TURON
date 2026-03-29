import { Promo, PromoValidationResult } from '../data/types';

export const MOCK_PROMOS: Promo[] = [
  { id: '1', code: 'SKIDKA25', discountType: 'PERCENT', value: 25 },
  { id: '2', code: 'SAVE10000', discountType: 'FIXED', value: 10000 },
  { id: '3', code: 'MIN50000', discountType: 'PERCENT', value: 10, minSubtotal: 50000 },
];

export const validatePromo = (code: string, subtotal: number): PromoValidationResult => {
  const promo = MOCK_PROMOS.find(p => p.code.toUpperCase() === code.toUpperCase());

  if (!promo) {
    return { isValid: false, message: 'Promo-kod noto\'g\'ri' };
  }

  if (promo.minSubtotal && subtotal < promo.minSubtotal) {
    return { 
      isValid: false, 
      message: `Minimal summa: ${promo.minSubtotal.toLocaleString()} so'm bo'lishi kerak` 
    };
  }

  // Check if fixed discount is more than subtotal
  if (promo.discountType === 'FIXED' && promo.value >= subtotal) {
    return { isValid: false, message: 'Chegirma buyurtma summasidan ko\'p' };
  }

  return { isValid: true, message: 'Muvaffaqiyatli qo\'llanildi!', promo };
};

export const calculateDiscount = (promo: Promo, subtotal: number): number => {
  if (promo.discountType === 'PERCENT') {
    return Math.floor((subtotal * promo.value) / 100);
  }
  return promo.value;
};
