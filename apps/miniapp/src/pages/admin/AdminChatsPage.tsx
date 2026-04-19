import React, { useState } from 'react';
import { ArrowLeft, Bike, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminInbox, useAdminOrderChat, type AdminChatEntry } from '../../hooks/queries/useAdminChats';
import { useAuthStore } from '../../store/useAuthStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin || 1} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

// ── Inbox list item ───────────────────────────────────────────────────────────

const InboxItem: React.FC<{
  entry: AdminChatEntry;
  senderType: 'courier' | 'customer';
  isActive: boolean;
  onClick: () => void;
}> = ({ entry, senderType, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition-colors ${
      isActive ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'bg-white hover:bg-slate-50'
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

// ── Chat panel ────────────────────────────────────────────────────────────────

const ChatPanel: React.FC<{
  orderId: string;
  onClose: () => void;
}> = ({ orderId, onClose }) => {
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, isSending } = useAdminOrderChat(orderId);
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isSending) return;
    setInput('');
    await sendMessage(content);
  };

  const ADMIN_QUICK = ['Tushundim', 'Biroz kuting', 'Kuryer yo\'lda', 'Muammoni hal qilamiz'];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <span className="text-[15px] font-black text-slate-900">Buyurtma #{orderId.slice(-6).toUpperCase()}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">Yuklanmoqda...</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">Xabarlar yo'q</div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderRole === 'ADMIN';
            const roleLabel = msg.senderRole === 'COURIER' ? 'Kuryer' : msg.senderRole === 'CUSTOMER' ? 'Mijoz' : 'Admin';
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-[16px] px-3.5 py-2.5 ${
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
                  <p className={`mt-1 text-right text-[10px] ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                    {formatMsgTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
        {ADMIN_QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setInput(q)}
            className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-semibold text-indigo-700 active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
          placeholder="Xabar yozing..."
          className="flex-1 rounded-[14px] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!input.trim() || isSending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white disabled:opacity-40 active:scale-95"
        >
          <MessageCircle size={18} />
        </button>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'couriers' | 'customers';

const AdminChatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('couriers');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { data: inbox, isLoading } = useAdminInbox();

  const courierEntries = inbox?.courierMessages ?? [];
  const customerEntries = inbox?.customerMessages ?? [];
  const currentEntries = activeTab === 'couriers' ? courierEntries : customerEntries;
  const currentSenderType = activeTab === 'couriers' ? 'courier' : 'customer';

  const courierUnread = courierEntries.reduce((s, e) => s + e.unreadCount, 0);
  const customerUnread = customerEntries.reduce((s, e) => s + e.unreadCount, 0);

  if (selectedOrderId) {
    return (
      <div className="flex h-[calc(100vh-56px)] flex-col">
        <ChatPanel orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/admin/dashboard')} className="rounded-full p-1.5 hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-black text-slate-900">Xabarlar</h1>
      </div>

      {/* Tabs */}
      <div className="flex rounded-[14px] bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('couriers')}
          className={`relative flex-1 rounded-[11px] py-2 text-[13px] font-black transition-colors ${
            activeTab === 'couriers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Kuryerlar
          {courierUnread > 0 && (
            <span className="absolute right-2 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
              {courierUnread}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`relative flex-1 rounded-[11px] py-2 text-[13px] font-black transition-colors ${
            activeTab === 'customers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Mijozlar
          {customerUnread > 0 && (
            <span className="absolute right-2 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
              {customerUnread}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Yuklanmoqda...</div>
      ) : currentEntries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-slate-400">
          <MessageCircle size={32} />
          <p className="text-sm font-semibold">
            {activeTab === 'couriers' ? "Kuryerlardan yangi xabar yo'q" : "Mijozlardan yangi xabar yo'q"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentEntries.map((entry) => (
            <InboxItem
              key={entry.orderId}
              entry={entry}
              senderType={currentSenderType}
              isActive={selectedOrderId === entry.orderId}
              onClick={() => setSelectedOrderId(entry.orderId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminChatsPage;
