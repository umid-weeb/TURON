import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Map, Navigation, RefreshCw } from 'lucide-react';
import { CourierOrderCard } from '../../components/courier/CourierComponents';
import { CourierOrderCardSkeleton } from '../../components/ui/Skeleton';
import { useCourierOrders } from '../../hooks/queries/useOrders';

type CourierOrdersTab = 'new' | 'active' | 'completed';

const TAB_META: Array<{ key: CourierOrdersTab; label: string; emptyText: string }> = [
  { key: 'new', label: 'Yangi', emptyText: "Yangi biriktirilgan buyurtma yo'q" },
  { key: 'active', label: 'Faol', emptyText: "Faol yetkazib berish yo'q" },
  { key: 'completed', label: 'Yakunlangan', emptyText: "Yakunlangan buyurtma yo'q" },
];

const CourierOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<CourierOrdersTab>('new');
  const initDone = React.useRef(false);

  const { data: courierOrders = [], isLoading, error, refetch, isFetching } = useCourierOrders();

  const newOrders = courierOrders.filter((o) => o.courierAssignmentStatus === 'ASSIGNED');
  const activeOrders = courierOrders.filter((o) => ['ACCEPTED', 'PICKED_UP', 'DELIVERING'].includes(o.courierAssignmentStatus || ''));
  const completedOrders = courierOrders.filter((o) => ['DELIVERED', 'DECLINED', 'CANCELLED'].includes(o.courierAssignmentStatus || ''));

  React.useEffect(() => {
    if (initDone.current || isLoading) return;
    initDone.current = true;
    if (activeOrders.length > 0) {
      setActiveTab('active');
      return;
    }
    if (newOrders.length > 0) {
      setActiveTab('new');
      return;
    }
    if (completedOrders.length > 0) {
      setActiveTab('completed');
    }
  }, [isLoading, activeOrders.length, newOrders.length, completedOrders.length]);

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 animate-pulse rounded-[10px] bg-black/10 dark:bg-white/10" />
          <div className="h-10 w-10 animate-pulse rounded-[18px] bg-black/10 dark:bg-white/10" />
        </div>
        <div className="h-20 animate-pulse rounded-[24px] bg-black/10 dark:bg-white/10" />
        {[0, 1].map((i) => <CourierOrderCardSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-10">
        <div className="courier-card-strong rounded-[30px] p-8 text-center">
          <AlertCircle size={28} className="mx-auto text-red-400" />
          <p className="mt-4 text-[15px] font-black text-[var(--courier-text)]">Buyurtmalar yuklanmadi</p>
          <p className="mt-2 text-[13px] text-[var(--courier-muted)]">{(error as Error).message}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="courier-cta-primary mt-5 mx-auto flex h-12 items-center gap-2 rounded-[18px] px-5 text-[13px] font-black active:scale-95"
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

  const currentOrders = activeTab === 'new' ? newOrders : activeTab === 'active' ? activeOrders : completedOrders;
  const highlightedActive = activeOrders[0] ?? null;
  const currentMeta = TAB_META.find((t) => t.key === activeTab)!;

  return (
    <div className="courier-enter-up space-y-4 px-4 py-5 pb-32">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="courier-label">Courier Pro</p>
          <p className="mt-1 text-[24px] font-black tracking-tight text-[var(--courier-text)]">Kuryer operatsiyasi</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="courier-topbar-button flex h-11 w-11 items-center justify-center rounded-[18px]"
        >
          <RefreshCw size={17} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="courier-segment flex gap-1 rounded-[24px] p-1.5">
        {TAB_META.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-[18px] py-2.5 transition-all duration-200 ${
                isActive
                  ? 'courier-segment-active shadow-sm'
                  : 'bg-transparent text-[var(--courier-muted)] hover:bg-black/4 active:scale-95 dark:hover:bg-white/6'
              }`}
            >
              <span className={`text-[21px] font-black leading-none tabular-nums ${isActive ? 'text-[var(--courier-accent-contrast)]' : 'text-[var(--courier-text)]/60'}`}>
                {count}
              </span>
              <span className={`text-[11px] font-bold ${isActive ? 'text-[var(--courier-accent-contrast)]/72' : 'text-[var(--courier-muted)]'}`}>
                {tab.label}
              </span>
              {isActive ? <span className="mt-0.5 h-1 w-4 rounded-full bg-black/70" /> : null}
            </button>
          );
        })}
      </div>

      {highlightedActive && activeTab !== 'completed' ? (
        <button
          type="button"
          onClick={() => navigate(`/courier/map/${highlightedActive.id}`)}
          className="courier-floating-banner courier-hoverable flex w-full items-center justify-between rounded-[24px] px-4 py-3.5 text-left active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="courier-accent-pill flex h-10 w-10 items-center justify-center rounded-[14px]">
              <Navigation size={18} className="text-[var(--courier-accent-contrast)]" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white/55">Faol marshrut</p>
              <p className="text-[14px] font-black text-white">#{highlightedActive.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-[12px] font-black text-white">
            <Map size={15} />
            <span>Xarita</span>
          </div>
        </button>
      ) : null}

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-[var(--courier-accent)]" />
          <p className="text-[13px] font-black text-[var(--courier-text)]">{currentMeta.label} buyurtmalar</p>
        </div>
        <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-black text-[var(--courier-muted)] dark:bg-white/6">
          {currentOrders.length} ta
        </span>
      </div>

      {currentOrders.length > 0 ? (
        <div className="space-y-3">
          {currentOrders.map((order) => (
            <CourierOrderCard key={order.id} order={order} onClick={() => navigate(`/courier/order/${order.id}`)} />
          ))}
        </div>
      ) : (
        <div className="courier-card-strong rounded-[30px] px-6 py-10 text-center">
          {activeTab === 'new' ? (
            <>
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--courier-accent-soft)] opacity-70" />
                <div className="courier-accent-pill relative flex h-16 w-16 items-center justify-center rounded-full">
                  <Navigation size={26} className="text-[var(--courier-accent-contrast)]" />
                </div>
              </div>
              <p className="text-[16px] font-black text-[var(--courier-text)]">Buyurtma kutilmoqda</p>
              <p className="mt-1.5 text-[13px] leading-snug text-[var(--courier-muted)]">
                Online bo'lsangiz, yangi topshiriqlar avtomatik keladi
              </p>
            </>
          ) : activeTab === 'active' ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--courier-accent-soft)]">
                <Navigation size={26} className="text-[var(--courier-accent-strong)]" />
              </div>
              <p className="text-[16px] font-black text-[var(--courier-text)]">Faol yetkazish yo'q</p>
              <p className="mt-1 text-[13px] text-[var(--courier-muted)]">
                Yangi buyurtmani qabul qiling va marshrut boshlanadi
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/12">
                <CheckCircle2 size={26} className="text-emerald-400" />
              </div>
              <p className="text-[16px] font-black text-[var(--courier-text)]">Hali yakunlanmagan</p>
              <p className="mt-1 text-[13px] text-[var(--courier-muted)]">
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

