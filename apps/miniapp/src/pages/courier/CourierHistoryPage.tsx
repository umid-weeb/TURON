import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { CourierHistoryCardSkeleton, StatStripSkeleton } from '../../components/ui/Skeleton';
import { useCourierHistory } from '../../hooks/queries/useCouriers';

type HistoryFilter = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED';

function formatMoney(value: number) {
  return `${value.toLocaleString('uz-UZ')} so'm`;
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'DELIVERED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200">
        <CheckCircle2 size={11} />
        Topshirildi
      </span>
    );
  }

  if (status === 'CANCELLED' || status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-600 dark:bg-red-500/12 dark:text-red-200">
        <XCircle size={11} />
        Bekor
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--courier-accent-soft)] px-2.5 py-1 text-[11px] font-black text-[#7d5e00] dark:text-[var(--courier-accent)]">
      <Clock3 size={11} />
      Faol
    </span>
  );
}

const CourierHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: history = [], isLoading, error, refetch, isFetching } = useCourierHistory();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<HistoryFilter>('ALL');

  const filteredHistory = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return history.filter((entry) => {
      const matchesSearch =
        !q ||
        entry.orderNumber.toLowerCase().includes(q) ||
        entry.customerName.toLowerCase().includes(q) ||
        entry.destinationAddress.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (activeFilter === 'ACTIVE') return ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(entry.assignmentStatus);
      if (activeFilter === 'DELIVERED') return entry.assignmentStatus === 'DELIVERED';
      if (activeFilter === 'CANCELLED') return ['CANCELLED', 'REJECTED'].includes(entry.assignmentStatus);
      return true;
    });
  }, [activeFilter, history, searchQuery]);

  const deliveredCount = history.filter((e) => e.assignmentStatus === 'DELIVERED').length;
  const cancelledCount = history.filter((e) => ['CANCELLED', 'REJECTED'].includes(e.assignmentStatus)).length;

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-44 animate-pulse rounded-[10px] bg-black/10 dark:bg-white/10" />
          <div className="h-10 w-10 animate-pulse rounded-[18px] bg-black/10 dark:bg-white/10" />
        </div>
        <StatStripSkeleton count={3} />
        <div className="h-12 animate-pulse rounded-[18px] bg-black/10 dark:bg-white/10" />
        {[0, 1, 2].map((i) => <CourierHistoryCardSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-10">
        <div className="courier-card-strong rounded-[30px] p-8 text-center">
          <AlertCircle size={28} className="mx-auto text-red-400" />
          <p className="mt-4 text-[15px] font-black text-[var(--courier-text)]">Tarix yuklanmadi</p>
          <p className="mt-2 text-[13px] text-[var(--courier-muted)]">{(error as Error).message}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="courier-cta-primary mt-5 mx-auto flex h-12 items-center gap-2 rounded-[18px] px-5 text-[13px] font-black active:scale-95"
          >
            <RefreshCw size={15} />
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="courier-enter-up space-y-4 px-4 py-5 pb-32">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="courier-label">Arxiv</p>
          <p className="mt-1 text-[24px] font-black tracking-tight text-[var(--courier-text)]">Buyurtmalar tarixi</p>
        </div>
        <button type="button" onClick={() => void refetch()} className="courier-topbar-button flex h-11 w-11 items-center justify-center rounded-[18px]">
          <RefreshCw size={17} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Jami', value: history.length, color: 'text-[var(--courier-text)]' },
          { label: 'Topshirildi', value: deliveredCount, color: 'text-emerald-600 dark:text-emerald-300' },
          { label: 'Bekor', value: cancelledCount, color: 'text-red-500 dark:text-red-300' },
        ].map((s) => (
          <div key={s.label} className="courier-card-strong rounded-[22px] py-3 text-center courier-hoverable">
            <p className={`text-[24px] font-black leading-none ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-[11px] font-bold text-[var(--courier-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="courier-card-strong relative rounded-[22px] px-4 py-3">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--courier-muted)]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Raqam, mijoz yoki manzil..."
          className="h-12 w-full rounded-[18px] border border-[var(--courier-line)] bg-black/4 pl-11 pr-4 text-[14px] text-[var(--courier-text)] outline-none placeholder:text-[var(--courier-muted)] focus:border-[var(--courier-accent-strong)] dark:bg-white/5"
        />
      </div>

      <div className="courier-segment flex gap-2 rounded-[22px] p-1.5">
        {[
          { key: 'ALL', label: 'Barchasi' },
          { key: 'ACTIVE', label: 'Faol' },
          { key: 'DELIVERED', label: 'Topshirildi' },
          { key: 'CANCELLED', label: 'Bekor' },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveFilter(f.key as HistoryFilter)}
            className={`flex-1 rounded-[16px] px-2 py-2.5 text-[11px] font-black transition-colors ${
              activeFilter === f.key
                ? 'courier-segment-active'
                : 'text-[var(--courier-muted)] hover:bg-black/4 dark:hover:bg-white/6'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="px-1 text-[11px] font-bold text-[var(--courier-muted)]">{filteredHistory.length} ta natija</p>

      {history.length === 0 ? (
        <div className="courier-card-strong rounded-[30px] px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--courier-accent-soft)]">
            <Package size={28} className="text-[var(--courier-accent-strong)]" />
          </div>
          <p className="text-[17px] font-black text-[var(--courier-text)]">Tarix hali bo'sh</p>
          <p className="mt-2 text-[13px] leading-snug text-[var(--courier-muted)]">
            Birinchi yetkazishingizni muvaffaqiyatli tugatganingizdan so'ng bu yerda ko'rinadi.
          </p>
        </div>
      ) : filteredHistory.length > 0 ? (
        <div className="space-y-3">
          {filteredHistory.map((entry) => (
            <button
              key={entry.assignmentId}
              type="button"
              onClick={() => navigate(`/courier/order/${entry.orderId}`)}
              className="courier-card-strong courier-hoverable w-full rounded-[28px] p-4 text-left active:scale-[0.985]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[17px] font-black text-[var(--courier-text)]">#{entry.orderNumber}</p>
                  <p className="mt-0.5 text-[13px] text-[var(--courier-muted)]">{entry.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-black text-[var(--courier-text)]">{formatMoney(entry.total)}</p>
                  {entry.deliveryFee > 0 ? (
                    <p className="mt-0.5 text-[11px] text-[var(--courier-muted)]">yetkazish: {formatMoney(entry.deliveryFee)}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <StatusBadge status={entry.assignmentStatus} />
                <span className="text-[11px] text-[var(--courier-muted)]">
                  {formatDate(entry.deliveredAt || entry.cancelledAt || entry.assignedAt)}
                </span>
              </div>

              <div className="mt-2.5 flex items-start gap-2 rounded-[16px] bg-black/4 px-3 py-2.5 dark:bg-white/5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--courier-muted)]" />
                <p className="text-[12px] leading-snug text-[var(--courier-text)]/78">{entry.destinationAddress}</p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--courier-muted)]">
                  <Package size={12} />
                  {entry.itemCount} ta mahsulot
                </span>
                {entry.customerPhone ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-[var(--courier-muted)]">
                    <Phone size={12} />
                    {entry.customerPhone}
                  </span>
                ) : null}
              </div>

              {entry.note ? (
                <div className="mt-2 rounded-[14px] border border-amber-100 bg-[var(--courier-accent-soft)] px-3 py-2 text-[12px] text-[#7d5e00] dark:border-white/8 dark:text-[var(--courier-accent)]">
                  {entry.note}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="courier-card-strong rounded-[30px] px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black/6 dark:bg-white/6">
            <Package size={28} className="text-[var(--courier-muted)]" />
          </div>
          <p className="text-[16px] font-black text-[var(--courier-text)]">Natija topilmadi</p>
          <p className="mt-1 text-[13px] text-[var(--courier-muted)]">Qidiruv yoki filtrni o'zgartirib ko'ring</p>
        </div>
      )}
    </div>
  );
};

export default CourierHistoryPage;
