import { OrderItem } from '../../store/courierStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  items: OrderItem[];
}

function formatMoney(value: number) {
  return `${value.toLocaleString('uz-UZ')} so'm`;
}

export function OrderDetailSheet({ isOpen, onClose, orderId, items }: Props) {
  if (!isOpen) return null;

  const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const title = orderId ? `Buyurtma ${orderId}` : 'Buyurtma';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.58)',
      }}
    >
      <button
        type="button"
        aria-label="Yopish"
        onClick={onClose}
        style={{ flex: 1, border: 'none', background: 'transparent' }}
      />
      <div
        style={{
          background: '#1a1b26',
          borderRadius: '16px 16px 0 0',
          padding: 16,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.45)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
            margin: '0 auto 16px',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#e8ecff' }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              border: 'none',
              background: 'transparent',
              color: '#6b7080',
              fontSize: 24,
              cursor: 'pointer',
              lineHeight: '32px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ maxHeight: '42vh', overflowY: 'auto', marginTop: 8 }}>
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#a0a8c0',
                      fontSize: 18,
                    }}
                  >
                    🍽️
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#e8ecff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7080', marginTop: 2 }}>× {item.quantity} ta</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#2dd4a0' }}>
                  {formatMoney(item.price)}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '18px 0', fontSize: 13, color: '#6b7080', textAlign: 'center' }}>
              Mahsulotlar hali yuklanmadi
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 0 0',
          }}
        >
          <div style={{ fontSize: 13, color: '#6b7080' }}>Jami:</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#e8ecff' }}>{formatMoney(totalAmount)}</div>
        </div>
      </div>
    </div>
  );
}
