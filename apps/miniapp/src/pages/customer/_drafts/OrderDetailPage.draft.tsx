import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bike,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  Clock,
  CreditCard,
  MapPin,
  MessageCircle,
  RotateCcw,
  ShoppingBag,
  XCircle,
} from 'lucide-react';

type DraftOrderStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED';

type DraftOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: DraftOrderStatus;
  paymentMethod: 'CASH' | 'EXTERNAL_PAYMENT' | 'MANUAL_TRANSFER';
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerAddress: string;
  note?: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }>;
};

const formatMoney = (amount: number) => `${new Intl.NumberFormat('uz-UZ').format(amount)} so'm`;

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('uz-UZ', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));

export function OrderDetailPageDraft() {
  const navigate = useNavigate();
  const { id } = useParams();

  const order: DraftOrder = {
    id: id || '123',
    orderNumber: '100094',
    createdAt: new Date().toISOString(),
    status: 'DELIVERING',
    paymentMethod: 'CASH',
    subtotal: 128000,
    deliveryFee: 15000,
    total: 143000,
    customerAddress: "O'zbekiston, Toshkent, Sergeli tumani, Yangi Sergeli ko'chasi, 46",
    note: 'Eshik kodi: 1234',
    items: [{ id: 1, name: 'Osh 1 porsiya', quantity: 4, price: 32000, totalPrice: 128000 }],
  };

  const statusSteps = [
    { id: 'PENDING', label: 'Qabul qilindi', icon: Clock },
    { id: 'PREPARING', label: 'Tayyorlanmoqda', icon: ChefHat },
    { id: 'DELIVERING', label: "Yo'lda", icon: Bike },
    { id: 'DELIVERED', label: 'Yetkazildi', icon: CheckCircle2 },
  ] as const;

  const isCancelled = order.status === 'CANCELLED';
  const matchedStepIndex = statusSteps.findIndex((step) => step.id === order.status);
  const currentStepIndex =
    isCancelled ? -1 : matchedStepIndex !== -1 ? matchedStepIndex : order.status === 'READY_FOR_PICKUP' ? 1 : 0;

  const handleReorder = () => {
    navigate('/customer/cart');
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24 font-sans text-gray-900 shadow-sm">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-4">
        <button
          className="-ml-2 rounded-full p-2 transition hover:bg-gray-100 active:scale-95"
          onClick={() => navigate('/customer/orders')}
          type="button"
        >
          <ChevronLeft className="text-gray-700" size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold">Buyurtma #{order.orderNumber}</h1>
          <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {isCancelled ? (
            <div className="flex flex-col items-center text-center">
              <XCircle className="mb-3 text-red-500" size={48} />
              <h2 className="text-xl font-bold text-gray-900">Bekor qilindi</h2>
              <p className="mt-1 text-sm text-gray-500">Ushbu buyurtma bekor qilingan.</p>
            </div>
          ) : (
            <div>
              <h2 className="mb-6 text-center text-lg font-bold">
                {statusSteps[currentStepIndex]?.label || 'Kutilmoqda...'}
              </h2>

              <div className="relative flex items-center justify-between">
                <div className="absolute left-0 top-1/2 z-0 h-1 w-full -translate-y-1/2 rounded-full bg-gray-100" />
                <div
                  className="absolute left-0 top-1/2 z-0 h-1 -translate-y-1/2 rounded-full bg-black transition-all duration-500 ease-in-out"
                  style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
                />

                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 ${
                          isActive ? 'bg-black text-white shadow-md' : 'border-2 border-gray-100 bg-white text-gray-300'
                        } ${isCurrent ? 'ring-4 ring-gray-200' : ''}`}
                      >
                        <Icon size={18} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-gray-900">
            <ShoppingBag size={20} />
            <h3 className="text-base font-bold">Buyurtma tarkibi</h3>
          </div>

          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-700">
                    {item.quantity}x
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight text-gray-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatMoney(item.price)} / dona</p>
                  </div>
                </div>
                <p className="text-sm font-bold">{formatMoney(item.totalPrice)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Taomlar summasi</span>
              <span>{formatMoney(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Yetkazish xizmati</span>
              <span>{formatMoney(order.deliveryFee)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between pt-2 text-lg font-black text-gray-900">
              <span>Umumiy jami</span>
              <span>{formatMoney(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50">
              <MapPin className="text-gray-700" size={18} />
            </div>
            <div>
              <p className="mb-0.5 text-xs font-medium text-gray-500">Yetkazish manzili</p>
              <p className="text-sm font-medium leading-snug text-gray-900">{order.customerAddress}</p>
              {order.note ? (
                <p className="mt-1.5 rounded-md bg-gray-50 p-2 text-xs text-gray-500">
                  <span className="font-medium">Izoh:</span> {order.note}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50">
              <CreditCard className="text-gray-700" size={18} />
            </div>
            <div>
              <p className="mb-0.5 text-xs font-medium text-gray-500">To'lov usuli</p>
              <p className="text-sm font-medium text-gray-900">
                {order.paymentMethod === 'CASH'
                  ? 'Naqd pul'
                  : order.paymentMethod === 'EXTERNAL_PAYMENT'
                    ? 'Click / Payme'
                    : 'Karta'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md border-t border-gray-200 bg-white p-4">
        <div className="flex gap-3">
          <button
            className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-gray-100 text-gray-800 transition hover:bg-gray-200 active:scale-95"
            onClick={() => navigate('/customer/support')}
            type="button"
          >
            <MessageCircle className="mb-0.5" size={20} />
            <span className="text-[10px] font-bold">Yordam</span>
          </button>

          <button
            className="flex-1 rounded-xl bg-black text-sm font-bold text-white shadow-md transition hover:bg-gray-800 active:scale-95"
            onClick={handleReorder}
            type="button"
          >
            <span className="flex items-center justify-center gap-2">
              <RotateCcw size={18} />
              Aynan shuni takrorlash
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
