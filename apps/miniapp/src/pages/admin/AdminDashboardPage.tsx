import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Bike,
  ClipboardList,
  MessageCircle,
  Tag,
  TrendingUp,
  UtensilsCrossed,
  BarChart3,
} from 'lucide-react';
import { OrderStatusEnum, PaymentStatusEnum } from '@turon/shared';
import { useAdminOrders } from '../../hooks/queries/useOrders';
import { useAdminCourierDirectory } from '../../hooks/queries/useCouriers';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useAdminUnreadTotal } from '../../hooks/queries/useAdminChats';

const cardClassName =
  'admin-pro-card admin-motion-up rounded-[20px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]';

function formatCompactMoney(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K`;
  }

  return value.toString();
}

const DashboardCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  className = '',
  children,
}) => <section className={`${cardClassName} ${className}`.trim()}>{children}</section>;

const StatCard: React.FC<{
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}> = ({ title, value, hint, icon, tone = 'neutral' }) => {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-600'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-600'
      : tone === 'danger'
          ? 'bg-rose-50 text-rose-600'
          : 'bg-blue-50 text-blue-600';

  return (
    <DashboardCard>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12px] font-semibold text-slate-500">{title}</p>
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span>
        </div>
        <p className="text-[30px] font-black leading-none text-slate-950">{value}</p>
        <p className="text-xs font-medium text-slate-500">{hint}</p>
      </div>
    </DashboardCard>
  );
};

const QuickActionCard: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number;
}> = ({ label, icon, onClick, badge }) => {
  return (
    <div className="relative">
      {badge ? (
        <span className="absolute right-2 top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-sm">
          {badge}
        </span>
      ) : null}
      <DashboardCard className="admin-shimmer p-0">
        <button
          type="button"
          onClick={onClick}
          className="flex h-[94px] w-full flex-col items-center justify-center gap-2 rounded-[20px] px-3 text-slate-700 hover:text-blue-600"
        >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
          {icon}
        </span>
        <span className="text-[12px] font-semibold leading-tight">{label}</span>
        </button>
      </DashboardCard>
    </div>
  );
};

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const storeOrders = useOrdersStore((state) => state.orders);
  const { data: chatUnread = 0 } = useAdminUnreadTotal();

  const { data: adminOrders = [], isLoading } = useAdminOrders();
  const { data: couriers = [] } = useAdminCourierDirectory();

  const orders = adminOrders.length > 0 ? adminOrders : storeOrders;
  const newOrders = orders.filter((order) => order.orderStatus === OrderStatusEnum.PENDING);
  const pendingOrders = orders.filter(
    (order) =>
      order.orderStatus === OrderStatusEnum.PENDING ||
      order.paymentStatus === PaymentStatusEnum.PENDING,
  );
  const deliveredRevenue = orders
    .filter((order) => order.orderStatus === OrderStatusEnum.DELIVERED)
    .reduce((sum, order) => sum + order.total, 0);
  const onlineCouriers = couriers.filter((courier) => courier.isOnline).length;
  const busyCouriers = couriers.filter((courier) => courier.activeAssignments > 0).length;

  const quickActions = useMemo(
    () => [
      {
        key: 'orders',
        label: 'Buyurtmalar',
        icon: <ClipboardList size={20} />,
        onClick: () => navigate('/admin/orders'),
        badge: newOrders.length || undefined,
      },
      {
        key: 'menu',
        label: 'Menyu',
        icon: <UtensilsCrossed size={20} />,
        onClick: () => navigate('/admin/menu'),
      },
      {
        key: 'couriers',
        label: 'Kuryerlar',
        icon: <Bike size={20} />,
        onClick: () => navigate('/admin/couriers'),
        badge: busyCouriers || undefined,
      },
      {
        key: 'promos',
        label: 'Promokodlar',
        icon: <Tag size={20} />,
        onClick: () => navigate('/admin/promos'),
      },
      {
        key: 'reports',
        label: 'Hisobotlar',
        icon: <BarChart3 size={20} />,
        onClick: () => navigate('/admin/reports'),
      },
      {
        key: 'notifications',
        label: 'Xabarlar',
        icon: <Bell size={20} />,
        onClick: () => navigate('/admin/notifications'),
        badge: pendingOrders.length || undefined,
      },
      {
        key: 'chats',
        label: 'Chat',
        icon: <MessageCircle size={20} />,
        onClick: () => navigate('/admin/chats'),
        badge: chatUnread || undefined,
      },
      {
        key: 'restaurant',
        label: 'Restoran',
        icon: <UtensilsCrossed size={20} />,
        onClick: () => navigate('/admin/restaurant'),
      },
    ],
    [navigate, newOrders.length, busyCouriers, pendingOrders.length, chatUnread],
  );

  return (
    <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom,0px)+96px)]">
      <DashboardCard>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Umumiy holat</p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
          Bugungi admin ko'rsatkichlari
        </h2>
        <p className="text-sm font-medium text-slate-500">Muhim raqamlar va tezkor o'tishlar bir sahifada</p>
      </DashboardCard>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <StatCard
            title="Yangi buyurtmalar"
            value={newOrders.length.toString()}
            hint="Yangi oqim"
            icon={<ClipboardList size={16} />}
            tone="neutral"
          />
        </div>
        <div>
          <StatCard
            title="Bugungi daromad"
            value={formatCompactMoney(deliveredRevenue || orders.reduce((sum, order) => sum + order.total, 0))}
            hint="UZS hisobida"
            icon={<TrendingUp size={16} />}
            tone="success"
          />
        </div>
        <div>
          <StatCard
            title="Faol kuryerlar"
            value={`${onlineCouriers}/${couriers.length || 0}`}
            hint={`${busyCouriers} ta band`}
            icon={<Bike size={16} />}
            tone="warning"
          />
        </div>
        <div>
          <StatCard
            title="Kutilayotganlar"
            value={pendingOrders.length.toString()}
            hint="Tasdiq kutmoqda"
            icon={<Bell size={16} />}
            tone="danger"
          />
        </div>
      </div>

      <DashboardCard>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Tezkor amallar</p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-900">Bitta bosishda boshqarish</p>
        </div>
        {isLoading && orders.length === 0 ? (
          <div className="flex h-[228px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {quickActions.map((item) => (
              <QuickActionCard
                key={item.key}
                label={item.label}
                icon={item.icon}
                badge={item.badge}
                onClick={item.onClick}
              />
            ))}
          </div>
        )}
      </DashboardCard>

      <p className="text-center text-xs font-medium text-slate-400">@turonkafebot</p>
    </div>
  );
};

export default AdminDashboardPage;

