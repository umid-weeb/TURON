import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bike, Check, CheckCheck, Loader2, MessageCircle, Send, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useAdminInbox,
  useAdminOrderChat,
  type AdminChatEntry,
  type AdminChatMessage,
} from '../../hooks/queries/useAdminChats';
import { useAuthStore } from '../../store/useAuthStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 60) return `${diffMin || 1} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

// ── Inbox list item ───────────────────────────────────────────────────────────

const InboxItem = React.memo(function InboxItem({
  entry,
  senderType,
  isActive,
  onClick,
}: {
  entry: AdminChatEntry;
  senderType: 'courier' | 'customer';
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition-all ${
        isActive
          ? 'bg-indigo-50 ring-1 ring-indigo-200'
          : 'bg-white hover:bg-slate-50'
      } shadow-[0_4px_12px_rgba(15,23,42,0.06)]`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          senderType === 'courier' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
        }`}
      >
        {senderType === 'courier' ? <Bike size={18} /> : <User size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-black text-slate-900">
            #{entry.orderNumber.padStart(3, '0')}
          </span>
          <span className="text-[11px] text-slate-400">{formatTime(entry.lastAt)}</span>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-slate-500">{entry.lastMessage}</p>
      </div>
      {entry.unreadCount > 0 && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-black text-white">
          {entry.unreadCount}
        </span>
      )}
    </button>
  );
});

// ── Message bubble ────────────────────────────────────────────────────────────

const MessageBubble = React.memo(function MessageBubble({
  msg,
  isMine,
}: {
  msg: AdminChatMessage;
  isMine: boolean;
}) {
  const isSending = msg._status === 'sending';
  const roleLabel =
    msg.senderRole === 'COURIER' ? 'Kuryer'
    : msg.senderRole === 'CUSTOMER' ? 'Mijoz'
    : 'Admin';

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-[16px] px-3.5 py-2.5 transition-opacity ${
          isSending ? 'opacity-60' : 'opacity-100'
        } ${
          isMine
            ? 'rounded-br-[4px] bg-indigo-600 text-white'
            : 'rounded-bl-[4px] bg-slate-100 text-slate-900'
        }`}
      >
        {!isMine && (
          <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
            {roleLabel}
          </p>
        )}
        <p className="text-[13px] font-semibold leading-snug">{msg.content}</p>
        <div className="mt-1 flex items-center justify-end gap-1">
          <p className={`text-[10px] ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
            {isSending ? '...' : formatMsgTime(msg.createdAt)}
          </p>
          {isMine && (
            isSending
              ? <Loader2 size={10} className="ml-0.5 animate-spin text-white/50" />
              : msg.isRead
                ? <CheckCheck size={12} className="text-indigo-200" />
                : <Check size={12} className="text-white/40" />
          )}
        </div>
      </div>
    </div>
  );
});

// ── Chat panel ────────────────────────────────────────────────────────────────

const ADMIN_QUICK = ['Tushundim', 'Biroz kuting', 'Kuryer yo\'lda', 'Muammoni hal qilamiz', 'Bog\'landik'];

const ChatPanel: React.FC<{
  orderId: string;
  targetRole: 'COURIER' | 'CUSTOMER' | null;
  globalConnected: boolean;
  onClose: () => void;
}> = ({ orderId, targetRole, globalConnected, onClose }) => {
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, isSending } = useAdminOrderChat(orderId, globalConnected);
  const adminId = useAuthStore((s) => s.user?.id ?? '');

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef(false);

  // Initial instant scroll
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [isLoading, messages.length]);

  // Smart scroll: only auto-scroll when already near bottom
  useEffect(() => {
    if (!didInitialScrollRef.current) return;
    const list = listRef.current;
    if (!list) return;
    const isNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Reset scroll flag when order changes
  useEffect(() => {
    didInitialScrollRef.current = false;
  }, [orderId]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isSending) return;
    setInput('');
    try {
      await sendMessage(content, targetRole);
    } catch {
      setInput(content); // restore on error
    }
  };

  const recipientLabel =
    targetRole === 'COURIER' ? 'Kuryerga' : targetRole === 'CUSTOMER' ? 'Mijozga' : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 transition-colors hover:bg-slate-100 active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-[15px] font-black text-slate-900">
            #{orderId.slice(-6).toUpperCase()}
          </span>
          {recipientLabel && (
            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-black text-indigo-600">
              {recipientLabel}
            </span>
          )}
        </div>
        {/* SSE dot */}
        <span
          className={`h-2 w-2 rounded-full ${
            globalConnected ? 'bg-emerald-400' : 'bg-slate-300 animate-pulse'
          }`}
        />
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={22} className="animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <MessageCircle size={28} />
            <p className="text-[13px] font-semibold">Xabarlar yo'q</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={msg.senderRole === 'ADMIN' || msg.senderId === adminId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 no-scrollbar">
        {ADMIN_QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setInput(q)}
            className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-semibold text-indigo-700 transition-colors active:scale-95 active:bg-indigo-100"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 border-t border-slate-100 px-4 py-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Xabar yozing..."
          rows={1}
          maxLength={500}
          className="flex-1 resize-none rounded-[14px] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          style={{ maxHeight: 80, overflowY: 'auto' }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!input.trim() || isSending}
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-all active:scale-95 disabled:opacity-40"
        >
          {isSending
            ? <Loader2 size={16} className="animate-spin" />
            : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'couriers' | 'customers';

interface SelectedChat {
  orderId: string;
  /** Which role sent the messages in this inbox entry — determines targetRole for admin replies */
  senderType: 'courier' | 'customer';
}

const AdminChatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('couriers');
  const [selected, setSelected] = useState<SelectedChat | null>(null);
  const { data: inbox, isLoading } = useAdminInbox();

  // Admin always has the global SSE running (AdminLayout opens it).
  // We pass true so useAdminOrderChat won't add redundant polling.
  const globalConnected = true;

  const courierEntries = inbox?.courierMessages ?? [];
  const customerEntries = inbox?.customerMessages ?? [];
  const courierUnread = courierEntries.reduce((s, e) => s + e.unreadCount, 0);
  const customerUnread = customerEntries.reduce((s, e) => s + e.unreadCount, 0);
  const currentEntries = activeTab === 'couriers' ? courierEntries : customerEntries;
  const currentSenderType = activeTab === 'couriers' ? 'courier' : 'customer';

  // targetRole: when admin opens a "courier" thread → direct replies to COURIER, etc.
  const targetRole: 'COURIER' | 'CUSTOMER' | null =
    selected?.senderType === 'courier' ? 'COURIER'
    : selected?.senderType === 'customer' ? 'CUSTOMER'
    : null;

  return (
    <div className="relative flex h-[calc(100dvh-56px)] flex-col overflow-hidden">
      {/* ── Inbox pane (slides out when chat is open) ── */}
      <div
        className="absolute inset-0 flex flex-col transition-transform duration-300"
        style={{ transform: selected ? 'translateX(-100%)' : 'translateX(0)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="rounded-full p-1.5 hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-black text-slate-900">Xabarlar</h1>
        </div>

        {/* Tabs */}
        <div className="mx-4 flex rounded-[14px] bg-slate-100 p-1">
          {(['couriers', 'customers'] as Tab[]).map((tab) => {
            const unread = tab === 'couriers' ? courierUnread : customerUnread;
            const label = tab === 'couriers' ? 'Kuryerlar' : 'Mijozlar';
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 rounded-[11px] py-2 text-[13px] font-black transition-colors ${
                  activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {label}
                {unread > 0 && (
                  <span className="absolute right-2 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 size={22} className="animate-spin text-slate-400" />
            </div>
          ) : currentEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-slate-400">
              <MessageCircle size={32} />
              <p className="text-sm font-semibold">
                {activeTab === 'couriers' ? "Kuryerlardan yangi xabar yo'q" : "Mijozlardan yangi xabar yo'q"}
              </p>
            </div>
          ) : (
            currentEntries.map((entry) => (
              <InboxItem
                key={entry.orderId}
                entry={entry}
                senderType={currentSenderType}
                isActive={selected?.orderId === entry.orderId}
                onClick={() => setSelected({ orderId: entry.orderId, senderType: currentSenderType })}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat pane (slides in when an order is selected) ── */}
      <div
        className="absolute inset-0 bg-white transition-transform duration-300"
        style={{ transform: selected ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {selected && (
          <ChatPanel
            key={selected.orderId}
            orderId={selected.orderId}
            targetRole={targetRole}
            globalConnected={globalConnected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
};

export default AdminChatsPage;
