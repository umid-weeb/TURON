import React from 'react';
import { CheckCircle2, ChevronRight, MapPinned, ShoppingBag } from 'lucide-react';
import { Order, OrderStatus, PaymentMethod, PaymentStatus } from '../../data/types';
import { getStatusStep } from '../../lib/orderStatusUtils';
import {
  getLocalizedOrderStatusLabel,
  getLocalizedTrackingSteps,
  useCustomerLanguage,
} from '../../features/i18n/customerLocale';

function getBadgeClass(status: OrderStatus) {
  if (status === OrderStatus.PREPARING) return 'bg-amber-100 text-amber-700';
  if (status === OrderStatus.READY_FOR_PICKUP) return 'bg-sky-100 text-sky-700';
  if (status === OrderStatus.DELIVERING) return 'bg-indigo-100 text-indigo-700';
  if (status === OrderStatus.DELIVERED) return 'bg-emerald-100 text-emerald-700';
  if (status === OrderStatus.CANCELLED) return 'bg-rose-100 text-rose-700';
  return 'bg-[#f4f4f5] text-[#202020]';
}

function getPaymentPill(method: PaymentMethod, status: PaymentStatus) {
  if (method === PaymentMethod.CASH) {
    return "Naqd";
  }

  const paymentMethodLabel = method === PaymentMethod.MANUAL_TRANSFER ? 'Karta' : 'Click / Payme';

  if (status === PaymentStatus.COMPLETED) {
    return `${paymentMethodLabel} - Tolangan`;
  }

  if (status === PaymentStatus.FAILED) {
    return `${paymentMethodLabel} - Rad etilgan`;
  }

  return `${paymentMethodLabel} - Tekshiruvda`;
}

export const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const { language } = useCustomerLanguage();

  return (
    <span
      className={`inline-flex items-center rounded-[8px] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${getBadgeClass(status)}`}
    >
      {getLocalizedOrderStatusLabel(status, language)}
    </span>
  );
};

export const OrderCard: React.FC<{ order: Order; onClick: () => void; onReorder?: () => void }> = ({ order, onClick, onReorder }) => {
  const { formatText, intlLocale } = useCustomerLanguage();
  const date = new Date(order.createdAt).toLocaleDateString(intlLocale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isCompleted = order.orderStatus === OrderStatus.DELIVERED;
  const isCancelled = order.orderStatus === OrderStatus.CANCELLED;
  
  const statusText = isCompleted ? 'Muvaffaqiyatli yakunlandi' : isCancelled ? 'Rad etildi' : 'Jarayonda';
  const statusColor = isCompleted ? 'text-emerald-600' : isCancelled ? 'text-rose-600' : 'text-amber-600';

  return (
    <div className="w-full rounded-[20px] bg-[#f4f4f5] p-4 text-left shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-[13px] font-semibold text-[#8c8c96]">{date}</p>
          <div className="mt-1 flex items-center gap-2">
            <h3 className="text-[16px] font-black text-[#202020]">#{order.orderNumber}</h3>
          </div>
        </div>
        <p className={`text-[13px] font-bold ${statusColor}`}>{statusText}</p>
      </div>

      {/* Items List */}
      <div className="mb-4">
        <p className="text-[14px] font-semibold text-[#202020] leading-snug">
          {order.items.map(item => formatText(item.name)).join(', ')}
        </p>
      </div>

      {/* Footer and Reorder */}
      <div className="flex items-center justify-between border-t border-slate-200/60 pt-4">
        <div>
          <p className="text-[12px] font-semibold text-[#8c8c96]">Umumiy summa</p>
          <p className="text-[16px] font-black text-[#202020]">{order.total.toLocaleString()} so'm</p>
        </div>
        
        {isCompleted || isCancelled ? (
          <button
            onClick={(e) => { e.stopPropagation(); onReorder?.(); }}
            className="rounded-full bg-[#C2FF00] px-4 py-2.5 text-[14px] font-black text-[#111] shadow-sm transition-transform active:scale-95"
          >
            Qayta buyurtma
          </button>
        ) : (
          <button
            onClick={onClick}
            className="rounded-full bg-[#C2FF00] px-4 py-2.5 text-[14px] font-black text-[#111] shadow-sm transition-transform active:scale-95"
          >
            Kuzatish
          </button>
        )}
      </div>
    </div>
  );
};

export const OrderTimeline: React.FC<{ status: OrderStatus; onCallCourier?: () => void }> = ({ status, onCallCourier }) => {
  const { language } = useCustomerLanguage();
  const currentStep = getStatusStep(status);
  const steps = getLocalizedTrackingSteps(language);

  if (status === OrderStatus.CANCELLED) {
    return (
      <section
        className="rounded-[20px] p-5"
        style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)' }}
      >
        <p className="text-[12px] font-black uppercase tracking-[0.1em] text-rose-500">Holat</p>
        <p className="mt-2 text-lg font-black text-rose-600">
          {getLocalizedOrderStatusLabel(status, language)}
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-rose-500/80">
          Buyurtma bekor qilingan. Zarurat bo'lsa support orqali operator bilan bog'laning.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-[20px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.07)]"
      style={{ background: 'var(--tg-theme-secondary-bg-color, #f2f2f7)' }}
    >
      <p
        className="text-[12px] font-black uppercase tracking-[0.1em]"
        style={{ color: 'var(--tg-theme-hint-color, #8e8e93)' }}
      >
        Jarayon
      </p>
      <div className="relative mt-5 space-y-5">
        <div
          className="absolute bottom-5 left-[13px] top-3 w-[2px] rounded-full"
          style={{ background: 'rgba(0,0,0,0.08)' }}
        />
        {steps.map((step) => {
          const stepIndex = getStatusStep(step.id);
          const isCompleted = currentStep > stepIndex;
          const isActive = currentStep === stepIndex;

          return (
            <div key={step.id} className="relative flex items-start gap-4">
              <div
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                  isActive ? 'scale-110 shadow-md' : ''
                }`}
                style={
                  isCompleted
                    ? { background: '#C62020', color: '#fff' }
                    : isActive
                    ? { background: '#C2FF00', color: '#111' }
                    : { background: 'rgba(0,0,0,0.06)', color: 'var(--tg-theme-hint-color, #8e8e93)', border: '2px solid rgba(0,0,0,0.06)' }
                }
              >
                {isCompleted
                  ? <CheckCircle2 size={16} />
                  : <span className="text-[12px] font-black">{stepIndex + 1}</span>}
              </div>
              <div className="min-w-0 pb-2 pt-0.5">
                <p
                  className="text-[15px] font-black"
                  style={{
                    color: isActive || isCompleted
                      ? 'var(--tg-theme-text-color)'
                      : 'var(--tg-theme-hint-color, #8e8e93)',
                  }}
                >
                  {step.label}
                </p>
                <p
                  className="mt-1 text-[13px] leading-snug"
                  style={{
                    color: isActive
                      ? 'var(--tg-theme-text-color)'
                      : 'var(--tg-theme-hint-color, #8e8e93)',
                    opacity: isActive ? 0.75 : 1,
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {currentStep >= 2 && currentStep < 4 ? (
        <button
          onClick={onCallCourier}
          type="button"
          className="mt-6 w-full rounded-[14px] p-3 text-center text-[15px] font-bold text-[#C62020] transition-opacity active:opacity-70"
          style={{ background: 'rgba(198,32,32,0.07)' }}
        >
          Kuryerga qo'ng'iroq qilish
        </button>
      ) : null}
    </section>
  );
};

export const TrackingMapPlaceholder: React.FC = () => (
  <section className="overflow-hidden rounded-[12px] border border-white/8 bg-[#111827] p-4 shadow-[0_12px_24px_rgba(2,6,23,0.2)]">
    <div className="rounded-[12px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_30%),linear-gradient(180deg,#0b1120_0%,#111827_100%)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Jonli kuzatuv</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-white">Kuryer yo'lga chiqishi bilan xarita jonlanadi</h3>
          <p className="mt-2 max-w-[260px] text-sm leading-6 text-white/58">
            Restoran, kuryer va manzil orasidagi harakat shu blokda ko'rinadi.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.06] text-sky-200">
          <MapPinned size={20} />
        </div>
      </div>

      <div className="mt-4 rounded-[12px] border border-white/8 bg-slate-950/60 p-4">
        <div className="relative h-28 rounded-[10px] bg-[linear-gradient(180deg,#1f2937_0%,#0f172a_100%)]">
          <div className="absolute left-5 top-6 h-3 w-3 rounded-full bg-emerald-400" />
          <div className="absolute right-6 bottom-6 h-3 w-3 rounded-full bg-rose-400" />
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#0f172a] bg-amber-300" />
          <div className="absolute left-8 right-8 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#34d399_0%,#f59e0b_54%,#f87171_100%)] opacity-75" />
        </div>
      </div>
    </div>
  </section>
);

export const OrdersEmptyState: React.FC<{ onShop: () => void }> = ({ onShop }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-[#f4f4f5] text-[#8c8c96] shadow-sm">
      <ShoppingBag size={38} />
    </div>
    <h3 className="mt-6 text-[1.5rem] font-black tracking-tight text-[#202020]">Buyurtmalar hali yo'q</h3>
    <p className="mt-3 max-w-[260px] text-sm leading-6 text-[#8c8c96]">
      Turon Kafesi menyusidan taom tanlang, keyingi buyurtmalaringiz shu yerda jamlanadi.
    </p>
    <button
      type="button"
      onClick={onShop}
      className="mt-8 rounded-full bg-[#C62020] px-8 py-3.5 text-sm font-black text-white shadow-md transition-transform active:scale-[0.985]"
    >
      Menyuga qaytish
    </button>
  </div>
);
