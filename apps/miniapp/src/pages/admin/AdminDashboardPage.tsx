import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/admin-overhaul.css';
import { useAdminOrders } from '../../hooks/queries/useOrders';
import { useAdminCourierDirectory } from '../../hooks/queries/useCouriers';
import { useOrdersStore } from '../../store/useOrdersStore';
import { AdminDashboardAlert } from '../../features/admin/dashboard/AdminDashboardAlert';
import { AdminDashboardHero } from '../../features/admin/dashboard/AdminDashboardHero';
import { AdminDashboardLiveFeed } from '../../features/admin/dashboard/AdminDashboardLiveFeed';
import { AdminDashboardQuickActions } from '../../features/admin/dashboard/AdminDashboardQuickActions';
import { AdminDashboardSkeleton } from '../../features/admin/dashboard/AdminDashboardSkeleton';
import { AdminDashboardStatRail } from '../../features/admin/dashboard/AdminDashboardStatRail';
import { buildDashboardSummary } from '../../features/admin/dashboard/dashboardUtils';

function useLiveClock() {
  const [value, setValue] = React.useState(() => new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }));

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setValue(new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }));
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  return value;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const clock = useLiveClock();
  const storeOrders = useOrdersStore((state) => state.orders);
  const { data: adminOrders = [], isLoading: ordersLoading } = useAdminOrders();
  const { data: couriers = [], isLoading: couriersLoading } = useAdminCourierDirectory();
  const orders = adminOrders.length > 0 ? adminOrders : storeOrders;
  const summary = React.useMemo(() => buildDashboardSummary(orders, couriers), [couriers, orders]);
  const isInitialLoading = ordersLoading && couriersLoading && adminOrders.length === 0 && storeOrders.length === 0;

  if (isInitialLoading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="adminx-page space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+108px)]">
      <AdminDashboardAlert count={summary.pendingCount} onClick={() => navigate('/admin/orders')} />

      <AdminDashboardHero
        currentTime={clock}
        pendingCount={summary.pendingCount}
        pendingValue={summary.pendingValue}
        todayRevenue={summary.todayRevenue}
        activeCouriers={summary.onlineCouriersCount}
        activeOrdersCount={summary.activeOrdersCount}
        deliveredTodayCount={summary.deliveredTodayCount}
        onOpenOrders={() => navigate('/admin/orders')}
        onOpenReports={() => navigate('/admin/reports')}
      />

      <AdminDashboardStatRail metrics={summary.metrics} onNavigate={(route) => navigate(route)} />

      <AdminDashboardLiveFeed
        orders={summary.recentOrders}
        onOpenAll={() => navigate('/admin/orders')}
        onOpenOrder={(orderId) => navigate(`/admin/orders/${orderId}`)}
      />

      <AdminDashboardQuickActions pendingCount={summary.pendingCount} onNavigate={(route) => navigate(route)} />
    </div>
  );
}
