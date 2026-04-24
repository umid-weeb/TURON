import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Package2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import type { MenuProduct } from '../types';
import AvailabilityBadge from './AvailabilityBadge';

interface Props {
  product: MenuProduct;
  categoryName?: string;
  onToggleActive: (product: MenuProduct) => void;
  onDeleteRequest: (product: MenuProduct) => void;
  isBusy?: boolean;
}

const ProductCardAdmin: React.FC<Props> = ({
  product,
  categoryName,
  onToggleActive,
  onDeleteRequest,
  isBusy = false,
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={`group overflow-hidden rounded-[30px] border p-4 shadow-[0_14px_30px_rgba(74,56,16,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(74,56,16,0.12)] ${
        product.isActive
          ? 'border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,250,240,0.92)_100%)]'
          : 'border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,248,248,0.98)_0%,rgba(255,240,240,0.92)_100%)] opacity-90'
      }`}
    >
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => navigate(`/admin/menu/products/${product.id}/edit`)}
          disabled={isBusy}
          className="flex min-w-0 flex-1 gap-4 text-left transition disabled:opacity-70"
        >
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-[rgba(255,190,11,0.16)] bg-[linear-gradient(180deg,rgba(255,250,235,0.98)_0%,rgba(255,243,208,0.9)_100%)] shadow-[0_12px_24px_rgba(74,56,16,0.08)]">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={(event) => {
                  (event.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Package2 size={30} className="text-[var(--admin-pro-primary-contrast)]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="truncate text-[16px] font-black text-[var(--admin-pro-text)]">{product.name}</h4>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[rgba(255,190,11,0.16)] bg-[rgba(255,212,59,0.14)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--admin-pro-primary-contrast)]">
                {categoryName || "Kategoriya yo'q"}
              </span>
              {!product.isActive ? (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-600">
                  Nofaol
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-lg font-black text-[var(--admin-pro-primary-contrast)]">
              {product.price.toLocaleString()} so'm
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AvailabilityBadge availability={product.availability} />
              <span className="rounded-full border border-[var(--admin-pro-line)] bg-white/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--admin-pro-text-muted)]">
                Zaxira: {product.stockQuantity}
              </span>
            </div>
          </div>
        </button>

        <div className="flex flex-col gap-2 self-center">
          <button
            type="button"
            onClick={() => onToggleActive(product)}
            disabled={isBusy}
            className={`flex h-10 w-10 items-center justify-center rounded-[16px] border transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 ${
              product.isActive
                ? 'border-emerald-200 bg-emerald-50 text-emerald-600 shadow-[0_10px_20px_rgba(16,185,129,0.1)]'
                : 'border-rose-200 bg-rose-50 text-rose-500 shadow-[0_10px_20px_rgba(244,63,94,0.08)]'
            }`}
          >
            {product.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/menu/products/${product.id}/edit`)}
            disabled={isBusy}
            className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--admin-pro-line)] bg-white/88 text-[var(--admin-pro-text-muted)] shadow-[0_10px_20px_rgba(74,56,16,0.06)] transition hover:-translate-y-0.5 hover:text-[var(--admin-pro-primary-contrast)] active:scale-95 disabled:opacity-60"
          >
            <Edit3 size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(product)}
            disabled={isBusy}
            className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,247,247,0.96)_0%,rgba(255,237,237,0.94)_100%)] text-rose-500 shadow-[0_10px_20px_rgba(244,63,94,0.08)] transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCardAdmin;
