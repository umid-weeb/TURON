import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers3, Loader2, Save, Sparkles, Trash2, X } from 'lucide-react';
import type { CategoryFormData, MenuCategory } from '../types';

interface Props {
  initialData?: MenuCategory;
  onSubmit: (data: CategoryFormData) => Promise<void> | void;
  title: string;
  error?: string | null;
  isSubmitting?: boolean;
  onDelete?: () => Promise<void> | void;
  isDeleting?: boolean;
}

const CategoryForm: React.FC<Props> = ({
  initialData,
  onSubmit,
  title,
  error,
  isSubmitting = false,
  onDelete,
  isDeleting = false,
}) => {
  const navigate = useNavigate();
  const [name, setName] = useState(initialData?.name || '');
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder || 1);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keyboardInset, setKeyboardInset] = useState(0);

  React.useEffect(() => {
    const updateKeyboardInset = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const inset = Math.max(0, Math.round(window.innerHeight - viewportHeight));
      setKeyboardInset(inset > 120 ? inset : 0);
    };

    updateKeyboardInset();
    window.visualViewport?.addEventListener('resize', updateKeyboardInset);
    window.visualViewport?.addEventListener('scroll', updateKeyboardInset);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardInset);
    };
  }, []);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name = 'Kategoriya nomi kiritilishi shart';
    }

    if (sortOrder < 0) {
      nextErrors.sortOrder = 'Tartib raqami musbat bo\'lishi kerak';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate() || isSubmitting) {
      return;
    }

    await onSubmit({
      name: name.trim(),
      sortOrder,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in duration-300">
      <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom,0px)+108px)]">
        <header className="admin-pro-card admin-hero-card overflow-hidden px-5 py-5 text-[#fff8e9]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#ffe8a3]">
                <Layers3 size={13} />
                Kategoriya formi
              </span>
              <h2 className="mt-4 text-[30px] font-black tracking-tight">{title}</h2>
              <p className="mt-1 max-w-[260px] text-sm font-medium text-[#f5e7bf]/86">
                Menyu bo&apos;limini aniq tartib va ko&apos;rinish bilan boshqaring.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-[#fff4cf] shadow-[0_14px_30px_rgba(0,0,0,0.2)] transition hover:bg-white/16 active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {error ? (
          <div className="admin-pro-card rounded-[28px] border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,245,246,0.98)_0%,rgba(255,237,240,0.92)_100%)] px-4 py-3 shadow-[0_16px_34px_rgba(244,63,94,0.12)]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-500">Xatolik</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-rose-700">{error}</p>
          </div>
        ) : null}

        <div className="admin-pro-card admin-pro-card-muted rounded-[28px] px-4 py-4">
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
            <Sparkles size={14} className="text-[var(--admin-pro-primary-strong)]" />
            Eslatma
          </p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--admin-pro-text-muted)]">
            Kategoriya rasmi mahsulot kartalaridagi birinchi rasm asosida ko'rsatiladi.
          </p>
        </div>

        <section className="admin-pro-card space-y-4 rounded-[32px] px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--admin-pro-text-muted)]">
                Asosiy ma&apos;lumot
              </p>
              <h3 className="mt-2 text-lg font-black tracking-tight text-[var(--admin-pro-text)]">
                Kategoriya parametrlari
              </h3>
            </div>
            <div className="rounded-2xl border border-[var(--admin-pro-line)] bg-[rgba(255,249,233,0.86)] px-3 py-2 text-right shadow-[0_14px_28px_rgba(74,56,16,0.08)]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
                Status
              </p>
              <p className="mt-1 text-sm font-black text-[var(--admin-pro-text)]">
                {isActive ? 'Faol' : 'Nofaol'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="admin-label !mb-2 !pl-0">Kategoriya nomi *</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Masalan: Somsa"
              className={`admin-input h-14 ${
                errors.name
                  ? 'border-red-300 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]'
                  : 'focus:border-[rgba(255,190,11,0.66)]'
              }`}
            />
            {errors.name ? <p className="text-xs font-medium text-red-500">{errors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="admin-label !mb-2 !pl-0">Tartib raqami</label>
            <input
              type="number"
              inputMode="numeric"
              value={sortOrder}
              onChange={(event) => setSortOrder(parseInt(event.target.value, 10) || 0)}
              min={0}
              className={`admin-input h-14 ${
                errors.sortOrder
                  ? 'border-red-300 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]'
                  : 'focus:border-[rgba(255,190,11,0.66)]'
              }`}
            />
            {errors.sortOrder ? (
              <p className="text-xs font-medium text-red-500">{errors.sortOrder}</p>
            ) : null}
          </div>
        </section>

        <div className="admin-pro-card rounded-[30px] px-4 py-4">
          <div className="flex items-center justify-between gap-3 rounded-[24px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,252,244,0.98)_0%,rgba(252,244,220,0.96)_100%)] px-4 py-4 shadow-[0_14px_30px_rgba(74,56,16,0.08)]">
          <div>
            <p className="text-sm font-black text-[var(--admin-pro-text)]">Faol holat</p>
            <p className="mt-0.5 text-xs font-semibold text-[var(--admin-pro-text-muted)]">
              Nofaol kategoriya mijozlarga ko&apos;rinmaydi
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full p-1 transition ${
              isActive
                ? 'bg-[linear-gradient(135deg,var(--admin-pro-primary)_0%,var(--admin-pro-primary-strong)_100%)] shadow-[0_10px_22px_rgba(255,190,11,0.28)]'
                : 'bg-[#c9bf9f]'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white shadow-[0_6px_16px_rgba(74,56,16,0.22)] transition ${
                isActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          </div>
        </div>

        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            disabled={isSubmitting || isDeleting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[22px] border border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,247,247,0.96)_0%,rgba(255,237,237,0.94)_100%)] text-sm font-black text-rose-600 shadow-[0_14px_30px_rgba(244,63,94,0.08)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={16} />}
            Kategoriyani o&apos;chirish
          </button>
        ) : null}
      </div>

      <div
        className="fixed inset-x-0 z-40 mx-auto w-full max-w-[430px] border-t border-[var(--admin-pro-line)] bg-[rgba(255,251,240,0.92)] px-4 py-3 backdrop-blur-xl"
        style={{
          bottom: `${Math.max(0, keyboardInset - 6)}px`,
          paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 12px)`,
        }}
      >
        <button
          type="submit"
          disabled={isSubmitting || isDeleting}
          className="admin-btn-save h-14 max-w-none rounded-[22px] text-[13px] disabled:opacity-60 disabled:shadow-none"
        >
          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Saqlash
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;
