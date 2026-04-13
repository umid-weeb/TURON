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
  if (status === OrderStatus.PREPARING) return 'border-amber-300/18 bg-amber-400/12 text-amber-100';
  if (status === OrderStatus.READY_FOR_PICKUP) return 'border-sky-300/18 bg-sky-400/12 text-sky-100';
  if (status === OrderStatus.DELIVERING) return 'border-indigo-300/18 bg-indigo-400/12 text-indigo-100';
  if (status === OrderStatus.DELIVERED) return 'border-emerald-300/18 bg-emerald-400/12 text-emerald-100';
  if (status === OrderStatus.CANCELLED) return 'border-rose-300/18 bg-rose-400/12 text-rose-100';
  return 'border-white/8 bg-white/[0.06] text-white/72';
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
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getBadgeClass(status)}`}
    >
      {getLocalizedOrderStatusLabel(status, language)}
    </span>
  );
};

export const OrderCard: React.FC<{ order: Order; onClick: () => void }> = ({ order, onClick }) => {
  const { formatText, intlLocale } = useCustomerLanguage();
  const date = new Date(order.createdAt).toLocaleDateString(intlLocale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[12px] border border-white/8 bg-[#111827] p-4 text-left shadow-[0_12px_24px_rgba(2,6,23,0.22)] transition-transform active:scale-[0.985]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Buyurtma</p>
          <h3 className="mt-1.5 text-lg font-black tracking-tight text-white">#{order.orderNumber}</h3>
          <p className="mt-1.5 text-[11px] font-semibold text-white/44">{date}</p>
        </div>
        <OrderStatusBadge status={order.orderStatus} />
      </div>

      <div className="mt-4 space-y-2">
        {order.items.slice(0, 2).map((item, index) => (
          <div key={`${item.id}-${index}`} className="flex items-center gap-2 text-sm text-white/72">
            <span className="h-1.5 w-1.5 rounded-full bg-white/24" />
            <span className="text-[11px] font-black text-white/42">{item.quantity}x</span>
            <span className="truncate font-semibold">{formatText(item.name)}</span>
          </div>
        ))}
        {order.items.length > 2 ? (
          <p className="pl-3.5 text-[11px] font-semibold text-white/42">
            +{order.items.length - 2} ta mahsulot
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/8 bg-white/[0.06] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/58">
            {getPaymentPill(order.paymentMethod, order.paymentStatus)}
          </span>
          <span className="text-sm font-black text-white">{order.total.toLocaleString()} so'm</span>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/8 bg-white/[0.05] text-white/54">
          <ChevronRight size={18} />
        </div>
      </div>
    </button>
  );
};

export const OrderTimeline: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const { language } = useCustomerLanguage();
  const currentStep = getStatusStep(status);
  const steps = getLocalizedTrackingSteps(language);

  if (status === OrderStatus.CANCELLED) {
    return (
      <section className="rounded-[12px] border border-rose-300/18 bg-rose-400/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-100/74">Holat</p>
        <p className="mt-2 text-base font-black text-rose-100">
          {getLocalizedOrderStatusLabel(status, language)}
        </p>
        <p className="mt-2 text-sm leading-6 text-rose-100/76">
          Buyurtma bekor qilingan. Zarurat bo'lsa support orqali operator bilan bog'laning.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[12px] border border-white/8 bg-[#111827] p-4 shadow-[0_12px_24px_rgba(2,6,23,0.18)]">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Bosqichlar</p>
      <div className="relative mt-4 space-y-4">
        <div className="absolute left-[13px] top-3 bottom-3 w-px bg-white/10" />
        {steps.map((step) => {
          const stepIndex = getStatusStep(step.id);
          const isCompleted = currentStep > stepIndex;
          const isActive = currentStep === stepIndex;

          return (
            <div key={step.id} className="relative flex items-start gap-3">
              <div
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                  isCompleted
                    ? 'border-emerald-300/18 bg-emerald-400/14 text-emerald-100'
                    : isActive
                      ? 'border-amber-300/18 bg-amber-400/14 text-amber-100'
                      : 'border-white/10 bg-[#0b1120] text-white/34'
                }`}
              >
                {isCompleted ? <CheckCircle2 size={14} /> : <span className="text-[11px] font-black">{stepIndex + 1}</span>}
              </div>
              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-sm font-black ${
                    isActive ? 'text-white' : isCompleted ? 'text-white/68' : 'text-white/42'
                  }`}
                >
                  {step.label}
                </p>
                <p className={`mt-1 text-[12px] leading-5 ${isActive ? 'text-white/66' : 'text-white/34'}`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
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
    <div className="flex h-20 w-20 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.05] text-white/58">
      <ShoppingBag size={38} />
    </div>
    <h3 className="mt-6 text-[1.8rem] font-black tracking-tight text-white">Buyurtmalar hali yo'q</h3>
    <p className="mt-3 max-w-[260px] text-sm leading-6 text-white/54">
      Turon Kafesi menyusidan taom tanlang, keyingi buyurtmalaringiz shu yerda jamlanadi.
    </p>
    <button
      type="button"
      onClick={onShop}
      className="mt-8 rounded-[12px] bg-white px-5 py-3 text-sm font-black text-slate-950 transition-transform active:scale-[0.985]"
    >
      Menyuga qaytish
    </button>
  </div>
);
