import React, { useEffect, useState } from 'react';
import {
  Bell,
  ChevronRight,
  ClipboardList,
  Gift,
  Globe2,
  Headphones,
  Loader2,
  MapPin,
  Moon,
  Pencil,
  Phone,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { useTelegram } from '../../hooks/useTelegram';
import { api } from '../../lib/api';
import { requestTelegramPhoneContact } from '../../lib/telegramContact';

const RED = '#C62020';
const HERO_HEIGHT = 172;
const HERO_SHAPE_WIDTH = '150%';
const HERO_SHAPE_HEIGHT = 232;
const AVATAR_SIZE = 104;

const ANIM_STYLES = `
  @keyframes turon-hero-drop {
    0% {
      opacity: 0;
      transform: translate3d(-50%, -42px, 0) scale(1.06);
    }
    58% {
      opacity: 1;
      transform: translate3d(-50%, 4px, 0) scale(1.015);
    }
    100% {
      opacity: 1;
      transform: translate3d(-50%, 0, 0) scale(1);
    }
  }

  @keyframes turon-avatar-float {
    0% {
      opacity: 0;
      transform: translate3d(0, 20px, 0) scale(0.88);
    }
    55% {
      opacity: 1;
      transform: translate3d(0, -4px, 0) scale(1.03);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes turon-fade-up-soft {
    0% {
      opacity: 0;
      transform: translate3d(0, 18px, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes turon-cascade-3d {
    0% {
      opacity: 0;
      transform: perspective(700px) rotateX(24deg) translateY(-20px);
    }
    100% {
      opacity: 1;
      transform: perspective(700px) rotateX(0deg) translateY(0px);
    }
  }

  @keyframes turon-pulse-ring {
    0% {
      transform: scale(1);
      opacity: 0.55;
    }
    100% {
      transform: scale(2.1);
      opacity: 0;
    }
  }
`;

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith('0')) return `+998${digits.slice(1)}`;
  if (digits.length === 9) return `+998${digits}`;
  return null;
}

const Toggle: React.FC<{ on: boolean; onChange: () => void }> = ({ on, onChange }) => (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      onChange();
    }}
    style={{
      width: 56,
      height: 32,
      borderRadius: 999,
      background: on ? RED : 'rgba(148, 163, 184, 0.38)',
      border: 'none',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.25s ease',
      flexShrink: 0,
      boxShadow: on
        ? 'inset 0 0 0 1px rgba(198,32,32,0.18)'
        : 'inset 0 0 0 1px rgba(148,163,184,0.16)',
    }}
    aria-label="toggle"
  >
    <span
      style={{
        position: 'absolute',
        top: 4,
        left: on ? 28 : 4,
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: '0 2px 10px rgba(15,23,42,0.18)',
        transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    />
  </button>
);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(198,32,32,0.11) 0%, rgba(198,32,32,0.07) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 17, fontWeight: 750, color: 'var(--app-text)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minWidth: 0 }}>
        {value ? (
          <span
            style={{
              maxWidth: 144,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 15,
              color: 'var(--app-muted)',
              fontWeight: 650,
            }}
          >
            {value}
          </span>
        ) : null}
        {right ?? (onClick ? <ChevronRight size={20} color="var(--app-muted)" /> : null)}
      </div>
    </>
  );

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: 'var(--app-card)',
    border: 'none',
    borderBottom: last ? 'none' : '1px solid var(--app-line)',
    padding: '22px 20px',
    cursor: onClick ? 'pointer' : 'default',
    textAlign: 'left',
    transition: 'background 0.15s ease',
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

const Section: React.FC<{ title?: string; children: React.ReactNode; delay: number }> = ({ title, children, delay }) => (
  <div
    style={{
      marginTop: 30,
      animation: `turon-cascade-3d 0.48s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
    }}
  >
    {title ? (
      <p
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: 'var(--app-section-label)',
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          margin: '0 0 10px',
          paddingInline: 20,
        }}
      >
        {title}
      </p>
    ) : null}
    <div
      style={{
        overflow: 'hidden',
        background: 'var(--app-card)',
        boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
      }}
    >
      {children}
    </div>
  </div>
);

const PhoneEditModal: React.FC<{
  initialPhone?: string | null;
  onClose: () => void;
  onSaved: (phone: string | null) => void;
}> = ({ initialPhone, onClose, onSaved }) => {
  const [value, setValue] = useState(initialPhone || '');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
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

    return () => {
      window.visualViewport?.removeEventListener('resize', syncKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', syncKeyboardInset);
    };
  }, []);

  const savePhone = async () => {
    setError('');
    setInfo('');
    const trimmed = value.trim();
    const normalized = trimmed ? normalizePhone(trimmed) : null;
    if (trimmed && !normalized) {
      setError("Noto'g'ri format. Masalan: +998 90 123 45 67");
      return;
    }
    setSaving(true);
    try {
      const res = (await api.patch('/users/me/phone', { phone: normalized })) as { phoneNumber: string | null };
      onSaved(res.phoneNumber);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Telefon saqlanmadi');
    } finally {
      setSaving(false);
    }
  };

  const persistTelegramPhone = async (phoneNumber: string) => {
    setSaving(true);
    try {
      const res = (await api.patch('/users/me/phone', { phone: phoneNumber })) as { phoneNumber: string | null };
      onSaved(res.phoneNumber);
      onClose();
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Telefon saqlanmadi');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const requestTelegramPhone = async () => {
    setError('');
    setInfo("Telegram oynasida raqam ulashishni tasdiqlang.");
    setTelegramLoading(true);

    const result = await requestTelegramPhoneContact();

    if (result.phoneNumber) {
      const normalized = normalizePhone(result.phoneNumber) ?? result.phoneNumber;
      setValue(normalized);
      setInfo("Raqam Telegramdan olindi. Saqlanmoqda...");
      setTelegramLoading(false);
      await persistTelegramPhone(normalized);
      return;
    }

    setTelegramLoading(false);
    setInfo('');
    setError(result.message);
    window.setTimeout(() => inputRef.current?.focus(), 120);
  };

  return (
    <div
      className="fixed inset-0 z-[420] flex items-end justify-center px-3"
      style={{
        background: 'rgba(2,6,23,0.62)',
        backdropFilter: 'blur(8px)',
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${keyboardInset}px + 10px)`,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
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
          disabled={telegramLoading || saving}
          className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-red-100 bg-red-50 text-[13px] font-black text-[#C62020] active:scale-[0.98] disabled:opacity-60"
        >
          {telegramLoading ? <Loader2 size={17} className="animate-spin" /> : <Phone size={17} />}
          <span>{telegramLoading ? 'Telegram kutilmoqda...' : 'Telegramdan raqamni olish'}</span>
        </button>
        {info ? <p className="mb-3 text-[12px] font-semibold text-[var(--app-muted)]">{info}</p> : null}

        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
            setInfo('');
          }}
          placeholder="+998 90 123 45 67"
          className={`h-14 w-full rounded-[14px] border bg-[var(--app-bg)] px-4 text-[16px] font-bold text-[var(--app-text)] outline-none ${
            error ? 'border-red-300 focus:border-red-400' : 'border-[var(--app-line)] focus:border-red-400'
          }`}
        />
        {error ? <p className="mt-2 text-[12px] font-semibold text-red-600">{error}</p> : null}

        <div className="mt-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              void savePhone();
            }}
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
  const initials =
    displayName
      .split(' ')
      .map((item: string) => item[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'TK';

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
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--app-bg)',
        paddingBottom: 100,
        color: 'var(--app-text)',
        overflowX: 'hidden',
      }}
    >
      <style>{ANIM_STYLES}</style>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: HERO_HEIGHT,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: -74,
            width: HERO_SHAPE_WIDTH,
            height: HERO_SHAPE_HEIGHT,
            transform: 'translateX(-50%)',
            borderBottomLeftRadius: '50% 36%',
            borderBottomRightRadius: '50% 36%',
            background:
              'radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 42%), linear-gradient(160deg, #980000 0%, #C62020 58%, #E53A3A 100%)',
            boxShadow: '0 18px 40px rgba(198,32,32,0.28)',
            animation: 'turon-hero-drop 1s cubic-bezier(0.22,1,0.36,1) both',
            willChange: 'transform, opacity',
          }}
        />

        <h1
          style={{
            position: 'absolute',
            top: 'max(env(safe-area-inset-top, 0px), 16px)',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 800,
            color: '#FFFFFF',
            margin: 0,
            paddingTop: 14,
            animation: 'turon-fade-up-soft 0.72s cubic-bezier(0.22,1,0.36,1) 0.08s both',
          }}
        >
          Profil
        </h1>
      </div>

      <div
        style={{
          position: 'relative',
          marginTop: -58,
          paddingBottom: 14,
          zIndex: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 36,
            left: '50%',
            width: '118%',
            height: 138,
            transform: 'translateX(-50%)',
            borderTopLeftRadius: '50% 58%',
            borderTopRightRadius: '50% 58%',
            background: 'var(--app-bg)',
            boxShadow: '0 -10px 24px rgba(15,23,42,0.05)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              animation: 'turon-avatar-float 1s cubic-bezier(0.22,1,0.36,1) both',
              willChange: 'transform, opacity',
            }}
          >
            <div
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                borderRadius: '50%',
                border: '4px solid #FFFFFF',
                boxShadow: '0 12px 34px rgba(198,32,32,0.28), 0 3px 12px rgba(15,23,42,0.16)',
                overflow: 'hidden',
                background: `linear-gradient(135deg, ${RED}, #7B0000)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 32, fontWeight: 900, color: '#FFFFFF' }}>{initials}</span>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              paddingInline: 20,
              textAlign: 'center',
              animation: 'turon-fade-up-soft 0.88s cubic-bezier(0.22,1,0.36,1) 0.08s both',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 850,
                lineHeight: 1.16,
                letterSpacing: '-0.03em',
                color: 'var(--app-text)',
              }}
            >
              {displayName}
            </h2>
            {username ? (
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--app-muted)',
                }}
              >
                {username}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <Section title="Asosiy" delay={0.32}>
        <Row
          icon={<Phone size={22} color={RED} />}
          label="Telefon raqam"
          right={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minWidth: 0 }}>
              <span
                style={{
                  maxWidth: 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 15,
                  color: 'var(--app-muted)',
                  fontWeight: 700,
                }}
              >
                {phoneLabel}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPhoneFeedback('');
                  setIsPhoneOpen(true);
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: '1px solid rgba(198,32,32,0.16)',
                  background: 'rgba(198,32,32,0.08)',
                  color: RED,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
                aria-label="Telefonni tahrirlash"
              >
                <Pencil size={16} />
              </button>
              {user?.phoneNumber ? (
                <button
                  type="button"
                  disabled={phoneDeleting}
                  onClick={() => {
                    void deletePhone();
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    border: '1px solid rgba(198,32,32,0.16)',
                    background: 'rgba(198,32,32,0.08)',
                    color: RED,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: 'pointer',
                    opacity: phoneDeleting ? 0.55 : 1,
                  }}
                  aria-label="Telefonni o'chirish"
                >
                  {phoneDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              ) : null}
            </div>
          }
        />
        {phoneFeedback ? (
          <p style={{ padding: '0 20px 12px 92px', fontSize: 12, fontWeight: 700, color: RED }}>{phoneFeedback}</p>
        ) : null}

        <Row icon={<MapPin size={22} color={RED} />} label="Mening manzillarim" onClick={() => navigate('/customer/addresses')} />
        <Row icon={<ClipboardList size={22} color={RED} />} label="Buyurtmalar tarixi" onClick={() => navigate('/customer/orders')} />
        <Row icon={<Gift size={22} color={RED} />} label="Promokod va bonuslar" onClick={() => navigate('/customer/promos')} />
        <Row icon={<Globe2 size={22} color={RED} />} label="Tilni o'zgartirish" value={langLabel} onClick={cycleLanguage} last />
      </Section>

      <Section title="Sozlamalar" delay={0.4}>
        <Row icon={<Moon size={22} color={RED} />} label="Dark Mode" right={<Toggle on={darkMode} onChange={() => setDarkMode((value) => !value)} />} />
        <Row icon={<Bell size={22} color={RED} />} label="Bildirishnomalar" right={<Toggle on={notifOn} onChange={() => setNotifOn((value) => !value)} />} last />
      </Section>

      <Section title="Qo'llab-quvvatlash" delay={0.48}>
        <div style={{ padding: '18px 20px', background: 'var(--app-card)' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 14,
                border: `1.5px solid ${RED}`,
                animation: 'turon-pulse-ring 2s ease-out 0s infinite',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 14,
                border: `1.5px solid ${RED}`,
                animation: 'turon-pulse-ring 2s ease-out 0.8s infinite',
                pointerEvents: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => navigate('/customer/support')}
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                height: 52,
                borderRadius: 14,
                background: 'rgba(198,32,32,0.07)',
                border: '1.5px solid rgba(198,32,32,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 700,
                color: RED,
              }}
            >
              <Headphones size={20} color={RED} />
              Yordam markazi
            </button>
          </div>
        </div>
      </Section>

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
