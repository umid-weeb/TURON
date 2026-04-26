import React from 'react';
import { ChevronRight, Loader2, MapPin, Phone, Truck } from 'lucide-react';
import { Order } from '../../../data/types';
import { getStaleAgeLabel } from '../../../lib/orderStaleUtils';
import {
  formatCurrency,
  formatOrderTime,
  getDispatchLabel,
  getOrderAddressSummary,
  getOrderCustomerTitle,
  getOrderItemSummary,
  getOrderStatusMeta,
  getPaymentMeta,
} from './adminOrders.utils';

interface AdminOrderCardProps {
  order: Order;
  index: number;
  isMutating: boolean;
  primaryActionLabel: string;
  needsCourier: boolean;
  isStale?: boolean;
  onOpen: () => void;
  onPrimaryAction: () => void;
  onAssignCourier?: () => void;
}

export function AdminOrderCard({
  order,
  index,
  isMutating,
  primaryActionLabel,
  needsCourier,
  isStale,
  onOpen,
  onPrimaryAction,
  onAssignCourier,
}: AdminOrderCardProps) {
  const statusMeta = getOrderStatusMeta(order.orderStatus);
  const paymentMeta = getPaymentMeta(order.paymentStatus);
  const dispatchLabel = getDispatchLabel(order);
  const avatarLabel = getOrderCustomerTitle(order).slice(0, 1).toUpperCase();

  return (
    <article
      className="adminx-order-card"
      data-status={order.orderStatus}
      data-stale={isStale ? 'true' : undefined}
      style={{ ['--i' as string]: index } as React.CSSProperties}
    >
      <div className="adminx-order-top">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-start gap-3">
            <div className="adminx-order-avatar">{avatarLabel}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-black tracking-[-0.03em] text-[var(--adminx-color-ink)]">
                  #{order.orderNumber}
                </p>
                {isStale ? (
                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[rgba(28,18,7,0.1)] bg-[rgba(28,18,7,0.05)] px-3 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--adminx-color-muted)]">
                    Eskirgan · {getStaleAgeLabel(order)}
                  </span>
                ) : (
                  <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.14em] ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                )}
              </div>
              <p className="mt-3 truncate text-[15px] font-black text-[var(--adminx-color-ink)]">
                {getOrderCustomerTitle(order)}
              </p>
              <div className="mt-2 flex items-start gap-2 text-sm font-semibold text-[var(--adminx-color-muted)]">
                <MapPin size={15} className="mt-0.5 shrink-0" />
                <span className="line-clamp-2">{getOrderAddressSummary(order)}</span>
              </div>
            </div>
          </div>
        </button>

        <div className="shrink-0 text-right">
          <p className="text-base font-black text-[var(--adminx-color-ink)]">{formatCurrency(order.total)}</p>
          <p className="mt-2 text-xs font-semibold text-[var(--adminx-color-faint)]">{formatOrderTime(order.createdAt)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.14em] ${paymentMeta.className}`}>
          {paymentMeta.label}
        </span>
        {dispatchLabel ? (
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[rgba(28,18,7,0.08)] bg-white px-3 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--adminx-color-muted)]">
            <Truck size={13} />
            <span className="max-w-[138px] truncate">{dispatchLabel}</span>
          </span>
        ) : null}
        {order.customerPhone ? (
          <a
            href={`tel:${order.customerPhone}`}
            className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[rgba(28,18,7,0.08)] bg-white px-3 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--adminx-color-muted)]"
          >
            <Phone size={13} />
            Qo'ng'iroq
          </a>
        ) : null}
      </div>

      <div className="mt-4 rounded-[18px] border border-[rgba(28,18,7,0.06)] bg-[rgba(255,255,255,0.78)] px-4 py-3">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--adminx-color-muted)]">
          <span>{getOrderItemSummary(order)}</span>
          <span>{order.items.length} ta</span>
        </div>
      </div>

      {!isStale ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {needsCourier && onAssignCourier ? (
            <button
              type="button"
              onClick={onAssignCourier}
              disabled={isMutating}
              className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-[rgba(28,18,7,0.08)] bg-white px-4 text-sm font-black text-[var(--adminx-color-ink)] disabled:opacity-60"
            >
              Biriktirish
            </button>
          ) : null}
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={isMutating}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--adminx-color-primary)_0%,var(--adminx-color-primary-dark)_100%)] px-5 text-sm font-black text-[var(--adminx-color-dark)] shadow-[var(--adminx-shadow-glow)] disabled:opacity-60"
          >
            {isMutating ? <Loader2 size={16} className="animate-spin" /> : primaryActionLabel}
            {!isMutating ? <ChevronRight size={16} /> : null}
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] border border-[rgba(28,18,7,0.08)] bg-white px-4 text-sm font-black text-[var(--adminx-color-muted)]"
          >
            Ko'rish
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </article>
  );
}

