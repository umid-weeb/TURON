import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, Home, ChevronRight } from 'lucide-react';
import { Order } from '../../data/types';

const OrderSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state?.order as Order;

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 px-8 text-center animate-in zoom-in duration-500">
        <h2 className="text-xl font-black text-gray-900 mb-2">Xatolik yuz berdi!</h2>
        <button 
          onClick={() => navigate('/customer')}
          className="mt-6 w-full h-14 bg-amber-500 text-white rounded-[24px] font-black shadow-lg shadow-amber-200 flex items-center justify-center gap-3"
        >
          <span>Asosiy sahifa</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-10 px-6 pb-20 animate-in fade-in duration-700">
      {/* Success Icon */}
      <div className="relative mb-8">
        <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center shadow-inner">
          <CheckCircle2 size={72} className="text-green-500 animate-in zoom-in duration-1000" />
        </div>
        <div className="absolute -top-2 -right-2 w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
            <span className="text-xl uppercase font-black">!</span>
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center space-y-2 mb-10">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none uppercase">Rahmat!</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">Buyurtmangiz qabul qilindi</p>
        <div className="inline-block px-4 py-2 bg-gray-100 rounded-2xl mt-4">
            <span className="text-gray-900 font-black text-lg tracking-tight">#{order.orderNumber}</span>
        </div>
      </div>

      {/* Order Summary Card */}
      <div className="w-full bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-4 mb-10">
         <div className="flex justify-between items-center text-sm font-bold text-gray-500">
            <span>To'lov turi</span>
            <span className="text-gray-900">{order.paymentMethod === 'CASH' ? 'Naqd pul' : (order.paymentMethod === 'ONLINE' ? 'Online' : 'Karta')}</span>
         </div>
         <div className="flex justify-between items-center text-sm font-bold text-gray-500">
            <span>Umumiy miqdor</span>
            <span className="text-xl font-black text-amber-600 tracking-tight">{order.total.toLocaleString()} so'm</span>
         </div>
         <div className="pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                Tez orada operatorimiz siz bilan bog'lanib buyurtmani tasdiqlaydi.
            </p>
         </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-4">
        <button 
          onClick={() => navigate('/customer/orders')}
          className="w-full h-16 bg-gray-900 text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-xl shadow-gray-200"
        >
          <ShoppingBag size={24} />
          <span>Buyurtmalarim</span>
        </button>
        
        <button 
          onClick={() => navigate('/customer')}
          className="w-full h-16 bg-white text-gray-900 rounded-[24px] border-2 border-gray-100 font-black text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
        >
          <Home size={24} />
          <span>Bosh sahifa</span>
        </button>
      </div>

      {/* Hint */}
      <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
         <span>Bizni tanlaganingiz uchun rahmat</span>
         <ChevronRight size={12} />
      </div>
    </div>
  );
};

export default OrderSuccessPage;
