import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import { useAuthStore } from './store/useAuthStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRoleEnum } from '@turon/shared';
import axios from 'axios';

// --- Layouts ---
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage';

// --- Courier Pages ---
import CourierLayout from './components/layout/CourierLayout';
import CourierOrdersPage from './pages/courier/CourierOrdersPage';
import CourierOrderDetailPage from './pages/courier/CourierOrderDetailPage';
import CourierMapPage from './pages/courier/CourierMapPage';

// --- Customer Pages ---
import HomePage from './pages/customer/HomePage';
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

// --- Placeholder Components ---
const LoadingScreen = () => (
  <div className="h-screen flex flex-col items-center justify-center bg-amber-50">
    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
    <p className="text-amber-800 font-medium">Turon Kafesi yuklanmoqda...</p>
  </div>
);

const AuthErrorScreen = ({ message }: { message: string }) => (
  <div className="h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 text-2xl">⚠️</div>
    <h2 className="text-xl font-bold text-red-800 mb-2">Identifikatsiya xatosi</h2>
    <p className="text-red-600">{message}</p>
  </div>
);

const UnauthorizedScreen = () => (
  <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
    <h2 className="text-xl font-bold text-gray-800 mb-2">Ruxsat etilmadi</h2>
    <p className="text-gray-600">Sizda ushbu sahifaga kirish huquqi yo'q.</p>
  </div>
);

// --- Admin/Courier Placeholders ---
const AdminHome = () => <div className="p-4"><h1>🏢 Admin Paneli tez kunda...</h1></div>;
const CourierHome = () => <div className="p-4"><h1>🚚 Kurer Sahifasi tez kunda...</h1></div>;

// --- Main App Logic ---
const AuthGateway: React.FC = () => {
  const { initData, ready, expand } = useTelegram();
  const { setAuth, user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function bootstrap() {
      if (!initData) {
        // For development outside Telegram, let's use a mock user if needed, or error
        setError('Telegram muhiti topilmadi. Iltimos, bot orqali kiring.');
        setLoading(false);
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await axios.post(`${apiUrl}/auth/telegram`, { initData });
        
        const { user: authUser, token } = response.data;
        setAuth(authUser, token);
        
        ready();
        expand();
        
        // Auto-redirect based on role
        if (authUser.role === UserRoleEnum.ADMIN) navigate('/admin');
        else if (authUser.role === UserRoleEnum.COURIER) navigate('/courier');
        else navigate('/customer');
        
      } catch (err: any) {
        setError(err.response?.data?.error || 'Server bilan bog\'lanishda xato yuz berdi.');
      } finally {
        setLoading(false);
      }
    }

    if (!isAuthenticated) {
      bootstrap();
    } else {
      setLoading(false);
      // Already authed, redirect from root if necessary
      if (location.pathname === '/') {
          if (user?.role === UserRoleEnum.ADMIN) navigate('/admin');
          else if (user?.role === UserRoleEnum.COURIER) navigate('/courier');
          else navigate('/customer');
      }
    }
  }, [initData, isAuthenticated, user, navigate, ready, expand, setAuth]);

  if (loading) return <LoadingScreen />;
  if (error) return <AuthErrorScreen message={error} />;

  return null;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthGateway />} />
        
        {/* Customer Routes */}
        <Route path="/customer" element={
          <ProtectedRoute allowedRoles={[UserRoleEnum.CUSTOMER, UserRoleEnum.ADMIN]}>
            <CustomerLayout />
          </ProtectedRoute>
        }>
          <Route index element={<HomePage />} />
          <Route path="category/:id" element={<CategoryPage />} />
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="address-success" element={<OrderSuccessPage />} /> {/* Reusing or separate? Using separate below */}
          <Route path="order-success" element={<OrderSuccessPage />} />
          <Route path="addresses" element={<AddressListPage />} />
          <Route path="address/new" element={<AddressFormPage />} />
          <Route path="address/map" element={<MapSelectionPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:orderId" element={<OrderDetailPage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={[UserRoleEnum.ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
        </Route>

        {/* Courier Routes */}
        <Route path="/courier" element={
          <ProtectedRoute allowedRoles={[UserRoleEnum.COURIER, UserRoleEnum.ADMIN]}>
            <CourierLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<CourierOrdersPage />} />
          <Route path="order/:orderId" element={<CourierOrderDetailPage />} />
          <Route path="map/:orderId" element={<CourierMapPage />} />
        </Route>

        <Route path="/auth-error" element={<AuthErrorScreen message="Seans muddati tugagan yoki xato." />} />
        <Route path="/unauthorized" element={<UnauthorizedScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
