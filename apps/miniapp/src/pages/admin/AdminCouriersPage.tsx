import React from 'react';
import { AlertCircle, Loader2, Save, UserPlus, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import '../../styles/admin-overhaul.css';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  useAdminCourierDirectory,
  useCreateCourierByAdmin,
  useUpdateCourierByAdmin,
} from '../../hooks/queries/useCouriers';
import { AdminCourierRow } from '../../features/admin/couriers/AdminCourierRow';
import { AdminCouriersSkeleton } from '../../features/admin/couriers/AdminCouriersSkeleton';
import { AdminCouriersToolbar } from '../../features/admin/couriers/AdminCouriersToolbar';
import {
  buildCourierFilterOptions,
  buildCouriersSummary,
  formatLastSeen,
  matchesCourierFilter,
  matchesCourierSearch,
  resolveCourierFilter,
  sortCouriersForAdmin,
  type AdminCourierFilter,
} from '../../features/admin/couriers/adminCouriers.utils';
import type { AdminCourierDirectoryItem } from '../../data/types';

type CourierDraft = {
  fullName: string;
  phoneNumber: string;
  telegramUsername: string;
  isActive: boolean;
};

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="adminx-field">
      <span className="adminx-kicker text-[var(--adminx-color-faint)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="adminx-input"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="adminx-surface rounded-[18px] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[var(--adminx-color-ink)]">{label}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--adminx-color-muted)]">{checked ? 'Faol' : 'Nofaol'}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-7 w-12 items-center rounded-full p-1 transition ${checked ? 'bg-[var(--adminx-color-success)]' : 'bg-[rgba(28,18,7,0.16)]'}`}
        >
          <span className={`h-5 w-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  );
}

function BottomSheet({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [sheetHeight, setSheetHeight] = React.useState('86dvh');

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  React.useEffect(() => {
    const computeHeight = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        setSheetHeight('86dvh');
        return;
      }
      setSheetHeight(`${Math.max(420, Math.floor(viewport.height - 12))}px`);
    };

    computeHeight();
    window.visualViewport?.addEventListener('resize', computeHeight);
    window.visualViewport?.addEventListener('scroll', computeHeight);

    return () => {
      window.visualViewport?.removeEventListener('resize', computeHeight);
      window.visualViewport?.removeEventListener('scroll', computeHeight);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(21,17,11,0.34)] backdrop-blur-[4px]"
        onClick={onClose}
        aria-label="Yopish"
      />
      <div
        className="relative flex w-full max-w-[430px] flex-col rounded-t-[28px] border border-[rgba(28,18,7,0.08)] bg-[rgba(255,252,244,0.98)] shadow-[0_-22px_52px_rgba(74,56,16,0.18)]"
        style={{ height: sheetHeight, maxHeight: '86dvh' }}
      >
        <div className="px-5 pb-3 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[rgba(245,166,35,0.3)]" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-black tracking-[-0.03em] text-[var(--adminx-color-ink)]">{title}</p>
              {subtitle ? <p className="mt-1 text-xs font-semibold text-[var(--adminx-color-muted)]">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(28,18,7,0.08)] bg-white text-[var(--adminx-color-muted)]"
              aria-label="Yopish"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer ? (
          <div
            className="border-t border-[rgba(28,18,7,0.08)] bg-[rgba(255,252,244,0.98)] px-5 py-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminCouriersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [searchInput, setSearchInput] = React.useState(() => searchParams.get('q') ?? '');
  const [activeFilter, setActiveFilter] = React.useState<AdminCourierFilter>(() =>
    resolveCourierFilter(searchParams.get('status')),
  );
  const [activeModal, setActiveModal] = React.useState<
    | { type: 'create' }
    | { type: 'edit'; courierId: string }
    | null
  >(null);
  const [pendingCourierId, setPendingCourierId] = React.useState<string | null>(null);
  const [pendingToggleId, setPendingToggleId] = React.useState<string | null>(null);
  const [createForm, setCreateForm] = React.useState({
    telegramId: '',
    fullName: '',
    phoneNumber: '',
    telegramUsername: '',
    isActive: true,
  });
  const [editForms, setEditForms] = React.useState<Record<string, CourierDraft>>({});

  const debouncedQuery = useDebouncedValue(searchInput, 220);
  const { data: couriers = [], isLoading, error, refetch, isFetching } = useAdminCourierDirectory();
  const createCourier = useCreateCourierByAdmin();
  const updateCourier = useUpdateCourierByAdmin();
  const hasOpenModal = activeModal !== null;

  React.useEffect(() => {
    if (hasOpenModal) {
      document.body.setAttribute('data-admin-modal-open', '1');
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.removeAttribute('data-admin-modal-open');
        document.body.style.overflow = '';
      };
    }

    document.body.removeAttribute('data-admin-modal-open');
    document.body.style.overflow = '';

    return () => {
      document.body.removeAttribute('data-admin-modal-open');
      document.body.style.overflow = '';
    };
  }, [hasOpenModal]);

  React.useEffect(() => {
    const urlQuery = searchParams.get('q') ?? '';
    const urlFilter = resolveCourierFilter(searchParams.get('status'));
    setSearchInput((current) => (current === urlQuery ? current : urlQuery));
    setActiveFilter((current) => (current === urlFilter ? current : urlFilter));
  }, [searchParams]);

  React.useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (debouncedQuery.trim()) nextParams.set('q', debouncedQuery.trim());
    else nextParams.delete('q');

    if (activeFilter !== 'ALL') nextParams.set('status', activeFilter);
    else nextParams.delete('status');

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeFilter, debouncedQuery, searchParams, setSearchParams]);

  const sortedCouriers = React.useMemo(() => sortCouriersForAdmin(couriers), [couriers]);
  const filteredCouriers = React.useMemo(
    () => sortedCouriers.filter((courier) => matchesCourierFilter(courier, activeFilter) && matchesCourierSearch(courier, debouncedQuery)),
    [activeFilter, debouncedQuery, sortedCouriers],
  );
  const summary = React.useMemo(() => buildCouriersSummary(sortedCouriers), [sortedCouriers]);
  const filters = React.useMemo(() => buildCourierFilterOptions(sortedCouriers), [sortedCouriers]);

  const handleCreate = () => {
    setFeedback(null);

    if (!createForm.telegramId.trim() || !createForm.fullName.trim()) {
      setFeedback('Telegram ID va ism kiritilishi shart.');
      return;
    }

    createCourier.mutate(createForm, {
      onSuccess: () => {
        setFeedback("Yangi kuryer qo'shildi.");
        setCreateForm({ telegramId: '', fullName: '', phoneNumber: '', telegramUsername: '', isActive: true });
        setActiveModal(null);
      },
      onError: (mutationError) => {
        setFeedback(mutationError instanceof Error ? mutationError.message : "Kuryerni yaratib bo'lmadi");
      },
    });
  };

  const startEditing = (courier: AdminCourierDirectoryItem) => {
    setFeedback(null);
    setEditForms((current) => ({
      ...current,
      [courier.id]: {
        fullName: courier.fullName,
        phoneNumber: courier.phoneNumber || '',
        telegramUsername: courier.telegramUsername || '',
        isActive: courier.isActive,
      },
    }));
    setActiveModal({ type: 'edit', courierId: courier.id });
  };

  const handleEditSave = (courierId: string) => {
    const draft = editForms[courierId];
    if (!draft?.fullName.trim()) {
      setFeedback("Kuryer ismi bo'sh bo'lmasligi kerak.");
      return;
    }

    setPendingCourierId(courierId);
    updateCourier.mutate(
      { id: courierId, payload: draft },
      {
        onSuccess: () => {
          setFeedback("Kuryer ma'lumotlari yangilandi.");
          setActiveModal(null);
          setPendingCourierId(null);
        },
        onError: (mutationError) => {
          setFeedback(mutationError instanceof Error ? mutationError.message : "Kuryerni yangilab bo'lmadi");
          setPendingCourierId(null);
        },
      },
    );
  };

  if (isLoading) {
    return <AdminCouriersSkeleton />;
  }

  if (error) {
    return (
      <div className="adminx-page pb-[calc(env(safe-area-inset-bottom,0px)+108px)]">
        <div className="adminx-surface flex min-h-[340px] flex-col items-center justify-center rounded-[24px] px-6 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[rgba(255,244,242,0.95)] text-[var(--adminx-color-danger)]">
            <AlertCircle size={28} />
          </div>
          <h2 className="mt-5 text-xl font-black tracking-[-0.04em] text-[var(--adminx-color-ink)]">Kuryerlar ochilmadi</h2>
          <p className="mt-2 max-w-[260px] text-sm font-semibold text-[var(--adminx-color-muted)]">
            {error instanceof Error ? error.message : 'Server bilan aloqa tiklanmadi'}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,var(--adminx-color-primary)_0%,var(--adminx-color-primary-dark)_100%)] px-5 text-sm font-black text-[var(--adminx-color-dark)] shadow-[var(--adminx-shadow-glow)]"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="adminx-page space-y-3 pb-[calc(env(safe-area-inset-bottom,0px)+108px)]">
      <AdminCouriersToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchClear={() => setSearchInput('')}
        filters={filters}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        summary={summary}
        onRefresh={() => void refetch()}
        onCreate={() => {
          setFeedback(null);
          setActiveModal({ type: 'create' });
        }}
        isFetching={isFetching}
      />

      {feedback ? (
        <div className="adminx-surface rounded-[18px] px-4 py-3 text-sm font-semibold text-[var(--adminx-color-ink)]">
          {feedback}
        </div>
      ) : null}

      {filteredCouriers.length === 0 ? (
        <div className="adminx-surface flex flex-col items-center justify-center rounded-[24px] px-6 py-16 text-center">
          <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--adminx-color-ink)]">Kuryer topilmadi</h3>
          <p className="mt-2 text-sm font-semibold text-[var(--adminx-color-muted)]">Qidiruv yoki filtrni o'zgartiring</p>
          {(debouncedQuery.trim() || activeFilter !== 'ALL') ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setActiveFilter('ALL');
              }}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[16px] border border-[rgba(28,18,7,0.08)] bg-white px-5 text-sm font-black text-[var(--adminx-color-ink)]"
            >
              Tozalash
            </button>
          ) : null}
        </div>
      ) : (
        <section className="space-y-2.5">
          {filteredCouriers.map((courier, index) => (
            <AdminCourierRow
              key={courier.id}
              courier={courier}
              index={index}
              isTogglePending={pendingToggleId === courier.id}
              onEdit={() => startEditing(courier)}
              onToggle={() => {
                setFeedback(null);
                setPendingToggleId(courier.id);
                updateCourier.mutate(
                  { id: courier.id, payload: { isActive: !courier.isActive } },
                  {
                    onSuccess: () => {
                      setFeedback(courier.isActive ? 'Kuryer faolsizlantirildi.' : 'Kuryer faollashtirildi.');
                      setPendingToggleId(null);
                    },
                    onError: (mutationError) => {
                      setFeedback(mutationError instanceof Error ? mutationError.message : "Holatni o'zgartirib bo'lmadi");
                      setPendingToggleId(null);
                    },
                  },
                );
              }}
            />
          ))}
        </section>
      )}

      {activeModal?.type === 'create' ? (
        <BottomSheet title="Yangi kuryer" onClose={() => setActiveModal(null)}>
          <div className="grid gap-3">
            <InputField
              label="Telegram ID"
              value={createForm.telegramId}
              onChange={(value) => setCreateForm((current) => ({ ...current, telegramId: value }))}
              placeholder="123456789"
            />
            <InputField
              label="Telegram nomi"
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
            <ToggleField
              label="Faol kuryer"
              checked={createForm.isActive}
              onChange={(checked) => setCreateForm((current) => ({ ...current, isActive: checked }))}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={createCourier.isPending}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--adminx-color-primary)_0%,var(--adminx-color-primary-dark)_100%)] px-4 text-sm font-black text-[var(--adminx-color-dark)] shadow-[var(--adminx-shadow-glow)] disabled:opacity-60"
            >
              {createCourier.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Saqlash
            </button>
          </div>
        </BottomSheet>
      ) : null}

      {activeModal?.type === 'edit' ? (
        <BottomSheet
          title="Kuryerni tahrirlash"
          subtitle={formatLastSeen(couriers.find((item) => item.id === activeModal.courierId)?.updatedAt)}
          onClose={() => setActiveModal(null)}
          footer={(() => {
            const courier = couriers.find((item) => item.id === activeModal.courierId);
            const isSaving = pendingCourierId === activeModal.courierId;
            if (!courier) return null;

            return (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-[16px] border border-[rgba(28,18,7,0.08)] bg-white px-4 text-sm font-black text-[var(--adminx-color-ink)]"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={() => handleEditSave(courier.id)}
                  disabled={isSaving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--adminx-color-primary)_0%,var(--adminx-color-primary-dark)_100%)] px-4 text-sm font-black text-[var(--adminx-color-dark)] shadow-[var(--adminx-shadow-glow)] disabled:opacity-60"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Saqlash
                </button>
              </div>
            );
          })()}
        >
          {(() => {
            const courier = couriers.find((item) => item.id === activeModal.courierId);
            const draft = editForms[activeModal.courierId];

            if (!courier || !draft) {
              return (
                <div className="adminx-surface rounded-[18px] px-4 py-4 text-sm font-semibold text-[var(--adminx-color-muted)]">
                  Ma'lumot tayyorlanmadi. Qayta urinib ko'ring.
                </div>
              );
            }

            return (
              <div className="grid gap-3">
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
                  label="Telegram nomi"
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
                <ToggleField
                  label="Kuryer holati"
                  checked={draft.isActive}
                  onChange={(checked) =>
                    setEditForms((current) => ({
                      ...current,
                      [courier.id]: { ...current[courier.id], isActive: checked },
                    }))
                  }
                />
              </div>
            );
          })()}
        </BottomSheet>
      ) : null}
    </div>
  );
}
