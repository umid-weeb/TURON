import React, { useRef, useState } from 'react';
import {
  Banknote,
  Camera,
  CheckCircle2,
  Copy,
  CreditCard,
  ImageIcon,
  Smartphone,
  X,
} from 'lucide-react';
import { PaymentMethod } from '../../data/types';
import { useCheckoutStore } from '../../store/useCheckoutStore';

const CARD_NUMBER = '9860 3501 4052 8612';
const CARD_NUMBER_RAW = '9860350140528612';
const MAX_RECEIPT_IMAGE_SIDE = 1600;
const RECEIPT_IMAGE_QUALITY = 0.82;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Receipt image could not be loaded'));
    image.src = src;
  });
}

async function prepareReceiptImage(file: File): Promise<string> {
  const originalDataUrl = await readFileAsDataUrl(file);

  try {
    const image = await loadImage(originalDataUrl);
    const scale = Math.min(
      1,
      MAX_RECEIPT_IMAGE_SIDE / Math.max(image.width, image.height),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      return originalDataUrl;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', RECEIPT_IMAGE_QUALITY);
  } catch {
    return originalDataUrl;
  }
}

const PaymentMethodSelector: React.FC = () => {
  const { paymentMethod, setPaymentMethod, setReceiptImage } = useCheckoutStore();
  const [copiedCard, setCopiedCard] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(CARD_NUMBER_RAW);
      setCopiedCard(true);
      window.setTimeout(() => setCopiedCard(false), 2000);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = CARD_NUMBER_RAW;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedCard(true);
      window.setTimeout(() => setCopiedCard(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    void prepareReceiptImage(file)
      .then((dataUrl) => {
        setReceiptPreview(dataUrl);
        setReceiptImage(dataUrl);
      })
      .catch(() => {
        setReceiptPreview(null);
        setReceiptImage(null);
      });
  };

  const handleRemoveReceipt = () => {
    setReceiptPreview(null);
    setReceiptImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {/* ── Naqd pul ── */}
      <button
        type="button"
        onClick={() => setPaymentMethod(PaymentMethod.CASH)}
        className={`relative flex w-full items-center gap-3 rounded-[12px] border p-3 text-left transition-all active:scale-[0.985] ${
          paymentMethod === PaymentMethod.CASH
            ? 'border-amber-300/25 bg-amber-400/10 shadow-[0_12px_24px_rgba(245,158,11,0.14)]'
            : 'border-white/8 bg-white/[0.04]'
        }`}
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br ${
            paymentMethod === PaymentMethod.CASH
              ? 'from-amber-300 to-orange-500 text-slate-950'
              : 'from-emerald-400 to-emerald-500 text-white'
          }`}
        >
          <Banknote size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black tracking-tight text-white">Naqd pul</h4>
          <p className="mt-1 text-xs font-semibold text-white/62">Buyurtma topshirilganda to'laysiz</p>
          <p className="mt-1.5 text-[11px] font-semibold text-white/38">Eng sodda va ishonchli usul</p>
        </div>
        {paymentMethod === PaymentMethod.CASH && (
          <div className="absolute right-4 top-4 text-amber-300">
            <CheckCircle2 size={22} />
          </div>
        )}
      </button>

      {/* ── Karta orqali to'lov ── */}
      <div
        className={`rounded-[12px] border transition-all ${
          paymentMethod === PaymentMethod.MANUAL_TRANSFER
            ? 'border-sky-300/25 bg-sky-400/10 shadow-[0_12px_24px_rgba(56,189,248,0.12)]'
            : 'border-white/8 bg-white/[0.04]'
        }`}
      >
        {/* Method row */}
        <button
          type="button"
          onClick={() => setPaymentMethod(PaymentMethod.MANUAL_TRANSFER)}
          className="relative flex w-full items-center gap-3 p-3 text-left transition-all active:scale-[0.985]"
        >
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br ${
              paymentMethod === PaymentMethod.MANUAL_TRANSFER
                ? 'from-amber-300 to-orange-500 text-slate-950'
                : 'from-sky-400 to-blue-500 text-white'
            }`}
          >
            <CreditCard size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black tracking-tight text-white">Karta orqali to'lov</h4>
            <p className="mt-1 text-xs font-semibold text-white/62">
              Kartaga o'tkazmani amalga oshiring
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-white/38">
              Chekni yuklang — admin tasdiqlaydi
            </p>
          </div>
          {paymentMethod === PaymentMethod.MANUAL_TRANSFER && (
            <div className="absolute right-4 top-4 text-amber-300">
              <CheckCircle2 size={22} />
            </div>
          )}
        </button>

        {/* Expanded card info — visible when selected */}
        {paymentMethod === PaymentMethod.MANUAL_TRANSFER && (
          <div className="border-t border-white/8 px-3 pb-3 pt-2 space-y-3">
            {/* Card number — tap to copy */}
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                Karta raqami
              </p>
              <button
                type="button"
                onClick={() => void handleCopyCard()}
                className={`flex w-full items-center justify-between gap-3 rounded-[10px] border px-4 py-3 text-left transition-all active:scale-[0.98] ${
                  copiedCard
                    ? 'border-emerald-400/30 bg-emerald-400/12'
                    : 'border-sky-400/20 bg-sky-400/8 hover:bg-sky-400/14'
                }`}
              >
                <span className="font-mono text-[18px] font-black tracking-[0.15em] text-white">
                  {CARD_NUMBER}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                    copiedCard
                      ? 'bg-emerald-400/20 text-emerald-300'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {copiedCard ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                </span>
              </button>
              {copiedCard && (
                <p className="mt-1.5 text-[11px] font-semibold text-emerald-300">
                  Karta raqami nusxalandi ✓
                </p>
              )}
            </div>

            {/* Check upload */}
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                To'lov cheki (screenshot yoki rasm)
              </p>
              {receiptPreview ? (
                <div className="relative">
                  <img
                    src={receiptPreview}
                    alt="Chek"
                    className="w-full rounded-[10px] object-cover"
                    style={{ maxHeight: '200px' }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/80 text-white"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-2 left-2 rounded-full bg-emerald-500/90 px-3 py-1 text-[10px] font-black text-white">
                    ✓ Chek yuklandi
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-white/15 bg-white/[0.03] py-5 transition-colors active:bg-white/[0.06]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-400/15 text-sky-300">
                    <Camera size={20} />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-black text-white/80">Chekni yuklang</p>
                    <p className="mt-1 text-[11px] text-white/40">
                      Galereyadan screenshot yoki rasm tanlang
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black text-white/70">
                    <ImageIcon size={12} />
                    <span>Rasm tanlash</span>
                  </div>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Click / Payme — tez kunda ── */}
      <div className="relative flex w-full items-center gap-3 cursor-not-allowed rounded-[12px] border border-white/8 bg-white/[0.03] p-3 opacity-50">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-slate-500 to-slate-600 text-white">
          <Smartphone size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black tracking-tight text-white">Click / Payme</h4>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-300">
              Tez kunda
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-white/62">Tashqi ilova orqali to'lash</p>
          <p className="mt-1.5 text-[11px] font-semibold text-white/38">
            Hozircha mavjud emas — yaqin orada
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
