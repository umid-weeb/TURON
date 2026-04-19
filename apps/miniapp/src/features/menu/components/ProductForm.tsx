import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save, X } from 'lucide-react';
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

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name = 'Taom nomi kiritilishi shart';
    }

    if (!categoryId) {
      nextErrors.categoryId = 'Kategoriyani tanlang';
    }

    if (price <= 0) {
      nextErrors.price = 'Narx musbat bo\'lishi kerak';
    }

    if (stockQuantity < 0) {
      nextErrors.stockQuantity = 'Zaxira miqdori manfiy bo\'lishi mumkin emas';
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

        {categoryMissing ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Diqqat</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-amber-700">
              Avval kamida bitta kategoriya yarating, keyin taom qo'shing.
            </p>
          </div>
        ) : null}

        <ProductImageUploader
          currentImageUrl={imageUrl}
          onImageChange={setImageUrl}
          onImageRemove={() => setImageUrl('')}
        />

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Taom nomi *</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Masalan: Tandir somsa"
              className={`h-14 w-full rounded-xl border px-4 text-base font-medium text-slate-800 outline-none transition ${
                errors.name ? 'border-red-300' : 'border-slate-200 focus:border-blue-400'
              }`}
            />
            {errors.name ? <p className="text-xs font-medium text-red-500">{errors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Tavsif</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Taom haqida qisqacha..."
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Narx (so'm) *</label>
            <input
              type="number"
              inputMode="numeric"
              value={price || ''}
              onChange={(event) => setPrice(parseInt(event.target.value, 10) || 0)}
              min={0}
              placeholder="12000"
              className={`h-14 w-full rounded-xl border px-4 text-lg font-black text-slate-800 outline-none transition ${
                errors.price ? 'border-red-300' : 'border-slate-200 focus:border-blue-400'
              }`}
            />
            {errors.price ? <p className="text-xs font-medium text-red-500">{errors.price}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Kategoriya *</label>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={categoryMissing}
              className={`h-14 w-full rounded-xl border px-4 text-base font-medium text-slate-800 outline-none transition ${
                errors.categoryId ? 'border-red-300' : 'border-slate-200 focus:border-blue-400'
              }`}
            >
              <option value="">Tanlang...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId ? (
              <p className="text-xs font-medium text-red-500">{errors.categoryId}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Zaxira miqdori</label>
            <input
              type="number"
              inputMode="numeric"
              value={stockQuantity}
              onChange={(event) => setStockQuantity(parseInt(event.target.value, 10) || 0)}
              min={0}
              className={`h-14 w-full rounded-xl border px-4 text-base font-medium text-slate-800 outline-none transition ${
                errors.stockQuantity ? 'border-red-300' : 'border-slate-200 focus:border-blue-400'
              }`}
            />
            {errors.stockQuantity ? (
              <p className="text-xs font-medium text-red-500">{errors.stockQuantity}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Faol holat</p>
            <p className="mt-0.5 text-xs text-slate-500">Nofaol taom mijozlarga ko'rinmaydi</p>
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
            {isDeleting ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Taomni o'chirish"}
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
          disabled={categoryMissing || isSubmitting || isDeleting}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-base font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,0.28)] disabled:bg-blue-300 disabled:shadow-none"
        >
          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Saqlash
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
