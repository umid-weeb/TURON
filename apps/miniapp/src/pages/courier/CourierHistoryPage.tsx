import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Clock3,
  Loader2,
  Package,
  Phone,
  RefreshCw,
  Route,
  Search,
} from 'lucide-react';
import { useCourierHistory } from '../../hooks/queries/useCouriers';

type HistoryFilter = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED';

function formatMoney(value: number) {
  return `${value.toLocaleString('uz-UZ')} so'm`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Hali yo'q";
  }

  return new Date(value).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CourierHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: history = [], isLoading, error, refetch, isFetching } = useCourierHistory();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<HistoryFilter>('ALL');

  const filteredHistory = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return history.filter((entry) => {
      const matchesSearch =
        !normalizedQuery ||
        entry.orderNumber.toLowerCase().includes(normalizedQuery) ||
        entry.customerName.toLowerCase().includes(normalizedQuery) ||
        entry.destinationAddress.toLowerCase().includes(normalizedQuery);

      if (!matchesSearch) {
        return false;
      }

      if (activeFilter === 'ACTIVE') {
        return ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(entry.assignmentStatus);
      }

      if (activeFilter === 'DELIVERED') {
        return entry.assignmentStatus === 'DELIVERED';
      }

      if (activeFilter === 'CANCELLED') {
        return ['CANCELLED', 'REJECTED'].includes(entry.assignmentStatus);
      }

      return true;
    });
  }, [activeFilter, history, searchQuery]);

  const deliveredCount = history.filter((entry) => entry.assignmentStatus === 'DELIVERED').length;
  const cancelledCount = history.filter((entry) => ['CANCELLED', 'REJECTED'].includes(entry.assignmentStatus)).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center px-6 py-24">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <Loader2 size={28} className="mx-auto animate-spin text-indigo-600" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-slate-500">
            Tarix yuklanmoqda
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-10">
        <div className="rounded-[32px] border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle size={30} />
          </div>
          <h3 className="mt-5 text-xl font-black tracking-tight text-slate-900">Tarix yuklanmadi</h3>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            {(error as Error).message}
          </p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-xs font-black uppercase tracking-[0.18em] text-white"
          >
            <RefreshCw size={15} />
            <span>Qayta urinish</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in space-y-6 px-6 py-6 pb-36 duration-500">
      <section className="rounded-[34px] bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.25),transparent_28%),linear-gradient(135deg,#0f172a_0%,#111827_100%)] p-6 text-white shadow-[0_28px_72px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">Courier history</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Buyurtmalar tarixi</h1>
            <p className="mt-3 max-w-[320px] text-sm font-semibold leading-relaxed text-white/72">
              Yetkazilgan, bekor qilingan va faol topshiriqlar tarixini qidiring, solishtiring va qayta oching.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white"
          >
            <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <SummaryCard label="Jami" value={history.length.toString()} />
          <SummaryCard label="Topshirildi" value={deliveredCount.toString()} />
          <SummaryCard label="Bekor" value={cancelledCount.toString()} />
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Order raqami, mijoz yoki manzil bo'yicha qidiring"
            className="h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { key: 'ALL', label: 'Barchasi' },
            { key: 'ACTIVE', label: 'Faol' },
            { key: 'DELIVERED', label: 'Topshirildi' },
            { key: 'CANCELLED', label: 'Bekor' },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key as HistoryFilter)}
              className={`h-11 rounded-[18px] text-[11px] font-black uppercase tracking-[0.18em] ${
                activeFilter === filter.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {filteredHistory.length ? (
        <section className="space-y-4">
          {filteredHistory.map((entry) => (
            <button
              key={entry.assignmentId}
              type="button"
              onClick={() => navigate(`/courier/order/${entry.orderId}`)}
              className="w-full rounded-[30px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-transform active:scale-[0.985]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {entry.assignmentStatus}
                  </p>
                  <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                    #{entry.orderNumber}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-slate-600">{entry.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900">{formatMoney(entry.total)}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Fee {formatMoney(entry.deliveryFee)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] bg-slate-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <Route size={16} className="mt-0.5 shrink-0 text-amber-500" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Manzil</p>
                      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
                        {entry.destinationAddress}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] bg-slate-50 px-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoLabel icon={<Clock3 size={14} />} label="Biriktirildi" value={formatDate(entry.assignedAt)} />
                    <InfoLabel icon={<Package size={14} />} label="Yakun" value={formatDate(entry.deliveredAt || entry.cancelledAt)} />
                    <InfoLabel icon={<Phone size={14} />} label="Telefon" value={entry.customerPhone || "Yo'q"} />
                    <InfoLabel icon={<Route size={14} />} label="Item" value={`${entry.itemCount} ta`} />
                  </div>
                </div>
              </div>

              {entry.note ? (
                <div className="mt-4 rounded-[22px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  {entry.note}
                </div>
              ) : null}
            </button>
          ))}
        </section>
      ) : (
        <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-300">
            <Package size={34} />
          </div>
          <h4 className="mt-6 text-2xl font-black tracking-tight text-slate-900">Mos tarix topilmadi</h4>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            Qidiruv yoki filtrni o'zgartirib ko'ring.
          </p>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4">
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">{label}</p>
    <p className="mt-2 text-2xl font-black text-white">{value}</p>
  </div>
);

const InfoLabel: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="min-w-0">
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
      {icon}
      <span>{label}</span>
    </div>
    <p className="mt-2 truncate text-sm font-semibold text-slate-700">{value}</p>
  </div>
);

export default CourierHistoryPage;
