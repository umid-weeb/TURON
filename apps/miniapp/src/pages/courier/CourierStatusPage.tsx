import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, Loader2, Navigation } from 'lucide-react';
import {
  useCourierStatus,
  useCourierTodayStats,
  useUpdateCourierStatus,
} from '../../hooks/queries/useOrders';

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-10 w-[74px] shrink-0 items-center rounded-full border transition-all duration-300 focus:outline-none disabled:opacity-40 ${
        checked
          ? 'border-[rgba(255,205,0,0.4)] bg-[var(--courier-accent)] shadow-[0_16px_28px_rgba(255,205,0,0.28)]'
          : 'border-[var(--courier-line)] bg-black/8 dark:bg-white/8'
      }`}
    >
      <span
        className={`ml-1 inline-block h-8 w-8 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
          checked ? 'translate-x-8' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

const CourierStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: status, isLoading, error, refetch } = useCourierStatus();
  const { data: todayStats } = useCourierTodayStats();
  const updateStatus = useUpdateCourierStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[var(--courier-accent-strong)]" />
          <p className="text-[13px] font-bold text-[var(--courier-muted)]">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="px-5 py-10">
        <div className="courier-card-strong rounded-[30px] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/12">
            <AlertCircle size={26} className="text-red-500" />
          </div>
          <p className="text-[17px] font-black text-[var(--courier-text)]">Ulanib bo'lmadi</p>
          <p className="mt-2 text-[13px] text-[var(--courier-muted)]">
            {(error as Error)?.message || "Server bilan bog'lanib bo'lmadi"}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="courier-cta-primary mt-5 h-12 rounded-[18px] px-6 text-[13px] font-black active:scale-95"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  const isOnline = status.isOnline;
  const completedToday = todayStats?.completedCount ?? status.completedToday ?? 0;
  const feesToday = todayStats?.deliveryFeesTotal ?? 0;
  const activeCount = status.activeAssignments ?? 0;

  const handleToggle = () => {
    updateStatus.mutate({
      isOnline: !isOnline,
      isAcceptingOrders: !isOnline,
    });
  };

  return (
    <div className="courier-enter-up space-y-4 px-4 py-5">
      <div className="courier-card-strong rounded-[32px] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="courier-label">Ish rejimi</p>
            <p className="mt-2 text-[22px] font-black leading-tight text-[var(--courier-text)]">
              {isOnline ? 'Ishlamoqdaman' : 'Dam olmoqdaman'}
            </p>
            <p className="mt-1 text-[13px] text-[var(--courier-muted)]">
              {isOnline ? 'Yangi topshiriqlar avtomatik keladi' : 'Hech qanday topshiriq kelmaydi'}
            </p>
          </div>
          {updateStatus.isPending ? (
            <Loader2 size={24} className="shrink-0 animate-spin text-[var(--courier-accent-strong)]" />
          ) : (
            <Toggle checked={isOnline} onChange={handleToggle} disabled={updateStatus.isPending} />
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-black ${isOnline ? 'courier-status-pill' : 'bg-black/5 text-[var(--courier-muted)] dark:bg-white/6'}`}>
            <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-current animate-pulse' : 'bg-current/70'}`} />
            {isOnline ? 'Faol - buyurtma qabul qilmoqda' : 'Offline'}
          </span>
          <span className="rounded-full bg-black/5 px-3 py-1.5 text-[12px] font-bold text-[var(--courier-muted)] dark:bg-white/6">
            {status.isAcceptingOrders ? 'Qabul ochiq' : 'Qabul yopiq'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Yetkazildi', value: completedToday, tone: 'text-[var(--courier-text)]' },
          { label: 'Faol', value: activeCount, tone: 'text-[var(--courier-text)]' },
          { label: 'Haqdorlik', value: feesToday > 0 ? `${(feesToday / 1000).toFixed(0)}K` : '--', tone: 'text-[var(--courier-text)]' },
        ].map((item) => (
          <div key={item.label} className="courier-card-strong rounded-[24px] p-4 text-center courier-hoverable">
            <p className={`text-[26px] font-black leading-none ${item.tone}`}>{item.value}</p>
            <p className="mt-2 text-[11px] font-bold text-[var(--courier-muted)]">{item.label}</p>
          </div>
        ))}
      </div>

      {!isOnline ? (
        <div className="courier-card-strong rounded-[28px] px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="courier-accent-pill mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px]">
              <Navigation size={18} className="text-[var(--courier-accent-contrast)]" />
            </div>
            <div>
              <p className="text-[14px] font-black text-[var(--courier-text)]">Ishni boshlash uchun</p>
              <p className="mt-1 text-[12px] leading-snug text-[var(--courier-muted)]">
                Yuqoridagi <span className="font-black text-[var(--courier-text)]">Ishlamoqdaman</span> tugmasini yoqing. Shunda yangi buyurtmalar avtomatik keladi.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => navigate('/courier/orders')}
        className="courier-card-strong courier-hoverable flex w-full items-center justify-between rounded-[28px] px-5 py-4 active:scale-[0.985]"
      >
        <div>
          <p className="courier-label">Tezkor o'tish</p>
          <p className="mt-1 text-[16px] font-black text-[var(--courier-text)]">Barcha buyurtmalar</p>
        </div>
        <div className="courier-accent-pill flex h-10 w-10 items-center justify-center rounded-[14px]">
          <ChevronRight size={20} className="text-[var(--courier-accent-contrast)]" />
        </div>
      </button>
    </div>
  );
};

export default CourierStatusPage;
