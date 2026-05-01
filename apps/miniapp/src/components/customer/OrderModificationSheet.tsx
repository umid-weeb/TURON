import React from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Headphones,
  Loader2,
  MapPin,
  X,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useCreateOrderModification,
  useOrderModifications,
  type ModificationRequest,
} from '../../hooks/queries/useOrderModifications';
import { useToast } from '../ui/Toast';

interface OrderModificationSheetProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string | number;
  /** Current order status; controls which actions are offered. */
  orderStatus: string;
}

const CANCEL_REASONS: Array<{ id: string; label: string }> = [
  { id: 'changed_mind', label: 'Fikrimni o\'zgartirdim' },
  { id: 'wrong_items', label: 'Noto\'g\'ri taom tanlaganman' },
  { id: 'too_long', label: 'Juda uzoq kutyapman' },
  { id: 'duplicate', label: 'Ikki marta buyurtma berib qo\'yibman' },
  { id: 'other', label: 'Boshqa sabab' },
];

function statusBadge(status: ModificationRequest['status']) {
  if (status === 'PENDING') {
    return {
      label: "Kutilmoqda",
      icon: <Clock size={14} />,
      className:
        'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    };
  }
  if (status === 'AUTO_APPROVED' || status === 'APPROVED') {
    return {
      label: 'Tasdiqlandi',
      icon: <CheckCircle2 size={14} />,
      className:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    };
  }
  return {
    label: 'Rad etildi',
    icon: <XCircle size={14} />,
    className:
      'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  };
}

function typeLabel(t: ModificationRequest['type']): string {
  if (t === 'CANCEL') return 'Bekor qilish';
  if (t === 'ADDRESS_CHANGE') return "Manzilni o'zgartirish";
  return 'Boshqa';
}

const ActionButton: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint?: string;
  tone?: 'neutral' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}> = ({ icon, title, hint, tone = 'neutral', disabled, onClick }) => {
  const isDanger = tone === 'danger';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition-opacity active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${
        isDanger
          ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300'
          : 'border-[var(--app-line)] bg-[var(--app-card)] text-[var(--app-text)]'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          isDanger
            ? 'bg-rose-100 dark:bg-rose-500/15'
            : 'bg-[var(--app-soft)]'
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-black">{title}</p>
        {hint ? (
          <p className="mt-0.5 text-[11px] font-semibold opacity-70">{hint}</p>
        ) : null}
      </div>
      <ChevronRight size={18} className="opacity-50" />
    </button>
  );
};

export const OrderModificationSheet: React.FC<OrderModificationSheetProps> = ({
  open,
  onClose,
  orderId,
  orderNumber,
  orderStatus,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: requests = [] } = useOrderModifications(open ? orderId : undefined);
  const createMutation = useCreateOrderModification(orderId);
  const [view, setView] = React.useState<'menu' | 'cancel'>('menu');
  const [reasonId, setReasonId] = React.useState<string>('changed_mind');

  React.useEffect(() => {
    if (open) setView('menu');
  }, [open]);

  if (!open) return null;

  const isTerminal = orderStatus === 'DELIVERED' || orderStatus === 'CANCELLED';
  const isPending = orderStatus === 'PENDING';
  const lastRequest = requests[0] ?? null;
  const hasPendingRequest = requests.some((r) => r.status === 'PENDING');

  const submitCancel = () => {
    const reasonLabel =
      CANCEL_REASONS.find((r) => r.id === reasonId)?.label ?? reasonId;
    createMutation.mutate(
      { type: 'CANCEL', reason: reasonLabel },
      {
        onSuccess: (result) => {
          if (result.mode === 'AUTO') {
            showToast('Buyurtma bekor qilindi', 'success');
          } else {
            showToast(
              "Bekor qilish so'rovi yuborildi. Admin tasdiqlashini kuting.",
              'info',
            );
          }
          onClose();
        },
        onError: (err) => {
          showToast(err.message || "So'rov yuborilmadi", 'error');
        },
      },
    );
  };

  const goSupport = () => {
    onClose();
    navigate(`/customer/support?orderId=${orderId}&topic=other`);
  };

  const goAddressChange = () => {
    // Address change request is a future iteration — for now route to
    // support so the customer can talk it through with an operator.
    onClose();
    navigate(`/customer/support?orderId=${orderId}&topic=change`);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-t-[28px] bg-[var(--app-bg)] text-[var(--app-text)] animate-in slide-in-from-bottom duration-300"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          boxShadow: 'var(--app-card-shadow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 mb-2 h-1 w-9 rounded-full bg-[var(--app-line)]" />

        <div className="flex items-center justify-between px-5 pb-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-muted)]">
              Buyurtma #{orderNumber}
            </p>
            <h3 className="mt-1 text-[18px] font-black tracking-tight">
              Buyurtmani o'zgartirish
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--app-soft)] text-[var(--app-muted)] transition-opacity active:opacity-70"
          >
            <X size={18} />
          </button>
        </div>

        {/* Active request banner */}
        {lastRequest && view === 'menu' ? (
          <div className="px-5 pb-3">
            <div className="rounded-[14px] border border-[var(--app-line)] bg-[var(--app-soft)] px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-black text-[var(--app-text)]">
                  So'rov: {typeLabel(lastRequest.type)}
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${
                    statusBadge(lastRequest.status).className
                  }`}
                >
                  {statusBadge(lastRequest.status).icon}
                  {statusBadge(lastRequest.status).label}
                </span>
              </div>
              {lastRequest.reason ? (
                <p className="mt-1.5 text-[11px] text-[var(--app-muted)]">
                  Sabab: {lastRequest.reason}
                </p>
              ) : null}
              {lastRequest.decisionNote ? (
                <p className="mt-1.5 text-[11px] text-[var(--app-muted)]">
                  Admin: {lastRequest.decisionNote}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Body */}
        <div className="px-5 pb-2">
          {isTerminal ? (
            <p className="rounded-[14px] bg-[var(--app-soft)] p-4 text-center text-[13px] font-semibold text-[var(--app-muted)]">
              Bu buyurtma tugatilgan, o'zgartirib bo'lmaydi.
            </p>
          ) : view === 'menu' ? (
            <div className="space-y-2.5">
              <ActionButton
                tone="danger"
                icon={<XCircle size={20} />}
                title="Buyurtmani bekor qilish"
                hint={
                  isPending
                    ? 'Hozir bekor qilsangiz darhol bekor qilinadi'
                    : 'Admin tasdiqlashi kerak'
                }
                disabled={hasPendingRequest || createMutation.isPending}
                onClick={() => setView('cancel')}
              />
              <ActionButton
                icon={<MapPin size={20} />}
                title="Manzilni o'zgartirish"
                hint="Operator orqali yangilash"
                onClick={goAddressChange}
              />
              <ActionButton
                icon={<Headphones size={20} />}
                title="Boshqa savol"
                hint="Operator bilan yozishuv"
                onClick={goSupport}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-[var(--app-text)]">
                Bekor qilish sababi
              </p>
              <div className="space-y-1.5">
                {CANCEL_REASONS.map((r) => {
                  const active = r.id === reasonId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setReasonId(r.id)}
                      className={`flex w-full items-center justify-between rounded-[14px] border px-4 py-3 text-left text-[13px] font-semibold transition-colors ${
                        active
                          ? 'border-indigo-500 bg-indigo-500/10 text-[var(--app-text)]'
                          : 'border-[var(--app-line)] bg-[var(--app-card)] text-[var(--app-text)]'
                      }`}
                    >
                      <span>{r.label}</span>
                      {active ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                          <CheckCircle2 size={14} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setView('menu')}
                  className="flex h-12 flex-1 items-center justify-center rounded-[14px] border border-[var(--app-line)] bg-[var(--app-card)] text-[13px] font-black text-[var(--app-text)]"
                >
                  Orqaga
                </button>
                <button
                  type="button"
                  onClick={submitCancel}
                  disabled={createMutation.isPending}
                  className="flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-[14px] bg-rose-600 text-[13px] font-black text-white transition-opacity active:opacity-85 disabled:opacity-60"
                >
                  {createMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  {isPending ? 'Darhol bekor qilish' : "So'rov yuborish"}
                </button>
              </div>

              {!isPending ? (
                <p className="rounded-[12px] bg-amber-50 p-3 text-[11px] font-semibold leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  Restoran taom tayyorlashni boshlagan bo'lishi mumkin. Sizning
                  so'rovingiz adminga yuboriladi va u tasdiqlasa buyurtma bekor
                  qilinadi.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderModificationSheet;
