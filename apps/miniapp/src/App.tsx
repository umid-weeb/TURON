import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRoleEnum } from '@turon/shared';

// Guards & State Shells
import { AppBootstrapGate } from './components/auth/AppBootstrapGate';
import { RoleGuard } from './components/auth/RoleGuard';
import { RoleRedirect } from './components/auth/RoleRedirect';
import { NotFoundPage } from './components/ui/FeedbackStates';

// --- Layouts ---
import AdminLayout from './components/layout/AdminLayout';
import CourierLayout from './components/layout/CourierLayout';
import CustomerLayout from './components/layout/CustomerLayout';

// --- Admin Pages ---
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage';
import AdminMenuDashboard from './pages/admin/menu/AdminMenuDashboard';
import AdminCategoriesPage from './pages/admin/menu/AdminCategoriesPage';
import AdminCategoryFormPage from './pages/admin/menu/AdminCategoryFormPage';
import AdminProductsPage from './pages/admin/menu/AdminProductsPage';
import AdminProductFormPage from './pages/admin/menu/AdminProductFormPage';
import AdminPromosPage from './pages/admin/promos/AdminPromosPage';
import AdminPromoFormPage from './pages/admin/promos/AdminPromoFormPage';

// --- Courier Pages ---
import CourierOrdersPage from './pages/courier/CourierOrdersPage';
import CourierOrderDetailPage from './pages/courier/CourierOrderDetailPage';
import CourierMapPage from './pages/courier/CourierMapPage';
import CourierNotificationsPage from './pages/courier/CourierNotificationsPage';

// --- Customer Pages ---
import HomePage from './pages/customer/HomePage';
import MenuPage from './pages/customer/MenuPage';
import CategoryPage from './pages/customer/CategoryPage';
import ProductPage from './pages/customer/ProductPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderSuccessPage from './pages/customer/OrderSuccessPage';
import AddressListPage from './pages/customer/AddressListPage';
import AddressFormPage from './pages/customer/AddressFormPage';
import MapSelectionPage from './pages/customer/MapSelectionPage';
import OrdersPage from './pages/customer/OrdersPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import CustomerNotificationsPage from './pages/customer/NotificationsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <AppBootstrapGate>
        <Routes>
          {/* Base Redirect is handled inside AppBootstrapGate */}
          <Route path="/" element={<RoleRedirect />} />

          {/* Customer Module */}
          <Route path="/customer" element={
            <RoleGuard allowedRoles={[UserRoleEnum.CUSTOMER, UserRoleEnum.ADMIN]}>
              <CustomerLayout />
            </RoleGuard>
          }>
            <Route index element={<HomePage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="category/:id" element={<CategoryPage />} />
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
          </Route>

          {/* Courier Module */}
          <Route path="/courier" element={
            <RoleGuard allowedRoles={[UserRoleEnum.COURIER, UserRoleEnum.ADMIN]}>
              <CourierLayout />
            </RoleGuard>
          }>
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders" element={<CourierOrdersPage />} />
            <Route path="order/:orderId" element={<CourierOrderDetailPage />} />
            <Route path="map/:orderId" element={<CourierMapPage />} />
            <Route path="notifications" element={<CourierNotificationsPage />} />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppBootstrapGate>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
