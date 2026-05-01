import React from 'react';
import { CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react';
import {
  useDecideOrderModification,
  useOrderModifications,
  type ModificationRequest,
} from '../../hooks/queries/useOrderModifications';
import { useToast } from '../ui/Toast';

interface Props {
  orderId: string;
  /** Order number for the toast labels. */
  orderNumber: string | number;
}

function typeLabel(t: ModificationRequest['type']) {
  if (t === 'CANCEL') return 'Bekor qilish';
  if (t === 'ADDRESS_CHANGE') return "Manzilni o'zgartirish";
  return 'Boshqa';
}

function statusToken(status: ModificationRequest['status']) {
  if (status === 'PENDING') {
    return { label: 'Kutilmoqda', cls: 'bg-amber-100 text-amber-700' };
  }
  if (status === 'AUTO_APPROVED' || status === 'APPROVED') {
    return { label: 'Tasdiqlangan', cls: 'bg-emerald-100 text-emerald-700' };
  }
  return { label: 'Rad etilgan', cls: 'bg-rose-100 text-rose-700' };
}

/**
 * Compact card surfaced on AdminOrderDetailPage that lists every modification
 * request a customer has filed for the order. Pending requests get
 * Approve / Reject buttons inline. Decisions invalidate the order detail
 * + the global pending list so other admin tabs re-render automatically.
 */
export const AdminModificationRequestsCard: React.FC<Props> = ({ orderId, orderNumber }) => {
  const { data: requests = [], isLoading } = useOrderModifications(orderId);
  const decide = useDecideOrderModification(orderId);
  const { showToast } = useToast();

  const [noteByRequest, setNoteByRequest] = React.useState<Record<string, string>>({});

  if (isLoading || requests.length === 0) return null;

  const submit = (reqId: string, approve: boolean) => {
    const decisionNote = noteByRequest[reqId]?.trim() || undefined;
    decide.mutate(
      { reqId, approve, decisionNote },
      {
        onSuccess: (updated) => {
          showToast(
            approve
              ? `#${orderNumber} — so'rov tasdiqlandi`
              : `#${orderNumber} — so'rov rad etildi`,
            approve ? 'success' : 'info',
          );
          setNoteByRequest((prev) => {
            const next = { ...prev };
            delete next[reqId];
            return next;
          });
          void updated;
        },
        onError: (err) => {
          showToast(err.message || "Saqlanmadi", 'error');
        },
      },
    );
  };

  return (
    <section className="admin-pro-card flex flex-col gap-3 rounded-[24px] border border-[rgba(118,90,35,0.14)] bg-white/95 p-4 shadow-[0_18px_36px_rgba(74,56,16,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7a5600]">
            Mijoz so'rovlari
          </p>
          <h3 className="mt-1 text-[15px] font-black tracking-tight text-[var(--admin-pro-text)]">
            {requests.length} ta so'rov
          </h3>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {requests.map((r) => {
          const tag = statusToken(r.status);
          const isPending = r.status === 'PENDING';
          return (
            <div
              key={r.id}
              className="rounded-[20px] border border-[rgba(118,90,35,0.10)] bg-white/95 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-black text-[var(--admin-pro-text)]">
                  {typeLabel(r.type)}
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${tag.cls}`}
                >
                  {isPending ? <Clock size={11} /> : null}
                  {tag.label}
                </span>
              </div>

              {r.reason ? (
                <p className="mt-1.5 text-[12px] font-semibold text-[var(--admin-pro-text-muted)]">
                  Sabab: {r.reason}
                </p>
              ) : null}

              {r.decisionNote && !isPending ? (
                <p className="mt-1.5 text-[12px] font-semibold text-[var(--admin-pro-text-muted)]">
                  Admin izohi: {r.decisionNote}
                </p>
              ) : null}

              {isPending ? (
                <div className="mt-3 flex flex-col gap-2">
                  <textarea
                    value={noteByRequest[r.id] ?? ''}
                    onChange={(event) =>
                      setNoteByRequest((prev) => ({
                        ...prev,
                        [r.id]: event.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="Mijozga izoh (ixtiyoriy)"
                    className="w-full resize-none rounded-[12px] border border-[var(--admin-pro-line)] bg-white/95 px-3 py-2 text-[12px] font-semibold text-[var(--admin-pro-text)] outline-none focus:border-[rgba(255,190,11,0.5)]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => submit(r.id, false)}
                      disabled={decide.isPending}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-rose-300 bg-white text-[12px] font-black text-rose-700 transition-opacity active:opacity-80 disabled:opacity-50"
                    >
                      {decide.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <XCircle size={14} />
                      )}
                      Rad etish
                    </button>
                    <button
                      type="button"
                      onClick={() => submit(r.id, true)}
                      disabled={decide.isPending}
                      className="flex h-10 flex-[1.4] items-center justify-center gap-1.5 rounded-[12px] bg-emerald-600 text-[12px] font-black text-white transition-opacity active:opacity-85 disabled:opacity-60"
                    >
                      {decide.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Tasdiqlash
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AdminModificationRequestsCard;
