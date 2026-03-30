import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  CreditCard, 
  Truck, 
  Clock, 
  AlertCircle,
  MessageCircle,
  Package,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { 
  StatusActionButtons, 
  CourierAssignModal, 
  PaymentVerificationCard 
} from '../../components/admin/AdminComponents';
import { PaymentStatus } from '../../data/types';
import { getStatusLabel, getStatusColor } from '../../lib/orderStatusUtils';

const AdminOrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById, updateOrderStatus, verifyPayment, rejectPayment, assignCourier } = useOrdersStore();
  
  const [order, setOrder] = useState(orderId ? getOrderById(orderId) : undefined);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);

  useEffect(() => {
    if (!order && orderId) {
      const found = getOrderById(orderId);
      if (found) setOrder(found);
    }
  }, [orderId, getOrderById, order]);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h3 className="text-xl font-black text-slate-900 mb-2 italic uppercase tracking-tighter italic">Buyurtma topilmadi</h3>
        <button onClick={() => navigate('/admin/orders')} className="text-blue-500 font-bold uppercase tracking-widest text-[10px]">Ro'yxatga qaytish</button>
      </div>
    );
  }

  const handleStatusUpdate = (next: string) => {
    updateOrderStatus(order.id, next as any);
    setOrder({ ...order, orderStatus: next as any });
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  const handleApprovePayment = () => {
    verifyPayment(order.id, 'Admin'); // Mock admin name for now
    setOrder({ ...order, paymentStatus: PaymentStatus.COMPLETED, verificationStatus: true });
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const handleRejectPayment = () => {
    if (confirm('Ushbu to\'lovni rad etsangiz, buyurtma ham bekor qilinadi. Davom etasizmi?')) {
      rejectPayment(order.id);
      handleStatusUpdate('CANCELLED');
    }
  };

  const handleCancel = () => {
    if (confirm('Rostdan ham buyurtmani bekor qilmoqchimisiz?')) {
      handleStatusUpdate('CANCELLED');
    }
  };

  const handleCourierAssign = (id: string, name: string) => {
    assignCourier(order.id, id, name);
    setOrder({ ...order, courierId: id, courierName: name });
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const date = new Date(order.createdAt).toLocaleDateString('uz-UZ', { 
    day: 'numeric', 
    month: 'long', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const statusColor = getStatusColor(order.orderStatus);

  return (
    <div className="space-y-6 pb-40 animate-in fade-in slide-in-from-bottom duration-500">
      {/* Detail Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/admin/orders')}
          className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-right">
          <h2 className="text-xl font-black text-slate-900 leading-none italic uppercase tracking-tighter italic">#{order.orderNumber}</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">{date}</p>
        </div>
      </div>

      {/* Current Status Badge */}
      <div className={`w-full p-6 bg-${statusColor}-50 rounded-[32px] border border-${statusColor}-100 flex items-center justify-between shadow-lg shadow-${statusColor}-100/20`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 bg-${statusColor}-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-${statusColor}-200`}>
            <Clock size={24} />
          </div>
          <div>
             <h4 className={`text-[10px] font-black text-${statusColor}-600 uppercase tracking-widest`}>Holat</h4>
             <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{getStatusLabel(order.orderStatus)}</p>
          </div>
        </div>
        <StatusActionButtons 
          currentStatus={order.orderStatus} 
          onUpdate={handleStatusUpdate} 
          onCancel={handleCancel} 
        />
      </div>

      {/* Payment Verification Section (Anti-Fraud Check) */}
      <PaymentVerificationCard 
        order={order} 
        onApprove={handleApprovePayment} 
        onReject={handleRejectPayment} 
      />

      {/* Courier Assignment */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yetkazib beruvchi</h3>
          <button 
            onClick={() => setIsCourierModalOpen(true)}
            className="text-indigo-600 text-[10px] font-black uppercase tracking-widest"
          >
            {order.courierId ? "O'zgartirish" : "Biriktirish"}
          </button>
        </div>
        
        {order.courierName ? (
          <div className="flex items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
            <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <p className="font-black text-indigo-900">{order.courierName}</p>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">Kuryer biriktirilgan</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 opacity-60">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
              <Truck size={24} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Kuryer biriktirilmagan</p>
          </div>
        )}
      </div>

      {/* Address Card */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-1">Mijoz va Manzil</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0">
               <MapPin size={20} />
            </div>
            <div>
               <p className="font-bold text-slate-900 leading-tight">{order.customerAddress?.label || 'Manzil'}</p>
               <p className="text-slate-500 text-xs mt-1 leading-snug">{order.customerAddress?.addressText || 'Manzil yo\'q'}</p>
            </div>
          </div>
          {order.note && (
             <div className="flex items-start gap-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <MessageCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-amber-700 italic">{order.note}</p>
             </div>
          )}
        </div>
      </div>

      {/* Items Summary */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-1">Buyurtma tarkibi</h3>
        <div className="space-y-4">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-slate-50 rounded flex items-center justify-center text-[10px] font-black text-slate-400">{item.quantity}</span>
                <span className="font-bold text-slate-700">{item.name}</span>
              </div>
              <span className="font-black text-slate-900">{(item.price * item.quantity).toLocaleString()} so'm</span>
            </div>
          ))}
          <div className="pt-4 border-t border-slate-50 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Jami</span>
              <span className="text-slate-900">{order.total.toLocaleString()} so'm</span>
            </div>
            <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
              <span>To'lov usuli</span>
              <span>{order.paymentMethod === 'CASH' ? 'Naqd' : 'Onlayn'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Courier Select Modal */}
      <CourierAssignModal 
        isOpen={isCourierModalOpen} 
        onClose={() => setIsCourierModalOpen(false)} 
        onAssign={handleCourierAssign}
        currentCourierId={order.courierId}
      />
    </div>
  );
};

export default AdminOrderDetailPage;
