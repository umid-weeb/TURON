import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Check,
  ChevronDown,
  Layers3,
  Loader2,
  Package2,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { MenuCategory, MenuProduct, ProductFormData } from '../types';
import ProductImageUploader from './ProductImageUploader';

interface Props {
  categories: MenuCategory[];
  initialData?: MenuProduct;
  onSubmit: (data: ProductFormData) => Promise<void> | void;
  title: string;
  error?: string | null;
  isSubmitting?: boolean;
  onDelete?: () => Promise<void> | void;
  isDeleting?: boolean;
}

const ProductForm: React.FC<Props> = ({
  categories,
  initialData,
  onSubmit,
  title,
  error,
  isSubmitting = false,
  onDelete,
  isDeleting = false,
}) => {
  const navigate = useNavigate();

  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || '');
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [price, setPrice] = useState(initialData?.price || 0);
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [stockQuantity, setStockQuantity] = useState(initialData?.stockQuantity ?? 100);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
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

  useEffect(() => {
    if (!isCategorySheetOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCategorySheetOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCategorySheetOpen]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name = 'Taom nomi kiritilishi shart';
    }

    if (!categoryId) {
      nextErrors.categoryId = 'Kategoriyani tanlang';
    }

    if (price <= 0) {
      nextErrors.price = "Narx musbat bo'lishi kerak";
    }

    if (stockQuantity < 0) {
      nextErrors.stockQuantity = "Zaxira miqdori manfiy bo'lishi mumkin emas";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate() || isSubmitting || isDeleting) {
      return;
    }

    await onSubmit({
      categoryId,
      name: name.trim(),
      description: description.trim(),
      price,
      imageUrl,
      isActive,
      stockQuantity,
    });
  };

  const categoryMissing = categories.length === 0;
  const selectedCategoryName = useMemo(
    () => categories.find((category) => category.id === categoryId)?.name || '',
    [categories, categoryId],
  );

  return (
    <>
      <form onSubmit={handleSubmit} className="animate-in fade-in duration-300">
        <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom,0px)+118px)]">
          <header className="admin-pro-card admin-hero-card overflow-hidden px-5 py-5 text-[#fff8e9]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#ffe8a3]">
                  <Package2 size={13} />
                  Product studio
                </span>
                <h2 className="mt-4 text-[30px] font-black tracking-tight">{title}</h2>
                <p className="mt-1 max-w-[280px] text-sm font-medium text-[#f5e7bf]/86">
                  Taom kartasini premium katalog standartida to&apos;ldiring va darhol ishlatishga tayyorlang.
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

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe8a3]/85">Kategoriyalar</p>
                <p className="mt-2 text-xl font-black text-white">{categories.length}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe8a3]/85">Holat</p>
                <p className="mt-2 text-xl font-black text-white">{isActive ? 'Faol' : 'Nofaol'}</p>
              </div>
            </div>
          </header>

          {error ? (
            <div className="admin-pro-card rounded-[28px] border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,245,246,0.98)_0%,rgba(255,237,240,0.92)_100%)] px-4 py-3 shadow-[0_16px_34px_rgba(244,63,94,0.12)]">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-500">Xatolik</p>
              <p className="mt-1 text-sm font-bold leading-relaxed text-rose-700">{error}</p>
            </div>
          ) : null}

          {categoryMissing ? (
            <div className="admin-pro-card rounded-[28px] border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,250,235,0.98)_0%,rgba(255,243,208,0.94)_100%)] px-4 py-4 shadow-[0_16px_34px_rgba(245,158,11,0.12)]">
              <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
                <Sparkles size={14} />
                Diqqat
              </p>
              <p className="mt-2 text-sm font-bold leading-relaxed text-amber-800">
                Avval kamida bitta kategoriya yarating, keyin taomni katalogga qo&apos;shing.
              </p>
            </div>
          ) : null}

          <SectionCard
            eyebrow="Media"
            title="Taom fotosi"
            hint="Yorqin va toza rasm kartada ko&apos;proq bosilish beradi"
            icon={<Sparkles size={15} className="text-[var(--admin-pro-primary-strong)]" />}
          >
            <ProductImageUploader
              currentImageUrl={imageUrl}
              onImageChange={setImageUrl}
              onImageRemove={() => setImageUrl('')}
            />
          </SectionCard>

          <SectionCard
            eyebrow="Asosiy ma&apos;lumot"
            title="Katalog kartasi"
            hint="Nom, narx va kategoriya foydalanuvchi ko&apos;radigan asosiy blok"
            icon={<Layers3 size={15} className="text-[var(--admin-pro-primary-strong)]" />}
          >
            <Field label="Taom nomi" required error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Masalan: Tandir somsa"
                className={`admin-input h-14 ${
                  errors.name
                    ? 'border-red-300 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]'
                    : 'focus:border-[rgba(255,190,11,0.66)]'
                }`}
              />
            </Field>

            <Field label="Tavsif">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Taom haqida qisqacha izoh..."
                rows={4}
                className="admin-input min-h-[112px] resize-none py-3 text-sm font-semibold"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Narx (so&apos;m)" required error={errors.price}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={price || ''}
                  onChange={(event) => setPrice(parseInt(event.target.value, 10) || 0)}
                  min={0}
                  placeholder="12000"
                  className={`admin-input h-14 ${
                    errors.price
                      ? 'border-red-300 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]'
                      : 'focus:border-[rgba(255,190,11,0.66)]'
                  }`}
                />
              </Field>

              <Field label="Kategoriya" required error={errors.categoryId}>
                <button
                  type="button"
                  onClick={() => !categoryMissing && setIsCategorySheetOpen(true)}
                  disabled={categoryMissing}
                  className={`admin-input flex h-14 items-center justify-between text-left ${
                    errors.categoryId ? 'border-red-300' : ''
                  } ${categoryMissing ? 'opacity-60' : 'hover:-translate-y-0.5 active:scale-[0.995]'}`}
                >
                  <span
                    className={`text-[15px] font-bold ${
                      selectedCategoryName ? 'text-[var(--admin-pro-text)]' : 'text-[var(--admin-pro-text-muted)]'
                    }`}
                  >
                    {selectedCategoryName || 'Kategoriyani tanlang'}
                  </span>
                  <ChevronDown size={18} className="text-[var(--admin-pro-text-muted)]" />
                </button>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Operatsion nazorat"
            title="Mavjudlik va holat"
            hint="Tayyor emas taomni yashirish yoki zaxirani pasaytirish mumkin"
            icon={<Box size={15} className="text-[var(--admin-pro-primary-strong)]" />}
          >
            <Field label="Zaxira miqdori" error={errors.stockQuantity}>
              <input
                type="number"
                inputMode="numeric"
                value={stockQuantity}
                onChange={(event) => setStockQuantity(parseInt(event.target.value, 10) || 0)}
                min={0}
                className={`admin-input h-14 ${
                  errors.stockQuantity
                    ? 'border-red-300 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]'
                    : 'focus:border-[rgba(255,190,11,0.66)]'
                }`}
              />
            </Field>

            <div className="rounded-[26px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,252,244,0.98)_0%,rgba(252,244,220,0.96)_100%)] px-4 py-4 shadow-[0_14px_30px_rgba(74,56,16,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[var(--admin-pro-text)]">Faol holat</p>
                  <p className="mt-0.5 text-xs font-semibold text-[var(--admin-pro-text-muted)]">
                    Nofaol taom mijozlar menyusida ko&apos;rinmaydi
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
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
          </SectionCard>

          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete()}
              disabled={isSubmitting || isDeleting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[22px] border border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,247,247,0.96)_0%,rgba(255,237,237,0.94)_100%)] text-sm font-black text-rose-600 shadow-[0_14px_30px_rgba(244,63,94,0.08)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Taomni o&apos;chirish
            </button>
          ) : null}
        </div>

        <div
          className="fixed inset-x-0 z-40 mx-auto w-full max-w-[430px] border-t border-[var(--admin-pro-line)] bg-[rgba(255,251,240,0.92)] px-4 py-3 backdrop-blur-xl"
          style={{
            bottom: `${Math.max(0, keyboardInset - 6)}px`,
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          }}
        >
          <button
            type="submit"
            disabled={categoryMissing || isSubmitting || isDeleting}
            className="admin-btn-save h-14 max-w-none rounded-[22px] text-[13px] disabled:opacity-60 disabled:shadow-none"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            Saqlash
          </button>
        </div>
      </form>

      {isCategorySheetOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(24,18,10,0.34)] backdrop-blur-[3px]"
            onClick={() => setIsCategorySheetOpen(false)}
            aria-label="Yopish"
          />
          <div className="relative w-full max-w-[430px] rounded-t-[34px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,251,240,0.98)_0%,rgba(247,239,210,0.98)_100%)] px-4 pb-5 pt-3 shadow-[0_-18px_42px_rgba(74,56,16,0.18)]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[rgba(125,106,76,0.22)]" />
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-[var(--admin-pro-line)] bg-white/80 p-3 text-[var(--admin-pro-primary-contrast)] shadow-[0_12px_24px_rgba(74,56,16,0.08)]">
                <Layers3 size={18} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
                  Tanlash
                </p>
                <p className="mt-1 text-lg font-black tracking-tight text-[var(--admin-pro-text)]">
                  Kategoriyani tanlang
                </p>
              </div>
            </div>
            <div className="mt-4 max-h-[56dvh] space-y-2 overflow-y-auto pb-2">
              {categories.map((category) => {
                const isSelected = category.id === categoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(category.id);
                      setIsCategorySheetOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-[rgba(255,190,11,0.42)] bg-[linear-gradient(135deg,rgba(255,212,59,0.2)_0%,rgba(255,190,11,0.12)_100%)] text-[var(--admin-pro-primary-contrast)] shadow-[0_14px_26px_rgba(255,190,11,0.12)]'
                        : 'border-[var(--admin-pro-line)] bg-white/80 text-[var(--admin-pro-text)] shadow-[0_10px_20px_rgba(74,56,16,0.05)] hover:-translate-y-0.5'
                    }`}
                  >
                    <span className="text-sm font-black">{category.name}</span>
                    {isSelected ? <Check size={16} className="text-[var(--admin-pro-primary-contrast)]" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

const SectionCard: React.FC<{
  eyebrow: string;
  title: string;
  hint: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ eyebrow, title, hint, icon, children }) => (
  <section className="admin-pro-card rounded-[32px] px-5 py-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--admin-pro-text-muted)]">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-lg font-black tracking-tight text-[var(--admin-pro-text)]">{title}</h3>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--admin-pro-text-muted)]">{hint}</p>
      </div>
      <div className="rounded-2xl border border-[var(--admin-pro-line)] bg-[rgba(255,249,233,0.86)] p-3 shadow-[0_14px_28px_rgba(74,56,16,0.08)]">
        {icon}
      </div>
    </div>
    <div className="mt-5 space-y-4">{children}</div>
  </section>
);

const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required = false, error, children }) => (
  <div className="space-y-2">
    <label className="admin-label !mb-2 !pl-0">
      {label}
      {required ? <span className="ml-1 text-[var(--admin-pro-text-muted)]">*</span> : null}
    </label>
    {children}
    {error ? <p className="text-xs font-bold text-rose-500">{error}</p> : null}
  </div>
);

export default ProductForm;
