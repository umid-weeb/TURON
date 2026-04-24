import { X } from 'lucide-react';
import { useState } from 'react';
import { closeTelegramMiniApp } from '../../lib/telegramMiniApp';

interface MiniAppCloseButtonProps {
  tone?: 'dark' | 'light' | 'courier';
}

export function MiniAppCloseButton({ tone = 'dark' }: MiniAppCloseButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const buttonClass =
    tone === 'light'
      ? 'flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-transform active:scale-95'
      : tone === 'courier'
        ? 'courier-topbar-button flex h-11 w-11 items-center justify-center rounded-[18px]'
      : 'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition-transform active:scale-95';

  const modalClass =
    tone === 'courier'
      ? 'w-full max-w-[360px] overflow-hidden rounded-[26px] border border-[var(--courier-line)] bg-[var(--courier-surface-strong)] text-[var(--courier-text)] shadow-[0_30px_70px_rgba(17,17,17,0.18)]'
      : 'w-full max-w-[360px] overflow-hidden rounded-[22px] border border-white/10 bg-[#0d1525] shadow-2xl';

  const titleClass = tone === 'courier' ? 'text-[18px] font-black text-[var(--courier-text)]' : 'text-[18px] font-black text-white';
  const copyClass = tone === 'courier' ? 'mt-2 text-[13px] leading-[1.55] text-[var(--courier-muted)]' : 'mt-2 text-[13px] leading-[1.55] text-white/52';
  const cancelClass =
    tone === 'courier'
      ? 'rounded-[16px] border border-[var(--courier-line)] bg-[var(--courier-surface)] py-3.5 text-[14px] font-black text-[var(--courier-text)] shadow-[0_10px_24px_rgba(17,17,17,0.06)] transition-transform active:scale-[0.97]'
      : 'rounded-[14px] border border-white/12 bg-white/[0.07] py-3.5 text-[14px] font-black text-white transition-transform active:scale-[0.97]';
  const confirmClass =
    tone === 'courier'
      ? 'courier-cta-primary rounded-[16px] py-3.5 text-[14px] font-black'
      : 'rounded-[14px] bg-red-500 py-3.5 text-[14px] font-black text-white shadow-[0_4px_24px_rgba(239,68,68,0.35)] transition-transform active:scale-[0.97]';

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className={buttonClass}
        aria-label="Mini appni yopish"
        title="Yopish"
      >
        <X size={18} />
      </button>

      {showConfirm ? (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/55 px-4 pb-8 backdrop-blur-sm"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className={modalClass}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pb-2 pt-6 text-center">
              <p className={titleClass}>Yopmoqchimisiz?</p>
              <p className={copyClass}>
                Ilovani yopsangiz, tasdiqlanmagan ma'lumotlar saqlanmaydi.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 pb-5 pt-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className={cancelClass}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={closeTelegramMiniApp}
                className={confirmClass}
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
