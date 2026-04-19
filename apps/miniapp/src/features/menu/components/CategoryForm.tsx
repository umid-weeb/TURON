import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save, X } from 'lucide-react';
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-500">Xatolik</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-rose-700">{error}</p>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Eslatma</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
            Kategoriya rasmi mahsulot kartalaridagi birinchi rasm asosida ko'rsatiladi.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Kategoriya nomi *</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Masalan: Somsa"
              className={`h-14 w-full rounded-xl border px-4 text-base font-medium text-slate-800 outline-none transition ${
                errors.name ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
              }`}
            />
            {errors.name ? <p className="text-xs font-medium text-red-500">{errors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Tartib raqami</label>
            <input
              type="number"
              inputMode="numeric"
              value={sortOrder}
              onChange={(event) => setSortOrder(parseInt(event.target.value, 10) || 0)}
              min={0}
              className={`h-14 w-full rounded-xl border px-4 text-base font-medium text-slate-800 outline-none transition ${
                errors.sortOrder
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-slate-200 focus:border-blue-400'
              }`}
            />
            {errors.sortOrder ? (
              <p className="text-xs font-medium text-red-500">{errors.sortOrder}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Faol holat</p>
            <p className="mt-0.5 text-xs text-slate-500">Nofaol kategoriya mijozlarga ko'rinmaydi</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full p-1 transition ${
              isActive ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
                isActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete()}
            disabled={isSubmitting || isDeleting}
            className="h-11 w-full rounded-xl border border-rose-200 bg-rose-50 text-sm font-bold text-rose-600 disabled:opacity-60"
          >
            {isDeleting ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Kategoriyani o'chirish"}
          </button>
        ) : null}
      </div>

      <div
        className="fixed inset-x-0 z-40 mx-auto w-full max-w-[430px] border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur"
        style={{
          bottom: `${Math.max(0, keyboardInset - 6)}px`,
          paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 12px)`,
        }}
      >
        <button
          type="submit"
          disabled={isSubmitting || isDeleting}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-base font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,0.28)] disabled:bg-blue-300 disabled:shadow-none"
        >
          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Saqlash
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;
