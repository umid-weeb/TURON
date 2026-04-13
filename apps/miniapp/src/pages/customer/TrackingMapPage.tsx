import React from 'react';
import { ArrowLeft, Clock3, PackageCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrderDetails } from '../../hooks/queries/useOrders';

const TrackingMapPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order } = useOrderDetails(orderId);

  const backPath = orderId ? `/customer/orders/${orderId}` : '/customer/orders';

  return (
    <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_62%,#111827_100%)] px-5 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-between py-6">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white"
          aria-label="Orqaga"
        >
          <ArrowLeft size={20} />
        </button>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.07] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.42)] backdrop-blur-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-amber-300/20 bg-amber-400/12 text-amber-200">
            <Clock3 size={30} />
          </div>

          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/70">
            Tez kunda
          </p>
          <h1 className="mt-3 text-[2.1rem] font-black leading-[0.95] tracking-[-0.05em] text-white">
            Buyurtmani jonli kuzatish vaqtincha o'chirildi
          </h1>
          <p className="mt-4 text-sm font-semibold leading-6 text-white/62">
            Hozir loyiha yengil rejimda ishlaydi. Buyurtma holati order sahifasida va admin
            Telegram guruhida yuritiladi, xarita va jonli lokatsiya keyin bosqichma-bosqich qaytadi.
          </p>

          <div className="mt-6 rounded-[18px] border border-white/10 bg-slate-950/45 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-400/12 text-emerald-200">
                <PackageCheck size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                  Buyurtma
                </p>
                <p className="mt-1 text-base font-black text-white">
                  {order?.orderNumber ? `#${order.orderNumber}` : 'Tafsilotlar'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="mt-6 flex h-[54px] w-full items-center justify-center rounded-[16px] bg-white text-base font-black text-slate-950 transition-transform active:scale-[0.985]"
          >
            Buyurtma tafsilotlariga qaytish
          </button>
        </section>

        <p className="pb-2 text-center text-[11px] font-semibold leading-5 text-white/34">
          Tezlik va barqarorlik uchun vaqtincha optimallashtirildi.
        </p>
      </div>
    </div>
  );
};

export default TrackingMapPage;
