import React from 'react';
import { AlertCircle, AlertTriangle, Home, RefreshCw, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LOADING_MESSAGES = [
  "Oshpaz ishga tushdi...",
  "Eng mazali taomlar...",
  "Tez yetkazamiz!",
  "Bir daqiqa sabr...",
  "Turon Kafesi xizmatida!",
];

export const LoadingScreen: React.FC<{ message?: string }> = () => {
  const [msgIdx, setMsgIdx] = React.useState(0);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => window.clearInterval(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes burgerBounce {
          0%,100% { transform: translateY(0) rotate(-2deg) scale(1); }
          30%      { transform: translateY(-22px) rotate(3deg) scale(1.12); }
          60%      { transform: translateY(-10px) rotate(-1deg) scale(1.06); }
        }
        @keyframes steam {
          0%   { transform: translateY(0) scale(1);   opacity: 0.75; }
          100% { transform: translateY(-56px) scale(2); opacity: 0; }
        }
        @keyframes dotPop {
          0%,80%,100% { transform: scale(0.7); opacity: 0.4; }
          40%          { transform: scale(1.3); opacity: 1; }
        }
        @keyframes msgIn {
          0%   { opacity: 0; transform: translateY(8px); }
          18%  { opacity: 1; transform: translateY(0); }
          82%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.35; }
          50%      { opacity: 0.7; }
        }
      `}</style>

      <div
        style={{
          minHeight: '100dvh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg,#0a0d18 0%,#141830 55%,#0a0d18 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Glow behind burger */}
        <div style={{
          position: 'absolute',
          width: 180, height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,146,60,0.28) 0%, transparent 70%)',
          animation: 'glowPulse 1.6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Burger + steam */}
        <div style={{ position: 'relative', width: 120, height: 130, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          {/* Steam wisps */}
          {[
            { left: 24, top: 14, size: 9,  delay: '0s',    dur: '1.7s' },
            { left: 54, top: 8,  size: 11, delay: '0.55s', dur: '2.0s' },
            { left: 82, top: 18, size: 8,  delay: '1.1s',  dur: '1.5s' },
          ].map((s, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.45)',
              animation: `steam ${s.dur} ease-out infinite`,
              animationDelay: s.delay,
            }} />
          ))}

          {/* Burger */}
          <div style={{
            fontSize: 82,
            lineHeight: 1,
            animation: 'burgerBounce 1.5s cubic-bezier(.36,.07,.19,.97) infinite',
            filter: 'drop-shadow(0 10px 28px rgba(251,146,60,0.55))',
            userSelect: 'none',
          }}>
            🍔
          </div>
        </div>

        {/* Hot grill line */}
        <div style={{
          width: 72, height: 5, borderRadius: 3, marginTop: 2,
          background: 'linear-gradient(90deg,#f59e0b,#ef4444,#f59e0b)',
          boxShadow: '0 0 18px rgba(251,146,60,0.6)',
          animation: 'glowPulse 1.5s ease-in-out infinite',
        }} />

        {/* Brand name */}
        <p style={{
          marginTop: 24,
          fontSize: 26,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-0.04em',
          textShadow: '0 2px 16px rgba(251,146,60,0.4)',
        }}>
          Turon Kafesi
        </p>

        {/* Cycling message */}
        <div style={{ height: 26, marginTop: 8, overflow: 'hidden' }}>
          <p
            key={msgIdx}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.48)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              textAlign: 'center',
              animation: 'msgIn 1.8s ease-in-out',
            }}
          >
            {LOADING_MESSAGES[msgIdx]}
          </p>
        </div>

        {/* Bouncing dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#f59e0b',
              animation: `dotPop 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }} />
          ))}
        </div>
      </div>
    </>
  );
};

export const ErrorStateCard: React.FC<{ title?: string; message: string; onRetry?: () => void }> = ({
  title = 'Xatolik yuz berdi',
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-500 shadow-sm">
      <AlertCircle size={32} />
    </div>
    <h3 className="mb-2 text-lg font-black leading-none tracking-tight text-slate-800">{title}</h3>
    <p className="mb-6 max-w-xs text-sm font-medium text-slate-500">{message}</p>
    {onRetry ? (
      <button
        onClick={onRetry}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-50 font-bold text-red-600 transition-colors active:bg-red-100"
      >
        <RefreshCw size={18} />
        Qayta urinish
      </button>
    ) : null}
  </div>
);

export const UnauthorizedState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center animate-in fade-in duration-300">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-rose-100 text-rose-600 shadow-sm">
        <ShieldAlert size={36} />
      </div>
      <h2 className="mb-2 text-2xl font-black tracking-tight text-slate-800">Ruxsat etilmagan</h2>
      <p className="mb-8 max-w-[280px] text-sm font-medium text-slate-500">
        Sizda ushbu sahifaga kirish huquqi yo'q yoki profilingiz tasdiqlanmagan.
      </p>
      <button
        onClick={() => navigate('/')}
        className="h-14 w-full rounded-2xl bg-slate-900 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-transform active:scale-95"
      >
        Bosh sahifaga qaytish
      </button>
    </div>
  );
};

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative mb-8">
        <h1 className="text-8xl font-black text-slate-200">404</h1>
        <div className="absolute inset-0 flex items-center justify-center text-amber-500">
          <AlertTriangle size={48} className="drop-shadow-md" />
        </div>
      </div>
      <h2 className="mb-2 text-2xl font-black tracking-tight text-slate-800">Sahifa topilmadi</h2>
      <p className="mb-8 max-w-[280px] text-sm font-medium text-slate-500">
        Siz izlayotgan sahifa mavjud emas yoki nomi o'zgartirilgan bo'lishi mumkin.
      </p>
      <button
        onClick={() => navigate('/', { replace: true })}
        className="flex h-14 items-center gap-2 rounded-2xl bg-amber-500 px-8 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-amber-200 transition-transform active:scale-95 active:bg-amber-600"
      >
        <Home size={18} />
        Bosh sahifaga o'tish
      </button>
    </div>
  );
};
