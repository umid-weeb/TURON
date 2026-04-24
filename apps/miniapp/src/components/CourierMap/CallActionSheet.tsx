import React, { useEffect, useRef, useState } from 'react';
import { useNotifyCustomer } from '../../hooks/queries/useOrders';
import { formatPhoneForCallButton, initiateCall } from '../../lib/callUtils';

interface CallActionSheetProps {
  orderId: string;
  customerName: string;
  customerPhone: string | null | undefined;
  onClose: () => void;
}

type ActiveAction = 'telegram' | 'phone' | null;

export function CallActionSheet({
  orderId,
  customerName,
  customerPhone,
  onClose,
}: CallActionSheetProps) {
  const notifyMutation = useNotifyCustomer();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [sentAction, setSentAction] = useState<ActiveAction>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    el.style.transform = 'translateY(100%)';
    requestAnimationFrame(() => {
      el.style.transition = 'transform 0.42s cubic-bezier(0.22,1,0.36,1)';
      el.style.transform = 'translateY(0)';
    });
  }, []);

  const closeWithAnimation = () => {
    const el = sheetRef.current;
    if (!el) {
      onClose();
      return;
    }

    el.style.transform = 'translateY(100%)';
    window.setTimeout(onClose, 220);
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      closeWithAnimation();
    }
  };

  const handleTelegramNotify = async () => {
    const tg = window.Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred?.('light');

    setErrorText(null);
    setActiveAction('telegram');

    try {
      await notifyMutation.mutateAsync({ id: orderId, method: 'telegram_message' });
      setSentAction('telegram');
      tg?.HapticFeedback?.notificationOccurred?.('success');
      window.setTimeout(closeWithAnimation, 650);
    } catch {
      tg?.HapticFeedback?.notificationOccurred?.('error');
      setErrorText("Telegram xabar yuborilmadi. Bot yoki mijoz Telegram ID'sini tekshiring.");
    } finally {
      setActiveAction(null);
    }
  };

  const handlePhoneCall = async () => {
    const tg = window.Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred?.('medium');

    if (!customerPhone) {
      tg?.showAlert?.("Mijoz telefon raqami topilmadi.");
      setErrorText("Mijoz telefon raqami topilmadi.");
      return;
    }

    setErrorText(null);
    setActiveAction('phone');

    try {
      await notifyMutation.mutateAsync({ id: orderId, method: 'phone_call' });
      setSentAction('phone');
    } catch {
      setErrorText("Telegram ogohlantirish yuborilmadi, ammo telefon qo'ng'iroqni davom ettirish mumkin.");
    } finally {
      setActiveAction(null);
      closeWithAnimation();
      window.setTimeout(() => initiateCall(customerPhone, customerName || 'mijoz'), 220);
    }
  };

  const formattedPhone = customerPhone ? formatPhoneForCallButton(customerPhone) : null;
  const isBusy = activeAction !== null;

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(5,5,6,0.32) 0%, rgba(5,5,6,0.8) 100%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        ref={sheetRef}
        className="courier-dark-sheet"
        style={{
          width: '100%',
          maxWidth: 430,
          margin: '0 auto',
          borderRadius: '28px 28px 0 0',
          padding: '14px 16px calc(env(safe-area-inset-bottom,0px) + 20px)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: 44, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.16)', margin: '2px auto 18px' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div
            className="courier-accent-pill"
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff8eb' }}>
              {customerName || 'Mijoz'} bilan bog'lanish
            </div>
            <div style={{ fontSize: 12, color: '#b8b1a5', marginTop: 5, lineHeight: 1.5 }}>
              Avval Telegram orqali xabar yuboramiz. Telefon qo'ng'iroqda mijozga oldindan ogohlantirish ketadi.
            </div>
          </div>
        </div>

        {errorText ? (
          <div
            style={{
              marginBottom: 12,
              borderRadius: 16,
              border: '1px solid rgba(255,126,126,0.25)',
              background: 'rgba(255,126,126,0.1)',
              color: '#ffb3ae',
              fontSize: 12,
              lineHeight: 1.45,
              padding: '11px 12px',
            }}
          >
            {errorText}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void handleTelegramNotify()}
          disabled={isBusy}
          style={{
            width: '100%',
            padding: '14px',
            background:
              sentAction === 'telegram'
                ? 'rgba(255,216,76,0.16)'
                : 'linear-gradient(135deg, rgba(255,216,76,0.16), rgba(255,216,76,0.08))',
            border: '1px solid rgba(255,216,76,0.24)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: isBusy ? 'wait' : 'pointer',
            marginBottom: 10,
            textAlign: 'left',
            opacity: isBusy && activeAction !== 'telegram' ? 0.62 : 1,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
            boxShadow: sentAction === 'telegram' ? '0 16px 28px rgba(255,216,76,0.14)' : 'none',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: '#229ed9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 10px 22px rgba(34,158,217,0.28)',
            }}
          >
            <svg width="23" height="23" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.04 9.608c-.153.676-.553.84-1.12.522l-3.1-2.285-1.496 1.44c-.165.165-.304.304-.623.304l.223-3.16 5.75-5.193c.25-.222-.054-.346-.386-.124l-7.106 4.474-3.059-.955c-.664-.207-.677-.664.139-.982l11.946-4.605c.553-.2 1.036.135.872.956z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff8eb' }}>
              {activeAction === 'telegram' ? 'Yuborilmoqda...' : 'Telegram xabar yuborish'}
            </div>
            <div style={{ fontSize: 11, color: '#b8b1a5', marginTop: 3 }}>
              Mijoz bot orqali ko'radi, raqam oshkor bo'lmaydi
            </div>
          </div>
          <span
            className="courier-dark-chip--accent"
            style={{
              borderRadius: 999,
              padding: '4px 8px',
              whiteSpace: 'nowrap',
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Tavsiya
          </span>
        </button>

        <button
          type="button"
          onClick={() => void handlePhoneCall()}
          disabled={isBusy || !customerPhone}
          style={{
            width: '100%',
            padding: '14px',
            background: customerPhone ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.025)',
            border: `1px solid ${customerPhone ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: isBusy ? 'wait' : customerPhone ? 'pointer' : 'not-allowed',
            textAlign: 'left',
            opacity: isBusy && activeAction !== 'phone' ? 0.62 : 1,
            transition: 'transform 0.2s ease, opacity 0.2s ease',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: customerPhone ? 'rgba(255,216,76,0.12)' : 'rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={customerPhone ? '#ffd84c' : '#5c5952'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1A19.5 19.5 0 013.1 11a19.8 19.8 0 01-3-8.6A2 2 0 012 .2h3a2 2 0 012 1.7c.1 1.2.4 2.4.7 3.5a2 2 0 01-.5 2L6 8.9a16 16 0 006.1 6l1.5-1.5a2 2 0 012-.5c1.1.3 2.3.6 3.5.7a2 2 0 011.9 2z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: customerPhone ? '#fff8eb' : '#5c5952' }}>
              {activeAction === 'phone' ? 'Ogohlantirilmoqda...' : "Telefon qo'ng'iroq"}
            </div>
            <div style={{ fontSize: 11, color: '#b8b1a5', marginTop: 3 }}>
              {formattedPhone ?? "Mijoz raqami ko'rsatilmagan"}
            </div>
          </div>
          <span style={{ fontSize: 11, color: '#ffd84c', whiteSpace: 'nowrap', fontWeight: 700 }}>
            SIM orqali
          </span>
        </button>

        <button
          type="button"
          onClick={closeWithAnimation}
          disabled={isBusy}
          style={{
            width: '100%',
            padding: '16px 16px 6px',
            background: 'transparent',
            border: 'none',
            color: '#b8b1a5',
            fontSize: 14,
            fontWeight: 700,
            cursor: isBusy ? 'wait' : 'pointer',
          }}
        >
          Bekor qilish
        </button>
      </div>
    </div>
  );
}
