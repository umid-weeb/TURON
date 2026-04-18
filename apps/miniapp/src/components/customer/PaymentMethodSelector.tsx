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
        className={`relative flex w-full items-center gap-3 rounded-[20px] border p-4 text-left transition-all active:scale-[0.97] ${paymentMethod === PaymentMethod.CASH
            ? 'border-[#C62020]/30 bg-red-50 shadow-[0_2px_12px_rgba(198,32,32,0.06)]'
            : 'border-transparent bg-[#f4f4f5]'
          }`}
      >
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] transition-colors ${paymentMethod === PaymentMethod.CASH
              ? 'bg-[#C62020] text-white shadow-md shadow-[#C62020]/20'
              : 'bg-white text-[#202020] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
            }`}
        >
          <Banknote size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black tracking-tight text-slate-950">Naqd pul</h4>
          <p className="mt-1 text-xs font-semibold text-slate-600">Buyurtma topshirilganda to'laysiz</p>
          <p className="mt-1.5 text-[11px] font-semibold text-slate-500">Eng sodda va ishonchli usul</p>
        </div>
        {paymentMethod === PaymentMethod.CASH && (
          <div className="absolute right-4 top-4 text-[#C62020]">
            <CheckCircle2 size={22} />
          </div>
        )}
      </button>

      {/* ── Karta orqali to'lov ── */}
      <div
        className={`rounded-[20px] border transition-all ${paymentMethod === PaymentMethod.MANUAL_TRANSFER
            ? 'border-[#C62020]/30 bg-red-50 shadow-[0_2px_12px_rgba(198,32,32,0.06)]'
            : 'border-transparent bg-[#f4f4f5]'
          }`}
      >
        {/* Method row */}
        <button
          type="button"
          onClick={() => setPaymentMethod(PaymentMethod.MANUAL_TRANSFER)}
          className="relative flex w-full items-center gap-3 p-4 text-left transition-all active:scale-[0.97]"
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] transition-colors ${paymentMethod === PaymentMethod.MANUAL_TRANSFER
                ? 'bg-[#C62020] text-white shadow-md shadow-[#C62020]/20'
                : 'bg-white text-[#202020] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
              }`}
          >
            <CreditCard size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black tracking-tight text-slate-950">Karta orqali to'lov</h4>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Kartaga o'tkazmani amalga oshiring
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
              Chekni yuklang — admin tasdiqlaydi
            </p>
          </div>
          {paymentMethod === PaymentMethod.MANUAL_TRANSFER && (
            <div className="absolute right-4 top-4 text-[#C62020]">
              <CheckCircle2 size={22} />
            </div>
          )}
        </button>

        {/* Expanded card info — visible when selected */}
        {paymentMethod === PaymentMethod.MANUAL_TRANSFER && (
          <div className="border-t border-slate-200/50 px-4 pb-4 pt-3 space-y-3">
            {/* Card number — tap to copy */}
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Karta raqami
              </p>
              <button
                type="button"
                onClick={() => void handleCopyCard()}
                className={`flex w-full items-center justify-between gap-3 rounded-[16px] border px-4 py-3 text-left transition-all active:scale-[0.97] ${copiedCard
                    ? 'border-red-300/40 bg-red-50'
                    : 'border-transparent bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:bg-slate-50'
                  }`}
              >
                <span className="font-mono text-[16px] font-black tracking-[0.15em] text-slate-950">
                  {CARD_NUMBER}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${copiedCard
                      ? 'bg-red-100 text-[#C62020]'
                      : 'bg-[#f4f4f5] text-slate-600'
                    }`}
                >
                  {copiedCard ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                </span>
              </button>
              {copiedCard && (
                <p className="mt-1.5 text-[11px] font-semibold text-[#C62020]">
                  Karta raqami nusxalandi ✓
                </p>
              )}
            </div>

            {/* Check upload */}
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                To'lov cheki (screenshot yoki rasm)
              </p>
              {receiptPreview ? (
                <div className="relative">
                  <img
                    src={receiptPreview}
                    alt="Chek"
                    className="w-full rounded-[12px] object-cover border border-slate-200"
                    style={{ maxHeight: '200px' }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md text-slate-950"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-2 left-2 rounded-full bg-[#C62020] px-3 py-1 text-[10px] font-black text-white">
                    ✓ Chek yuklandi
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-slate-300 bg-slate-50 py-5 transition-colors active:bg-slate-100"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f4f5] text-slate-600">
                    <Camera size={20} />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-black text-slate-900">Chekni yuklang</p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Galereyadan screenshot yoki rasm tanlang
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700">
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
      <div className="relative flex w-full items-center gap-3 cursor-not-allowed rounded-[20px] border border-transparent bg-[#f4f4f5] p-4 opacity-70">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white text-slate-400 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <Smartphone size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black tracking-tight text-slate-950">Click / Payme</h4>
            <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">
              Tez kunda
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-600">Tashqi ilova orqali to'lash</p>
          <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
            Hozircha mavjud emas — yaqin orada
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
