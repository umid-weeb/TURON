import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { CourierMapView } from '../../components/courier/CourierMapView';
import { useUpdateDeliveryStage } from '../../hooks/queries/useOrders';
import { useCourierLocationStore } from '../../store/useCourierLocationStore';
import { haversineDistanceKm, moveTowards, etaMinutes, formatDistance, formatEta } from '../../lib/mapUtils';

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

  const restaurantPos = { lat: 41.311081, lng: 69.240562 }; // Mock restaurant position
  const customerPos = order.customerAddress ? { 
    lat: order.customerAddress.latitude, 
    lng: order.customerAddress.longitude 
  } : restaurantPos;

  const [courierPosition, setCourierPosition] = useState<{lat:number;lng:number}>(restaurantPos);
  const [distanceToTarget, setDistanceToTarget] = useState(0);
  const [etaToTarget, setEtaToTarget] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const courierLocation = useCourierLocationStore((state) => state.currentLocation);
  const { setCurrentLocation } = useCourierLocationStore();

  const stageMutation = useUpdateDeliveryStage();
  const { mutateAsync: updateDeliveryStageMutation } = stageMutation;
  const isStageLoading = stageMutation.status === 'pending';

  const stageState: DeliveryStage = order.deliveryStage || DeliveryStage.IDLE;

  const targetPosition = useMemo(() => {
    if ([DeliveryStage.IDLE, DeliveryStage.GOING_TO_RESTAURANT, DeliveryStage.ARRIVED_AT_RESTAURANT].includes(stageState)) {
      return restaurantPos;
    }
    return customerPos;
  }, [stageState, restaurantPos, customerPos]);

  const mapsProvider = (import.meta.env.VITE_MAPS_PROVIDER || 'mock').toLowerCase();
  const mapApiKey = import.meta.env.VITE_MAP_API_KEY || '';

  const mapReady = mapsProvider === 'yandex' && mapApiKey;

  const getNextStage = (current: DeliveryStage): DeliveryStage | null => {
    switch (current) {
      case DeliveryStage.IDLE:
        return DeliveryStage.GOING_TO_RESTAURANT;
      case DeliveryStage.GOING_TO_RESTAURANT:
        return DeliveryStage.ARRIVED_AT_RESTAURANT;
      case DeliveryStage.ARRIVED_AT_RESTAURANT:
        return DeliveryStage.PICKED_UP;
      case DeliveryStage.PICKED_UP:
        return DeliveryStage.DELIVERING;
      case DeliveryStage.DELIVERING:
        return DeliveryStage.ARRIVED_AT_DESTINATION;
      case DeliveryStage.ARRIVED_AT_DESTINATION:
        return DeliveryStage.DELIVERED;
      default:
        return null;
    }
  };

  const mapStageToOrderStatus = (stage: DeliveryStage): string | null => {
    switch (stage) {
      case DeliveryStage.PICKED_UP:
      case DeliveryStage.DELIVERING:
      case DeliveryStage.ARRIVED_AT_DESTINATION:
        return 'DELIVERING';
      case DeliveryStage.DELIVERED:
        return 'DELIVERED';
      default:
        return null;
    }
  };

  const updateStage = async (nextStage: DeliveryStage) => {
    if (!order) return;
    setIsTransitioning(true);

    try {
      await updateDeliveryStageMutation({ id: order.id, stage: nextStage });
      updateDeliveryStage(order.id, nextStage);
      const mappedStatus = mapStageToOrderStatus(nextStage);
      if (mappedStatus) updateOrderStatus(order.id, mappedStatus as any);
      setOrder({ ...order, deliveryStage: nextStage });
      if (nextStage === DeliveryStage.DELIVERED) {
        setTimeout(() => navigate('/courier/orders'), 1200);
      }
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('medium');
      }
    } catch (err) {
      console.error('Stage update failed', err);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleStageAction = (nextStage: DeliveryStage) => {
    void updateStage(nextStage);
  };

  const handleCall = () => {
    alert(`Qo'ng'iroq qilinmoqda: ${order.customerAddress?.label || 'Mijoz'}`);
  };

  // Couriers updates distance/eta and shared location
  useEffect(() => {
    const dist = haversineDistanceKm(courierPosition, targetPosition);
    setDistanceToTarget(dist);
    setEtaToTarget(etaMinutes(dist, 22));
    setCurrentLocation(courierPosition);
  }, [courierPosition, targetPosition, setCurrentLocation]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!order) return;

      const stage = order.deliveryStage || DeliveryStage.IDLE;
      if (stage === DeliveryStage.DELIVERED) {
        return;
      }

      const distanceKm = haversineDistanceKm(courierPosition, targetPosition);
      if (distanceKm < 0.05) {
        const next = getNextStage(stage);
        if (next) {
          void updateStage(next);
        }
        return;
      }

      const nextCoord = moveTowards(courierPosition, targetPosition, 0.06); // ~60m per tick
      setCourierPosition(nextCoord);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [order, courierPosition, targetPosition]);

  const liveMarkers = [
    { id: 'restaurant', position: restaurantPos, label: 'KAFE', type: 'PICKUP' as const },
    { id: 'customer', position: customerPos, label: 'MIJOZ', type: 'DELIVERY' as const },
    { id: 'courier', position: courierPosition, label: 'SIZ', type: 'COURIER' as const },
  ];

  return (
    <div className="h-screen w-full relative bg-slate-100 overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        {mapReady ? (
          <CourierMapView
            pickup={restaurantPos}
            destination={customerPos}
            courierPos={courierPosition}
            apiKey={mapApiKey}
          />
        ) : (
          <MockMapProvider.Component
            initialCenter={restaurantPos}
            markers={liveMarkers}
            showRoute={![DeliveryStage.IDLE, DeliveryStage.DELIVERED].includes(stageState)}
            height="100%"
          />
        )}
      </div>

      <div className="absolute top-6 left-6 z-40 bg-white/80 backdrop-blur-xl p-2 rounded-2xl shadow-xl border border-white/50 flex items-center gap-4">
        <button
          onClick={() => navigate(`/courier/order/${order.id}`)}
          className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="pr-4">
          <h2 className="text-sm font-black text-slate-900 leading-none uppercase tracking-tighter">#{order.orderNumber}</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Yetkazish rejimi</p>
        </div>
      </div>

      {stageState !== DeliveryStage.IDLE && stageState !== DeliveryStage.DELIVERED && (
        <div className="animate-in slide-in-from-top duration-700">
          <RouteInfoPanel
            distance={formatDistance(distanceToTarget)}
            eta={formatEta(etaToTarget)}
          />
        </div>
      )}

      <DeliveryBottomPanel
        order={order}
        currentStage={stageState}
        onAction={handleStageAction}
        onCall={handleCall}
      />

      {(isTransitioning || isStageLoading) && (
        <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center">
          <div className="bg-white p-4 rounded-xl shadow-lg text-sm font-bold">Jarayon yuklanmoqda...</div>
        </div>
      )}
    </div>
  );
};

export default CourierMapPage;
