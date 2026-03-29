import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Truck,
  MessageCircle,
  ArrowRight,
  Info,
  ChevronLeft
} from 'lucide-react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { DeliveryStage, Order } from '../../data/types';
import { MockMapProvider } from '../../features/maps/providers/MockMapProvider';
import { DeliveryBottomPanel, RouteInfoPanel } from '../../components/courier/CourierComponents';

const CourierMapPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById, updateDeliveryStage, updateOrderStatus } = useOrdersStore();
  
  const [order, setOrder] = useState<Order | undefined>(orderId ? getOrderById(orderId) : undefined);

  useEffect(() => {
    if (!order && orderId) {
      const found = getOrderById(orderId);
      if (found) setOrder(found);
    }
  }, [orderId, getOrderById, order]);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h3 className="text-xl font-black text-slate-900 mb-2 italic uppercase">Buyurtma topilmadi</h3>
        <button onClick={() => navigate('/courier/orders')} className="text-indigo-600 font-bold uppercase tracking-widest text-[10px]">Ro'yxatga qaytish</button>
      </div>
    );
  }

  const handleStageAction = (nextStage: DeliveryStage) => {
    updateDeliveryStage(order.id, nextStage);
    
    // Sync with general order status for Admin/Customer
    if (nextStage === 'PICKED_UP') {
      updateOrderStatus(order.id, 'PICKED_UP');
    } else if (nextStage === 'ON_THE_WAY') {
      updateOrderStatus(order.id, 'DELIVERING');
    } else if (nextStage === 'DELIVERED') {
      updateOrderStatus(order.id, 'DELIVERED');
      // Redirect after a small delay to show success
      setTimeout(() => navigate('/courier/orders'), 2000);
    }

    setOrder({ ...order, deliveryStage: nextStage });

    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  const handleCall = () => {
    alert(`Qo'ng'iroq qilinmoqda: ${order.customerAddress?.label || 'Mijoz'}`);
  };

  // Map Data
  const restaurantPos = { lat: 41.311081, lng: 69.240562 }; // Mock restaurant position
  const customerPos = order.customerAddress ? { 
    lat: order.customerAddress.latitude, 
    lng: order.customerAddress.longitude 
  } : restaurantPos;

  const markers = [
    { id: 'restaurant', position: restaurantPos, label: 'KAFE', type: 'PICKUP' as const },
    { id: 'customer', position: customerPos, label: 'MIJOZ', type: 'DELIVERY' as const },
    { id: 'courier', position: restaurantPos, label: 'Siz', type: 'COURIER' as const }
  ];

  const currentStage = order.deliveryStage || 'IDLE';

  return (
    <div className="h-screen w-full relative bg-slate-100 overflow-hidden font-sans">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <MockMapProvider.Component 
          initialCenter={restaurantPos}
          markers={markers}
          showRoute={currentStage !== 'IDLE' && currentStage !== 'DELIVERED'}
          height="100%"
        />
      </div>

      {/* Floating Header Actions */}
      <div className="absolute top-6 left-6 z-40 bg-white/80 backdrop-blur-xl p-2 rounded-2xl shadow-xl border border-white/50 flex items-center gap-4">
        <button 
          onClick={() => navigate(`/courier/order/${order.id}`)}
          className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="pr-4">
           <h2 className="text-sm font-black text-slate-900 leading-none italic uppercase italic tracking-tighter italic">#{order.orderNumber}</h2>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic italic">Yetkazish rejimi</p>
        </div>
      </div>

      {/* Route Navigation Info (Shows when active) */}
      {currentStage !== 'IDLE' && currentStage !== 'DELIVERED' && (
        <div className="animate-in slide-in-from-top duration-700">
           <RouteInfoPanel 
              distance={currentStage === 'PICKED_UP' || currentStage === 'ON_THE_WAY' ? '1.2 km' : '350 m'} 
              eta={currentStage === 'PICKED_UP' || currentStage === 'ON_THE_WAY' ? '8 daq' : '2 daq'} 
           />
        </div>
      )}

      {/* Bottom Action Panel */}
      <DeliveryBottomPanel 
        order={order} 
        currentStage={currentStage} 
        onAction={handleStageAction}
        onCall={handleCall}
      />
    </div>
  );
};

export default CourierMapPage;
