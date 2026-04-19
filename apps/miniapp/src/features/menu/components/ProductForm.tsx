import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Loader2, Save, Trash2, X } from 'lucide-react';
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
          <header className="rounded-3xl border border-slate-200/80 bg-white/95 px-5 py-5 shadow-[0_16px_34px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[26px] font-black leading-tight tracking-tight text-slate-900">{title}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">Yangi taomni aniq ma'lumotlar bilan qo'shing</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-500">Xatolik</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-rose-700">{error}</p>
            </div>
          ) : null}

          {categoryMissing ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600">Diqqat</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-amber-700">
                Avval kamida bitta kategoriya yarating, keyin taom qo'shing.
              </p>
            </div>
          ) : null}

          <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
            <div className="mb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Media</p>
            </div>
            <ProductImageUploader
              currentImageUrl={imageUrl}
              onImageChange={setImageUrl}
              onImageRemove={() => setImageUrl('')}
            />
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Asosiy ma'lumotlar</p>

            <Field label="Taom nomi" required error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Masalan: Tandir somsa"
                className={`h-14 w-full rounded-xl border bg-slate-50/65 px-4 text-[15px] font-medium text-slate-900 outline-none transition ${
                  errors.name ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                }`}
              />
            </Field>

            <Field label="Tavsif">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Taom haqida qisqacha..."
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/65 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400"
              />
            </Field>

            <Field label="Narx (so'm)" required error={errors.price}>
              <input
                type="number"
                inputMode="numeric"
                value={price || ''}
                onChange={(event) => setPrice(parseInt(event.target.value, 10) || 0)}
                min={0}
                placeholder="12000"
                className={`h-14 w-full rounded-xl border bg-slate-50/65 px-4 text-base font-bold text-slate-900 outline-none transition ${
                  errors.price ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                }`}
              />
            </Field>

            <Field label="Kategoriya" required error={errors.categoryId}>
              <button
                type="button"
                onClick={() => !categoryMissing && setIsCategorySheetOpen(true)}
                disabled={categoryMissing}
                className={`flex h-14 w-full items-center justify-between rounded-xl border bg-slate-50/65 px-4 text-left transition ${
                  errors.categoryId ? 'border-red-300' : 'border-slate-200'
                } ${categoryMissing ? 'opacity-60' : 'active:scale-[0.995]'}`}
              >
                <span className={`text-[15px] font-medium ${selectedCategoryName ? 'text-slate-900' : 'text-slate-500'}`}>
                  {selectedCategoryName || 'Kategoriyani tanlang'}
                </span>
                <ChevronDown size={18} className="text-slate-500" />
              </button>
            </Field>

            <Field label="Zaxira miqdori" error={errors.stockQuantity}>
              <input
                type="number"
                inputMode="numeric"
                value={stockQuantity}
                onChange={(event) => setStockQuantity(parseInt(event.target.value, 10) || 0)}
                min={0}
                className={`h-14 w-full rounded-xl border bg-slate-50/65 px-4 text-[15px] font-medium text-slate-900 outline-none transition ${
                  errors.stockQuantity
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-slate-200 focus:border-blue-400'
                }`}
              />
            </Field>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Sozlamalar</p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Faol holat</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">Nofaol taom mijozlar menyusida ko'rinmaydi</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
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
          </section>

          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete()}
              disabled={isSubmitting || isDeleting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-600 disabled:opacity-60"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Taomni o'chirish
            </button>
          ) : null}
        </div>

        <div
          className="fixed inset-x-0 z-40 mx-auto w-full max-w-[430px] border-t border-slate-200 bg-white/92 px-4 py-3 backdrop-blur"
          style={{
            bottom: `${Math.max(0, keyboardInset - 6)}px`,
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          }}
        >
          <button
            type="submit"
            disabled={categoryMissing || isSubmitting || isDeleting}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-bold text-white shadow-[0_14px_28px_rgba(37,99,235,0.28)] transition active:scale-[0.995] disabled:bg-blue-300 disabled:shadow-none"
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
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => setIsCategorySheetOpen(false)}
            aria-label="Yopish"
          />
          <div className="relative w-full max-w-[430px] rounded-t-[30px] border border-slate-200 bg-white px-4 pb-5 pt-3 shadow-[0_-16px_40px_rgba(15,23,42,0.16)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <p className="text-base font-bold text-slate-900">Kategoriyani tanlang</p>
            <div className="mt-3 max-h-[56dvh] space-y-2 overflow-y-auto pb-2">
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
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 active:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm font-semibold">{category.name}</span>
                    {isSelected ? <Check size={16} /> : null}
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

const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required = false, error, children }) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-slate-700">
      {label}
      {required ? <span className="ml-1 text-slate-400">*</span> : null}
    </label>
    {children}
    {error ? <p className="text-xs font-medium text-red-500">{error}</p> : null}
  </div>
);

export default ProductForm;

