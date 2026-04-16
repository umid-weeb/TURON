import React, { useState, useEffect } from 'react';
import { ChevronRight, Globe2, Moon, Bell, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { useTelegram } from '../../hooks/useTelegram';

const RED = '#C62020';

/* ─── Dark mode initializer (run on app start too) ─────────────────────── */
export function initDarkMode() {
  const dark = localStorage.getItem('turon-dark') === '1';
  document.body.classList.toggle('dark', dark);
}

/* ─── Toggle switch ─────────────────────────────────────────────────────── */
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

/* ─── Section row ────────────────────────────────────────────────────────── */
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

/* ─── Section card ───────────────────────────────────────────────────────── */
const Section: React.FC<{ title: string; children: React.ReactNode; delay?: number }> = ({
  title, children, delay = 0,
}) => (
  <div
    className="animate-in slide-in-from-left"
    style={{ animationDelay: `${delay}ms`, paddingInline: 0, marginTop: 28 }}
  >
    <p style={{
      fontSize: 11, fontWeight: 700, color: 'var(--app-section-label)',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      marginBottom: 8, paddingInline: 20,
    }}>
      {title}
    </p>
    <div style={{
      overflow: 'hidden',
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    }}>
      {children}
    </div>
  </div>
);

/* ─── Profile Page ───────────────────────────────────────────────────────── */
const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tg, user: tgUser } = useTelegram();
  const { language, setLanguage } = useCustomerLanguage();

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('turon-dark') === '1');
  const [notifOn, setNotifOn] = useState(() => localStorage.getItem('turon-notif') !== '0');

  // Apply dark mode globally
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('turon-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('turon-notif', notifOn ? '1' : '0');
  }, [notifOn]);

  // Telegram profile photo
  const photoUrl = tgUser?.photo_url || null;
  const fullName = user?.fullName || tgUser?.first_name
    ? `${tgUser?.first_name ?? ''} ${tgUser?.last_name ?? ''}`.trim()
    : 'Turon Mijozi';
  const displayName = user?.fullName || fullName;
  const username = tgUser?.username ? `@${tgUser.username}` : (user?.phoneNumber || '');

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
    <div style={{
      minHeight: '100vh',
      background: 'var(--app-bg)',
      paddingBottom: 100,
      color: 'var(--app-text)',
    }}>

      {/* ── Red gradient header — slides in from top ── */}
      <div
        className="animate-in slide-in-from-top"
        style={{
          background: `linear-gradient(160deg, ${RED} 0%, #7B0000 100%)`,
          paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
          paddingBottom: 80,
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: '14px 0 0' }}>
          Profil
        </h1>
      </div>

      {/* ── Avatar card — overlaps header, slides from left ── */}
      <div
        className="animate-in slide-in-from-left"
        style={{
          animationDelay: '80ms',
          marginTop: -64,
          marginInline: 16,
          background: 'var(--app-card)',
          borderRadius: 20,
          padding: '28px 20px 22px',
          boxShadow: '0 4px 28px rgba(0,0,0,0.10)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {/* Avatar: Telegram photo or initials */}
        <div style={{
          width: 84, height: 84, borderRadius: '50%',
          boxShadow: `0 4px 18px rgba(198,32,32,0.3)`,
          border: `3px solid ${RED}`,
          overflow: 'hidden',
          marginBottom: 6,
          flexShrink: 0,
          background: `linear-gradient(135deg, ${RED}, #7B0000)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 28, fontWeight: 900, color: 'white' }}>{initials}</span>
          )}
        </div>

        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--app-text)', margin: 0 }}>
          {displayName}
        </h2>
        {username && (
          <p style={{ fontSize: 13, color: 'var(--app-muted)', margin: 0 }}>
            {username}
          </p>
        )}
      </div>

      {/* ── Section: Asosiy ── */}
      <Section title="Asosiy" delay={150}>
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

      {/* ── Section: Sozlamalar ── */}
      <Section title="Sozlamalar" delay={250}>
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
    </div>
  );
};

export default ProfilePage;
