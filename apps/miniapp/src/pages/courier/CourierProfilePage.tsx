import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
  Wifi,
} from 'lucide-react';
import { useCourierProfile, useUpdateCourierProfile } from '../../hooks/queries/useCouriers';

function formatClock(value?: string | null) {
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

const CourierProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading, error, refetch, isFetching } = useCourierProfile();
  const updateProfile = useUpdateCourierProfile();
  const [form, setForm] = React.useState({
    fullName: '',
    phoneNumber: '',
    telegramUsername: '',
  });
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profile) {
      return;
    }

    setForm({
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber || '',
      telegramUsername: profile.telegramUsername || '',
    });
  }, [profile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center px-6 py-24">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <Loader2 size={28} className="mx-auto animate-spin text-indigo-600" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-slate-500">
            Profil yuklanmoqda
          </p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="px-6 py-10">
        <div className="rounded-[32px] border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle size={30} />
          </div>
          <h3 className="mt-5 text-xl font-black tracking-tight text-slate-900">Profil yuklanmadi</h3>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            {(error as Error)?.message || "Server bilan bog'lanib bo'lmadi"}
          </p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-xs font-black uppercase tracking-[0.18em] text-white"
          >
            <Loader2 size={15} className={isFetching ? 'animate-spin' : ''} />
            <span>Qayta urinish</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    setFeedback(null);

    if (!form.fullName.trim()) {
      setFeedback("Ism-familya bo'sh bo'lmasligi kerak.");
      return;
    }

    updateProfile.mutate(form, {
      onSuccess: () => {
        setFeedback("Profil ma'lumotlari saqlandi.");
      },
      onError: (mutationError) => {
        setFeedback(mutationError instanceof Error ? mutationError.message : "Profilni saqlab bo'lmadi");
      },
    });
  };

  return (
    <div className="animate-in fade-in space-y-6 px-6 py-6 pb-36 duration-500">
      <section className="rounded-[34px] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_28%),linear-gradient(135deg,#0f172a_0%,#111827_100%)] p-6 text-white shadow-[0_28px_72px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">Courier profile</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{profile.fullName}</h1>
            <p className="mt-3 max-w-[320px] text-sm font-semibold leading-relaxed text-white/72">
              Shaxsiy ma'lumotlar, ish holati va bugungi natijalarni bir joyda kuzating.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">Bugun</p>
            <p className="mt-2 text-2xl font-black text-white">{profile.completedToday}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <SummaryCard label="Faol" value={profile.activeAssignments.toString()} />
          <SummaryCard label="Jami" value={profile.totalDeliveredCount.toString()} />
          <SummaryCard label="Online" value={profile.isOnline ? 'Ha' : "Yo'q"} />
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <User size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Profil ma'lumotlari</p>
            <p className="mt-1 text-lg font-black text-slate-900">Kuryer akkaunti</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InputField label="Ism-familya" value={form.fullName} onChange={(value) => setForm((current) => ({ ...current, fullName: value }))} />
          <InputField label="Telegram username" value={form.telegramUsername} onChange={(value) => setForm((current) => ({ ...current, telegramUsername: value }))} placeholder="@ali_mirza" />
          <InputField label="Telefon" value={form.phoneNumber} onChange={(value) => setForm((current) => ({ ...current, phoneNumber: value }))} placeholder="+998901234567" />
          <StaticField label="Telegram ID" value={profile.telegramId} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-[11px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
          >
            {updateProfile.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Saqlash</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/courier/history')}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 px-5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700"
          >
            <ArrowRight size={16} />
            <span>Tarixni ochish</span>
          </button>
        </div>

        {feedback ? <p className="mt-4 text-sm font-semibold text-slate-600">{feedback}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <InfoCard
          icon={<Wifi size={18} />}
          label="Ish holati"
          value={
            profile.isOnline
              ? profile.isAcceptingOrders
                ? "Online va qabul ochiq"
                : 'Online, lekin qabul yopiq'
              : 'Offline'
          }
          helper={`Oxirgi online: ${formatClock(profile.lastOnlineAt)}`}
        />
        <InfoCard
          icon={<MapPin size={18} />}
          label="Oxirgi lokatsiya"
          value={profile.latestPresence ? `${profile.latestPresence.latitude.toFixed(5)}, ${profile.latestPresence.longitude.toFixed(5)}` : "Hali yo'q"}
          helper={`Yangilangan: ${formatClock(profile.lastSeenAt)}`}
        />
        <InfoCard
          icon={<Phone size={18} />}
          label="Aloqa"
          value={profile.phoneNumber || "Telefon kiritilmagan"}
          helper={`Telegram: ${profile.telegramUsername || "@yo'q"}`}
        />
        <InfoCard
          icon={<ShieldCheck size={18} />}
          label="Tizim holati"
          value={profile.isActive ? 'Faol akkaunt' : 'Noaktiv akkaunt'}
          helper={`Yaratilgan: ${formatClock(profile.createdAt)}`}
        />
      </section>

      {profile.activeAssignment ? (
        <section className="rounded-[30px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Faol topshiriq</p>
          <p className="mt-2 text-lg font-black text-emerald-900">#{profile.activeAssignment.orderNumber}</p>
          <p className="mt-2 text-sm font-semibold text-emerald-800">
            Status: {profile.activeAssignment.assignmentStatus}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/courier/order/${profile.activeAssignment?.orderId}`)}
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white"
          >
            <ArrowRight size={14} />
            <span>Topshiriqqa o'tish</span>
          </button>
        </section>
      ) : null}
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4">
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">{label}</p>
    <p className="mt-2 text-2xl font-black text-white">{value}</p>
  </div>
);

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none"
    />
  </label>
);

const StaticField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
    <div className="mt-2 flex h-12 items-center rounded-[18px] border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-700">
      {value}
    </div>
  </div>
);

const InfoCard: React.FC<{ icon: React.ReactNode; label: string; value: string; helper: string }> = ({
  icon,
  label,
  value,
  helper,
}) => (
  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-1 text-base font-black text-slate-900">{value}</p>
      </div>
    </div>
    <p className="mt-3 text-xs font-semibold text-slate-500">{helper}</p>
  </div>
);

export default CourierProfilePage;
