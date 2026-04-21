import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, Loader2, MessageCircle, Phone, Send, X } from 'lucide-react';
import { useOrderChat, type ChatMessage } from '../../hooks/queries/useOrderChat';
import { useAuthStore } from '../../store/useAuthStore';
import { initiateCall } from '../../lib/callUtils';

// ── Quick reply chips ─────────────────────────────────────────────────────────
const COURIER_QUICK = [
  "Yo'ldaman",
  "5 daqiqada yetaman",
  "Manzilni to'g'rilang",
  "Qayerda kutasiz?",
  "Restoranda kutmoqdaman",
];

const CUSTOMER_QUICK = [
  "OK, kutaman",
  "Eshik oldida bo'laman",
  "Qo'ng'iroq qiling",
  "10 daqiqa kuting",
  "Tayyor",
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

// ── Read receipt ──────────────────────────────────────────────────────────────
function ReadReceipt({ isRead, isDark }: { isRead: boolean; isDark: boolean }) {
  const cls = `inline-flex items-center ml-1 ${
    isRead
      ? 'text-indigo-300'
      : isDark
        ? 'text-white/35'
        : 'text-slate-300'
  }`;
  return (
    <span className={cls}>
      {isRead ? <CheckCheck size={12} /> : <Check size={12} />}
    </span>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = React.memo(function MessageBubble({
  msg,
  isMine,
  theme,
}: {
  msg: ChatMessage;
  isMine: boolean;
  theme: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  const isSending = msg._status === 'sending';

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-[18px] px-3.5 py-2.5 transition-opacity ${
          isSending ? 'opacity-60' : 'opacity-100'
        } ${
          isMine
            ? isDark
              ? 'rounded-br-[6px] bg-indigo-500 text-white'
              : 'rounded-br-[6px] bg-indigo-600 text-white'
            : isDark
              ? 'rounded-bl-[6px] bg-white/[0.09] text-white/90'
              : 'rounded-bl-[6px] bg-slate-100 text-slate-900'
        }`}
      >
        {!isMine && (
          <p
            className={`mb-1 text-[10px] font-black uppercase tracking-wide ${
              isDark ? 'text-white/45' : 'text-slate-400'
            }`}
          >
            {msg.senderRole === 'COURIER' ? 'Kuryer' : msg.senderRole === 'ADMIN' ? 'Operator' : 'Mijoz'}
          </p>
        )}
        <p className="text-[13px] font-semibold leading-snug">{msg.content}</p>
        <div className="mt-1 flex items-center justify-end gap-0.5">
          <p
            className={`text-[10px] ${
              isMine ? 'text-white/60' : isDark ? 'text-white/35' : 'text-slate-400'
            }`}
          >
            {isSending ? '...' : formatTime(msg.createdAt)}
          </p>
          {isMine && (
            isSending
              ? <Loader2 size={10} className="ml-1 animate-spin text-white/50" />
              : <ReadReceipt isRead={msg.isRead} isDark={isDark} />
          )}
        </div>
      </div>
    </div>
  );
});

// ── Unread reminder banner ────────────────────────────────────────────────────
function UnreadReminderBanner({
  phoneNumber,
  isDark,
  onDismiss,
}: {
  phoneNumber?: string | null;
  isDark: boolean;
  onDismiss: () => void;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Animate in after a tick
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleCall = () => initiateCall(phoneNumber);

  return (
    <div
      style={{
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s',
        transform: show ? 'translateY(0)' : 'translateY(-20px)',
        opacity: show ? 1 : 0,
      }}
      className={`mx-3 mb-2 flex items-center gap-3 rounded-[14px] p-3 ${
        isDark ? 'bg-amber-500/15 border border-amber-400/20' : 'bg-amber-50 border border-amber-200'
      }`}
    >
      {/* Pulsing phone icon */}
      <div className="relative shrink-0">
        <div className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-40" />
        <div className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
          isDark ? 'bg-amber-400/20' : 'bg-amber-100'
        }`}>
          <Phone size={16} className="text-amber-500" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-black ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
          Xabar o'qilmadi
        </p>
        <p className={`text-[11px] font-medium truncate ${isDark ? 'text-amber-300/70' : 'text-amber-700'}`}>
          Qo'ng'iroq qilib ko'rasizmi?
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        {phoneNumber && (
          <button
            onClick={handleCall}
            className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-black transition-all active:scale-95 ${
              isDark
                ? 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            <Phone size={11} />
            Qo'ng'iroq
          </button>
        )}
        <button
          onClick={onDismiss}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-95 ${
            isDark ? 'bg-white/8 text-white/50' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface OrderChatPanelProps {
  orderId: string;
  role: 'courier' | 'customer';
  /** Phone number of the OTHER party (customer → courier phone; courier → customer phone) */
  otherPartyPhone?: string | null;
  onClose?: () => void;
  theme?: 'light' | 'dark';
  /** If true renders inline (no overlay/backdrop) */
  inline?: boolean;
}

export const OrderChatPanel: React.FC<OrderChatPanelProps> = ({
  orderId,
  role,
  otherPartyPhone,
  onClose,
  theme = 'light',
  inline = false,
}) => {
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const [showReminder, setShowReminder] = useState(false);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const isDark = theme === 'dark';

  const { messages, isLoading, sendMessage, isSending, connected } = useOrderChat(
    orderId,
    role,
    {
      onUnreadReminder: () => setShowReminder(true),
    },
  );

  const quickReplies = role === 'courier' ? COURIER_QUICK : CUSTOMER_QUICK;
  const listRef = useRef<HTMLDivElement | null>(null);

  // Initial scroll to bottom when messages first load
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [isLoading, messages.length]);

  // Smart scroll: only auto-scroll when user is already near the bottom
  useEffect(() => {
    if (!didInitialScrollRef.current) return; // wait for initial scroll first
    const list = listRef.current;
    if (!list) return;
    const isNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft('');
    setShowReminder(false); // hide reminder when user is actively sending
    try {
      await sendMessage(text);
    } catch {
      setDraft(text); // restore on error
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleCall = () => {
    initiateCall(otherPartyPhone);
  };

  const content = (
    <div
      className={`flex h-full flex-col ${
        isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
      }`}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className={`flex shrink-0 items-center justify-between px-4 py-3 ${
          isDark ? 'border-b border-white/8' : 'border-b border-slate-100'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <MessageCircle size={18} className={isDark ? 'text-indigo-300' : 'text-indigo-500'} />
          <p className="text-[15px] font-black">
            {role === 'courier' ? 'Mijoz bilan yozishuv' : 'Kuryer bilan yozishuv'}
          </p>
          {/* Live indicator */}
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? 'bg-emerald-400' : 'bg-slate-400 animate-pulse'
            }`}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* ── Call button (only shown when we have the other party's phone) ── */}
          {otherPartyPhone && (
            <button
              type="button"
              onClick={handleCall}
              title={`${otherPartyPhone} ga qo'ng'iroq`}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 ${
                isDark
                  ? 'bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}
            >
              <Phone size={16} />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors active:scale-95 ${
                isDark ? 'bg-white/8 text-white/60' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Unread reminder (appears 60 s after unread message) ──────────── */}
      {showReminder && (
        <UnreadReminderBanner
          phoneNumber={otherPartyPhone}
          isDark={isDark}
          onDismiss={() => setShowReminder(false)}
        />
      )}

      {/* ── Messages list ─────────────────────────────────────────────────── */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={22} className="animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full ${
                isDark ? 'bg-white/8' : 'bg-slate-100'
              }`}
            >
              <MessageCircle size={24} className={isDark ? 'text-white/30' : 'text-slate-300'} />
            </div>
            <p className={`text-[13px] font-bold ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              Xabarlar yo'q
            </p>
            <p className={`text-[11px] ${isDark ? 'text-white/25' : 'text-slate-300'}`}>
              Birinchi xabarni yuboring
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMine={msg.senderId === userId}
                theme={theme}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Quick reply chips ─────────────────────────────────────────────── */}
      <div
        className={`shrink-0 overflow-x-auto px-4 py-2 ${
          isDark ? 'border-t border-white/8' : 'border-t border-slate-100'
        }`}
      >
        <div className="flex gap-2">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setDraft(q)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-black transition-colors active:scale-95 ${
                isDark
                  ? 'bg-white/8 text-white/70 hover:bg-white/14'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input row ─────────────────────────────────────────────────────── */}
      <div
        className={`shrink-0 px-3 py-3 ${
          isDark ? 'border-t border-white/8' : 'border-t border-slate-100'
        }`}
      >
        <div
          className={`flex items-end gap-2 rounded-[22px] border px-3 py-2 ${
            isDark ? 'border-white/10 bg-white/[0.06]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Xabar yozing..."
            rows={1}
            maxLength={500}
            className={`flex-1 resize-none bg-transparent text-[13px] font-semibold outline-none placeholder:font-normal ${
              isDark ? 'text-white placeholder:text-white/30' : 'text-slate-900 placeholder:text-slate-400'
            }`}
            style={{ maxHeight: '96px', overflowY: 'auto' }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || isSending}
            className={`mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40 ${
              isDark ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'
            }`}
          >
            {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </div>
  );

  if (inline) return content;

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div className="mt-auto max-h-[70vh] w-full overflow-hidden rounded-t-[28px] shadow-2xl">
        {content}
      </div>
    </div>
  );
};

export default OrderChatPanel;
