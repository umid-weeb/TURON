import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Gift, Loader2, Tag, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useValidatePromo } from '../../hooks/queries/usePromos';
import { useAuthStore } from '../../store/useAuthStore';
import { DiscountType } from '../../data/types';
import type { PromoValidationResult } from '../../data/types';

const RED = '#C62020';

const CustomerPromosPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const validateMutation = useValidatePromo();

  const [code, setCode] = useState('');
  const [result, setResult] = useState<PromoValidationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleValidate = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setResult(null);
    setErrorMsg('');

    validateMutation.mutate(
      { code: trimmed, subtotal: 0, userId: user?.id },
      {
        onSuccess: (data) => setResult(data),
        onError: (err: any) => {
          setErrorMsg(
            err?.response?.data?.error ||
            err?.message ||
            "Promokod topilmadi yoki amal qilmaydi",
          );
        },
      },
    );
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--app-bg)',
        color: 'var(--app-text)',
        paddingBottom: 80,
      }}
    >
      {/* Header */}
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'var(--app-surface)',
          borderBottom: '1px solid var(--app-line)',
          display: 'flex', alignItems: 'center', gap: 12,
          height: 60,
          paddingInline: 16,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--app-bg)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} color="var(--app-text)" />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: 'var(--app-text)', margin: 0 }}>
          Promokod va bonuslar
        </h1>
      </header>

      <main style={{ padding: '24px 20px', maxWidth: 440, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{
          background: `linear-gradient(135deg, #9B0000 0%, ${RED} 60%, #E53535 100%)`,
          borderRadius: 24, padding: '28px 24px', color: 'white', marginBottom: 28,
          textAlign: 'center',
        }}>
          <Gift size={40} style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Promokodingiz bormi?</h2>
          <p style={{ fontSize: 13, opacity: 0.8, marginTop: 6, lineHeight: 1.5 }}>
            Kodni kiriting va buyurtmangizga chegirma oling
          </p>
        </div>

        {/* Input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 700,
            color: 'var(--app-section-label)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 8,
          }}>
            Promokod
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Tag
                size={16}
                color="var(--app-muted)"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setErrorMsg('');
                  setResult(null);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleValidate(); }}
                placeholder="TURON2025"
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 14,
                  border: `1.5px solid ${errorMsg ? '#EF4444' : result?.isValid ? '#16A34A' : 'var(--app-line)'}`,
                  background: 'var(--app-card)',
                  paddingLeft: 40,
                  paddingRight: 16,
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: 'var(--app-text)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleValidate}
              disabled={validateMutation.isPending || !code.trim()}
              style={{
                height: 52, paddingInline: 20,
                borderRadius: 14,
                background: RED,
                border: 'none', cursor: 'pointer',
                color: 'white', fontWeight: 800, fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 6,
                flexShrink: 0,
                opacity: (!code.trim() || validateMutation.isPending) ? 0.55 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {validateMutation.isPending
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : 'Tekshirish'}
            </button>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#FEF2F2', borderRadius: 14, padding: '14px 16px',
            marginBottom: 16,
          }}>
            <XCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', margin: 0 }}>
              {errorMsg}
            </p>
          </div>
        )}

        {/* Success result */}
        {result?.isValid && (
          <div style={{
            background: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            borderRadius: 18, padding: '20px 20px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <CheckCircle2 size={22} color="#16A34A" />
              <span style={{ fontSize: 15, fontWeight: 800, color: '#15803D' }}>
                Promokod amal qiladi!
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.message && (
                <p style={{ fontSize: 14, fontWeight: 700, color: '#166534', margin: 0 }}>
                  {result.message}
                </p>
              )}
              {result.promo?.discountType === DiscountType.PERCENTAGE && (
                <p style={{ fontSize: 13, color: '#15803D', margin: 0 }}>
                  Chegirma: <strong>{result.promo.discountValue}%</strong>
                  {result.promo.minOrderValue
                    ? ` · ${result.promo.minOrderValue.toLocaleString()} so'mdan boshlab`
                    : ''}
                </p>
              )}
              {result.promo?.discountType === DiscountType.FIXED_AMOUNT && (
                <p style={{ fontSize: 13, color: '#15803D', margin: 0 }}>
                  Chegirma: <strong>{result.promo.discountValue.toLocaleString()} so'm</strong>
                  {result.promo.minOrderValue
                    ? ` · ${result.promo.minOrderValue.toLocaleString()} so'mdan boshlab`
                    : ''}
                </p>
              )}
              {result.discountAmount > 0 && (
                <p style={{ fontSize: 13, color: '#15803D', margin: 0 }}>
                  Tejaysiz: <strong>{result.discountAmount.toLocaleString()} so'm</strong>
                </p>
              )}
              <p style={{ fontSize: 12, color: '#16A34A', margin: '4px 0 0', fontStyle: 'italic' }}>
                Bu promokod checkout jarayonida avtomatik qo'llaniladi
              </p>
            </div>
          </div>
        )}

        {/* Invalid result */}
        {result && !result.isValid && !errorMsg && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#FEF2F2', borderRadius: 14, padding: '14px 16px',
            marginBottom: 16,
          }}>
            <XCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', margin: 0 }}>
              {result.message || "Promokod amal qilmaydi"}
            </p>
          </div>
        )}

        {/* Info block */}
        <div style={{
          background: 'var(--app-card)',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--app-line)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-section-label)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Qanday ishlaydi?
            </p>
          </div>
          {[
            ['1', 'Promokodni yuqoridagi maydonga kiriting'],
            ['2', 'Tekshirish tugmasini bosing'],
            ['3', 'Buyurtma berayotganda chegirma avtomatik qo\'llaniladi'],
          ].map(([num, text]) => (
            <div
              key={num}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px',
                borderBottom: num !== '3' ? '1px solid var(--app-line)' : 'none',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--app-icon-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontSize: 12, fontWeight: 900, color: RED,
              }}>
                {num}
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--app-text)', margin: 0, lineHeight: 1.4 }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CustomerPromosPage;
