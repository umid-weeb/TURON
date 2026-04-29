import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bike, Check, CheckCheck, LifeBuoy, Loader2, MessageCircle, Send, User } from 'lucide-react';
import {
  useAdminInbox,
  useAdminOrderChat,
  type AdminChatEntry,
  type AdminChatMessage,
} from '../../hooks/queries/useAdminChats';
import { useAuthStore } from '../../store/useAuthStore';

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMin < 60) return `${diffMin || 1} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function entryIconTone(senderType: 'courier' | 'customer' | 'support') {
  if (senderType === 'support') return 'bg-[#fff5db] text-[#a36a00]';
  return senderType === 'courier'
    ? 'bg-[#1f1a12] text-[#ffe39b]'
    : 'bg-[rgba(255,212,59,0.18)] text-[#7a5600]';
}

function isSupportEntry(orderId: string) {
  return orderId.startsWith('support:');
}

function formatEntryLabel(entry: { orderId: string; orderNumber: string }) {
  if (isSupportEntry(entry.orderId)) {
    // orderNumber comes as "1234 · Customer Name" or "Support · Customer Name"
    return entry.orderNumber;
  }
  return `#${entry.orderNumber.padStart(3, '0')}`;
}

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
  const isSupport = isSupportEntry(entry.orderId);
  const tone = isSupport ? 'support' : senderType;
  const badgeLabel = isSupport ? 'Support' : senderType === 'courier' ? 'Kuryer' : 'Mijoz';
  const Icon = isSupport ? LifeBuoy : senderType === 'courier' ? Bike : User;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`admin-pro-card flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-all ${
        isActive
          ? 'border-[rgba(255,190,11,0.22)] bg-[rgba(255,250,238,0.98)] shadow-[0_18px_34px_rgba(255,190,11,0.14)]'
          : 'hover:border-[rgba(255,190,11,0.14)] hover:shadow-[0_16px_30px_rgba(74,56,16,0.11)]'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/40 shadow-sm ${entryIconTone(tone)}`}
      >
        <Icon size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13px] font-black text-[var(--admin-pro-text)]">
              {formatEntryLabel(entry)}
            </span>
            <span className="rounded-full border border-[rgba(255,190,11,0.14)] bg-[rgba(255,212,59,0.12)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#7a5600]">
              {badgeLabel}
            </span>
          </div>
          <span className="text-[11px] text-[var(--admin-pro-text-muted)]">{formatTime(entry.lastAt)}</span>
        </div>
        <p className="mt-1 truncate text-[12px] text-[var(--admin-pro-text-muted)]">{entry.lastMessage}</p>
      </div>

      {entry.unreadCount > 0 ? (
        <span className="admin-pro-nav-badge flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-black">
          {entry.unreadCount}
        </span>
      ) : null}
    </button>
  );
});

const MessageBubble = React.memo(function MessageBubble({
  msg,
  isMine,
}: {
  msg: AdminChatMessage;
  isMine: boolean;
}) {
  const isSending = msg._status === 'sending';
  const roleLabel =
    msg.senderRole === 'COURIER' ? 'Kuryer' : msg.senderRole === 'CUSTOMER' ? 'Mijoz' : 'Admin';

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] rounded-[22px] px-4 py-3 transition-opacity ${isSending ? 'opacity-60' : 'opacity-100'} ${
          isMine
            ? 'rounded-br-[8px] bg-[linear-gradient(135deg,var(--admin-pro-primary)_0%,var(--admin-pro-primary-strong)_100%)] text-[var(--admin-pro-primary-contrast)] shadow-[0_12px_26px_rgba(255,190,11,0.24)]'
            : 'rounded-bl-[8px] border border-[rgba(118,90,35,0.12)] bg-white/92 text-[var(--admin-pro-text)] shadow-[0_10px_24px_rgba(74,56,16,0.06)]'
        }`}
      >
        {!isMine ? (
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--admin-pro-text-muted)]">
            {roleLabel}
          </p>
        ) : null}

        <p className="text-[13px] font-semibold leading-snug">{msg.content}</p>

        <div className="mt-1 flex items-center justify-end gap-1">
          <p className={`text-[10px] ${isMine ? 'text-[rgba(24,18,10,0.54)]' : 'text-[var(--admin-pro-text-muted)]'}`}>
            {isSending ? '...' : formatMsgTime(msg.createdAt)}
          </p>
          {isMine ? (
            isSending ? (
              <Loader2 size={10} className="ml-0.5 animate-spin text-[rgba(24,18,10,0.52)]" />
            ) : msg.isRead ? (
              <CheckCheck size={12} className="text-[rgba(24,18,10,0.72)]" />
            ) : (
              <Check size={12} className="text-[rgba(24,18,10,0.52)]" />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
});

const ADMIN_QUICK = ['Tushundim', 'Biroz kuting', 'Kuryer yo\'lda', 'Muammoni hal qilamiz', 'Bog\'landik'];

const ChatPanel: React.FC<{
  orderId: string;
  targetRole: 'COURIER' | 'CUSTOMER' | null;
  globalConnected: boolean;
  onClose: () => void;
}> = ({ orderId, targetRole, globalConnected, onClose }) => {
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, isSending } = useAdminOrderChat(orderId, globalConnected);
  const adminId = useAuthStore((state) => state.user?.id ?? '');

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef(false);

  useEffect(() => {
    if (!isLoading && messages.length > 0 && !didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [isLoading, messages.length]);

  useEffect(() => {
    if (!didInitialScrollRef.current) return;
    const list = listRef.current;
    if (!list) return;
    const isNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

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
      setInput(content);
    }
  };

  const isSupport = orderId.startsWith('support:');
  const recipientLabel = isSupport
    ? 'Support'
    : targetRole === 'COURIER'
      ? 'Kuryerga'
      : targetRole === 'CUSTOMER'
        ? 'Mijozga'
        : null;

  const headerLabel = isSupport
    ? `Support · ${orderId.slice(-12, -6)}`
    : `#${orderId.slice(-6).toUpperCase()}`;

  return (
    <div className="flex h-full flex-col rounded-[32px] border border-[rgba(118,90,35,0.14)] bg-[rgba(255,251,243,0.96)] shadow-[0_24px_48px_rgba(74,56,16,0.12)] backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-[rgba(118,90,35,0.12)] px-4 py-4">
        <button
          type="button"
          onClick={onClose}
          className="admin-pro-button-secondary inline-flex h-10 w-10 items-center justify-center rounded-2xl"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[16px] font-black text-[var(--admin-pro-text)]">
              {headerLabel}
            </span>
            {recipientLabel ? (
              <span className="rounded-full border border-[rgba(255,190,11,0.16)] bg-[rgba(255,212,59,0.16)] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#7a5600]">
                {recipientLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] font-semibold text-[var(--admin-pro-text-muted)]">
            {isSupport ? 'Support thread (mini app + Telegram)' : 'Jonli admin chat oqimi'}
          </p>
        </div>
        <span
          className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
            globalConnected ? 'admin-pro-sync-good' : 'admin-pro-sync-idle'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${globalConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {globalConnected ? 'Jonli' : 'Kutilyapti'}
        </span>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,248,229,0.66)_0%,rgba(255,252,244,0.96)_100%)] px-4 py-4"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="admin-pro-card admin-pro-card-muted flex items-center gap-3 rounded-[22px] px-4 py-3 text-[var(--admin-pro-text-muted)]">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-bold">Xabarlar yuklanmoqda</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="admin-pro-card flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(255,212,59,0.16)] text-[#7a5600]">
              <MessageCircle size={28} />
            </div>
            <div>
              <p className="text-sm font-black text-[var(--admin-pro-text)]">Xabarlar hali yo'q</p>
              <p className="mt-1 text-xs font-semibold text-[var(--admin-pro-text-muted)]">
                Shu yerning o'zidan birinchi javobni yuborishingiz mumkin.
              </p>
            </div>
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

      <div className="flex gap-2 overflow-x-auto border-t border-[rgba(118,90,35,0.1)] px-4 py-3 no-scrollbar">
        {ADMIN_QUICK.map((quick) => (
          <button
            key={quick}
            type="button"
            onClick={() => setInput(quick)}
            className="admin-pro-button-secondary shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold"
          >
            {quick}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-3 border-t border-[rgba(118,90,35,0.1)] px-4 py-4">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Xabar yozing..."
          rows={1}
          maxLength={500}
          className="min-h-[48px] flex-1 resize-none rounded-[18px] border border-[var(--admin-pro-line)] bg-white/92 px-4 py-3 text-[13px] font-semibold text-[var(--admin-pro-text)] outline-none transition focus:border-[rgba(255,190,11,0.52)] focus:ring-2 focus:ring-[rgba(255,212,59,0.18)]"
          style={{ maxHeight: 88, overflowY: 'auto' }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!input.trim() || isSending}
          className="admin-pro-button-primary mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl disabled:opacity-40"
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

type Tab = 'couriers' | 'customers';

interface SelectedChat {
  orderId: string;
  senderType: 'courier' | 'customer';
}

const AdminChatsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('couriers');
  const [selected, setSelected] = useState<SelectedChat | null>(null);
  const { data: inbox, isLoading } = useAdminInbox();

  const globalConnected = true;

  const courierEntries = inbox?.courierMessages ?? [];
  const customerEntries = inbox?.customerMessages ?? [];
  const courierUnread = courierEntries.reduce((sum, entry) => sum + entry.unreadCount, 0);
  const customerUnread = customerEntries.reduce((sum, entry) => sum + entry.unreadCount, 0);
  const currentEntries = activeTab === 'couriers' ? courierEntries : customerEntries;
  const currentSenderType = activeTab === 'couriers' ? 'courier' : 'customer';

  const targetRole: 'COURIER' | 'CUSTOMER' | null =
    selected?.senderType === 'courier'
      ? 'COURIER'
      : selected?.senderType === 'customer'
        ? 'CUSTOMER'
        : null;

  return (
    <div className="relative min-h-[calc(100dvh-var(--admin-header-clearance)-var(--admin-nav-clearance)+28px)] overflow-hidden pb-2">
      <div
        className="absolute inset-0 flex flex-col gap-4 transition-transform duration-300"
        style={{ transform: selected ? 'translateX(-104%)' : 'translateX(0)' }}
      >
        <section className="admin-pro-card admin-hero-card p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/55">Inbox center</p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-white">Mijoz va kuryer chatlari</h2>
          <div className="mt-4 flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">Kuryer</p>
              <p className="mt-1 text-lg font-black text-white">{courierUnread}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">Mijoz</p>
              <p className="mt-1 text-lg font-black text-white">{customerUnread}</p>
            </div>
            <div className="ml-auto rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/80">
              Jonli oqim
            </div>
          </div>
        </section>

        <div className="admin-pro-card flex rounded-[24px] p-1.5">
          {(['couriers', 'customers'] as Tab[]).map((tab) => {
            const unread = tab === 'couriers' ? courierUnread : customerUnread;
            const label = tab === 'couriers' ? 'Kuryerlar' : 'Mijozlar';
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 rounded-[18px] py-3 text-[13px] font-black transition-all ${
                  isActive
                    ? 'admin-pro-button-primary text-[var(--admin-pro-primary-contrast)] shadow-[0_12px_24px_rgba(255,190,11,0.2)]'
                    : 'text-[var(--admin-pro-text-muted)] hover:bg-[rgba(255,212,59,0.08)]'
                }`}
              >
                {label}
                {unread > 0 ? (
                  <span className="admin-pro-nav-badge absolute right-3 top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black">
                    {unread}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <section className="admin-pro-card flex-1 overflow-hidden rounded-[30px] p-3">
          <div className="space-y-3 overflow-y-auto pr-1">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-[22px] border border-[var(--admin-pro-line)] bg-white/86 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-[rgba(255,212,59,0.18)]" />
                    <div className="min-w-0 flex-1">
                      <div className="h-3 w-28 rounded-full bg-slate-200" />
                      <div className="mt-2 h-3 w-40 rounded-full bg-slate-100" />
                    </div>
                    <div className="h-5 w-5 rounded-full bg-slate-100" />
                  </div>
                </div>
              ))
            ) : currentEntries.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
                <div className="admin-pro-card flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(255,212,59,0.16)] text-[#7a5600]">
                  <MessageCircle size={28} />
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--admin-pro-text)]">
                    {activeTab === 'couriers' ? "Kuryerlardan yangi xabar yo'q" : "Mijozlardan yangi xabar yo'q"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--admin-pro-text-muted)]">
                    Yangi chat kelganda shu ro'yxatda paydo bo'ladi.
                  </p>
                </div>
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
        </section>
      </div>

      <div
        className="absolute inset-0 transition-transform duration-300"
        style={{ transform: selected ? 'translateX(0)' : 'translateX(104%)' }}
      >
        {selected ? (
          <ChatPanel
            key={selected.orderId}
            orderId={selected.orderId}
            targetRole={targetRole}
            globalConnected={globalConnected}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </div>
    </div>
  );
};

export default AdminChatsPage;
