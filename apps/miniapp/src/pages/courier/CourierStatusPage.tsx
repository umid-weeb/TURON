import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, Loader2, Navigation } from 'lucide-react';
import {
  useCourierOrders,
  useCourierStatus,
  useCourierTodayStats,
  useUpdateCourierStatus,
} from '../../hooks/queries/useOrders';
import { isActiveDeliveryStage } from '../../features/courier/deliveryStage';

// ─── iOS-style toggle ─────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  disabled,
  size = 'lg',
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: 'sm' | 'lg';
}) {
  const trackW = size === 'lg' ? 'w-16' : 'w-12';
  const trackH = size === 'lg' ? 'h-9' : 'h-7';
  const thumbW = size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  const translateOn = size === 'lg' ? 'translate-x-8' : 'translate-x-6';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-40 ${trackW} ${trackH} ${
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`ml-1 inline-block transform rounded-full bg-white shadow-md transition-transform duration-300 ${thumbW} ${
          checked ? translateOn : 'translate-x-0'
        }`}
      />
    </button>
  );
}

const CourierStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: status,
    isLoading,
    error,
    refetch,
  } = useCourierStatus();
  const { data: todayStats } = useCourierTodayStats();
  const { data: orders = [] } = useCourierOrders();
  const updateStatus = useUpdateCourierStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <p className="text-[13px] font-bold text-slate-400">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="px-5 py-10">
        <div className="rounded-[26px] border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle size={26} className="text-red-500" />
          </div>
          <p className="text-[17px] font-black text-slate-900">Ulanib bo'lmadi</p>
          <p className="mt-2 text-[13px] text-slate-500">
            {(error as Error)?.message || "Server bilan bog'lanib bo'lmadi"}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 h-12 rounded-[18px] bg-slate-900 px-6 text-[13px] font-black text-white active:scale-95"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  const isOnline = status.isOnline;
  const isAccepting = status.isAcceptingOrders;
  const activeDelivery = orders.find((o) => isActiveDeliveryStage(o.deliveryStage));
  const completedToday = todayStats?.completedCount ?? status.completedToday ?? 0;
  const feesToday = todayStats?.deliveryFeesTotal ?? 0;
  const activeCount = status.activeAssignments ?? 0;

  return (
    <div className="space-y-3 px-4 py-5">

      {/* ── Online / Offline toggle — primary CTA ──────────────────── */}
      <div className="rounded-[26px] bg-white border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[19px] font-black leading-tight text-slate-900">
              {isOnline ? 'Ishlamoqdaman' : 'Hozir dam olmoqdaman'}
            </p>
            <p className="mt-1 text-[13px] text-slate-500">
              {isOnline
                ? isAccepting
                  ? 'Yangi topshiriqlar kelishi mumkin'
                  : 'Yangi buyurtma qabul qilinmaydi'
                : 'Hech qanday topshiriq kelmaydi'}
            </p>
          </div>
          {updateStatus.isPending ? (
            <Loader2 size={24} className="shrink-0 animate-spin text-slate-400" />
          ) : (
            <Toggle
              checked={isOnline}
              onChange={() => updateStatus.mutate({ isOnline: !isOnline })}
              disabled={updateStatus.isPending}
            />
          )}
        </div>

        {/* Status pill */}
        <div className="mt-4">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-black ${
              isOnline
                ? isAccepting
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline
                  ? isAccepting
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
            {isOnline
              ? isAccepting
                ? 'Faol — buyurtma qabul qilmoqda'
                : 'Onlayn — qabul yopiq'
              : 'Offline'}
          </span>
        </div>
      </div>

      {/* ── Accept orders toggle — only when online ─────────────────── */}
      {isOnline && (
        <div className="rounded-[26px] bg-white border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[16px] font-black text-slate-900">Buyurtma qabul qilish</p>
              <p className="mt-0.5 text-[13px] text-slate-500">
                {isAccepting
                  ? "Yangi topshiriqlar avtomatik keladi"
                  : "Yangi topshiriq kelmaydi"}
              </p>
            </div>
            {updateStatus.isPending ? (
              <Loader2 size={22} className="shrink-0 animate-spin text-slate-400" />
            ) : (
              <Toggle
                checked={isAccepting}
                onChange={() => updateStatus.mutate({ isAcceptingOrders: !isAccepting })}
                disabled={updateStatus.isPending}
                size="sm"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Active delivery — prominent card ────────────────────────── */}
      {activeDelivery && (
        <button
          type="button"
          onClick={() => navigate(`/courier/map/${activeDelivery.id}`)}
          className="w-full rounded-[26px] bg-emerald-500 p-5 text-left shadow-lg shadow-emerald-200 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/20">
                <Navigation size={22} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-100">
                  Faol yetkazish
                </p>
                <p className="text-[17px] font-black text-white">
                  #{activeDelivery.orderNumber}
                </p>
                <p className="text-[12px] text-emerald-100">
                  {activeDelivery.destinationArea || activeDelivery.restaurantName}
                </p>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <ChevronRight size={20} className="text-white" />
            </div>
          </div>
        </button>
      )}

      {/* ── Today's stats strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[18px] bg-white border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-[26px] font-black text-slate-900 leading-none">{completedToday}</p>
          <p className="mt-1.5 text-[11px] font-bold text-slate-400">Yetkazildi</p>
        </div>
        <div className="rounded-[18px] bg-white border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-[26px] font-black text-slate-900 leading-none">{activeCount}</p>
          <p className="mt-1.5 text-[11px] font-bold text-slate-400">Faol</p>
        </div>
        <div className="rounded-[18px] bg-white border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-[16px] font-black text-slate-900 leading-none">
            {feesToday > 0 ? `${(feesToday / 1000).toFixed(0)}K` : '—'}
          </p>
          <p className="mt-1.5 text-[11px] font-bold text-slate-400">Haqdorlik</p>
        </div>
      </div>

      {/* ── Offline onboarding hint ──────────────────────────────────── */}
      {!isOnline && (
        <div className="rounded-[22px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white px-4 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-indigo-100 text-indigo-600">
              <Navigation size={17} />
            </div>
            <div>
              <p className="text-[14px] font-black text-slate-900">Ishni boshlash uchun</p>
              <p className="mt-1 text-[12px] leading-snug text-slate-500">
                Yuqoridagi <span className="font-black text-slate-700">"Ishlamoqdaman"</span> tugmasini yoqing. Shunda yangi buyurtmalar avtomatik keladi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick nav to orders list ─────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate('/courier/orders')}
        className="flex w-full items-center justify-between rounded-[26px] bg-white border border-slate-100 shadow-sm px-5 py-4 active:scale-[0.98] transition-transform"
      >
        <p className="text-[15px] font-black text-slate-900">Barcha buyurtmalar</p>
        <ChevronRight size={20} className="text-slate-400" />
      </button>
    </div>
  );
};

export default CourierStatusPage;
