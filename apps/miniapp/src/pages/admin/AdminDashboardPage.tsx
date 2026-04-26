import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  Bike,
  ChevronRight,
  ClipboardList,
  Clock,
  MessageCircle,
  Store,
  Tag,
  TrendingUp,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { OrderStatusEnum, PaymentStatusEnum } from '@turon/shared';
import type { Order } from '../../data/types';
import { useAdminOrders } from '../../hooks/queries/useOrders';
import { useAdminCourierDirectory } from '../../hooks/queries/useCouriers';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useAdminUnreadTotal } from '../../hooks/queries/useAdminChats';

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCompactMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toString();
}

const UZ_DAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

function getTodayLabel(): string {
  const d = new Date();
  return `${UZ_DAYS[d.getDay()]}, ${d.getDate()} ${UZ_MONTHS[d.getMonth()]}`;
}

function padTwo(n: number): string { return n.toString().padStart(2, '0'); }

function useLiveClock(): string {
  const [t, setT] = useState(() => { const d = new Date(); return `${padTwo(d.getHours())}:${padTwo(d.getMinutes())}`; });
  useEffect(() => {
    const id = setInterval(() => { const d = new Date(); setT(`${padTwo(d.getHours())}:${padTwo(d.getMinutes())}`); }, 30_000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Hozir';
  if (mins < 60) return `${mins}d`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}s`;
  return `${Math.floor(hrs / 24)}k`;
}

function getOrderInitials(order: Order): string {
  if (order.customerName?.trim()) {
    return order.customerName.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }
  return (order.orderNumber ?? order.id).slice(-2).toUpperCase();
}

function getStatusStyle(status: string): { color: string; label: string } {
  if (status === (OrderStatusEnum.PENDING as string)) return { color: '#F5A623', label: 'Yangi' };
  if (status === (OrderStatusEnum.DELIVERED as string)) return { color: '#4ade80', label: 'Yetkazildi' };
  return { color: '#60a5fa', label: 'Jarayonda' };
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const DashboardLoadingState: React.FC = () => (
  <div className="space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)]">
    <div className="admin-pro-card admin-hero-card p-6">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded-full bg-black/10" />
          <div className="h-6 w-16 rounded-full bg-black/8" />
        </div>
        <div className="h-3 w-20 rounded-full bg-black/10" />
        <div className="h-6 w-44 rounded-2xl bg-black/12" />
        <div className="pt-4 border-t border-black/10 space-y-2">
          <div className="h-3 w-24 rounded-full bg-black/8" />
          <div className="h-12 w-36 rounded-xl bg-black/12" />
          <div className="h-3 w-28 rounded-full bg-black/8" />
        </div>
      </div>
    </div>
    <div className="flex gap-2.5 pb-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 w-28 shrink-0 rounded-full bg-[rgba(255,255,255,0.06)]" />
      ))}
    </div>
    <div className="admin-pro-card p-5">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded-full bg-white/8" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/8 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 rounded-full bg-white/8" />
              <div className="h-2.5 w-16 rounded-full bg-white/6" />
            </div>
            <div className="space-y-1.5 text-right">
              <div className="h-3 w-14 rounded-full bg-white/8" />
              <div className="h-2.5 w-10 rounded-full bg-white/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Alert Banner ──────────────────────────────────────────────────────────────

const AlertBanner: React.FC<{ count: number; onClick: () => void }> = ({ count, onClick }) => (
  <button type="button" onClick={onClick} className="admin-alert-banner w-full">
    <span className="admin-alert-dot" />
    <span className="flex-1 text-left"><strong>{count} ta buyurtma</strong> tasdiq kutmoqda</span>
    <ArrowRight size={15} className="shrink-0 opacity-60" />
  </button>
);

// ─── Stat Pills ────────────────────────────────────────────────────────────────

type PillColor = 'success' | 'warning' | 'danger' | 'info';

const PILL_CONFIG: Record<PillColor, { dot: string; text: string; bg: string; border: string }> = {
  success: { dot: '#4ade80', text: 'text-emerald-400', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.18)' },
  warning: { dot: '#F5A623', text: 'text-amber-400',   bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.2)' },
  danger:  { dot: '#ef4444', text: 'text-red-400',     bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)' },
  info:    { dot: '#60a5fa', text: 'text-blue-400',    bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
};

const StatPill: React.FC<{ label: string; value: number; color: PillColor; delay?: number }> = ({ label, value, color, delay = 0 }) => {
  const c = PILL_CONFIG[color];
  return (
    <div
      className="admin-motion-stagger flex shrink-0 items-center gap-2.5 rounded-full border px-4 py-2.5"
      style={{ background: c.bg, borderColor: c.border, animationDelay: `${delay}ms` }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0, boxShadow: `0 0 6px ${c.dot}88` }} />
      <span className="text-[12px] font-semibold text-[var(--admin-pro-text-muted)] whitespace-nowrap">{label}</span>
      <span className={`text-[15px] font-black tabular-nums ${c.text}`}>{value}</span>
    </div>
  );
};

// ─── Order Row ─────────────────────────────────────────────────────────────────

const OrderRow: React.FC<{ order: Order; delay: number; onClick: () => void }> = ({ order, delay, onClick }) => {
  const initials = getOrderInitials(order);
  const status = getStatusStyle(order.orderStatus as string);
  return (
    <button
      type="button"
      onClick={onClick}
      className="admin-motion-stagger flex w-full items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[rgba(255,255,255,0.03)] active:bg-[rgba(255,255,255,0.05)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(245,166,35,0.12)] text-[12px] font-black text-[#F5A623]">
        {initials}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[13px] font-bold text-[var(--admin-pro-text)] truncate">
          {order.customerName?.trim() || `#${order.orderNumber ?? order.id.slice(-4)}`}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
          <span className="text-[11px] font-semibold" style={{ color: status.color }}>{status.label}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[13px] font-black text-[var(--admin-pro-text)] tabular-nums">
          {formatCompactMoney(order.total)}<span className="text-[10px] font-medium text-[var(--admin-pro-text-muted)] ml-0.5">so'm</span>
        </p>
        <p className="text-[10px] font-medium text-[var(--admin-pro-text-muted)] mt-0.5">{timeAgo(order.createdAt)}</p>
      </div>
    </button>
  );
};

// ─── Quick Action Card ─────────────────────────────────────────────────────────

const QuickActionCard: React.FC<{
  label: string; icon: React.ReactNode; onClick: () => void;
  badge?: number; urgent?: boolean; delay?: number;
}> = ({ label, icon, onClick, badge, urgent = false, delay = 0 }) => (
  <div className="relative admin-motion-stagger" style={{ animationDelay: `${delay}ms` }}>
    {badge ? (
      <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shadow-lg">
        {badge > 99 ? '99+' : badge}
      </span>
    ) : null}
    <button
      type="button"
      onClick={onClick}
      className={`admin-pro-card ${urgent ? 'admin-quick-action-urgent' : ''} flex w-full flex-col items-center justify-center gap-2 rounded-[20px] px-3 min-h-[80px] active:scale-[0.96] transition-transform cursor-pointer`}
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${
        urgent
          ? 'bg-[var(--admin-pro-primary)] text-[var(--admin-pro-primary-contrast)] shadow-[0_6px_16px_rgba(245,166,35,0.36)]'
          : 'bg-[rgba(245,166,35,0.1)] text-[#F5A623] border border-[rgba(245,166,35,0.18)]'
      }`}>
        {icon}
      </span>
      <span className="text-[12px] font-bold leading-tight text-center text-[var(--admin-pro-text)]">{label}</span>
    </button>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const currentTime = useLiveClock();
  const todayLabel = useMemo(() => getTodayLabel(), []);

  const storeOrders = useOrdersStore(s => s.orders);
  const { data: chatUnread = 0 } = useAdminUnreadTotal();
  const { data: adminOrders = [], isLoading } = useAdminOrders();
  const { data: couriers = [] } = useAdminCourierDirectory();

  const orders = adminOrders.length > 0 ? adminOrders : storeOrders;
  const newOrders = orders.filter(o => o.orderStatus === OrderStatusEnum.PENDING);
  const pendingOrders = orders.filter(o =>
    o.orderStatus === OrderStatusEnum.PENDING || o.paymentStatus === PaymentStatusEnum.PENDING,
  );
  const deliveredOrders = orders.filter(o => o.orderStatus === OrderStatusEnum.DELIVERED);
  const deliveredRevenue = deliveredOrders.reduce((s, o) => s + o.total, 0);
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const activeOrders = orders.filter(o =>
    o.orderStatus !== OrderStatusEnum.PENDING &&
    o.orderStatus !== OrderStatusEnum.DELIVERED,
  );
  const onlineCouriers = couriers.filter(c => c.isOnline).length;
  const busyCouriers = couriers.filter(c => c.activeAssignments > 0).length;
  const recentOrders = useMemo(() =>
    [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [orders],
  );
  const isInitialLoading = isLoading && adminOrders.length === 0 && storeOrders.length === 0;

  const quickActions = useMemo(() => [
    { key: 'orders',        label: 'Buyurtmalar', icon: <ClipboardList size={20} />, onClick: () => navigate('/admin/orders'),        badge: newOrders.length || undefined,    urgent: newOrders.length > 0 },
    { key: 'couriers',      label: 'Kuryerlar',   icon: <Bike size={20} />,          onClick: () => navigate('/admin/couriers'),      badge: busyCouriers || undefined,        urgent: false },
    { key: 'menu',          label: 'Menyu',        icon: <UtensilsCrossed size={20} />, onClick: () => navigate('/admin/menu'),       badge: undefined,                        urgent: false },
    { key: 'promos',        label: 'Promokodlar',  icon: <Tag size={20} />,           onClick: () => navigate('/admin/promos'),        badge: undefined,                        urgent: false },
    { key: 'reports',       label: 'Hisobotlar',   icon: <BarChart3 size={20} />,     onClick: () => navigate('/admin/reports'),       badge: undefined,                        urgent: false },
    { key: 'notifications', label: 'Xabarlar',     icon: <Bell size={20} />,          onClick: () => navigate('/admin/notifications'), badge: pendingOrders.length || undefined, urgent: false },
    { key: 'chats',         label: 'Chat',         icon: <MessageCircle size={20} />, onClick: () => navigate('/admin/chats'),         badge: chatUnread || undefined,          urgent: false },
    { key: 'restaurant',    label: 'Restoran',     icon: <Store size={20} />,         onClick: () => navigate('/admin/restaurant'),    badge: undefined,                        urgent: false },
  ], [navigate, newOrders.length, busyCouriers, pendingOrders.length, chatUnread]);

  if (isInitialLoading) return <DashboardLoadingState />;

  return (
    <div className="space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)]">

      {/* ── Hero Revenue Card ─────────────────────────────────────────────────── */}
      <section className="admin-pro-card admin-hero-card admin-motion-up p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-lg select-none">🍜</span>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[rgba(30,16,0,0.6)]">Turon Kafe</span>
          </div>
          <div className="admin-hero-clock"><Clock size={11} />{currentTime}</div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="admin-status-dot active" />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(30,16,0,0.5)]">Umumiy holat</p>
        </div>
        <h2 className="text-[20px] font-black tracking-tight text-[#18100A] leading-tight">{"Bugungi ko'rsatkichlar"}</h2>
        <p className="text-[13px] font-semibold text-[rgba(30,16,0,0.55)] mt-0.5">{todayLabel}</p>

        <div className="mt-5 pt-5 border-t border-[rgba(0,0,0,0.12)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(30,16,0,0.45)] mb-2">Bugungi daromad</p>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[48px] font-black text-[#18100A] leading-none tracking-tight">
                {formatCompactMoney(deliveredRevenue || totalRevenue)}
                <span className="text-[18px] font-bold text-[rgba(30,16,0,0.5)] ml-2">so'm</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <TrendingUp size={13} className="text-[rgba(30,16,0,0.5)]" />
                <span className="text-[12px] font-bold text-[rgba(30,16,0,0.55)]">
                  {deliveredOrders.length} ta yetkazildi
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 pb-0.5">
              <p className="text-[10px] font-bold text-[rgba(30,16,0,0.4)] uppercase tracking-wider mb-0.5">Jami</p>
              <p className="text-[28px] font-black text-[#18100A] leading-none">{orders.length}</p>
              <p className="text-[10px] font-bold text-[rgba(30,16,0,0.4)] mt-0.5">buyurtma</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Alert Banner ─────────────────────────────────────────────────────── */}
      {pendingOrders.length > 0 && (
        <AlertBanner count={pendingOrders.length} onClick={() => navigate('/admin/orders')} />
      )}

      {/* ── Stat Pills (horizontal scroll) ───────────────────────────────────── */}
      <div className="-mx-4 px-4">
        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <StatPill label="Yetkazildi" value={deliveredOrders.length} color="success" delay={40} />
          <StatPill label="Faol"       value={activeOrders.length}   color="info"    delay={80} />
          <StatPill label="Kutmoqda"   value={pendingOrders.length}  color={pendingOrders.length > 0 ? 'danger' : 'warning'} delay={120} />
          <StatPill label="Kuryerlar"  value={onlineCouriers}        color="warning" delay={160} />
        </div>
      </div>

      {/* ── Live Order Feed ───────────────────────────────────────────────────── */}
      <section className="admin-pro-card overflow-hidden admin-motion-stagger" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--admin-pro-text-muted)]">Tezkor ko'rish</p>
            <p className="text-[15px] font-black text-[var(--admin-pro-text)]">Oxirgi buyurtmalar</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/orders')}
            className="flex items-center gap-1 text-[#F5A623] text-[12px] font-bold active:opacity-70"
          >
            Barchasi <ChevronRight size={14} />
          </button>
        </div>

        <div className="divide-y divide-[var(--admin-pro-line)]">
          {recentOrders.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[var(--admin-pro-text-muted)] text-sm font-semibold">Buyurtmalar mavjud emas</p>
            </div>
          ) : recentOrders.map((order, i) => (
            <OrderRow
              key={order.id}
              order={order}
              delay={200 + i * 40}
              onClick={() => navigate(`/admin/orders/${order.id}`)}
            />
          ))}
        </div>
      </section>

      {/* ── Quick Actions ──────────────────────────────────────────────────────── */}
      <section className="admin-pro-card p-5 admin-motion-stagger" style={{ animationDelay: '380ms' }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--admin-pro-text-muted)] mb-1">Tezkor amallar</p>
            <p className="text-[17px] font-black tracking-tight text-[var(--admin-pro-text)] leading-tight">Bitta bosishda boshqarish</p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(245,166,35,0.3)] bg-[rgba(245,166,35,0.1)] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#F5A623]">
            <Zap size={10} />Admin
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map(({ key: itemKey, ...rest }, i) => (
            <QuickActionCard key={itemKey} {...rest} delay={380 + i * 25} />
          ))}
        </div>
      </section>

      <p className="pb-1 text-center text-[11px] font-semibold text-[var(--admin-pro-text-muted)] opacity-40">
        @turonkafebot · Admin Panel
      </p>

    </div>
  );
};

export default AdminDashboardPage;
