import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Clock3,
  History,
  Loader2,
  Navigation,
  Power,
  ReceiptText,
  ShieldCheck,
  Truck,
  UserCheck,
  UserCircle2,
} from 'lucide-react';
import { useCourierOrders, useCourierStatus, useCourierTodayStats, useUpdateCourierStatus } from '../../hooks/queries/useOrders';
import { useAuthStore } from '../../store/useAuthStore';

function formatMoney(value: number) {
  return `${value.toLocaleString('uz-UZ')} so'm`;
}

function formatClock(value?: string | null) {
  if (!value) {
    return "Hali yo'q";
  }

  return new Date(value).toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CourierStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: status, isLoading, error, refetch, isFetching } = useCourierStatus();
  const {
    data: todayStats,
    isLoading: isStatsLoading,
    error: statsError,
    refetch: refetchTodayStats,
  } = useCourierTodayStats();
  const { data: courierOrders = [] } = useCourierOrders();
  const updateStatus = useUpdateCourierStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center px-6 py-24">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <Loader2 size={28} className="mx-auto animate-spin text-indigo-600" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-slate-500">
            Holat yuklanmoqda
          </p>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="px-6 py-10">
        <div className="rounded-[32px] border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle size={30} />
          </div>
          <h3 className="mt-5 text-xl font-black tracking-tight text-slate-900">Kuryer holati yuklanmadi</h3>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            {(error as Error)?.message || "Server bilan bog'lanib bo'lmadi"}
          </p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-5 text-xs font-black uppercase tracking-[0.18em] text-white"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  const availabilityLabel = !status.isOnline
    ? 'Offline'
    : status.isAcceptingOrders
      ? 'Buyurtma qabul qilmoqda'
      : 'Onlayn, lekin qabul yopiq';
  const activeAssignment = status.activeAssignment ?? null;
  const newAssignmentsCount = courierOrders.filter((order) => order.courierAssignmentStatus === 'ASSIGNED').length;
  const activeAssignmentsCount = courierOrders.filter((order) =>
    ['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(order.courierAssignmentStatus || ''),
  ).length;

  const toggleOnline = () => {
    updateStatus.mutate({ isOnline: !status.isOnline });
  };

  const toggleAccepting = () => {
    updateStatus.mutate({ isAcceptingOrders: !status.isAcceptingOrders });
  };

  const completedToday = todayStats?.completedCount ?? status.completedToday;
  const deliveryFeesToday = todayStats?.deliveryFeesTotal ?? 0;
  const deliveredRevenueToday = todayStats?.deliveredOrderAmountTotal ?? 0;
  const averageFulfillmentMinutes = todayStats?.averageFulfillmentMinutes ?? null;
  const averageDeliveryLegMinutes = todayStats?.averageDeliveryLegMinutes ?? null;
  const recentCompletedOrders = todayStats?.recentCompletedOrders ?? [];

  return (
    <div className="animate-in fade-in space-y-6 px-6 py-6 pb-36 duration-500">
      <section className="relative overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.35),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.2),transparent_24%),linear-gradient(135deg,#0f172a_0%,#111827_100%)] p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
        <div className="absolute -right-10 top-6 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-indigo-300/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/50">
                Kuryer paneli
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">
                {user?.fullName || 'Kuryer'}
              </h2>
              <p className="mt-3 max-w-[270px] text-sm font-semibold leading-relaxed text-white/72">
                Holatingizni boshqaring, yangi topshiriqlarni qabul qiling va faol buyurtmaga tez o'ting.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void Promise.all([refetch(), refetchTodayStats()]);
              }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
              aria-label="Holatni yangilash"
            >
              <Loader2 size={18} className={isFetching || isStatsLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Holat</p>
              <p className="mt-2 text-sm font-black text-white">{status.isOnline ? 'Onlayn' : 'Offline'}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Faol</p>
              <p className="mt-2 text-2xl font-black text-white">{status.activeAssignments}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Bugun</p>
              <p className="mt-2 text-2xl font-black text-white">{completedToday}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-white/10 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Mavjudlik</p>
            <p className="mt-2 text-base font-black text-white">{availabilityLabel}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Bugungi natija</p>
            <p className="mt-1 text-lg font-black text-slate-900">Kunlik operatsion hisobot</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Real data
          </div>
        </div>

        {statsError ? (
          <div className="mt-4 rounded-[22px] border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              {(statsError as Error).message || 'Kunlik hisobot hozircha yuklanmadi'}
            </p>
          </div>
        ) : null}

        {isStatsLoading && !todayStats ? (
          <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-600">Kunlik hisobot yuklanmoqda...</p>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Topshirildi</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{completedToday}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Yetkazish haqi</p>
            <p className="mt-2 text-sm font-black text-slate-900">{formatMoney(deliveryFeesToday)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Yetkazilgan savdo</p>
            <p className="mt-2 text-sm font-black text-slate-900">{formatMoney(deliveredRevenueToday)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Clock3 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">O'rtacha yakunlash</p>
                <p className="mt-1 text-base font-black text-slate-900">
                  {averageFulfillmentMinutes !== null ? `${averageFulfillmentMinutes} daqiqa` : "Hali yo'q"}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <ReceiptText size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">So'nggi topshirish</p>
                <p className="mt-1 text-base font-black text-slate-900">{formatClock(todayStats?.lastDeliveredAt)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-emerald-100 bg-emerald-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Payout-safe ko'rsatkich</p>
              <p className="mt-1 text-sm font-black text-emerald-900">
                {todayStats?.payoutSummary.label || 'Kuryer ulushi alohida qoidaga ulanmagan'}
              </p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-emerald-800">
                Yetkazish haqi va savdo summasi operatsion ko'rsatkich sifatida ko'rsatiladi. Yakuniy kuryer ulushi alohida biznes qoidasi bilan hisoblanadi.
              </p>
            </div>
          </div>
        </div>

        {recentCompletedOrders.length > 0 ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Oxirgi yakunlanganlar</p>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                O'rtacha yo'l: {averageDeliveryLegMinutes !== null ? `${averageDeliveryLegMinutes} daqiqa` : "Hali yo'q"}
              </p>
            </div>
            <div className="space-y-3">
              {recentCompletedOrders.slice(0, 3).map((completedOrder) => (
                <div
                  key={completedOrder.assignmentId}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900">Buyurtma #{completedOrder.orderNumber}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatClock(completedOrder.deliveredAt)} / {formatMoney(completedOrder.total)}
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                      {formatMoney(completedOrder.deliveryFee)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4">
        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Power size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ish rejimi</p>
              <p className="mt-1 text-base font-black text-slate-900">
                {status.isOnline ? 'Ishlayapman' : 'Hozir ishlamayman'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleOnline}
            disabled={updateStatus.isPending}
            className={`mt-4 flex h-14 w-full items-center justify-between rounded-[22px] px-4 text-left text-sm font-black transition-transform active:scale-[0.98] ${
              status.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <span>{status.isOnline ? "Offline holatga o'tish" : "Online holatga o'tish"}</span>
            {updateStatus.isPending ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <UserCheck size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Qabul rejimi</p>
              <p className="mt-1 text-base font-black text-slate-900">
                {status.isAcceptingOrders ? 'Yangi buyurtma olaman' : 'Yangi buyurtma yopiq'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleAccepting}
            disabled={updateStatus.isPending || !status.isOnline}
            className={`mt-4 flex h-14 w-full items-center justify-between rounded-[22px] px-4 text-left text-sm font-black transition-transform active:scale-[0.98] ${
              status.isAcceptingOrders ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <span>
              {status.isAcceptingOrders ? "Qabulni vaqtincha to'xtatish" : 'Yangi buyurtmalarni ochish'}
            </span>
            {updateStatus.isPending ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>

          {!status.isOnline ? (
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Buyurtma qabul qilishni yoqish uchun avval online bo'ling.
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4">
        <button
          type="button"
          onClick={() => navigate('/courier/orders')}
          className="flex items-center justify-between rounded-[30px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Truck size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Buyurtmalar</p>
              <p className="mt-1 text-base font-black text-slate-900">Yangi va faol topshiriqlarni ko'rish</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400" />
        </button>

        {activeAssignment ? (
          <button
            type="button"
            onClick={() => navigate(`/courier/order/${activeAssignment.orderId}`)}
            className="flex items-center justify-between rounded-[30px] border border-emerald-200 bg-emerald-50 p-5 text-left shadow-sm transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Navigation size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Faol topshiriq</p>
                <p className="mt-1 text-base font-black text-slate-900">
                  Buyurtma #{activeAssignment.orderNumber}
                </p>
              </div>
            </div>
            <ArrowRight size={18} className="text-emerald-700" />
          </button>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => navigate('/courier/history')}
            className="flex items-center justify-between rounded-[30px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <History size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tarix</p>
                <p className="mt-1 text-base font-black text-slate-900">Yetkazilgan buyurtmalar</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/courier/profile')}
            className="flex items-center justify-between rounded-[30px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <UserCircle2 size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Profil</p>
                <p className="mt-1 text-base font-black text-slate-900">Aloqa va akkaunt</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-400" />
          </button>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Operatsion navbat</p>
            <p className="mt-1 text-lg font-black text-slate-900">Kutilayotgan topshiriqlar</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/courier/orders')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700"
          >
            <Truck size={14} />
            <span>Panelni ochish</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Yangi</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{newAssignmentsCount}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">Biriktirilgan, ammo hali qabul qilinmagan</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Faol</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{activeAssignmentsCount}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">Qabul qilingan yoki yo'lda bo'lgan vazifa</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CourierStatusPage;
