import React from 'react';
import { CreditCard, Route, ShoppingBag, Tag, Truck, Loader2 } from 'lucide-react';
import { PaymentMethod, type OrderQuote } from '../../data/types';
import { useCartStore } from '../../store/useCartStore';
import { useCheckoutStore } from '../../store/useCheckoutStore';
import type { RouteInfo } from '../../features/maps/MapProvider';

const OrderSummaryCard: React.FC<{
  routeInfo?: RouteInfo | null;
  quote?: OrderQuote | null;
  isQuoteLoading?: boolean;
  compact?: boolean;
}> = ({ routeInfo, quote, isQuoteLoading = false, compact = false }) => {
  const { getSubtotal, getDiscount, appliedPromo, items } = useCartStore();
  const { paymentMethod } = useCheckoutStore();

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const merchandiseTotal = Math.max(0, subtotal - discount);
  const total = quote?.total ?? merchandiseTotal;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const resolvedRouteInfo =
    quote &&
      typeof quote.deliveryDistanceMeters === 'number' &&
      typeof quote.deliveryEtaMinutes === 'number'
      ? {
        distance:
          quote.deliveryDistanceMeters < 1000
            ? `${Math.round(quote.deliveryDistanceMeters)} m`
            : `${(quote.deliveryDistanceMeters / 1000).toFixed(1)} km`,
        eta: `${quote.deliveryEtaMinutes} daq`,
        distanceMeters: quote.deliveryDistanceMeters,
        etaSeconds: quote.deliveryEtaMinutes * 60,
      }
      : routeInfo;

  const deliveryFeeLabel =
    typeof quote?.deliveryFee === 'number'
      ? quote.deliveryFee === 0
        ? 'Bepul!'
        : `${quote.deliveryFee.toLocaleString()} so'm`
      : isQuoteLoading
        ? 'Hisoblanmoqda...'
        : 'Manzil tanlangach';

  const deliveryFeeColor =
    typeof quote?.deliveryFee === 'number' && quote.deliveryFee === 0
      ? 'text-emerald-400 font-black'
      : isQuoteLoading
        ? 'text-amber-400'
        : 'text-white';

  const paymentLabel =
    paymentMethod === PaymentMethod.CASH
      ? 'Naqd pul'
      : paymentMethod === PaymentMethod.EXTERNAL_PAYMENT
        ? 'Click / Payme'
        : "Qo'lda o'tkazma";

  return (
    <section className="rounded-[16px] border border-slate-200 bg-slate-50">
      {!compact ? (
        <div className="flex items-center gap-3 border-b border-slate-200 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600">
            <ShoppingBag size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Hisob-kitob</p>
            <h3 className="mt-1 text-[15px] font-black tracking-tight text-slate-950">Buyurtma xulosasi</h3>
          </div>
        </div>
      ) : null}

      <div className={`${compact ? 'space-y-2 ' : 'mt-2 space-y-3 '}border-b border-slate-200 p-2.5`}>
        <div className="flex items-center justify-between text-[13px] font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <ShoppingBag size={14} className="text-slate-400" />
            <span>Taomlar ({itemCount} ta)</span>
          </div>
          <span className="font-black text-slate-950">{subtotal.toLocaleString()} so'm</span>
        </div>

        <div className="flex items-center justify-between text-[13px] font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <Truck size={14} className="text-slate-400" />
            <span>Yetkazish</span>
          </div>
          <div className="flex items-center gap-2">
            {isQuoteLoading && <Loader2 size={14} className="animate-spin text-amber-500" />}
            <span className={`font-black ${typeof quote?.deliveryFee === 'number' && quote.deliveryFee === 0
                ? 'text-emerald-600'
                : isQuoteLoading
                  ? 'text-amber-600'
                  : 'text-slate-950'
              }`}>
              {deliveryFeeLabel}
            </span>
          </div>
        </div>

        {discount > 0 ? (
          <div className="flex items-center justify-between text-[13px] font-semibold text-emerald-700">
            <div className="flex items-center gap-2">
              <Tag size={14} />
              <span>{appliedPromo ? `Promokod` : 'Chegirma'}</span>
            </div>
            <span className="font-black">-{discount.toLocaleString()} so'm</span>
          </div>
        ) : null}
      </div>

      {resolvedRouteInfo ? (
        <div className="grid grid-cols-2 gap-2 border-b border-slate-200 p-2.5">
          <div className="rounded-[12px] border border-slate-200 bg-white p-2.5">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              <Route size={12} />
              <span>Masofa</span>
            </div>
            <p className="mt-1 text-sm font-black text-slate-950">{resolvedRouteInfo.distance}</p>
          </div>
          <div className="rounded-[12px] border border-slate-200 bg-white p-2.5">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              <Truck size={12} />
              <span>ETA</span>
            </div>
            <p className="mt-1 text-sm font-black text-slate-950">{resolvedRouteInfo.eta}</p>
          </div>
        </div>
      ) : null}

      <div className={`flex items-center justify-between p-3 ${compact ? 'py-2.5' : 'py-3'}`}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {quote ? 'Jami summa' : 'Taomlar jami'}
          </p>
          <p className={`mt-1 font-black tracking-tight text-[#C62020] ${compact ? 'text-[22px]' : 'text-[28px]'}`}>{total.toLocaleString()} so'm</p>
        </div>
        {!compact ? (
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
              <CreditCard size={13} />
              <span>{paymentLabel}</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default OrderSummaryCard;
