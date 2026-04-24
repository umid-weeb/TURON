import React from 'react';
import { AlertTriangle, Loader2, ShieldAlert, Sparkles, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemName?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  warningText?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  itemName,
  isDeleting = false,
  onConfirm,
  onCancel,
  isDangerous = true,
  confirmLabel = "Ha, o'chirish",
  cancelLabel = 'Bekor qilish',
  warningText,
}) => {
  if (!isOpen) {
    return null;
  }

  const accentClasses = isDangerous
    ? {
        badge: 'border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,245,246,0.98)_0%,rgba(255,236,239,0.96)_100%)] text-rose-600 shadow-[0_14px_30px_rgba(244,63,94,0.14)]',
        icon: 'text-rose-500',
        warning: 'border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,245,246,0.98)_0%,rgba(255,236,239,0.94)_100%)] text-rose-700',
        button:
          'bg-[linear-gradient(135deg,#fb7185_0%,#f43f5e_100%)] shadow-[0_18px_34px_rgba(244,63,94,0.26)] hover:brightness-[1.03]',
        eyebrow: 'text-rose-300',
        chip: 'border-rose-200/40 bg-rose-400/12 text-rose-100',
        pulse: 'bg-[radial-gradient(circle,rgba(251,113,133,0.32)_0%,transparent_70%)]',
      }
    : {
        badge: 'border-[rgba(255,190,11,0.28)] bg-[linear-gradient(180deg,rgba(255,250,235,0.98)_0%,rgba(255,243,208,0.96)_100%)] text-[#8d5d00] shadow-[0_14px_30px_rgba(245,158,11,0.14)]',
        icon: 'text-[#c98b00]',
        warning: 'border-[rgba(255,190,11,0.26)] bg-[linear-gradient(180deg,rgba(255,250,235,0.98)_0%,rgba(255,243,208,0.94)_100%)] text-[#8d5d00]',
        button:
          'bg-[linear-gradient(135deg,var(--admin-pro-primary)_0%,var(--admin-pro-primary-strong)_100%)] text-[var(--admin-pro-primary-contrast)] shadow-[0_18px_34px_rgba(255,190,11,0.24)] hover:brightness-[1.03]',
        eyebrow: 'text-[#ffe29a]',
        chip: 'border-[rgba(255,212,59,0.24)] bg-[rgba(255,212,59,0.16)] text-[#fff0b5]',
        pulse: 'bg-[radial-gradient(circle,rgba(255,212,59,0.28)_0%,transparent_70%)]',
      };

  const defaultWarningText = isDangerous
    ? "Bu amalni qaytarib bo'lmaydi. Bog'liq ma'lumotlar ham o'chiriladi."
    : "Amalni tasdiqlashdan oldin ma'lumotlarni yana bir bor tekshiring.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(18,14,10,0.62)] px-3 pb-3 backdrop-blur-md md:items-center md:p-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[430px] overflow-hidden rounded-[34px] border border-[rgba(118,90,35,0.2)] bg-[linear-gradient(180deg,rgba(255,251,240,0.99)_0%,rgba(248,240,216,0.98)_100%)] shadow-[0_28px_90px_rgba(18,14,10,0.34)] animate-in fade-in slide-in-from-bottom-4 duration-300 md:zoom-in-95 md:slide-in-from-bottom-0"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="admin-hero-card relative overflow-hidden px-6 pb-5 pt-5 text-[#fff8e9]">
          <div className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-2xl ${accentClasses.pulse}`} />
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border ${accentClasses.badge}`}
            >
              {isDangerous ? <AlertTriangle size={24} className={accentClasses.icon} /> : <ShieldAlert size={24} className={accentClasses.icon} />}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-[11px] font-black uppercase tracking-[0.24em] ${accentClasses.eyebrow}`}>
                  Tasdiqlash
                </p>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${accentClasses.chip}`}>
                  <Sparkles size={11} />
                  Premium
                </span>
              </div>
              <h2 className="mt-2 text-[24px] font-black leading-tight tracking-tight text-white">
                {title}
              </h2>
              <p className="mt-2 text-[14px] font-medium leading-6 text-[#f5e7bf]/82">{description}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-[#f5e7bf] transition hover:bg-white/14 active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 pb-6 pt-5">

          {itemName ? (
            <div className="rounded-[22px] border border-[var(--admin-pro-line)] bg-[rgba(255,255,255,0.82)] px-4 py-3 shadow-[0_12px_28px_rgba(74,56,16,0.06)]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--admin-pro-text-muted)]">
                Tanlangan obyekt
              </p>
              <p className="mt-1 truncate text-[15px] font-black text-[var(--admin-pro-text)]">{itemName}</p>
            </div>
          ) : null}

          <div className={`rounded-[22px] border px-4 py-3 shadow-[0_12px_28px_rgba(74,56,16,0.05)] ${accentClasses.warning}`}>
            <p className="text-[13px] font-semibold leading-5">{warningText ?? defaultWarningText}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="h-12 rounded-[18px] border border-[var(--admin-pro-line)] bg-white/92 text-[14px] font-black text-[var(--admin-pro-text)] shadow-[0_12px_24px_rgba(74,56,16,0.05)] transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className={`flex h-12 items-center justify-center gap-2 rounded-[18px] text-[14px] font-black transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 ${accentClasses.button}`}
            >
              {isDeleting && <Loader2 size={16} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
