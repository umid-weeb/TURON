import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRoleEnum } from '@turon/shared';

// Guards & State Shells
import { AppBootstrapGate } from './components/auth/AppBootstrapGate';
import { RoleGuard } from './components/auth/RoleGuard';
import { PullToRefreshIndicator } from './components/customer/PullToRefreshIndicator';
import { AppErrorBoundary } from './components/ui/AppErrorBoundary';
import { NotFoundPage } from './components/ui/FeedbackStates';

const AdminLayout = React.lazy(() => import('./components/layout/AdminLayout'));
const CourierLayout = React.lazy(() => import('./components/layout/CourierLayout'));
const CustomerLayout = React.lazy(() => import('./components/layout/CustomerLayout'));

// 🚀 PERFORMANCE FIX: Asosiy menyu sahifalari (Bottom Tabs) to'g'ridan-to'g'ri yuklanadi.
// Bu navigatsiyani 0ms ga tushiradi va oq ekranda (Suspense fallback) qotib qolishning oldini oladi.
import HomePage from './pages/customer/HomePage';
import MenuPage from './pages/customer/MenuPage';
import CartPage from './pages/customer/CartPage';
import OrdersPage from './pages/customer/OrdersPage';
import ProfilePage from './pages/customer/ProfilePage';

const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminOrdersPage = React.lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = React.lazy(() => import('./pages/admin/AdminOrderDetailPage'));
const AdminNotificationsPage = React.lazy(() => import('./pages/admin/AdminNotificationsPage'));
const AdminMenuDashboard = React.lazy(() => import('./pages/admin/menu/AdminMenuDashboard'));
const AdminCategoriesPage = React.lazy(() => import('./pages/admin/menu/AdminCategoriesPage'));
const AdminCategoryFormPage = React.lazy(() => import('./pages/admin/menu/AdminCategoryFormPage'));
const AdminProductsPage = React.lazy(() => import('./pages/admin/menu/AdminProductsPage'));
const AdminProductFormPage = React.lazy(() => import('./pages/admin/menu/AdminProductFormPage'));
const AdminPromosPage = React.lazy(() => import('./pages/admin/promos/AdminPromosPage'));
const AdminPromoFormPage = React.lazy(() => import('./pages/admin/promos/AdminPromoFormPage'));
const AdminCouriersPage = React.lazy(() => import('./pages/admin/AdminCouriersPage'));
const AdminReportsPage = React.lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminChatsPage = React.lazy(() => import('./pages/admin/AdminChatsPage'));
const RestaurantSettingsPage = React.lazy(() => import('./pages/admin/RestaurantSettingsPage'));

const CourierStatusPage = React.lazy(() => import('./pages/courier/CourierStatusPage'));
const CourierOrdersPage = React.lazy(() => import('./pages/courier/CourierOrdersPage'));
const CourierOrderDetailPage = React.lazy(() => import('./pages/courier/CourierOrderDetailPage'));
const CourierMapPage = React.lazy(() => import('./pages/courier/CourierMapPage'));
const CourierNotificationsPage = React.lazy(() => import('./pages/courier/CourierNotificationsPage'));
const CourierHistoryPage = React.lazy(() => import('./pages/courier/CourierHistoryPage'));
const CourierProfilePage = React.lazy(() => import('./pages/courier/CourierProfilePage'));

const SearchPage = React.lazy(() => import('./pages/customer/SearchPage'));
const FavoritesPage = React.lazy(() => import('./pages/customer/FavoritesPage'));
const CategoryPage = React.lazy(() => import('./pages/customer/CategoryPage'));
const ProductPage = React.lazy(() => import('./pages/customer/ProductPage'));
const CheckoutPage = React.lazy(() => import('./pages/customer/CheckoutPage'));
const OrderSuccessPage = React.lazy(() => import('./pages/customer/OrderSuccessPage'));
const AddressListPage = React.lazy(() => import('./pages/customer/AddressListPage'));
const AddressFormPage = React.lazy(() => import('./pages/customer/AddressFormPage'));
const MapSelectionPage = React.lazy(() => import('./pages/customer/MapSelectionPage'));
const OrderDetailPage = React.lazy(() => import('./pages/customer/OrderDetailPage'));
const TrackingMapPage = React.lazy(() => import('./pages/customer/TrackingMapPage'));
const CustomerNotificationsPage = React.lazy(() => import('./pages/customer/NotificationsPage'));
const CustomerPromosPage = React.lazy(() => import('./pages/customer/CustomerPromosPage'));
const SupportPage = React.lazy(() => import('./pages/customer/SupportPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Sahifaga qaytadan kirganda 2 daqiqa davomida API qayta chaqirilmaydi (Keshdan olinadi)
      staleTime: 1000 * 60 * 2, 
      // Kesh xotirada (RAM) 10 daqiqa ushlab turiladi
      gcTime: 1000 * 60 * 10,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 bg-[#f6f6f7]">
      <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-black" />
        Sahifa yuklanmoqda...
      </div>
    </div>
  );
}

function TelegramBackButtonManager() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Orqaga tugmasi bosilganda marshrutni 1 qadam ortga qaytarish
  React.useEffect(() => {
    const twa = (window as any).Telegram?.WebApp;
    if (!twa) return;

    const handleBack = () => {
      navigate(-1);
    };

    twa.BackButton.onClick(handleBack);
    return () => {
      twa.BackButton.offClick(handleBack);
    };
  }, [navigate]);

  // 2. Sahifa o'zgarganda Back tugmasini ko'rsatish yoki yashirish
  React.useEffect(() => {
    const twa = (window as any).Telegram?.WebApp;
    if (!twa) return;

    // Asosiy menyular (Tab) ro'yxati. Bu sahifalarda Back button yashiriladi va default yopish (X) chiqadi.
    const rootPaths = [
      '/',
      '/customer', '/customer/menu', '/customer/search', '/customer/cart', '/customer/orders', '/customer/profile', '/customer/favorites', '/customer/promos', '/customer/support', '/customer/notifications',
      '/admin', '/admin/dashboard', '/admin/orders', '/admin/menu', '/admin/promos', '/admin/couriers', '/admin/reports', '/admin/chats', '/admin/restaurant', '/admin/notifications',
      '/courier', '/courier/orders', '/courier/history', '/courier/profile', '/courier/notifications'
    ];

    const currentPath = location.pathname.replace(/\/$/, '') || '/';
    
    if (rootPaths.includes(currentPath)) {
      twa.BackButton.hide(); // Asosiy sahifalarda Yopish (X) chiqadi
    } else {
      twa.BackButton.show(); // Ichki sahifalarda Orqaga (<) chiqadi
    }
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <TelegramBackButtonManager />
      <PullToRefreshIndicator />
      <AppBootstrapGate>
        <AppErrorBoundary theme="dark" homeUrl="/">
          <React.Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Base Redirect is handled inside AppBootstrapGate */}
              <Route path="/" element={<div />} />
              <Route path="/menu" element={<Navigate to="/customer/menu" replace />} />
              <Route path="/search" element={<Navigate to="/customer/search" replace />} />
              <Route path="/cart" element={<Navigate to="/customer/cart" replace />} />
              <Route path="/profile" element={<Navigate to="/customer/profile" replace />} />
              <Route path="/orders" element={<Navigate to="/customer/orders" replace />} />

              <Route
                path="/customer/orders/:orderId/tracking"
                element={
                  <RoleGuard allowedRoles={[UserRoleEnum.CUSTOMER, UserRoleEnum.ADMIN]}>
                    <TrackingMapPage />
                  </RoleGuard>
                }
              />

              {/* Customer Module */}
              <Route path="/customer" element={
                <RoleGuard allowedRoles={[UserRoleEnum.CUSTOMER, UserRoleEnum.ADMIN]}>
                  <CustomerLayout />
                </RoleGuard>
              }>
                <Route index element={<HomePage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="favorites" element={<FavoritesPage />} />
                <Route path="category/:id" element={<CategoryPage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="product/:id" element={<ProductPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="address-success" element={<OrderSuccessPage />} /> 
                <Route path="order-success" element={<OrderSuccessPage />} />
                <Route path="addresses" element={<AddressListPage />} />
                <Route path="address/new" element={<AddressFormPage />} />
                <Route path="address/map" element={<MapSelectionPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/:orderId" element={<OrderDetailPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="promos" element={<CustomerPromosPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="notifications" element={<CustomerNotificationsPage />} />
              </Route>

              {/* Admin Module */}
              <Route path="/admin" element={
                <RoleGuard allowedRoles={[UserRoleEnum.ADMIN]}>
                  <AdminLayout />
                </RoleGuard>
              }>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
                <Route path="notifications" element={<AdminNotificationsPage />} />
                <Route path="menu" element={<AdminMenuDashboard />} />
                <Route path="menu/categories" element={<AdminCategoriesPage />} />
                <Route path="menu/categories/new" element={<AdminCategoryFormPage />} />
                <Route path="menu/categories/:categoryId/edit" element={<AdminCategoryFormPage />} />
                <Route path="menu/products" element={<AdminProductsPage />} />
                <Route path="menu/products/new" element={<AdminProductFormPage />} />
                <Route path="menu/products/:productId/edit" element={<AdminProductFormPage />} />
                <Route path="promos" element={<AdminPromosPage />} />
                <Route path="promos/new" element={<AdminPromoFormPage />} />
                <Route path="promos/:promoId/edit" element={<AdminPromoFormPage />} />
                <Route path="couriers" element={<AdminCouriersPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="chats" element={<AdminChatsPage />} />
                <Route path="restaurant" element={<RestaurantSettingsPage />} />
              </Route>

              {/* Courier Module */}
              <Route path="/courier" element={
                <RoleGuard allowedRoles={[UserRoleEnum.COURIER]}>
                  <CourierLayout />
                </RoleGuard>
              }>
                <Route index element={<CourierStatusPage />} />
                <Route path="orders" element={<CourierOrdersPage />} />
                <Route path="order/:orderId" element={<CourierOrderDetailPage />} />
                <Route path="map/:orderId" element={<CourierMapPage />} />
                <Route path="history" element={<CourierHistoryPage />} />
                <Route path="profile" element={<CourierProfilePage />} />
                <Route path="notifications" element={<CourierNotificationsPage />} />
              </Route>

              {/* Fallback 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </React.Suspense>
        </AppErrorBoundary>
      </AppBootstrapGate>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
