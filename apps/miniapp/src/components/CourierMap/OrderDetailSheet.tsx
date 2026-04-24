import { Package2, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Yopish"
        onClick={onClose}
        className="flex-1"
      />

      <div className="courier-dark-sheet rounded-t-[28px] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] pt-4">
        <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-white/15" />

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
              Tarkib
            </p>
            <p className="mt-1 text-[18px] font-black text-[#fff8eb]">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6 text-white/72 transition-transform active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 max-h-[42vh] space-y-2 overflow-y-auto pr-1">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.04] px-3 py-3"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-12 w-12 rounded-[14px] object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgba(255,216,76,0.12)] text-[var(--courier-accent)]">
                    <Package2 size={20} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-black text-[#fff8eb]">{item.name}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#b8b1a5]">
                    {item.quantity} ta
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[13px] font-black text-[var(--courier-accent)]">
                    {formatMoney(item.price)}
                  </p>
                  <p className="mt-1 text-[10px] text-[#b8b1a5]">
                    jami: {formatMoney(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-8 text-center">
              <Package2 size={20} className="mx-auto text-[#b8b1a5]" />
              <p className="mt-3 text-[13px] font-bold text-[#b8b1a5]">
                Mahsulotlar hali yuklanmadi
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#b8b1a5]">
              Jami
            </span>
            <span className="text-[18px] font-black text-[#fff8eb]">
              {formatMoney(totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
