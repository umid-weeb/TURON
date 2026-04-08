import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Map, Navigation, Package, RefreshCw } from 'lucide-react';
import { CourierOrderCard } from '../../components/courier/CourierComponents';
import { CourierOrderCardSkeleton } from '../../components/ui/Skeleton';
import { useCourierOrders } from '../../hooks/queries/useOrders';

type CourierOrdersTab = 'new' | 'active' | 'completed';

const TAB_META: Array<{ key: CourierOrdersTab; label: string; emptyText: string }> = [
  { key: 'new',       label: 'Yangi',      emptyText: "Yangi biriktirilgan buyurtma yo'q" },
  { key: 'active',    label: 'Faol',       emptyText: "Faol yetkazib berish yo'q" },
  { key: 'completed', label: 'Yakunlangan', emptyText: "Yakunlangan buyurtma yo'q" },
];

const CourierOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<CourierOrdersTab>('new');
  const initDone = React.useRef(false);

  const { data: courierOrders = [], isLoading, error, refetch, isFetching } = useCourierOrders();

  const newOrders       = courierOrders.filter((o) => o.courierAssignmentStatus === 'ASSIGNED');
  const activeOrders    = courierOrders.filter((o) =>
    ['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(o.courierAssignmentStatus || ''),
  );
  const completedOrders = courierOrders.filter((o) =>
    ['DELIVERED', 'DECLINED', 'CANCELLED'].includes(o.courierAssignmentStatus || ''),
  );

  // ── Only auto-select tab on first data load, never override user choice after ──
  React.useEffect(() => {
    if (initDone.current || isLoading) return;
    initDone.current = true;
    if (activeOrders.length > 0)    { setActiveTab('active');    return; }
    if (newOrders.length > 0)       { setActiveTab('new');       return; }
    if (completedOrders.length > 0) { setActiveTab('completed'); return; }
  }, [isLoading, activeOrders.length, newOrders.length, completedOrders.length]);

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 animate-pulse rounded-[10px] bg-slate-200" />
          <div className="h-10 w-10 animate-pulse rounded-[18px] bg-slate-200" />
        </div>
        <div className="h-20 animate-pulse rounded-[20px] bg-slate-200" />
        {[0, 1].map((i) => <CourierOrderCardSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-10">
        <div className="rounded-[26px] border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertCircle size={28} className="mx-auto text-red-400" />
          <p className="mt-4 text-[15px] font-black text-slate-900">Buyurtmalar yuklanmadi</p>
          <p className="mt-2 text-[13px] text-slate-500">{(error as Error).message}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 flex h-12 items-center gap-2 rounded-[18px] bg-slate-900 px-5 text-[13px] font-black text-white mx-auto active:scale-95 transition-transform"
          >
            <RefreshCw size={15} />
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  const counts: Record<CourierOrdersTab, number> = {
    new: newOrders.length,
    active: activeOrders.length,
    completed: completedOrders.length,
  };

  const currentOrders =
    activeTab === 'new' ? newOrders : activeTab === 'active' ? activeOrders : completedOrders;
  const highlightedActive = activeOrders[0] ?? null;
  const currentMeta = TAB_META.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-3 px-4 py-5 pb-32">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-[22px] font-black text-slate-900">Kuryer operatsiyasi</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-500 active:scale-95 transition-transform"
        >
          <RefreshCw size={17} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Segmented tab switcher ───────────────────────────────────── */}
      <div className="rounded-[20px] bg-slate-100 p-1.5 flex gap-1">
        {TAB_META.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-[16px] py-2.5 transition-all duration-200 ${
                isActive
                  ? 'bg-white shadow-sm'
                  : 'bg-transparent hover:bg-slate-200/60 active:scale-95'
              }`}
            >
              <span
                className={`text-[21px] font-black leading-none tabular-nums ${
                  isActive ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                {count}
              </span>
              <span
                className={`text-[11px] font-bold ${
                  isActive ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <span className="mt-0.5 h-1 w-4 rounded-full bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Active route shortcut (always visible if active order exists) ── */}
      {highlightedActive && (
        <button
          type="button"
          onClick={() => navigate(`/courier/map/${highlightedActive.id}`)}
          className="flex w-full items-center justify-between rounded-[22px] bg-emerald-500 px-4 py-3.5 text-left shadow-md shadow-emerald-200 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <Navigation size={18} className="text-white" />
            <div>
              <p className="text-[11px] font-bold text-emerald-100">Faol marshrut</p>
              <p className="text-[14px] font-black text-white">#{highlightedActive.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-black text-white">
            <Map size={15} />
            <span>Xarita</span>
          </div>
        </button>
      )}

      {/* ── Content header — clearly tied to the active tab ─────────── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-indigo-500" />
          <p className="text-[13px] font-black text-slate-700">{currentMeta.label} buyurtmalar</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
          {currentOrders.length} ta
        </span>
      </div>

      {/* ── Orders list ──────────────────────────────────────────────── */}
      {currentOrders.length > 0 ? (
        <div className="space-y-3">
          {currentOrders.map((order) => (
            <CourierOrderCard
              key={order.id}
              order={order}
              onClick={() => navigate(`/courier/order/${order.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[26px] border border-slate-100 bg-white px-6 py-10 text-center shadow-sm">
          {activeTab === 'new' ? (
            /* Animated waiting state for new orders tab */
            <>
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-200 opacity-50" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
                  <Navigation size={26} className="text-indigo-400" />
                </div>
              </div>
              <p className="text-[16px] font-black text-slate-800">Buyurtma kutilmoqda</p>
              <p className="mt-1.5 text-[13px] leading-snug text-slate-400">
                Online bo'lsangiz, yangi topshiriqlar avtomatik keladi
              </p>
            </>
          ) : activeTab === 'active' ? (
            /* Active tab empty */
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                <Navigation size={26} className="text-amber-300" />
              </div>
              <p className="text-[16px] font-black text-slate-700">Faol yetkazish yo'q</p>
              <p className="mt-1 text-[13px] text-slate-400">
                Yangi buyurtmani qabul qiling va marshrut boshlanadi
              </p>
            </>
          ) : (
            /* Completed tab empty */
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 size={26} className="text-emerald-300" />
              </div>
              <p className="text-[16px] font-black text-slate-700">Hali yakunlanmagan</p>
              <p className="mt-1 text-[13px] text-slate-400">
                Birinchi yetkazishni muvaffaqiyatli tugatganingizdan so'ng bu yerda ko'rinadi
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CourierOrdersPage;
