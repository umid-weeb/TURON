import { X } from 'lucide-react';
import { closeTelegramMiniApp } from '../../lib/telegramMiniApp';

interface MiniAppCloseButtonProps {
  tone?: 'dark' | 'light';
}

export function MiniAppCloseButton({ tone = 'dark' }: MiniAppCloseButtonProps) {
  const className =
    tone === 'light'
      ? 'flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-transform active:scale-95'
      : 'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition-transform active:scale-95';

  return (
    <button
      type="button"
      onClick={closeTelegramMiniApp}
      className={className}
      aria-label="Mini appni yopish"
      title="Yopish"
    >
      <X size={18} />
    </button>
  );
}
