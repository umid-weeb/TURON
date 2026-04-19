import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { AdminPromo, DiscountTypeEnum, PromoFormData } from '../types';

interface Props {
  initialData?: AdminPromo;
  onSubmit: (data: PromoFormData) => void;
  title: string;
  isSubmitting?: boolean;
}

export const PromoForm: React.FC<Props> = ({
  initialData,
  onSubmit,
  title,
  isSubmitting = false,
}) => {
  const navigate = useNavigate();

  const [code, setCode] = useState(initialData?.code || '');
  const [titleStr, setTitleStr] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [discountType, setDiscountType] = useState<DiscountTypeEnum>(initialData?.discountType || DiscountTypeEnum.PERCENTAGE);
  const [discountValue, setDiscountValue] = useState(initialData?.discountValue || 0);
  const [minOrderValue, setMinOrderValue] = useState(initialData?.minOrderValue || 0);

  // Dates formatting to YYYY-MM-DD for input[type="date"]
  const [startDate, setStartDate] = useState(
    initialData?.startDate
      ? new Date(initialData.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );

  const [endDate, setEndDate] = useState(
    initialData?.endDate
      ? new Date(initialData.endDate).toISOString().split('T')[0]
      : ''
  );

  const [usageLimit, setUsageLimit] = useState(initialData?.usageLimit || 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [isFirstOrderOnly, setIsFirstOrderOnly] = useState(initialData?.isFirstOrderOnly ?? false);
  const [targetUserId, setTargetUserId] = useState(initialData?.targetUserId ?? '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!code.trim()) errs.code = 'Promokod kiritilishi shart';
    if (discountValue <= 0) errs.discountValue = 'Chegirma qiymati musbat bo\'lishi kerak';
    if (discountType === DiscountTypeEnum.PERCENTAGE && discountValue > 100) errs.discountValue = 'Foiz 100 dan oshmasligi kerak';
    if (endDate && new Date(endDate) < new Date(startDate)) errs.endDate = 'Tugash sanasi boshlanishidan kichik bo\'lmasligi kerak';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      code: code.trim().toUpperCase(),
      title: titleStr.trim(),
      description: description.trim(),
      discountType,
      discountValue,
      minOrderValue,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate + 'T23:59:59.999Z').toISOString() : '',
      usageLimit,
      isActive,
      isFirstOrderOnly,
      targetUserId: targetUserId.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300 pb-8 text-slate-100">
      <section className="sticky top-[calc(env(safe-area-inset-top,0px)+8px)] z-10 rounded-2xl border border-white/10 bg-slate-900/70 p-3 backdrop-blur-xl shadow-[0_16px_44px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-white">Promokodni tahrirlash</h2>
            <p className="mt-0.5 text-xs text-slate-400">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all duration-200 hover:bg-white/10"
            >
              <X size={16} />
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-3.5 text-sm font-semibold text-white shadow-[0_0_22px_rgba(99,102,241,0.38)] transition-all duration-200 hover:bg-indigo-400 active:scale-[0.98] disabled:opacity-60"
            >
              <Save size={15} />
              {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-xl shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
        <h3 className="mb-3 text-sm font-semibold text-white">Asosiy ma'lumotlar</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Promokod *</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="MEGA50"
              className={`h-11 w-full rounded-xl border bg-white/5 px-3 font-semibold tracking-[0.18em] uppercase text-white placeholder:text-slate-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-400/40 ${
                errors.code ? 'border-rose-400/60' : 'border-white/15 focus:border-indigo-400'
              }`}
            />
            {errors.code && <p className="text-xs font-medium text-rose-300">{errors.code}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Sarlavha</label>
            <input
              type="text"
              value={titleStr}
              onChange={(e) => setTitleStr(e.target.value)}
              placeholder="Yangi mijozlarga aksiya"
              className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Tavsif</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qisqa tavsif"
              rows={3}
              className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-xl shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
        <h3 className="mb-3 text-sm font-semibold text-white">Chegirma sozlamalari</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Turi *</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountTypeEnum)}
              className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
            >
              <option className="text-slate-900" value={DiscountTypeEnum.PERCENTAGE}>Foizli (%)</option>
              <option className="text-slate-900" value={DiscountTypeEnum.FIXED}>Miqdorli</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Qiymati *</label>
            <input
              type="number"
              value={discountValue || ''}
              onChange={(e) => setDiscountValue(parseInt(e.target.value) || 0)}
              className={`h-11 w-full rounded-xl border bg-white/5 px-3 text-sm font-semibold text-white outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-400/40 ${
                errors.discountValue ? 'border-rose-400/60' : 'border-white/15 focus:border-indigo-400'
              }`}
            />
          </div>
        </div>
        {errors.discountValue && <p className="mt-2 text-xs font-medium text-rose-300">{errors.discountValue}</p>}

        <div className="mt-3 space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Minimal buyurtma qiymati (so&apos;m)</label>
          <input
            type="number"
            value={minOrderValue || ''}
            onChange={(e) => setMinOrderValue(parseInt(e.target.value) || 0)}
            className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-xl shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
        <h3 className="mb-3 text-sm font-semibold text-white">Foydalanish qoidalari</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Boshlanish sanasi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Tugash sanasi (ixtiyoriy)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`h-11 w-full rounded-xl border bg-white/5 px-3 text-sm font-medium text-white outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-400/40 ${
                errors.endDate ? 'border-rose-400/60' : 'border-white/15 focus:border-indigo-400'
              }`}
            />
          </div>
        </div>
        {errors.endDate && <p className="mt-2 text-xs font-medium text-rose-300">{errors.endDate}</p>}

        <div className="mt-3 space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Foydalanish limiti (0 = cheksiz)</label>
          <input
            type="number"
            value={usageLimit || ''}
            onChange={(e) => setUsageLimit(parseInt(e.target.value) || 0)}
            className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="pr-3">
              <p className="text-sm font-medium text-white">Faol holat</p>
              <p className="text-xs text-slate-400">O&apos;chirilgan promokod foydalanuvchilarga ishlamaydi</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative h-7 w-12 rounded-full transition-all duration-200 ${isActive ? 'bg-emerald-500/90 shadow-[0_0_14px_rgba(16,185,129,0.45)]' : 'bg-slate-600/70'}`}
            >
              <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${isActive ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="pr-3">
              <p className="text-sm font-medium text-white">Faqat birinchi buyurtma</p>
              <p className="text-xs text-slate-400">Oldin buyurtma bergan mijozlarga ishlamaydi</p>
            </div>
            <button
              type="button"
              onClick={() => setIsFirstOrderOnly(!isFirstOrderOnly)}
              className={`relative h-7 w-12 rounded-full transition-all duration-200 ${isFirstOrderOnly ? 'bg-indigo-500/90 shadow-[0_0_14px_rgba(99,102,241,0.45)]' : 'bg-slate-600/70'}`}
            >
              <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${isFirstOrderOnly ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-xl shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
        <h3 className="mb-3 text-sm font-semibold text-white">Kengaytirilgan sozlamalar</h3>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Mijoz ID (VIP promo, ixtiyoriy)</label>
          <input
            type="text"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value.trim())}
            placeholder="UUID (bo'sh = hamma uchun)"
            className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 font-mono text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
          />
          <p className="text-xs text-slate-400">To&apos;ldirilsa faqat shu foydalanuvchi ishlata oladi</p>
        </div>
      </section>
    </form>
  );
};
