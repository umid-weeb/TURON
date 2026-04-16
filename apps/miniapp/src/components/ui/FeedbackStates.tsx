import React from 'react';
import { AlertCircle, AlertTriangle, Home, RefreshCw, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── 3-D food carousel data ───────────────────────────────────────────────────

const FOOD_ITEMS = [
  { emoji: '🍔', label: 'Burger', glow: '#f59e0b', glow2: '#ef4444' },
  { emoji: '🍗', label: 'Qovurilgan tovuq', glow: '#ef4444', glow2: '#f97316' },
  { emoji: '🥩', label: 'Steyk', glow: '#e11d48', glow2: '#dc2626' },
  { emoji: '🍕', label: 'Pizza', glow: '#f97316', glow2: '#fbbf24' },
  { emoji: '🌯', label: 'Sharwarma', glow: '#fbbf24', glow2: '#f59e0b' },
  { emoji: '🥗', label: 'Yangi salat', glow: '#22c55e', glow2: '#84cc16' },
  { emoji: '🍜', label: "Lag'mon", glow: '#a78bfa', glow2: '#818cf8' },
  { emoji: '🍱', label: "Kombo to'plam", glow: '#38bdf8', glow2: '#60a5fa' },
];

/** How long each food item stays on screen (ms). All animations are sync'd to this. */
const ITEM_MS = 2_200;

/**
 * Orbiting sparkle dots that circle the emoji.
 * r = orbit radius (px), dur = full revolution (s), delay = pre-offset (s, negative = start mid-orbit)
 */
const ORBITS = [
  { r: 84, dur: 3.4, delay: 0, size: 5 },
  { r: 100, dur: 4.7, delay: -1.9, size: 4 },
  { r: 112, dur: 5.3, delay: -3.2, size: 3 },
  { r: 70, dur: 2.9, delay: -0.8, size: 4 },
];

// ─── TuronSplashScreen - RED TURON BRANDING ───────────────────────────────────

export const LoadingScreen: React.FC<{ message?: string }> = () => {
  return (
    <>
      <style>{`
        /* ── Rotating dish animation ────────────────────────────────────────── */
        @keyframes dishRotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ── Burger entry animation ──────────────────────────────────────────── */
        @keyframes burgerEntry {
          0%   { opacity: 0; transform: translateY(20px) scale(0.8); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── Text fade in ────────────────────────────────────────────────────── */
        @keyframes textFadeIn {
          0%   { opacity: 0; }
          30%  { opacity: 1; }
          100% { opacity: 1; }
        }

        /* ── Loading dots animation ──────────────────────────────────────────── */
        @keyframes dotPulse {
          0%,100% { opacity: 0.3; transform: scale(1); }
          50%     { opacity: 1; transform: scale(1.2); }
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
          background: '#D32F2F',
          overflow: 'hidden',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {/* ── Turon Logo with Rotating Dish in O ────────────────────────────── */}
        <div
          style={{
            animation: 'textFadeIn 1s ease-out forwards',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: 32,
          }}
        >
          {/* TUR text */}
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '0.02em',
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              lineHeight: 1,
            }}
          >
            TUR
          </span>

          {/* Rotating Dish Circle (O) */}
          <div
            style={{
              position: 'relative',
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Outer decorative ring - rotating */}
            <div
              style={{
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: '3px solid #fff',
                animation: 'dishRotate 4s linear infinite',
              }}
            />

            {/* Inner decorative circle */}
            <div
              style={{
                position: 'absolute',
                width: 70,
                height: 70,
                borderRadius: '50%',
                border: '2px dashed rgba(255,255,255,0.6)',
              }}
            />

            {/* Center dish emoji - rotating */}
            <div
              style={{
                fontSize: 48,
                lineHeight: 1,
                animation: 'dishRotate 6s linear infinite',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              🍛
            </div>
          </div>

          {/* N text */}
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '0.02em',
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              lineHeight: 1,
            }}
          >
            N
          </span>
        </div>

        {/* ── Brand tagline ────────────────────────────────────────────────────── */}
        <div
          style={{
            animation: 'textFadeIn 1.2s ease-out forwards',
            textAlign: 'center',
            marginBottom: 48,
          }}
        >
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.85)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Kafesi
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.6)',
              letterSpacing: '0.12em',
            }}
          >
            Mazali Taomlar
          </p>
        </div>

        {/* ── Loading dots ────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            animation: 'textFadeIn 1.4s ease-out forwards',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.7)',
                animation: 'dotPulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};

// ─── Shared feedback states ───────────────────────────────────────────────────

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
