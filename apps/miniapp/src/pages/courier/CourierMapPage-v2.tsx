import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useYmaps3 } from '../../hooks/useYmaps3';
import { useYmaps21 } from '../../hooks/useYmaps21';
import { useGPS } from '../../hooks/useGPS';
import { useCompass } from '../../hooks/useCompass';
import { useRoute } from '../../hooks/useRoute';
import { CourierMap } from '../../components/CourierMap/CourierMap';
import { BottomPanel } from '../../components/BottomPanel/BottomPanel';
import { useCourierOrderDetails } from '../../hooks/queries/useOrders';

// ENV dan API keylar — .env da belgilangan bo'lishi kerak
const YMAPS3_KEY = import.meta.env.VITE_YMAPS3_KEY || 'c3e2b675-cbbf-4886-b77a-3ed4e0d4f3f8';
const YMAPS21_KEY = import.meta.env.VITE_YMAPS21_KEY || 'c3e2b675-cbbf-4886-b77a-3ed4e0d4f3f8';

/**
 * Courier Tracker — Yandex Maps 3.0 bilan real-time navigation
 *
 * Xususiyatlari:
 * - 3D xarita perspektiva (45° tilt)
 * - Heading-based camera rotation (azimuth)
 * - Sariq uchburchak courier marker
 * - Yashil polyline route
 * - Pedestrian marshrut (ymaps 2.1 multiRouter)
 * - GPS + Compass fusion
 * - Low-pass filter heading smoothing
 *
 * Architecture:
 * ├── useYmaps3() — Xarita render
 * ├── useYmaps21() — Marshrut hisoblash
 * ├── useGPS() — Geolocation watcher
 * ├── useCompass() — DeviceOrientation listener
 * ├── useRoute() — multiRouter + React Query
 * ├── CourierMap — ymaps3 component
 * └── BottomPanel — Status va tugmalar
 */
export function CourierMapPage() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();

  // ── API Loaders ────────────────────────────────────────────────────────────
  const { ymaps3, ready: map3Ready, error: map3Error } = useYmaps3(YMAPS3_KEY);
  const { ymaps, ready: map21Ready, error: map21Error } = useYmaps21(YMAPS21_KEY);

  // ── Sensors ────────────────────────────────────────────────────────────────
  const { requestPermission, compassPermission } = useCompass();
  useGPS(); // Avtomatik boshlanadi

  // ── Destination (order dan) ────────────────────────────────────────────────
  const { data: order, isLoading: orderLoading } = useCourierOrderDetails(orderId || '');

  const destination: [number, number] =
    order && order.destinationLng && order.destinationLat
      ? [order.destinationLng, order.destinationLat]
      : [69.2687, 41.3111]; // Default — Namuna

  // ── Route kalkulyatsiya ────────────────────────────────────────────────────
  const { isLoading: routeLoading } = useRoute(
    map21Ready ? ymaps : null,
    destination,
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (orderLoading || !map3Ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1a1a2e]">
        <div className="text-center">
          <div className="mb-3 inline-block">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
          </div>
          <p className="text-white text-sm font-medium">Xarita yuklanmoqda…</p>
          {(map3Error || map21Error) && (
            <p className="text-red-400 text-xs mt-2">{map3Error || map21Error}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCall = () => {
    // Telegram bot / backend API call
    console.log('📞 Qo\'ng\'iroq qilish', orderId);
  };

  const handleArrived = () => {
    // Mark delivery as completed
    console.log('✓ Yetib keldim', orderId);
    navigate(`/courier/order/${orderId}/proof-of-delivery`);
  };

  const handleProblem = () => {
    console.log('⚠️ Muammo', orderId);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1a1a2e]">
      {/* Xarita — to'liq fon */}
      {map3Ready && ymaps3 && (
        <CourierMap ymaps3={ymaps3} destination={destination} />
      )}

      {/* Orqasidan chiqish tugmasi */}
      <button
        onClick={() => navigate('/courier/orders')}
        className="absolute top-4 left-4 z-50 flex h-10 w-10 items-center justify-center
          rounded-full border border-white/20 bg-slate-950/60 text-white
          shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
      >
        <ArrowLeft size={18} />
      </button>

      {/* iOS Kompas ruxsat tugmasi */}
      {compassPermission === 'unknown' && (
        <button
          onClick={requestPermission}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
            bg-blue-600 hover:bg-blue-700 text-white rounded-3xl px-8 py-4
            text-sm font-bold shadow-2xl active:scale-95 transition-all"
        >
          📡 Navigatsiyani boshlash
        </button>
      )}

      {/* Pastki panel — masofa, vaqt, tugmalar */}
      <BottomPanel
        routeLoading={routeLoading}
        onCall={handleCall}
        onArrived={handleArrived}
        onProblem={handleProblem}
      />
    </div>
  );
}
