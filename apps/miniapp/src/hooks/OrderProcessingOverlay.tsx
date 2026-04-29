import React from 'react';
import { Headphones, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  isVisible: boolean;
}

export function OrderProcessingOverlay({ isVisible }: Props) {
  if (!isVisible) return null;

  const navigate = useNavigate();
  const [elapsedSec, setElapsedSec] = React.useState(0);

  // Lock body scroll while the overlay is visible so the page behind doesn't
  // bleed into the screen on small heights.
  React.useEffect(() => {
    if (!isVisible) return;
    setElapsedSec(0);
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearInterval(id);
      document.body.style.overflow = prevOverflow;
    };
  }, [isVisible]);

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const ss = String(elapsedSec % 60).padStart(2, '0');
  const isSlow = elapsedSec >= 18;

  // Bug fix: clicking Support from the queue overlay used to push /customer/support
  // on top of /customer/checkout. After replying to support, the user pressed back
  // and ended up on the now-stale checkout/confirmation page. We replace checkout
  // with /customer/orders first so back from support lands on the orders list.
  const goToSupport = () => {
    navigate('/customer/orders', { replace: true });
    navigate('/customer/support?topic=other');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4 animate-in fade-in duration-200"
      style={{
        background: 'rgba(2,6,23,0.62)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="w-full max-w-[360px] rounded-[24px] bg-[var(--app-surface)] text-[var(--app-text)] animate-in zoom-in-95 duration-300"
        style={{ boxShadow: 'var(--app-card-shadow)' }}
      >
        <div className="flex flex-col items-center gap-4 px-6 py-7 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-soft)]">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#C62020]/25" />
            <Loader2 size={26} className="relative animate-spin text-[#C62020]" />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--app-muted)]">
              Buyurtma navbatda
            </p>
            <h3 className="mt-2 text-[20px] font-black tracking-tight">
              Bir oz kuting…
            </h3>
            <p className="mt-2 text-[12px] font-semibold leading-5 text-[var(--app-muted)]">
              {isSlow
                ? "Internet sekin bo'lishi mumkin, jarayon davom etyapti."
                : 'Buyurtmangiz xavfsiz qabul qilinmoqda.'}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[var(--app-soft)] px-3.5 py-1.5 text-[12px] font-black tracking-wide text-[var(--app-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C62020]" />
            {mm}:{ss}
          </div>

          {isSlow ? (
            <button
              type="button"
              onClick={goToSupport}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--app-soft)] text-[13px] font-black text-[var(--app-text)] transition-transform active:scale-[0.985]"
            >
              <Headphones size={15} />
              Support bilan bog'lanish
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
