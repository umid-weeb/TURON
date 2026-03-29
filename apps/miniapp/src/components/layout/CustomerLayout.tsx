import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { HeaderBar, BottomNavbar } from '../customer/CustomerComponents';

const CustomerLayout: React.FC = () => {
  const location = useLocation();
  
  // Dynamic title based on path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/customer') return 'Turon Kafesi';
    if (path.includes('/customer/category')) return 'Kategoriya';
    if (path.includes('/customer/product')) return 'Taom haqida';
    if (path === '/customer/cart') return 'Savat';
    if (path === '/customer/checkout') return 'Buyurtma';
    if (path === '/customer/orders') return 'Buyurtmalarim';
    return 'Turon';
  };

  const showBack = location.pathname !== '/customer';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <HeaderBar title={getPageTitle()} showBack={showBack} />
      <main className="flex-1 px-5 pt-4 overflow-x-hidden">
        <Outlet />
      </main>
      <BottomNavbar />
    </div>
  );
};

export default CustomerLayout;
