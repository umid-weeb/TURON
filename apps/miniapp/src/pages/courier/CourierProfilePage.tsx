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
  if (!value) return "—";
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
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <p className="text-[13px] font-bold text-slate-400">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="px-5 py-10">
        <div className="rounded-[26px] border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertCircle size={28} className="mx-auto text-red-400" />
          <p className="mt-4 text-[15px] font-black text-slate-900">Profil yuklanmadi</p>
          <p className="mt-2 text-[13px] text-slate-500">
            {(error as Error)?.message || "Server bilan bog'lanib bo'lmadi"}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 flex h-12 items-center gap-2 rounded-[18px] bg-slate-900 px-5 text-[13px] font-black text-white mx-auto active:scale-95 transition-transform"
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
      onError: (err) =>
        setSaveError(err instanceof Error ? err.message : "Saqlab bo'lmadi"),
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

  // Initials
  const initials = profile.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'K';

  const statusLabel = profile.isOnline
    ? profile.isAcceptingOrders
      ? 'Faol — buyurtma qabul qilmoqda'
      : 'Onlayn — qabul yopiq'
    : 'Offline';

  return (
    <div className="space-y-3 px-4 py-5 pb-32">

      {/* ── Avatar + name + status ───────────────────────────────────── */}
      <div className="flex items-center gap-4 rounded-[26px] bg-white border border-slate-100 shadow-sm p-5">
        <div className="relative shrink-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-[20px] font-black text-white">
            {initials}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${
              profile.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[19px] font-black leading-tight text-slate-900">{profile.fullName}</p>
          <p className={`mt-0.5 text-[13px] font-semibold ${profile.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
            {statusLabel}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Oxirgi faollik: {formatClock(profile.lastSeenAt)}
          </p>
        </div>
      </div>

      {/* ── Quick stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Bugun', value: profile.completedToday },
          { label: 'Faol', value: profile.activeAssignments },
          { label: 'Jami', value: profile.totalDeliveredCount },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[18px] bg-white border border-slate-100 shadow-sm py-3 text-center"
          >
            <p className="text-[24px] font-black leading-none text-slate-900">{s.value}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Active assignment shortcut ───────────────────────────────── */}
      {profile.activeAssignment && (
        <button
          type="button"
          onClick={() => navigate(`/courier/order/${profile.activeAssignment?.orderId}`)}
          className="flex w-full items-center justify-between rounded-[18px] bg-emerald-500 px-4 py-3.5 shadow-md shadow-emerald-200 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <Navigation size={18} className="text-white" />
            <div className="text-left">
              <p className="text-[11px] font-bold text-emerald-100">Faol topshiriq</p>
              <p className="text-[14px] font-black text-white">
                #{profile.activeAssignment.orderNumber}
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="text-white" />
        </button>
      )}

      {/* ── Edit form ────────────────────────────────────────────────── */}
      {!isEditing ? (
        <div className="rounded-[26px] bg-white border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Profil ma'lumotlari
              </p>
              <p className="mt-1 text-[13px] font-semibold text-slate-500">
                O'zgartirish uchun avval tahrirlash rejimini oching
              </p>
            </div>
            <button
              type="button"
              onClick={openEdit}
              className="flex h-10 shrink-0 items-center gap-2 rounded-[15px] bg-indigo-50 px-3 text-[12px] font-black text-indigo-600 active:scale-95 transition-transform"
            >
              <PencilLine size={15} />
              Tahrirlash
            </button>
          </div>

          {saved && (
            <div className="flex items-center gap-2 rounded-[18px] bg-emerald-50 px-4 py-2.5">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <p className="text-[13px] font-bold text-emerald-700">Ma'lumotlar saqlandi</p>
            </div>
          )}

          <div className="grid gap-2">
            <div className="rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ism-familya</p>
              <p className="mt-1 text-[14px] font-black text-slate-900">{profile.fullName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Telefon</p>
                <p className="mt-1 truncate text-[13px] font-black text-slate-900">
                  {profile.phoneNumber || "Kiritilmagan"}
                </p>
              </div>
              <div className="min-w-0 rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Telegram</p>
                <p className="mt-1 truncate text-[13px] font-black text-slate-900">
                  {profile.telegramUsername || "Username yo'q"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[26px] bg-white border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Ma'lumotlarni tahrirlash
              </p>
              <p className="mt-1 text-[13px] font-semibold text-slate-500">
                Saqlagandan keyin forma avtomatik yopiladi
              </p>
            </div>
            <button
              type="button"
              onClick={closeEdit}
              disabled={updateProfile.isPending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-95 transition-transform disabled:opacity-50"
              aria-label="Tahrirlashni yopish"
            >
              <X size={18} />
            </button>
          </div>

          <label className="block">
            <span className="text-[12px] font-bold text-slate-500">Ism-familya</span>
            <input
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              className="mt-1.5 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-bold text-slate-500">Telefon</span>
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="+998901234567"
              className="mt-1.5 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-bold text-slate-500">Telegram username</span>
            <input
              value={form.telegramUsername}
              onChange={(e) => setForm((prev) => ({ ...prev, telegramUsername: e.target.value }))}
              placeholder="@username"
              className="mt-1.5 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>

          {/* Telegram ID (readonly) */}
          <div>
            <span className="text-[12px] font-bold text-slate-500">Telegram ID</span>
            <div className="mt-1.5 flex h-12 items-center rounded-[18px] border border-slate-100 bg-slate-100 px-4 text-[14px] font-semibold text-slate-500">
              {profile.telegramId}
            </div>
          </div>

          {saveError && (
            <p className="text-[12px] text-red-500 px-1">{saveError}</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-[18px] bg-slate-900 text-[14px] font-black text-white shadow-sm active:scale-[0.98] transition-transform disabled:opacity-50 py-3.5"
          >
            {updateProfile.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Save size={17} />
                Saqlash
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Info: contact + account ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[18px] bg-white border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone size={15} className="text-slate-400" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Aloqa</p>
          </div>
          <p className="text-[13px] font-black text-slate-900 truncate">
            {profile.phoneNumber || "Kiritilmagan"}
          </p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {profile.telegramUsername || "Username yo'q"}
          </p>
        </div>

        <div className="rounded-[18px] bg-white border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={15} className="text-slate-400" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Akkaunt</p>
          </div>
          <p className={`text-[13px] font-black ${profile.isActive ? 'text-emerald-700' : 'text-red-500'}`}>
            {profile.isActive ? 'Faol' : 'Bloklangan'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {formatClock(profile.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourierProfilePage;
