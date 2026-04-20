import React, { useState } from 'react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  TrendingUp,
  ShoppingBag,
  Users,
  Percent,
  ChevronRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { env } from '../../config';
import { useAdminReportStats, type ReportTimeframe } from '../../hooks/queries/useAdminReports';

const AdminReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<ReportTimeframe>('today');
  const [isExporting, setIsExporting] = useState(false);

  const { data: stats, isLoading, isError, refetch, isFetching } = useAdminReportStats(timeframe);

  // Backend orders[] arraydan jami buyurtmalar sonini hisoblash
  const orderCount = stats?.orders.reduce((sum, o) => sum + o.count, 0) ?? 0;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const url = `${env.API_URL}/reports/export?timeframe=${timeframe}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setTimeout(() => setIsExporting(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 h-[66px] flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <h1 className="text-lg font-black tracking-tight text-slate-900">Xisobotlar</h1>
        </div>

        {/* Refresh tugmasi */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 active:scale-95 transition-transform disabled:opacity-40"
          aria-label="Yangilash"
        >
          <RefreshCw size={16} className={`text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="p-4 space-y-6">
        {/* Timeframe Selector */}
        <div className="bg-white rounded-[28px] p-2 flex gap-1 border border-slate-100 shadow-sm">
          {(['today', 'week', 'month', 'year'] as ReportTimeframe[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`flex-1 py-3 rounded-[22px] text-xs font-black uppercase tracking-wider transition-all ${
                timeframe === t
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              {t === 'today' ? 'Bugun' : t === 'week' ? 'Hafta' : t === 'month' ? 'Oy' : 'Yil'}
            </button>
          ))}
        </div>

        {/* Xato holati */}
        {isError && (
          <div className="rounded-[20px] bg-red-50 border border-red-100 px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-bold text-red-600">Ma'lumot yuklanmadi.</span>
            <button
              onClick={() => refetch()}
              className="ml-auto text-xs font-black text-red-500 underline"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {/* Hero — Umumiy Daromad */}
        <section className="rounded-[32px] bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-100 opacity-80">
            Umumiy Daromad
          </p>

          {isLoading ? (
            <div className="mt-3 h-10 w-48 rounded-xl bg-white/20 animate-pulse" />
          ) : (
            <h2 className="text-4xl font-black mt-2 tracking-tight">
              {(stats?.revenue.total ?? 0).toLocaleString()}{' '}
              <span className="text-lg opacity-60">so'm</span>
            </h2>
          )}

          <div className="mt-6 flex items-center gap-2 bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/10">
            <TrendingUp size={14} />
            <span className="text-xs font-bold">Real ma'lumot · {timeframe}</span>
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Buyurtmalar */}
          <div className="bg-white rounded-[26px] border border-slate-100 p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
              <ShoppingBag size={20} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Buyurtmalar
            </p>
            {isLoading ? (
              <div className="mt-2 h-8 w-16 rounded-lg bg-slate-100 animate-pulse" />
            ) : (
              <p className="text-2xl font-black text-slate-900 mt-1">{orderCount}</p>
            )}
          </div>

          {/* Yangi mijozlar */}
          <div className="bg-white rounded-[26px] border border-slate-100 p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center mb-4">
              <Users size={20} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Yangi Mijozlar
            </p>
            {isLoading ? (
              <div className="mt-2 h-8 w-16 rounded-lg bg-slate-100 animate-pulse" />
            ) : (
              <p className="text-2xl font-black text-slate-900 mt-1">
                +{stats?.newCustomers ?? 0}
              </p>
            )}
          </div>

          {/* Chegirmalar */}
          <div className="bg-white rounded-[26px] border border-slate-100 p-4 shadow-sm col-span-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <Percent size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Chegirmalar
                </p>
                {isLoading ? (
                  <div className="mt-1 h-6 w-28 rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                  <p className="text-xl font-black text-slate-900">
                    {(stats?.revenue.discount ?? 0).toLocaleString()} so'm
                  </p>
                )}
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-300" />
          </div>
        </div>

        {/* Buyurtma statuslari breakdown */}
        {!isLoading && stats && stats.orders.length > 0 && (
          <div className="bg-white rounded-[26px] border border-slate-100 p-4 shadow-sm space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Status bo'yicha
            </p>
            {stats.orders.map((o) => (
              <div key={o.status} className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600 capitalize">
                  {statusLabel(o.status)}
                </span>
                <span className="text-sm font-black text-slate-900 tabular-nums">{o.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Export */}
        <div className="bg-slate-900 rounded-[32px] p-6 text-white text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl" />
          <FileSpreadsheet size={40} className="mx-auto text-emerald-400 mb-4" />
          <h3 className="text-xl font-black">Excel formatida yuklab olish</h3>
          <p className="text-sm font-bold text-slate-400 mt-2 leading-relaxed">
            Tanlangan davr bo'yicha barcha buyurtmalar va moliyaviy ma'lumotlarni o'z ichiga oladi.
          </p>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full mt-6 h-[56px] rounded-[22px] bg-white text-slate-900 flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Download size={20} />
                <span>Eksport (Excel)</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Kutilmoqda',
    CONFIRMED: 'Tasdiqlangan',
    PREPARING: 'Tayyorlanmoqda',
    READY_FOR_PICKUP: 'Tayyor',
    DELIVERING: 'Yetkazilmoqda',
    DELIVERED: 'Yetkazildi',
    CANCELLED: 'Bekor qilindi',
  };
  return map[status] ?? status;
}

export default AdminReportsPage;
