import React from 'react';
import { AlertCircle, ArrowUpRight, Clock3, TrendingUp } from 'lucide-react';
import { formatFullMoney } from './dashboardUtils';

interface Props {
  currentTime: string;
  pendingCount: number;
  pendingValue: number;
  todayRevenue: number;
  activeCouriers: number;
  activeOrdersCount: number;
  deliveredTodayCount: number;
  onOpenOrders: () => void;
  onOpenReports: () => void;
}

export function AdminDashboardHero({
  currentTime,
  pendingCount,
  pendingValue,
  todayRevenue,
  activeCouriers,
  activeOrdersCount,
  deliveredTodayCount,
  onOpenOrders,
  onOpenReports,
}: Props) {
  return (
    <section className="adminx-zone-hero adminx-panel adminx-home-hero p-4 md:p-5">
      <div className="adminx-home-hero-top flex items-center justify-between gap-3">
        <div>
          <p className="adminx-kicker text-[rgba(255,250,240,0.58)]">Admin nazorat</p>
          <h2 className="mt-1 text-[28px] font-black leading-none tracking-[-0.05em] text-white">
            Bugungi holat
          </h2>
        </div>
        <div className="adminx-chip border-white/10 bg-white/8 text-white/82">
          <Clock3 size={14} />
          {currentTime}
        </div>
      </div>

      <div className="adminx-home-hero-grid mt-4">
        <button type="button" onClick={onOpenOrders} className="adminx-home-pending-card text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="adminx-chip" data-tone="danger">
              <AlertCircle size={14} />
              Kutmoqda
            </span>
            <ArrowUpRight size={18} className="text-[var(--adminx-color-danger)]" />
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <div className="adminx-home-pending-count">
                {pendingCount > 99 ? '99+' : pendingCount}
              </div>
              <p className="mt-2 text-[19px] font-black leading-tight tracking-[-0.05em] text-[var(--adminx-color-ink)]">
                Tasdiq kerak
              </p>
            </div>
            <div
              className="rounded-[18px] px-3 py-2 text-right text-[var(--adminx-color-danger)]"
              style={{ background: 'rgba(214, 69, 69, 0.1)' }}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.16em]">Qiymat</p>
              <p className="mt-1 text-sm font-extrabold">{formatFullMoney(pendingValue)}</p>
            </div>
          </div>
        </button>

        <div className="adminx-home-kpi-stack">
          <button type="button" onClick={onOpenReports} className="adminx-home-kpi-card text-left text-[var(--adminx-color-dark)]" data-tone="revenue">
            <div className="flex items-center justify-between gap-3">
              <span className="adminx-chip border-black/6 bg-black/6 text-[var(--adminx-color-dark)]">
                <TrendingUp size={14} />
                Tushum
              </span>
              <ArrowUpRight size={16} className="text-[rgba(28,18,7,0.46)]" />
            </div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-[rgba(28,18,7,0.58)]">
              Bugungi daromad
            </p>
            <div className="mt-2 text-[28px] font-black leading-none tracking-[-0.06em] text-[var(--adminx-color-dark)]">
              {todayRevenue.toLocaleString('uz-UZ')}
            </div>
            <p className="mt-2 text-[12px] font-bold text-[rgba(28,18,7,0.7)]">So'm</p>
          </button>

          <button type="button" onClick={onOpenOrders} className="adminx-home-kpi-card text-left" data-tone="ops">
            <div className="flex items-center justify-between gap-3">
              <span className="adminx-chip border-black/5 bg-white/80 text-[var(--adminx-color-ink)]">
                <Clock3 size={14} />
                Operatsiya
              </span>
              <ArrowUpRight size={16} className="text-[var(--adminx-color-faint)]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="adminx-home-mini-metric">
                <span>Faol</span>
                <strong>{activeOrdersCount}</strong>
              </div>
              <div className="adminx-home-mini-metric">
                <span>Kuryer</span>
                <strong>{activeCouriers}</strong>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--adminx-color-muted)]">
              <span>Yetkazildi</span>
              <span>{deliveredTodayCount}</span>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
