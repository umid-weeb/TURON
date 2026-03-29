import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  MapPin, 
  MessageCircle, 
  CreditCard, 
  Receipt, 
  ArrowLeft,
  RefreshCcw,
  ShoppingBag,
  HelpCircle
} from 'lucide-react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useCartStore } from '../../store/useCartStore';
import { OrderTimeline, TrackingMapPlaceholder, OrderStatusBadge } from '../../components/customer/OrderHistoryComponents';
import { CheckoutSectionCard } from '../../components/customer/CheckoutComponents';
import { getStatusLabel } from '../../lib/orderStatusUtils';

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById } = useOrdersStore();
  const { setItems } = useCartStore();
  
  const [order, setOrder] = useState(orderId ? getOrderById(orderId) : undefined);

  useEffect(() => {
    if (!order && orderId) {
      const found = getOrderById(orderId);
      if (found) setOrder(found);
    }
  }, [orderId, getOrderById, order]);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h3 className="text-xl font-black text-slate-900 mb-2">Buyurtma topilmadi</h3>
        <button onClick={() => navigate('/customer/orders')} className="text-amber-500 font-bold">Ro'yxatga qaytish</button>
      </div>
    );
  }

  const handleReorder = () => {
    setItems([...order.items]);
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    navigate('/customer/cart');
  };

  const date = new Date(order.createdAt).toLocaleDateString('uz-UZ', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="space-y-6 pb-40 animate-in fade-in slide-in-from-bottom duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button 
          onClick={() => navigate('/customer/orders')}
          className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-right">
          <h2 className="text-xl font-black text-slate-900 leading-none italic">#{order.orderNumber}</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{date}</p>
        </div>
      </div>

      {/* Status Timeline */}
      <OrderTimeline status={order.orderStatus} />

      {/* Map Placeholder */}
      {(order.orderStatus === 'ON_WAY' || order.orderStatus === 'ACCEPTED' || order.orderStatus === 'PREPARING') && (
        <TrackingMapPlaceholder />
      )}

      {/* Delivery Details */}
      <CheckoutSectionCard title="Yetkazib berish manzili">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <MapPin size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 leading-tight">{order.customerAddress?.label || 'Manzil'}</h4>
            <p className="text-slate-500 text-sm mt-1">{order.customerAddress?.addressText || 'Manzil ko\'rsatilmadi'}</p>
            {order.note && (
              <div className="flex items-center gap-1.5 mt-2 text-slate-400 italic text-xs">
                <MessageCircle size={12} />
                <span>{order.note}</span>
              </div>
            )}
          </div>
        </div>
      </CheckoutSectionCard>

      {/* Payment Summary */}
      <CheckoutSectionCard title="To'lov ma'lumotlari">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{order.paymentMethod === 'CASH' ? 'Naqd pul' : 'Onlayn to\'lov'}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {order.paymentStatus === 'PAID' ? 'To\'langan' : 'To\'lov kutilmoqda'}
              </p>
            </div>
          </div>
          <div className="text-right">
             <span className="font-black text-slate-900">{order.total.toLocaleString()} so'm</span>
          </div>
        </div>
      </CheckoutSectionCard>

      {/* Order Items */}
      <CheckoutSectionCard title="Buyurtma tarkibi">
        <div className="space-y-4">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                  {item.quantity}x
                </div>
                <span className="font-bold text-slate-700 text-sm">{item.name}</span>
              </div>
              <span className="font-black text-slate-900 text-sm">{(item.price * item.quantity).toLocaleString()} so'm</span>
            </div>
          ))}
          
          <div className="pt-4 border-t border-slate-50 space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
              <span>Subtotal</span>
              <span>{order.subtotal.toLocaleString()} so'm</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-xs text-emerald-500 font-bold uppercase">
                <span>Chegirma</span>
                <span>-{order.discount.toLocaleString()} so'm</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
              <span>Yetkazib berish</span>
              <span>{order.deliveryFee.toLocaleString()} so'm</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="font-black text-slate-900 uppercase tracking-tighter italic">Jami</span>
              <span className="font-black text-amber-600 text-lg italic">{order.total.toLocaleString()} so'm</span>
            </div>
          </div>
        </div>
      </CheckoutSectionCard>

      {/* Support Action */}
      <button className="w-full h-14 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-400 font-bold active:bg-slate-50 transition-colors">
        <HelpCircle size={20} />
        <span>Yordam kerakmi?</span>
      </button>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-24 left-0 right-0 px-6 z-40 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pt-10 pb-2">
        <button 
          onClick={handleReorder}
          className="w-full h-16 bg-slate-900 text-white rounded-[24px] font-black text-lg shadow-2xl shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <RefreshCcw size={24} />
          <span>Yana buyurtma berish</span>
        </button>
      </div>
    </div>
  );
};

export default OrderDetailPage;
