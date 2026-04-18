import React, { useState, useEffect } from 'react';
import { Bell, ChevronRight, ClipboardList, Globe2, Loader2, Moon, Phone, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { useTelegram } from '../../hooks/useTelegram';
import { api } from '../../lib/api';

const RED = '#C62020';

function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('998')) return `+${d}`;
  if (d.length === 10 && d.startsWith('0')) return `+998${d.slice(1)}`;
  if (d.length === 9) return `+998${d}`;
  return null;
}

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
}> = ({ icon, label, value, onClick, right, last }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      width: '100%', background: 'var(--app-card)',
      border: 'none',
      borderBottom: last ? 'none' : '1px solid var(--app-line)',
      padding: '15px 20px',
      cursor: onClick ? 'pointer' : 'default',
      textAlign: 'left',
      transition: 'background 0.15s',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {value && (
        <span style={{ fontSize: 13, color: 'var(--app-muted)', fontWeight: 500 }}>{value}</span>
      )}
      {right ?? (onClick ? <ChevronRight size={18} color="var(--app-muted)" /> : null)}
    </div>
  </button>
);

/* ─── Section ────────────────────────────────────────────────────────────── */
const Section: React.FC<{ title?: string; children: React.ReactNode; delay?: number }> = ({
  title, children, delay = 0,
}) => (
  <div
    className="animate-in slide-in-from-left"
    style={{ animationDelay: `${delay}ms`, marginTop: 28 }}
  >
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
      if (!viewport) {
        setKeyboardInset(0);
        return;
      }
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
    const normalized = normalizePhone(value);
    if (!normalized) {
      setError("Noto'g'ri format. Masalan: +998 90 123 45 67");
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch('/users/me/phone', { phone: normalized }) as { phoneNumber: string };
      onSaved(res.phoneNumber);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Telefon saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  const deletePhone = async () => {
    setSaving(true);
    setError('');
    try {
      await api.delete('/users/me/phone');
      onSaved(null);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Telefon o'chirilmadi");
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

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            disabled={saving || !value.trim()}
            onClick={() => { void savePhone(); }}
            className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#C62020] px-4 text-[14px] font-black text-white shadow-lg shadow-red-200 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : null}
            <span>Saqlash</span>
          </button>
          <button
            type="button"
            disabled={saving || !initialPhone}
            onClick={() => { void deletePhone(); }}
            className="flex h-[52px] w-14 items-center justify-center rounded-[14px] border border-red-100 bg-red-50 text-[#C62020] active:scale-[0.98] disabled:opacity-40"
            aria-label="Telefonni o'chirish"
          >
            <Trash2 size={18} />
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
  const username = tgUser?.username
    ? `@${tgUser.username}`
    : '';
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

  return (
    <div
      className="animate-in slide-in-from-left"
      style={{
        minHeight: '100vh',
        background: 'var(--app-bg)',
        paddingBottom: 100,
        color: 'var(--app-text)',
      }}
    >

      {/* ── Red gradient hero header ───────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(160deg, #9B0000 0%, ${RED} 60%, #E53535 100%)`,
        paddingTop: 'max(env(safe-area-inset-top, 0px), 20px)',
        paddingBottom: 60,
        textAlign: 'center',
        position: 'relative',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: '12px 0 0' }}>
          Profil
        </h1>
      </div>

      {/* ── Avatar — overlaps header bottom, no card box ───────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: -52,
          paddingBottom: 20,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Avatar circle */}
        <div style={{
          width: 90, height: 90, borderRadius: '50%',
          border: `4px solid white`,
          boxShadow: `0 6px 24px rgba(198,32,32,0.35), 0 2px 8px rgba(0,0,0,0.15)`,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${RED}, #7B0000)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 30, fontWeight: 900, color: 'white' }}>{initials}</span>
          )}
        </div>

        {/* Name */}
        <h2 style={{
          fontSize: 18, fontWeight: 800, color: 'var(--app-text)',
          margin: '12px 0 0', textAlign: 'center',
        }}>
          {displayName}
        </h2>

        {/* Username / phone */}
        {username ? (
          <p style={{ fontSize: 13, color: 'var(--app-muted)', margin: '4px 0 0' }}>
            {username}
          </p>
        ) : null}
      </div>

      {/* ── Rows ──────────────────────────────────────────────────────────── */}
      <Section title="Asosiy" delay={120}>
        <Row
          icon={<Phone size={19} color={RED} />}
          label="Telefon raqam"
          value={phoneLabel}
          onClick={() => setIsPhoneOpen(true)}
        />
        <Row
          icon={<ClipboardList size={19} color={RED} />}
          label="Buyurtmalar tarixi"
          onClick={() => navigate('/customer/orders')}
        />
        <Row
          icon={<Globe2 size={19} color={RED} />}
          label="Tilni o'zgartirish"
          value={langLabel}
          onClick={cycleLanguage}
          last
        />
      </Section>

      <Section delay={220}>
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

      {isPhoneOpen ? (
        <PhoneEditModal
          initialPhone={user?.phoneNumber || null}
          onClose={() => setIsPhoneOpen(false)}
          onSaved={(phoneNumber) => updateUser({ phoneNumber })}
        />
      ) : null}

    </div>
  );
};

export default ProfilePage;
