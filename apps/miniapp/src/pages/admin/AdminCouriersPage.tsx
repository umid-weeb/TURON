import React from 'react';
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Truck,
  UserPlus,
  Wifi,
} from 'lucide-react';
import {
  useAdminCourierDirectory,
  useCreateCourierByAdmin,
  useUpdateCourierByAdmin,
} from '../../hooks/queries/useCouriers';
import type { AdminCourierDirectoryItem } from '../../data/types';

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

const AdminCouriersPage: React.FC = () => {
  const { data: couriers = [], isLoading, error, refetch, isFetching } = useAdminCourierDirectory();
  const createCourier = useCreateCourierByAdmin();
  const updateCourier = useUpdateCourierByAdmin();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingCourierId, setEditingCourierId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [createForm, setCreateForm] = React.useState({
    telegramId: '',
    fullName: '',
    phoneNumber: '',
    telegramUsername: '',
    isActive: true,
  });
  const [editForms, setEditForms] = React.useState<Record<string, {
    fullName: string;
    phoneNumber: string;
    telegramUsername: string;
    isActive: boolean;
  }>>({});

  const onlineCount = couriers.filter((courier) => courier.isOnline).length;
  const acceptingCount = couriers.filter((courier) => courier.isAcceptingOrders).length;
  const activeAssignments = couriers.reduce((sum, courier) => sum + courier.activeAssignments, 0);

  const handleCreate = () => {
    setFeedback(null);

    if (!createForm.telegramId.trim() || !createForm.fullName.trim()) {
      setFeedback("Telegram ID va ism kiritilishi shart.");
      return;
    }

    createCourier.mutate(createForm, {
      onSuccess: () => {
        setFeedback("Yangi kuryer qo'shildi.");
        setCreateForm({
          telegramId: '',
          fullName: '',
          phoneNumber: '',
          telegramUsername: '',
          isActive: true,
        });
        setIsCreateOpen(false);
      },
      onError: (mutationError) => {
        setFeedback(mutationError instanceof Error ? mutationError.message : "Kuryerni yaratib bo'lmadi");
      },
    });
  };

  const startEditing = (courier: AdminCourierDirectoryItem) => {
    setEditingCourierId(courier.id);
    setEditForms((current) => ({
      ...current,
      [courier.id]: {
        fullName: courier.fullName,
        phoneNumber: courier.phoneNumber || '',
        telegramUsername: courier.telegramUsername || '',
        isActive: courier.isActive,
      },
    }));
  };

  const handleEditSave = (courierId: string) => {
    const draft = editForms[courierId];

    if (!draft?.fullName.trim()) {
      setFeedback("Kuryer ismi bo'sh bo'lmasligi kerak.");
      return;
    }

    updateCourier.mutate(
      {
        id: courierId,
        payload: draft,
      },
      {
        onSuccess: () => {
          setFeedback("Kuryer ma'lumotlari yangilandi.");
          setEditingCourierId(null);
        },
        onError: (mutationError) => {
          setFeedback(mutationError instanceof Error ? mutationError.message : "Kuryerni yangilab bo'lmadi");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <Loader2 size={28} className="mx-auto animate-spin text-sky-600" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-slate-500">
            Kuryerlar yuklanmoqda
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[32px] border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertCircle size={30} />
        </div>
        <h3 className="mt-5 text-xl font-black tracking-tight text-slate-900">Kuryerlar yuklanmadi</h3>
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
    );
  }

  return (
    <div className="space-y-6 pb-36">
      <section className="rounded-[34px] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_28%),linear-gradient(135deg,#0f172a_0%,#111827_100%)] p-6 text-white shadow-[0_28px_72px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">Courier management</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Kuryerlar</h1>
            <p className="mt-3 max-w-[320px] text-sm font-semibold leading-relaxed text-white/72">
              Yangi kuryer qo'shing, faol holatini boshqaring va operatsion yuklamani bir joydan kuzating.
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
          <SummaryCard label="Jami" value={couriers.length.toString()} icon={<Truck size={18} />} />
          <SummaryCard label="Online" value={onlineCount.toString()} icon={<Wifi size={18} />} />
          <SummaryCard label="Faol topshiriq" value={activeAssignments.toString()} icon={<ShieldCheck size={18} />} />
        </div>

        <div className="mt-4 rounded-[24px] border border-white/10 bg-white/10 px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">Qabul ochiq</p>
          <p className="mt-2 text-xl font-black text-white">{acceptingCount} ta kuryer yangi buyurtma oladi</p>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Yangi kuryer</p>
            <p className="mt-1 text-lg font-black text-slate-900">Bot orqali role-safe kiradi</p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen((current) => !current)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white"
          >
            <Plus size={15} />
            <span>{isCreateOpen ? 'Yopish' : "Kuryer qo'shish"}</span>
          </button>
        </div>

        {isCreateOpen ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InputField
              label="Telegram ID"
              value={createForm.telegramId}
              onChange={(value) => setCreateForm((current) => ({ ...current, telegramId: value }))}
              placeholder="123456789"
            />
            <InputField
              label="Telegram username"
              value={createForm.telegramUsername}
              onChange={(value) => setCreateForm((current) => ({ ...current, telegramUsername: value }))}
              placeholder="@ali_mirza"
            />
            <InputField
              label="Ism-familya"
              value={createForm.fullName}
              onChange={(value) => setCreateForm((current) => ({ ...current, fullName: value }))}
              placeholder="Ali Mirza"
            />
            <InputField
              label="Telefon"
              value={createForm.phoneNumber}
              onChange={(value) => setCreateForm((current) => ({ ...current, phoneNumber: value }))}
              placeholder="+998901234567"
            />
            <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={createForm.isActive}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              <span>Faol kuryer sifatida qo'shilsin</span>
            </label>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createCourier.isPending}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[20px] bg-emerald-600 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
            >
              {createCourier.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              <span>Saqlash</span>
            </button>
          </div>
        ) : null}

        {feedback ? (
          <p className="mt-4 text-sm font-semibold text-slate-600">{feedback}</p>
        ) : null}
      </section>

      <section className="space-y-4">
        {couriers.map((courier) => {
          const isEditing = editingCourierId === courier.id;
          const draft = editForms[courier.id];

          return (
            <article
              key={courier.id}
              className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {courier.telegramUsername || `Telegram ID ${courier.telegramId}`}
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                    {courier.fullName}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {courier.phoneNumber || "Telefon yo'q"}
                  </p>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <StatusChip tone={courier.isActive ? 'emerald' : 'slate'} label={courier.isActive ? 'Faol' : 'Nofaol'} />
                  <StatusChip tone={courier.isOnline ? 'sky' : 'slate'} label={courier.isOnline ? 'Online' : 'Offline'} />
                  <StatusChip tone={courier.isAcceptingOrders ? 'amber' : 'slate'} label={courier.isAcceptingOrders ? 'Qabul ochiq' : 'Qabul yopiq'} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricTile label="Faol topshiriq" value={courier.activeAssignments.toString()} />
                <MetricTile label="Bugun tugadi" value={courier.completedToday.toString()} />
                <MetricTile label="Jami yetkazdi" value={courier.totalDelivered.toString()} />
                <MetricTile label="Bugungi fee" value={`${courier.deliveryFeesToday.toLocaleString('uz-UZ')} so'm`} />
              </div>

              <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-500 md:grid-cols-2">
                <p>Oxirgi online: {formatClock(courier.lastOnlineAt)}</p>
                <p>Oxirgi lokatsiya: {formatClock(courier.lastSeenAt)}</p>
                <p>Tizimga qo'shilgan: {formatClock(courier.createdAt)}</p>
                <p>Oxirgi topshirish: {formatClock(courier.lastDeliveredAt)}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => (isEditing ? setEditingCourierId(null) : startEditing(courier))}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700"
                >
                  <Save size={14} />
                  <span>{isEditing ? 'Yopish' : 'Tahrirlash'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateCourier.mutate({
                      id: courier.id,
                      payload: { isActive: !courier.isActive },
                    })
                  }
                  disabled={updateCourier.isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
                >
                  {updateCourier.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  <span>{courier.isActive ? 'Noaktiv qilish' : 'Faollashtirish'}</span>
                </button>
              </div>

              {isEditing && draft ? (
                <div className="mt-4 grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                  <InputField
                    label="Ism-familya"
                    value={draft.fullName}
                    onChange={(value) =>
                      setEditForms((current) => ({
                        ...current,
                        [courier.id]: { ...current[courier.id], fullName: value },
                      }))
                    }
                  />
                  <InputField
                    label="Telegram username"
                    value={draft.telegramUsername}
                    onChange={(value) =>
                      setEditForms((current) => ({
                        ...current,
                        [courier.id]: { ...current[courier.id], telegramUsername: value },
                      }))
                    }
                  />
                  <InputField
                    label="Telefon"
                    value={draft.phoneNumber}
                    onChange={(value) =>
                      setEditForms((current) => ({
                        ...current,
                        [courier.id]: { ...current[courier.id], phoneNumber: value },
                      }))
                    }
                  />
                  <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={draft.isActive}
                      onChange={(event) =>
                        setEditForms((current) => ({
                          ...current,
                          [courier.id]: { ...current[courier.id], isActive: event.target.checked },
                        }))
                      }
                    />
                    <span>Faol kuryer</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleEditSave(courier.id)}
                    disabled={updateCourier.isPending}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-[20px] bg-emerald-600 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
                  >
                    {updateCourier.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>Yangilash</span>
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">{label}</p>
      <div className="text-white/80">{icon}</div>
    </div>
    <p className="mt-2 text-2xl font-black text-white">{value}</p>
  </div>
);

const StatusChip: React.FC<{ tone: 'emerald' | 'sky' | 'amber' | 'slate'; label: string }> = ({
  tone,
  label,
}) => {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'sky'
        ? 'bg-sky-50 text-sky-700'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-slate-100 text-slate-500';

  return <span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${toneClass}`}>{label}</span>;
};

const MetricTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[22px] bg-slate-50 px-4 py-4">
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
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
      className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none"
    />
  </label>
);

export default AdminCouriersPage;
