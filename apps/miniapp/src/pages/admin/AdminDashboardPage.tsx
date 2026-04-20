import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Col, Row, Space, Spin, Statistic, Typography } from 'antd';
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

function formatCompactMoney(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K`;
  }

  return value.toString();
}

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
    <Card className="admin-pro-card admin-motion-up">
      <Space direction="vertical" size={10} className="w-full">
        <div className="flex items-start justify-between gap-2">
          <Typography.Text className="text-[12px] font-semibold text-slate-500">{title}</Typography.Text>
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span>
        </div>
        <Statistic value={value} valueStyle={{ fontSize: 30, fontWeight: 900, color: '#020617' }} />
        <Typography.Text className="text-xs font-medium text-slate-500">{hint}</Typography.Text>
      </Space>
    </Card>
  );
};

const QuickActionCard: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number;
}> = ({ label, icon, onClick, badge }) => (
  <Badge count={badge} size="small">
    <Card className="admin-pro-card admin-motion-up admin-shimmer p-0">
      <Button
        type="text"
        onClick={onClick}
        className="flex h-[94px] w-full flex-col items-center justify-center gap-2 !rounded-xl !text-slate-700 hover:!text-blue-600"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
          {icon}
        </span>
        <span className="text-[12px] font-semibold leading-tight">{label}</span>
      </Button>
    </Card>
  </Badge>
);

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
      <Card className="admin-pro-card admin-motion-up">
        <Typography.Text className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Umumiy holat</Typography.Text>
        <Typography.Title level={4} className="!mb-1 !mt-2 !text-slate-900">
          Bugungi admin ko'rsatkichlari
        </Typography.Title>
        <Typography.Text className="text-sm font-medium text-slate-500">Muhim raqamlar va tezkor o'tishlar bir sahifada</Typography.Text>
      </Card>

      <Row gutter={[12, 12]}>
        <Col span={12}>
          <StatCard
            title="Yangi buyurtmalar"
            value={newOrders.length.toString()}
            hint="Yangi oqim"
            icon={<ClipboardList size={16} />}
            tone="neutral"
          />
        </Col>
        <Col span={12}>
          <StatCard
            title="Bugungi daromad"
            value={formatCompactMoney(deliveredRevenue || orders.reduce((sum, order) => sum + order.total, 0))}
            hint="UZS hisobida"
            icon={<TrendingUp size={16} />}
            tone="success"
          />
        </Col>
        <Col span={12}>
          <StatCard
            title="Faol kuryerlar"
            value={`${onlineCouriers}/${couriers.length || 0}`}
            hint={`${busyCouriers} ta band`}
            icon={<Bike size={16} />}
            tone="warning"
          />
        </Col>
        <Col span={12}>
          <StatCard
            title="Kutilayotganlar"
            value={pendingOrders.length.toString()}
            hint="Tasdiq kutmoqda"
            icon={<Bell size={16} />}
            tone="danger"
          />
        </Col>
      </Row>

      <Card className="admin-pro-card admin-motion-up" title={
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Tezkor amallar</p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-900">Bitta bosishda boshqarish</p>
        </div>
      }>
        {isLoading && orders.length === 0 ? (
          <div className="flex h-[228px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
            <Spin size="large" />
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
      </Card>

      <p className="text-center text-xs font-medium text-slate-400">@turonkafebot</p>
    </div>
  );
};

export default AdminDashboardPage;

