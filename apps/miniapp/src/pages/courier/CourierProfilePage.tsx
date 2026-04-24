import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Navigation,
  PencilLine,
  Phone,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCourierProfile, useUpdateCourierProfile } from '../../hooks/queries/useCouriers';

function formatClock(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CourierProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading, error, refetch } = useCourierProfile();
  const updateProfile = useUpdateCourierProfile();
  const [form, setForm] = React.useState({
    fullName: '',
    phoneNumber: '',
    telegramUsername: '',
  });
  const [isEditing, setIsEditing] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profile || isEditing) return;
    setForm({
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber || '',
      telegramUsername: profile.telegramUsername || '',
    });
  }, [profile, isEditing]);

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

  if (error || !profile) {
    return (
      <div className="px-5 py-10">
        <div className="courier-card-strong rounded-[30px] p-8 text-center">
          <AlertCircle size={28} className="mx-auto text-red-400" />
          <p className="mt-4 text-[15px] font-black text-[var(--courier-text)]">Profil yuklanmadi</p>
          <p className="mt-2 text-[13px] text-[var(--courier-muted)]">
            {(error as Error)?.message || "Server bilan bog'lanib bo'lmadi"}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="courier-cta-primary mt-5 mx-auto flex h-12 items-center gap-2 rounded-[18px] px-5 text-[13px] font-black active:scale-95"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    setSaved(false);
    setSaveError(null);
    if (!form.fullName.trim()) {
      setSaveError("Ism-familya bo'sh bo'lmasligi kerak");
      return;
    }
    updateProfile.mutate(form, {
      onSuccess: () => {
        setSaved(true);
        setIsEditing(false);
      },
      onError: (err) => setSaveError(err instanceof Error ? err.message : "Saqlab bo'lmadi"),
    });
  };

  const openEdit = () => {
    setSaved(false);
    setSaveError(null);
    setForm({
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber || '',
      telegramUsername: profile.telegramUsername || '',
    });
    setIsEditing(true);
  };

  const closeEdit = () => {
    setSaveError(null);
    setForm({
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber || '',
      telegramUsername: profile.telegramUsername || '',
    });
    setIsEditing(false);
  };

  const initials = profile.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'K';

  const statusLabel = profile.isOnline
    ? profile.isAcceptingOrders
      ? 'Faol - buyurtma qabul qilmoqda'
      : 'Onlayn - qabul yopiq'
    : 'Offline';

  return (
    <div className="courier-enter-up space-y-4 px-4 py-5 pb-32">
      <div className="courier-card-strong rounded-[32px] p-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="courier-accent-pill flex h-[72px] w-[72px] items-center justify-center rounded-[22px] text-[22px] font-black">
              {initials}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[var(--courier-surface-strong)] ${profile.isOnline ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
          </div>
          <div className="min-w-0">
            <p className="courier-label">Kuryer profili</p>
            <p className="mt-2 text-[22px] font-black leading-tight text-[var(--courier-text)]">{profile.fullName}</p>
            <p className="mt-1 text-[13px] font-semibold text-[var(--courier-muted)]">{statusLabel}</p>
            <p className="mt-1 text-[11px] text-[var(--courier-muted)]">Oxirgi faollik: {formatClock(profile.lastSeenAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Bugun', value: profile.completedToday },
          { label: 'Faol', value: profile.activeAssignments },
          { label: 'Jami', value: profile.totalDeliveredCount },
        ].map((s) => (
          <div key={s.label} className="courier-card-strong rounded-[22px] py-3 text-center courier-hoverable">
            <p className="text-[24px] font-black leading-none text-[var(--courier-text)]">{s.value}</p>
            <p className="mt-1 text-[11px] font-bold text-[var(--courier-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      {profile.activeAssignment ? (
        <button
          type="button"
          onClick={() => navigate(`/courier/order/${profile.activeAssignment?.orderId}`)}
          className="courier-floating-banner courier-hoverable flex w-full items-center justify-between rounded-[24px] px-4 py-3.5 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="courier-accent-pill flex h-10 w-10 items-center justify-center rounded-[14px]">
              <Navigation size={18} className="text-[var(--courier-accent-contrast)]" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-bold text-white/55">Faol topshiriq</p>
              <p className="text-[14px] font-black text-white">#{profile.activeAssignment.orderNumber}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-white" />
        </button>
      ) : null}

      {!isEditing ? (
        <div className="courier-card-strong rounded-[30px] p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="courier-label">Profil ma'lumotlari</p>
              <p className="mt-2 text-[13px] font-semibold text-[var(--courier-muted)]">
                O'zgartirish uchun avval tahrirlash rejimini oching
              </p>
            </div>
            <button
              type="button"
              onClick={openEdit}
              className="courier-cta-primary flex h-11 shrink-0 items-center gap-2 rounded-[16px] px-4 text-[12px] font-black active:scale-95"
            >
              <PencilLine size={15} />
              Tahrirlash
            </button>
          </div>

          {saved ? (
            <div className="flex items-center gap-2 rounded-[18px] bg-emerald-50 px-4 py-2.5 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200">
              <CheckCircle2 size={16} />
              <p className="text-[13px] font-bold">Ma'lumotlar saqlandi</p>
            </div>
          ) : null}

          <div className="grid gap-2">
            <div className="courier-soft-surface rounded-[20px] px-4 py-3">
              <p className="courier-label">Ism-familya</p>
              <p className="mt-2 text-[14px] font-black text-[var(--courier-text)]">{profile.fullName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="courier-soft-surface min-w-0 rounded-[20px] px-4 py-3">
                <p className="courier-label">Telefon</p>
                <p className="mt-2 truncate text-[13px] font-black text-[var(--courier-text)]">{profile.phoneNumber || 'Kiritilmagan'}</p>
              </div>
              <div className="courier-soft-surface min-w-0 rounded-[20px] px-4 py-3">
                <p className="courier-label">Telegram</p>
                <p className="mt-2 truncate text-[13px] font-black text-[var(--courier-text)]">{profile.telegramUsername || "Username yo'q"}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="courier-card-strong rounded-[30px] p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="courier-label">Ma'lumotlarni tahrirlash</p>
              <p className="mt-2 text-[13px] font-semibold text-[var(--courier-muted)]">Saqlagandan keyin forma avtomatik yopiladi</p>
            </div>
            <button
              type="button"
              onClick={closeEdit}
              disabled={updateProfile.isPending}
              className="courier-topbar-button flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-50"
              aria-label="Tahrirlashni yopish"
            >
              <X size={18} />
            </button>
          </div>

          <label className="block">
            <span className="text-[12px] font-bold text-[var(--courier-muted)]">Ism-familya</span>
            <input
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              className="mt-1.5 h-12 w-full rounded-[18px] border border-[var(--courier-line)] bg-black/4 px-4 text-[14px] font-semibold text-[var(--courier-text)] outline-none focus:border-[var(--courier-accent-strong)] dark:bg-white/5"
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-bold text-[var(--courier-muted)]">Telefon</span>
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="+998901234567"
              className="mt-1.5 h-12 w-full rounded-[18px] border border-[var(--courier-line)] bg-black/4 px-4 text-[14px] font-semibold text-[var(--courier-text)] outline-none placeholder:text-[var(--courier-muted)] focus:border-[var(--courier-accent-strong)] dark:bg-white/5"
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-bold text-[var(--courier-muted)]">Telegram username</span>
            <input
              value={form.telegramUsername}
              onChange={(e) => setForm((prev) => ({ ...prev, telegramUsername: e.target.value }))}
              placeholder="@username"
              className="mt-1.5 h-12 w-full rounded-[18px] border border-[var(--courier-line)] bg-black/4 px-4 text-[14px] font-semibold text-[var(--courier-text)] outline-none placeholder:text-[var(--courier-muted)] focus:border-[var(--courier-accent-strong)] dark:bg-white/5"
            />
          </label>

          <div>
            <span className="text-[12px] font-bold text-[var(--courier-muted)]">Telegram ID</span>
            <div className="mt-1.5 flex h-12 items-center rounded-[18px] border border-[var(--courier-line)] bg-black/5 px-4 text-[14px] font-semibold text-[var(--courier-muted)] dark:bg-white/5">
              {profile.telegramId}
            </div>
          </div>

          {saveError ? <p className="px-1 text-[12px] text-red-500">{saveError}</p> : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="courier-cta-primary flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[14px] font-black disabled:opacity-50"
          >
            {updateProfile.isPending ? <Loader2 size={18} className="animate-spin" /> : <><Save size={17} />Saqlash</>}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="courier-card-strong rounded-[22px] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Phone size={15} className="text-[var(--courier-muted)]" />
            <p className="courier-label">Aloqa</p>
          </div>
          <p className="text-[13px] font-black text-[var(--courier-text)] truncate">{profile.phoneNumber || 'Kiritilmagan'}</p>
          <p className="mt-0.5 truncate text-[11px] text-[var(--courier-muted)]">{profile.telegramUsername || "Username yo'q"}</p>
        </div>

        <div className="courier-card-strong rounded-[22px] p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck size={15} className="text-[var(--courier-muted)]" />
            <p className="courier-label">Akkaunt</p>
          </div>
          <p className={`text-[13px] font-black ${profile.isActive ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-500 dark:text-red-300'}`}>
            {profile.isActive ? 'Faol' : 'Bloklangan'}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--courier-muted)]">{formatClock(profile.createdAt)}</p>
        </div>
      </div>
    </div>
  );
};

export default CourierProfilePage;

