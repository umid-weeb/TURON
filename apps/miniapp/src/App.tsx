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

const AdminLayout = React.lazy(() => import('./components/layout/AdminLayout'));
const CourierLayout = React.lazy(() => import('./components/layout/CourierLayout'));
const CustomerLayout = React.lazy(() => import('./components/layout/CustomerLayout'));

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

const HomePage = React.lazy(() => import('./pages/customer/HomePage'));
const SearchPage = React.lazy(() => import('./pages/customer/SearchPage'));
const FavoritesPage = React.lazy(() => import('./pages/customer/FavoritesPage'));
const CategoryPage = React.lazy(() => import('./pages/customer/CategoryPage'));
const MenuPage = React.lazy(() => import('./pages/customer/MenuPage'));
const ProductPage = React.lazy(() => import('./pages/customer/ProductPage'));
const CartPage = React.lazy(() => import('./pages/customer/CartPage'));
const CheckoutPage = React.lazy(() => import('./pages/customer/CheckoutPage'));
const OrderSuccessPage = React.lazy(() => import('./pages/customer/OrderSuccessPage'));
const AddressListPage = React.lazy(() => import('./pages/customer/AddressListPage'));
const AddressFormPage = React.lazy(() => import('./pages/customer/AddressFormPage'));
const MapSelectionPage = React.lazy(() => import('./pages/customer/MapSelectionPage'));
const OrdersPage = React.lazy(() => import('./pages/customer/OrdersPage'));
const OrderDetailPage = React.lazy(() => import('./pages/customer/OrderDetailPage'));
const TrackingMapPage = React.lazy(() => import('./pages/customer/TrackingMapPage'));
const CustomerNotificationsPage = React.lazy(() => import('./pages/customer/NotificationsPage'));
const ProfilePage = React.lazy(() => import('./pages/customer/ProfilePage'));
const CustomerPromosPage = React.lazy(() => import('./pages/customer/CustomerPromosPage'));
const SupportPage = React.lazy(() => import('./pages/customer/SupportPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// function RouteFallback() {
//   return (
//     <div className="flex min-h-[40vh] items-center justify-center px-6">
//       <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
//         <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
//         Yuklanmoqda...
//       </div>
//     </div>
//   );
// }

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <PullToRefreshIndicator />
      <AppBootstrapGate>
        <AppErrorBoundary theme="dark" homeUrl="/">
          {/* <React.Suspense fallback={<RouteFallback />}> */}
          {/* <React.Suspense > */}
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
          {/* </React.Suspense> */}
        </AppErrorBoundary>
      </AppBootstrapGate>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
