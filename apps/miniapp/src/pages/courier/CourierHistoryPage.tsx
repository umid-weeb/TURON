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
  if (!value) return "—";
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
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
        <CheckCircle2 size={11} />
        Topshirildi
      </span>
    );
  }
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-600">
        <XCircle size={11} />
        Bekor
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
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
      if (activeFilter === 'ACTIVE')
        return ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(entry.assignmentStatus);
      if (activeFilter === 'DELIVERED') return entry.assignmentStatus === 'DELIVERED';
      if (activeFilter === 'CANCELLED')
        return ['CANCELLED', 'REJECTED'].includes(entry.assignmentStatus);
      return true;
    });
  }, [activeFilter, history, searchQuery]);

  const deliveredCount = history.filter((e) => e.assignmentStatus === 'DELIVERED').length;
  const cancelledCount = history.filter((e) =>
    ['CANCELLED', 'REJECTED'].includes(e.assignmentStatus),
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-44 animate-pulse rounded-[10px] bg-slate-200" />
          <div className="h-10 w-10 animate-pulse rounded-[18px] bg-slate-200" />
        </div>
        <StatStripSkeleton count={3} />
        <div className="h-12 animate-pulse rounded-[18px] bg-slate-200" />
        {[0, 1, 2].map((i) => <CourierHistoryCardSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-10">
        <div className="rounded-[26px] border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertCircle size={28} className="mx-auto text-red-400" />
          <p className="mt-4 text-[15px] font-black text-slate-900">Tarix yuklanmadi</p>
          <p className="mt-2 text-[13px] text-slate-500">{(error as Error).message}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 flex h-12 items-center gap-2 rounded-[18px] bg-slate-900 px-5 text-[13px] font-black text-white mx-auto active:scale-95 transition-transform"
          >
            <RefreshCw size={15} />
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-5 pb-32">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-[22px] font-black text-slate-900">Buyurtmalar tarixi</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-500 active:scale-95 transition-transform"
        >
          <RefreshCw size={17} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Jami', value: history.length, color: 'text-slate-900' },
          { label: 'Topshirildi', value: deliveredCount, color: 'text-emerald-600' },
          { label: 'Bekor', value: cancelledCount, color: 'text-red-500' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[18px] bg-white border border-slate-100 shadow-sm py-3 text-center"
          >
            <p className={`text-[24px] font-black leading-none ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Raqam, mijoz yoki manzil..."
          className="h-12 w-full rounded-[18px] border border-slate-200 bg-white pl-11 pr-4 text-[14px] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-2">
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
            className={`flex-1 h-10 rounded-[18px] text-[11px] font-black transition-colors ${
              activeFilter === f.key
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-100 text-slate-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Results count ───────────────────────────────────────────── */}
      <p className="px-1 text-[11px] font-bold text-slate-400">
        {filteredHistory.length} ta natija
      </p>

      {/* ── History list ────────────────────────────────────────────── */}
      {history.length === 0 ? (
        /* First-time courier — no history at all */
        <div className="rounded-[26px] border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
            <Package size={28} className="text-indigo-300" />
          </div>
          <p className="text-[17px] font-black text-slate-800">Tarix hali bo'sh</p>
          <p className="mt-2 text-[13px] leading-snug text-slate-400">
            Birinchi yetkazishingizni muvaffaqiyatli tugatganingizdan so'ng bu yerda ko'rinadi.
            <br />
            <span className="font-bold text-indigo-500">Omad!</span>
          </p>
        </div>
      ) : filteredHistory.length > 0 ? (
        <div className="space-y-3">
          {filteredHistory.map((entry) => (
            <button
              key={entry.assignmentId}
              type="button"
              onClick={() => navigate(`/courier/order/${entry.orderId}`)}
              className="w-full rounded-[26px] border border-slate-100 bg-white p-4 text-left shadow-sm active:scale-[0.98] transition-transform"
            >
              {/* Top row: order number + status + total */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[17px] font-black text-slate-900">#{entry.orderNumber}</p>
                  <p className="mt-0.5 text-[13px] text-slate-500">{entry.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-black text-slate-900">{formatMoney(entry.total)}</p>
                  {entry.deliveryFee > 0 && (
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      yetkazish: {formatMoney(entry.deliveryFee)}
                    </p>
                  )}
                </div>
              </div>

              {/* Status + time row */}
              <div className="mt-2.5 flex items-center gap-2">
                <StatusBadge status={entry.assignmentStatus} />
                <span className="text-[11px] text-slate-400">
                  {formatDate(entry.deliveredAt || entry.cancelledAt || entry.assignedAt)}
                </span>
              </div>

              {/* Address */}
              <div className="mt-2.5 flex items-start gap-2 rounded-[14px] bg-slate-50 px-3 py-2.5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <p className="text-[12px] leading-snug text-slate-600">{entry.destinationAddress}</p>
              </div>

              {/* Meta: items + phone */}
              <div className="mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Package size={12} />
                  {entry.itemCount} ta mahsulot
                </span>
                {entry.customerPhone && (
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Phone size={12} />
                    {entry.customerPhone}
                  </span>
                )}
              </div>

              {entry.note && (
                <div className="mt-2 rounded-[14px] border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  {entry.note}
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-[26px] border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Package size={28} className="text-slate-300" />
          </div>
          <p className="text-[16px] font-black text-slate-700">Natija topilmadi</p>
          <p className="mt-1 text-[13px] text-slate-400">
            Qidiruv yoki filtrni o'zgartirib ko'ring
          </p>
        </div>
      )}
    </div>
  );
};

export default CourierHistoryPage;
