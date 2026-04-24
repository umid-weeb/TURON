import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRoleEnum } from '@turon/shared';

// Guards & State Shells
import { AppBootstrapGate } from './components/auth/AppBootstrapGate';
import { RoleGuard } from './components/auth/RoleGuard';
import { PullToRefreshIndicator } from './components/customer/PullToRefreshIndicator';
import { AppErrorBoundary } from './components/ui/AppErrorBoundary';
import { NotFoundPage } from './components/ui/FeedbackStates';
import CustomerLayout from './components/layout/CustomerLayout';
import AdminLayout from './components/layout/AdminLayout';
import CourierLayout from './components/layout/CourierLayout';
import {
  AdminDashboardRouteSkeleton,
  AdminFormRouteSkeleton,
  AdminListRouteSkeleton,
  CourierCardsRouteSkeleton,
  CourierDetailRouteSkeleton,
  CourierListRouteSkeleton,
  CourierMapRouteSkeleton,
} from './components/ui/RouteSkeletons';

// Customer flow to'liq eager-load qilinadi.
// Sabab: mini app ichida customer route almashganda global Suspense fallback
// oq "Sahifa yuklanmoqda..." oynasini ko'rsatardi.
// Customer panel bir xil bundle bo'lib kiradi, admin/courier esa lazy qoladi.
import HomePage from './pages/customer/HomePage';
import MenuPage from './pages/customer/MenuPage';
import CartPage from './pages/customer/CartPage';
import OrdersPage from './pages/customer/OrdersPage';
import ProfilePage from './pages/customer/ProfilePage';
import SearchPage from './pages/customer/SearchPage';
import FavoritesPage from './pages/customer/FavoritesPage';
import CategoryPage from './pages/customer/CategoryPage';
import ProductPage from './pages/customer/ProductPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderSuccessPage from './pages/customer/OrderSuccessPage';
import AddressListPage from './pages/customer/AddressListPage';
import AddressFormPage from './pages/customer/AddressFormPage';
import MapSelectionPage from './pages/customer/MapSelectionPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import TrackingMapPage from './pages/customer/TrackingMapPage';
import CustomerNotificationsPage from './pages/customer/NotificationsPage';
import CustomerPromosPage from './pages/customer/CustomerPromosPage';
import SupportPage from './pages/customer/SupportPage';

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

function withPageSkeleton(node: React.ReactNode, fallback: React.ReactNode) {
  return <React.Suspense fallback={fallback}>{node}</React.Suspense>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <PullToRefreshIndicator />
      <AppBootstrapGate>
        <AppErrorBoundary theme="dark" homeUrl="/">
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
              <Route
                path="dashboard"
                element={withPageSkeleton(<AdminDashboardPage />, <AdminDashboardRouteSkeleton />)}
              />
              <Route
                path="orders"
                element={withPageSkeleton(<AdminOrdersPage />, <AdminListRouteSkeleton />)}
              />
              <Route
                path="orders/:orderId"
                element={withPageSkeleton(<AdminOrderDetailPage />, <AdminFormRouteSkeleton />)}
              />
              <Route
                path="notifications"
                element={withPageSkeleton(<AdminNotificationsPage />, <AdminListRouteSkeleton />)}
              />
              <Route
                path="menu"
                element={withPageSkeleton(<AdminMenuDashboard />, <AdminDashboardRouteSkeleton />)}
              />
              <Route
                path="menu/categories"
                element={withPageSkeleton(<AdminCategoriesPage />, <AdminListRouteSkeleton />)}
              />
              <Route
                path="menu/categories/new"
                element={withPageSkeleton(<AdminCategoryFormPage />, <AdminFormRouteSkeleton />)}
              />
              <Route
                path="menu/categories/:categoryId/edit"
                element={withPageSkeleton(<AdminCategoryFormPage />, <AdminFormRouteSkeleton />)}
              />
              <Route
                path="menu/products"
                element={withPageSkeleton(<AdminProductsPage />, <AdminListRouteSkeleton />)}
              />
              <Route
                path="menu/products/new"
                element={withPageSkeleton(<AdminProductFormPage />, <AdminFormRouteSkeleton />)}
              />
              <Route
                path="menu/products/:productId/edit"
                element={withPageSkeleton(<AdminProductFormPage />, <AdminFormRouteSkeleton />)}
              />
              <Route
                path="promos"
                element={withPageSkeleton(<AdminPromosPage />, <AdminListRouteSkeleton />)}
              />
              <Route
                path="promos/new"
                element={withPageSkeleton(<AdminPromoFormPage />, <AdminFormRouteSkeleton />)}
              />
              <Route
                path="promos/:promoId/edit"
                element={withPageSkeleton(<AdminPromoFormPage />, <AdminFormRouteSkeleton />)}
              />
              <Route
                path="couriers"
                element={withPageSkeleton(<AdminCouriersPage />, <AdminListRouteSkeleton />)}
              />
              <Route
                path="reports"
                element={withPageSkeleton(<AdminReportsPage />, <AdminDashboardRouteSkeleton />)}
              />
              <Route
                path="chats"
                element={withPageSkeleton(<AdminChatsPage />, <AdminListRouteSkeleton />)}
              />
              <Route
                path="restaurant"
                element={withPageSkeleton(<RestaurantSettingsPage />, <AdminFormRouteSkeleton />)}
              />
            </Route>

            {/* Courier Module */}
            <Route path="/courier" element={
              <RoleGuard allowedRoles={[UserRoleEnum.COURIER]}>
                <CourierLayout />
              </RoleGuard>
            }>
              <Route
                index
                element={withPageSkeleton(<CourierStatusPage />, <CourierCardsRouteSkeleton />)}
              />
              <Route
                path="orders"
                element={withPageSkeleton(<CourierOrdersPage />, <CourierListRouteSkeleton />)}
              />
              <Route
                path="order/:orderId"
                element={withPageSkeleton(<CourierOrderDetailPage />, <CourierDetailRouteSkeleton />)}
              />
              <Route
                path="map/:orderId"
                element={withPageSkeleton(<CourierMapPage />, <CourierMapRouteSkeleton />)}
              />
              <Route
                path="history"
                element={withPageSkeleton(<CourierHistoryPage />, <CourierListRouteSkeleton />)}
              />
              <Route
                path="profile"
                element={withPageSkeleton(<CourierProfilePage />, <CourierCardsRouteSkeleton />)}
              />
              <Route
                path="notifications"
                element={withPageSkeleton(<CourierNotificationsPage />, <CourierListRouteSkeleton />)}
              />
            </Route>

            {/* Fallback 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppErrorBoundary>
      </AppBootstrapGate>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
