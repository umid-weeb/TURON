import React from 'react';
import { ArrowRight, Truck } from 'lucide-react';
import { formatCurrency } from './adminOrders.utils';

interface AdminOrdersHeroProps {
  pendingCount: number;
  pendingValue: number;
  readyCount: number;
  deliveringCount: number;
  courierNeededCount: number;
  onOpenPending: () => void;
  onOpenUrgentOrder?: () => void;
}

export function AdminOrdersHero({
  pendingCount,
  pendingValue,
  readyCount,
  deliveringCount,
  courierNeededCount,
  onOpenPending,
  onOpenUrgentOrder,
}: AdminOrdersHeroProps) {
  return (
    <section className="adminx-zone-hero adminx-hero-grid">
      <article className="adminx-panel min-h-[220px] p-6">
        <div className="relative z-[1] flex h-full flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="adminx-kicker text-white/68">Navbatda</p>
              <p className="mt-3 text-[52px] font-black leading-none tracking-[-0.06em] text-white">
                {pendingCount}
              </p>
            </div>
            <span
              className={`inline-flex min-h-9 items-center justify-center rounded-full px-4 text-[11px] font-black uppercase tracking-[0.16em] ${
                pendingCount > 0
                  ? 'bg-[rgba(255,244,242,0.14)] text-[#ffd2ca]'
                  : 'bg-[rgba(255,255,255,0.08)] text-white/72'
              }`}
            >
              {pendingCount > 0 ? 'Kutmoqda' : 'Toza'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/58">Summasi</p>
              <p className="mt-2 text-lg font-black text-white">{formatCurrency(pendingValue)}</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/58">Kuryer</p>
              <p className="mt-2 text-lg font-black text-white">{courierNeededCount}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenPending}
              className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--adminx-color-primary)] px-5 text-sm font-black text-[var(--adminx-color-dark)] shadow-[var(--adminx-shadow-glow)]"
            >
              Yangi buyurtmalar
            </button>
            <button
              type="button"
              onClick={onOpenUrgentOrder ?? onOpenPending}
              className="inline-flex min-h-12 items-center gap-2 rounded-[16px] border border-white/12 bg-white/8 px-4 text-sm font-black text-white"
            >
              Birinchisi
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </article>

      <div className="grid gap-3">
        <article className="adminx-revenue-card p-5">
          <p className="adminx-kicker text-[var(--adminx-color-dark-soft)]">Tayyor</p>
          <p className="mt-3 text-[34px] font-black leading-none tracking-[-0.05em] text-[var(--adminx-color-dark)]">
            {readyCount}
          </p>
        </article>

        <article className="adminx-surface flex items-center justify-between gap-4 rounded-[24px] px-5 py-5">
          <div>
            <p className="adminx-kicker text-[var(--adminx-color-faint)]">Yo'lda</p>
            <p className="mt-2 text-[26px] font-black leading-none tracking-[-0.04em] text-[var(--adminx-color-ink)]">
              {deliveringCount}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[rgba(245,166,35,0.14)] text-[var(--adminx-color-primary-dark)]">
            <Truck size={24} />
          </div>
        </article>
      </div>
    </section>
  );
}
