import React, { useState, useEffect } from 'react';
import {
  Bell, ChevronRight, ClipboardList, Gift, Globe2, Headphones,
  Loader2, MapPin, Moon, Pencil, Phone, Trash2, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { useTelegram } from '../../hooks/useTelegram';
import { api } from '../../lib/api';

const RED = '#C62020';

/* ─── Animation keyframes injected once ──────────────────────────────────── */
const ANIM_STYLES = `
  @keyframes turon-unfurl {
    0%   { clip-path: ellipse(50% 1% at 50% 0%); opacity: 0.55; }
    30%  { clip-path: ellipse(52% 38% at 50% 0%); opacity: 1; }
    65%  { clip-path: ellipse(55% 82% at 50% 0%); }
    100% { clip-path: ellipse(56% 100% at 50% 0%); }
  }

  @keyframes turon-fade-quick {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes turon-layer-left {
    0%   { transform: translateX(-72px) scale(0.55); opacity: 0; }
    40%  { transform: translateX(0) scale(1.1);  opacity: 0.6; }
    75%  { transform: translateX(0) scale(0.96); opacity: 0.28; }
    100% { transform: translateX(0) scale(1);    opacity: 0; }
  }

  @keyframes turon-layer-right {
    0%   { transform: translateX(72px) scale(0.55);  opacity: 0; }
    40%  { transform: translateX(0) scale(1.1);  opacity: 0.6; }
    75%  { transform: translateX(0) scale(0.96); opacity: 0.28; }
    100% { transform: translateX(0) scale(1);    opacity: 0; }
  }

  @keyframes turon-avatar-snap {
    0%   { transform: scale(0.15) rotate(-12deg); opacity: 0; filter: blur(8px); }
    55%  { transform: scale(1.14) rotate(4deg);   opacity: 1; filter: blur(0); }
    78%  { transform: scale(0.93) rotate(-2deg); }
    100% { transform: scale(1)    rotate(0deg);   opacity: 1; }
  }

  @keyframes turon-letter-up {
    0%   { transform: translateY(22px); opacity: 0; }
    60%  { transform: translateY(-5px); opacity: 1; }
    100% { transform: translateY(0);   opacity: 1; }
  }

  @keyframes turon-cascade-3d {
    0%   { opacity: 0; transform: perspective(700px) rotateX(24deg) translateY(-20px); }
    100% { opacity: 1; transform: perspective(700px) rotateX(0deg)  translateY(0px); }
  }

  @keyframes turon-pulse-ring {
    0%   { transform: scale(1);   opacity: 0.55; }
    100% { transform: scale(2.1); opacity: 0; }
  }
`;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('998')) return `+${d}`;
  if (d.length === 10 && d.startsWith('0')) return `+998${d.slice(1)}`;
  if (d.length === 9) return `+998${d}`;
  return null;
}

/* ─── StaggerText ────────────────────────────────────────────────────────── */
const StaggerText: React.FC<{
  text: string;
  baseDelay: number;
  gap?: number;
  style?: React.CSSProperties;
}> = ({ text, baseDelay, gap = 0.07, style }) => {
  const words = text.split(' ').filter(Boolean);
  return (
    <span style={{ display: 'block', ...style }}>
      {words.map((word, wi) => (
        <span
          key={`${wi}-${word}`}
          style={{
            display: 'inline-block',
            marginRight: wi < words.length - 1 ? '0.3em' : 0,
            animation: `turon-letter-up 0.4s cubic-bezier(0.34,1.56,0.64,1) ${baseDelay + wi * gap}s both`,
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
};

/* ─── Toggle ─────────────────────────────────────────────────────────────── */
const Toggle: React.FC<{ on: boolean; onChange: () => void }> = ({ on, onChange }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    style={{
      width: 50, height: 28, borderRadius: 14,
      background: on ? RED : '#D1D5DB',
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background 0.25s', flexShrink: 0,
    }}
    aria-label="toggle"
  >
    <span style={{
      position: 'absolute', top: 4,
      left: on ? 26 : 4,
      width: 20, height: 20, borderRadius: '50%',
      background: 'white',
      boxShadow: '0 1px 6px rgba(0,0,0,0.22)',
      transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
    }} />
  </button>
);

/* ─── Row ────────────────────────────────────────────────────────────────── */
const Row: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  last?: boolean;
}> = ({ icon, label, value, onClick, right, last }) => {
  const content = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'var(--app-icon-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--app-text)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minWidth: 0 }}>
        {value && (
          <span style={{ fontSize: 13, color: 'var(--app-muted)', fontWeight: 500 }}>{value}</span>
        )}
        {right ?? (onClick ? <ChevronRight size={18} color="var(--app-muted)" /> : null)}
      </div>
    </>
  );

  const baseStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', background: 'var(--app-card)',
    border: 'none',
    borderBottom: last ? 'none' : '1px solid var(--app-line)',
    padding: '15px 20px',
    cursor: onClick ? 'pointer' : 'default',
    textAlign: 'left',
    transition: 'background 0.15s',
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={baseStyle}>
        {content}
      </button>
    );
  }

  return <div style={baseStyle}>{content}</div>;
};

/* ─── Section ────────────────────────────────────────────────────────────── */
const Section: React.FC<{ title?: string; children: React.ReactNode; delay: number }> = ({
  title, children, delay,
}) => (
  <div style={{
    marginTop: 28,
    animation: `turon-cascade-3d 0.48s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
  }}>
    {title && (
      <p style={{
        fontSize: 11, fontWeight: 700, color: 'var(--app-section-label)',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 8, paddingInline: 20,
      }}>
        {title}
      </p>
    )}
    <div style={{ overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  </div>
);

/* ─── PhoneEditModal ─────────────────────────────────────────────────────── */
const PhoneEditModal: React.FC<{
  initialPhone?: string | null;
  onClose: () => void;
  onSaved: (phone: string | null) => void;
}> = ({ initialPhone, onClose, onSaved }) => {
  const { requestPhoneContact } = useTelegram();
  const [value, setValue] = useState(initialPhone || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncKeyboardInset = () => {
      const viewport = window.visualViewport;
      if (!viewport) { setKeyboardInset(0); return; }
      setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };

    syncKeyboardInset();
    window.visualViewport?.addEventListener('resize', syncKeyboardInset);
    window.visualViewport?.addEventListener('scroll', syncKeyboardInset);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 250);

    return () => {
      window.clearTimeout(focusTimer);
      window.visualViewport?.removeEventListener('resize', syncKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', syncKeyboardInset);
    };
  }, []);

  const savePhone = async () => {
    setError('');
    const trimmed = value.trim();
    const normalized = trimmed ? normalizePhone(trimmed) : null;
    if (trimmed && !normalized) {
      setError("Noto'g'ri format. Masalan: +998 90 123 45 67");
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch('/users/me/phone', { phone: normalized }) as { phoneNumber: string | null };
      onSaved(res.phoneNumber);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Telefon saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  const requestTelegramPhone = () => {
    requestPhoneContact((shared, contact) => {
      const normalized = shared && contact?.phone_number ? normalizePhone(contact.phone_number) : null;
      if (normalized) {
        setValue(normalized);
        setError('');
      } else {
        setError("Telegram raqam bermadi. Raqamni qo'lda kiriting.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-[420] flex items-end justify-center px-3"
      style={{
        background: 'rgba(2,6,23,0.62)',
        backdropFilter: 'blur(8px)',
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${keyboardInset}px + 10px)`,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="max-h-[min(620px,calc(100dvh-24px))] w-full max-w-[430px] overflow-y-auto rounded-[24px] bg-[var(--app-card)] px-5 pb-5 pt-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-red-50">
              <Phone size={22} color={RED} />
            </div>
            <h2 className="text-[18px] font-black text-[var(--app-text)]">Telefon raqam</h2>
            <p className="mt-1 text-[13px] font-medium text-[var(--app-muted)]">
              Kuryer buyurtma paytida siz bilan bog'lana olishi uchun.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 active:scale-95"
          >
            <X size={15} />
          </button>
        </div>

        <button
          type="button"
          onClick={requestTelegramPhone}
          className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-red-100 bg-red-50 text-[13px] font-black text-[#C62020] active:scale-[0.98]"
        >
          <Phone size={17} />
          <span>Telegramdan raqamni olish</span>
        </button>

        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          placeholder="+998 90 123 45 67"
          className="h-14 w-full rounded-[14px] border border-[var(--app-line)] bg-[var(--app-bg)] px-4 text-[16px] font-bold text-[var(--app-text)] outline-none focus:border-red-400"
        />
        {error ? <p className="mt-2 text-[12px] font-semibold text-red-600">{error}</p> : null}

        <div className="mt-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => { void savePhone(); }}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#C62020] px-4 text-[14px] font-black text-white shadow-lg shadow-red-200 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : null}
            <span>Saqlash</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Profile Page ───────────────────────────────────────────────────────── */
const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { user: tgUser } = useTelegram();
  const { language, setLanguage } = useCustomerLanguage();

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('turon-dark') === '1');
  const [notifOn, setNotifOn] = useState(() => localStorage.getItem('turon-notif') !== '0');
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [phoneDeleting, setPhoneDeleting] = useState(false);
  const [phoneFeedback, setPhoneFeedback] = useState('');

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('turon-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('turon-notif', notifOn ? '1' : '0');
  }, [notifOn]);

  const photoUrl: string | null = tgUser?.photo_url ?? null;
  const displayName =
    user?.fullName ||
    (tgUser ? `${tgUser.first_name ?? ''} ${tgUser.last_name ?? ''}`.trim() : 'Turon Mijozi');
  const username = tgUser?.username ? `@${tgUser.username}` : '';
  const phoneLabel = user?.phoneNumber || 'Kiritilmagan';
  const initials = displayName
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'TK';

  const langLabel =
    language === 'ru' ? 'Русский' : language === 'uz-cyrl' ? 'Ўзбекча' : "O'zbekcha";

  const cycleLanguage = () => {
    const langs: Array<'uz-latn' | 'uz-cyrl' | 'ru'> = ['uz-latn', 'uz-cyrl', 'ru'];
    const next = (langs.indexOf(language as 'uz-latn' | 'uz-cyrl' | 'ru') + 1) % langs.length;
    setLanguage(langs[next]);
  };

  const deletePhone = async () => {
    if (!user?.phoneNumber || phoneDeleting) return;
    setPhoneDeleting(true);
    setPhoneFeedback('');
    try {
      try {
        await api.delete('/users/me/phone');
      } catch {
        await api.patch('/users/me/phone', { phone: null });
      }
      updateUser({ phoneNumber: null });
    } catch (err: any) {
      setPhoneFeedback(err?.response?.data?.error || "Telefon o'chirilmadi");
    } finally {
      setPhoneDeleting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--app-bg)',
      paddingBottom: 100,
      color: 'var(--app-text)',
    }}>
      {/* Inject keyframes */}
      <style>{ANIM_STYLES}</style>

      {/* ── Red Unfurl Shape ─────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 220,
        background: `linear-gradient(160deg, #9B0000 0%, ${RED} 60%, #E53535 100%)`,
        animation: 'turon-unfurl 0.55s cubic-bezier(0.16,1,0.3,1) 0.04s both',
        zIndex: 1,
        boxShadow: '0 10px 40px rgba(198,32,32,0.28)',
      }}>
        <h1 style={{
          position: 'absolute',
          top: 'max(env(safe-area-inset-top, 0px), 16px)',
          left: 0, right: 0,
          textAlign: 'center',
          fontSize: 18, fontWeight: 800, color: 'white',
          margin: 0,
          paddingTop: 14,
          animation: 'turon-fade-quick 0.3s 0.5s both',
        }}>
          Profil
        </h1>
      </div>

      {/* ── Avatar + Identity ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        marginTop: -49,
        paddingBottom: 6,
        position: 'relative', zIndex: 2,
      }}>
        {/* Avatar with ghost assembly layers */}
        <div style={{ position: 'relative', width: 98, height: 98 }}>
          {/* Ghost layer — flies in from left */}
          <div style={{
            position: 'absolute',
            top: 4, left: 4, right: 4, bottom: 4,
            borderRadius: '50%',
            background: RED,
            animation: 'turon-layer-left 0.5s ease-out 0.22s both',
            pointerEvents: 'none',
          }} />
          {/* Ghost layer — flies in from right */}
          <div style={{
            position: 'absolute',
            top: 4, left: 4, right: 4, bottom: 4,
            borderRadius: '50%',
            background: '#E53535',
            animation: 'turon-layer-right 0.5s ease-out 0.22s both',
            pointerEvents: 'none',
          }} />
          {/* Real avatar — snaps in */}
          <div style={{
            position: 'relative', zIndex: 1,
            width: 98, height: 98,
            borderRadius: '50%',
            border: '4px solid white',
            boxShadow: '0 8px 28px rgba(198,32,32,0.38), 0 2px 8px rgba(0,0,0,0.14)',
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${RED}, #7B0000)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'turon-avatar-snap 0.48s cubic-bezier(0.34,1.56,0.64,1) 0.45s both',
          }}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 32, fontWeight: 900, color: 'white' }}>{initials}</span>
            )}
          </div>
        </div>

        {/* Name — staggered word reveal */}
        <StaggerText
          text={displayName}
          baseDelay={0.72}
          style={{
            fontSize: 20, fontWeight: 800, color: 'var(--app-text)',
            marginTop: 14, textAlign: 'center', lineHeight: 1.2,
          }}
        />

        {/* Username */}
        {username ? (
          <StaggerText
            text={username}
            baseDelay={0.80}
            gap={0.045}
            style={{
              fontSize: 13, color: 'var(--app-muted)',
              marginTop: 4, textAlign: 'center',
            }}
          />
        ) : null}
      </div>

      {/* ── Asosiy ───────────────────────────────────────────────────────── */}
      <Section title="Asosiy" delay={0.88}>
        {/* Phone row */}
        <Row
          icon={<Phone size={19} color={RED} />}
          label="Telefon raqam"
          right={(
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minWidth: 0 }}>
              <span style={{
                maxWidth: 130,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: 13, color: 'var(--app-muted)', fontWeight: 700,
              }}>
                {phoneLabel}
              </span>
              <button
                type="button"
                onClick={() => { setPhoneFeedback(''); setIsPhoneOpen(true); }}
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  border: '1px solid rgba(198,32,32,0.16)',
                  background: 'rgba(198,32,32,0.08)',
                  color: RED, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0, cursor: 'pointer',
                }}
                aria-label="Telefonni tahrirlash"
              >
                <Pencil size={15} />
              </button>
              {user?.phoneNumber ? (
                <button
                  type="button"
                  disabled={phoneDeleting}
                  onClick={() => { void deletePhone(); }}
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    border: '1px solid rgba(198,32,32,0.16)',
                    background: 'rgba(198,32,32,0.08)',
                    color: RED, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, cursor: 'pointer',
                    opacity: phoneDeleting ? 0.55 : 1,
                  }}
                  aria-label="Telefonni o'chirish"
                >
                  {phoneDeleting
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Trash2 size={15} />}
                </button>
              ) : null}
            </div>
          )}
        />
        {phoneFeedback ? (
          <p style={{ padding: '0 20px 12px 74px', fontSize: 12, fontWeight: 700, color: RED }}>
            {phoneFeedback}
          </p>
        ) : null}

        {/* Addresses */}
        <Row
          icon={<MapPin size={19} color={RED} />}
          label="Mening manzillarim"
          onClick={() => navigate('/customer/addresses')}
        />

        {/* Orders */}
        <Row
          icon={<ClipboardList size={19} color={RED} />}
          label="Buyurtmalar tarixi"
          onClick={() => navigate('/customer/orders')}
        />

        {/* Bonuses */}
        <Row
          icon={<Gift size={19} color={RED} />}
          label="Promokod va bonuslar"
          onClick={() => navigate('/customer/promos')}
        />

        {/* Language */}
        <Row
          icon={<Globe2 size={19} color={RED} />}
          label="Tilni o'zgartirish"
          value={langLabel}
          onClick={cycleLanguage}
          last
        />
      </Section>

      {/* ── Sozlamalar ───────────────────────────────────────────────────── */}
      <Section title="Sozlamalar" delay={1.01}>
        <Row
          icon={<Moon size={19} color={RED} />}
          label="Dark Mode"
          right={<Toggle on={darkMode} onChange={() => setDarkMode((v) => !v)} />}
        />
        <Row
          icon={<Bell size={19} color={RED} />}
          label="Bildirishnomalar"
          right={<Toggle on={notifOn} onChange={() => setNotifOn((v) => !v)} />}
          last
        />
      </Section>

      {/* ── Qo'llab-quvvatlash ───────────────────────────────────────────── */}
      <Section title="Qo'llab-quvvatlash" delay={1.14}>
        <div style={{ padding: '18px 20px', background: 'var(--app-card)' }}>
          <div style={{ position: 'relative' }}>
            {/* Pulse ring 1 */}
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: 14,
              border: `1.5px solid ${RED}`,
              animation: 'turon-pulse-ring 2s ease-out 0s infinite',
              pointerEvents: 'none',
            }} />
            {/* Pulse ring 2 — offset */}
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: 14,
              border: `1.5px solid ${RED}`,
              animation: 'turon-pulse-ring 2s ease-out 0.8s infinite',
              pointerEvents: 'none',
            }} />
            <button
              type="button"
              onClick={() => navigate('/customer/support')}
              style={{
                position: 'relative', zIndex: 1,
                width: '100%', height: 52,
                borderRadius: 14,
                background: 'rgba(198,32,32,0.07)',
                border: `1.5px solid rgba(198,32,32,0.22)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, cursor: 'pointer',
                fontSize: 15, fontWeight: 700, color: RED,
              }}
            >
              <Headphones size={20} color={RED} />
              Yordam markazi
            </button>
          </div>
        </div>
      </Section>

      {/* ── Phone modal ──────────────────────────────────────────────────── */}
      {isPhoneOpen ? (
        <PhoneEditModal
          initialPhone={user?.phoneNumber || null}
          onClose={() => setIsPhoneOpen(false)}
          onSaved={(phoneNumber) => {
            updateUser({ phoneNumber });
            setPhoneFeedback('');
          }}
        />
      ) : null}
    </div>
  );
};

export default ProfilePage;
