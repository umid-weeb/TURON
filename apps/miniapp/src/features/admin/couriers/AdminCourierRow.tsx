import React from 'react';
import { Loader2, Pencil, Phone, Power, UserRound } from 'lucide-react';
import type { AdminCourierDirectoryItem } from '../../../data/types';
import { formatLastSeen, getCourierStatusMeta } from './adminCouriers.utils';

interface AdminCourierRowProps {
  courier: AdminCourierDirectoryItem;
  index: number;
  isTogglePending: boolean;
  onEdit: () => void;
  onToggle: () => void;
}

function getStatusClass(tone: ReturnType<typeof getCourierStatusMeta>['tone']) {
  switch (tone) {
    case 'success':
      return 'border-[rgba(36,159,99,0.18)] bg-[rgba(240,255,246,0.98)] text-[var(--adminx-color-success)]';
    case 'warning':
      return 'border-[rgba(245,166,35,0.2)] bg-[rgba(255,247,232,0.96)] text-[var(--adminx-color-primary-dark)]';
    case 'danger':
      return 'border-[rgba(214,69,69,0.14)] bg-[rgba(255,244,242,0.95)] text-[var(--adminx-color-danger)]';
    default:
      return 'border-[rgba(28,18,7,0.08)] bg-white text-[var(--adminx-color-muted)]';
  }
}

export function AdminCourierRow({
  courier,
  index,
  isTogglePending,
  onEdit,
  onToggle,
}: AdminCourierRowProps) {
  const status = getCourierStatusMeta(courier);
  const initials = (courier.fullName || 'K').trim().slice(0, 1).toUpperCase();

  return (
    <article className="adminx-courier-row" style={{ ['--i' as string]: index } as React.CSSProperties}>
      <div className="flex items-start gap-3">
        <div className="adminx-courier-avatar">{initials}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black tracking-[-0.03em] text-[var(--adminx-color-ink)]">
                {courier.fullName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-[var(--adminx-color-muted)]">
                <span>#{courier.telegramId}</span>
                {courier.telegramUsername ? <span>@{courier.telegramUsername.replace(/^@/, '')}</span> : null}
              </div>
            </div>
            <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.16em] ${getStatusClass(status.tone)}`}>
              {status.label}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="adminx-courier-mini">
              <span>Telefon</span>
              <strong>{courier.phoneNumber || 'Kiritilmagan'}</strong>
            </div>
            <div className="adminx-courier-mini">
              <span>So'nggi faollik</span>
              <strong>{formatLastSeen(courier.lastSeenAt || courier.lastOnlineAt || courier.updatedAt)}</strong>
            </div>
            <div className="adminx-courier-mini">
              <span>Faol buyurtma</span>
              <strong>{courier.activeAssignments} ta</strong>
            </div>
            <div className="adminx-courier-mini">
              <span>Bugun</span>
              <strong>{courier.completedToday} ta</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[14px] border border-[rgba(28,18,7,0.08)] bg-white px-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--adminx-color-ink)]"
        >
          <Pencil size={14} />
          Tahrirlash
        </button>
        {courier.phoneNumber ? (
          <a
            href={`tel:${courier.phoneNumber}`}
            className="inline-flex min-h-10 items-center justify-center rounded-[14px] border border-[rgba(28,18,7,0.08)] bg-white px-3 text-[var(--adminx-color-ink)]"
            aria-label="Qo'ng'iroq qilish"
          >
            <Phone size={14} />
          </a>
        ) : (
          <span className="inline-flex min-h-10 items-center justify-center rounded-[14px] border border-[rgba(28,18,7,0.05)] bg-[rgba(255,255,255,0.68)] px-3 text-[var(--adminx-color-faint)]">
            <UserRound size={14} />
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          disabled={isTogglePending}
          className={`inline-flex min-h-10 items-center justify-center rounded-[14px] px-3 ${
            courier.isActive
              ? 'border border-[rgba(214,69,69,0.14)] bg-[rgba(255,244,242,0.95)] text-[var(--adminx-color-danger)]'
              : 'border border-[rgba(36,159,99,0.18)] bg-[rgba(240,255,246,0.98)] text-[var(--adminx-color-success)]'
          }`}
          aria-label={courier.isActive ? 'Faolsizlantirish' : 'Faollashtirish'}
        >
          {isTogglePending ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
        </button>
      </div>
    </article>
  );
}
