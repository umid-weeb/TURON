import React from 'react';
import { ProductAvailabilityEnum } from '@turon/shared';

const labels: Record<ProductAvailabilityEnum, string> = {
  [ProductAvailabilityEnum.AVAILABLE]: 'Mavjud',
  [ProductAvailabilityEnum.TEMPORARILY_UNAVAILABLE]: 'Vaqtincha yo\'q',
  [ProductAvailabilityEnum.OUT_OF_STOCK]: 'Tugagan',
};

const colors: Record<ProductAvailabilityEnum, string> = {
  [ProductAvailabilityEnum.AVAILABLE]: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  [ProductAvailabilityEnum.TEMPORARILY_UNAVAILABLE]: 'border-amber-200 bg-amber-50 text-amber-700',
  [ProductAvailabilityEnum.OUT_OF_STOCK]: 'border-rose-200 bg-rose-50 text-rose-700',
};

const dots: Record<ProductAvailabilityEnum, string> = {
  [ProductAvailabilityEnum.AVAILABLE]: 'bg-emerald-500',
  [ProductAvailabilityEnum.TEMPORARILY_UNAVAILABLE]: 'bg-amber-500',
  [ProductAvailabilityEnum.OUT_OF_STOCK]: 'bg-rose-500',
};

const AvailabilityBadge: React.FC<{ availability: ProductAvailabilityEnum }> = ({ availability }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${colors[availability]}`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${dots[availability]}`} />
    {labels[availability]}
  </span>
);

export default AvailabilityBadge;
