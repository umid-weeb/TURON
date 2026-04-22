import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Printer } from 'lucide-react';
import { OrderReceiptDraft } from './OrderReceipt.draft';

type DraftOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName?: string;
  paymentMethod: 'CASH' | 'EXTERNAL_PAYMENT' | 'MANUAL_TRANSFER';
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: Array<{
    id?: string | number;
    itemName?: string;
    name?: string;
    quantity: number;
    totalPrice: number;
  }>;
};

export function OrderSuccessPageDraft() {
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state?.order as DraftOrder | undefined;

  const handlePrint = () => {
    window.print();
  };

  const handleGoToOrders = () => {
    navigate('/customer/orders', { replace: true });
  };

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Buyurtma ma'lumotlari topilmadi.</p>
        <button className="mt-4 text-blue-600" onClick={handleGoToOrders} type="button">
          Buyurtmalarga o'tish
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-10">
      <div className="print:hidden mb-8 flex w-full max-w-sm flex-col items-center text-center">
        <CheckCircle2 className="mb-4 text-green-500 drop-shadow-sm" size={64} />
        <h1 className="mb-2 text-2xl font-black text-gray-900">Buyurtma qabul qilindi!</h1>
        <p className="mb-8 text-sm text-gray-500">Oshpazlarimiz taomingizni tayyorlashni boshlashdi.</p>

        <div className="mb-8 flex w-full gap-3">
          <button
            className="flex-1 rounded-xl bg-gray-200 py-3.5 font-semibold text-gray-800 transition hover:bg-gray-300 active:scale-95"
            onClick={handlePrint}
            type="button"
          >
            <span className="flex items-center justify-center gap-2">
              <Printer size={18} />
              Chek (Print)
            </span>
          </button>
          <button
            className="flex-1 rounded-xl bg-black py-3.5 font-semibold text-white shadow-md transition hover:bg-gray-800 active:scale-95"
            onClick={handleGoToOrders}
            type="button"
          >
            <span className="flex items-center justify-center gap-1">
              Kuzatish
              <ChevronRight size={18} />
            </span>
          </button>
        </div>
      </div>

      <OrderReceiptDraft order={order} />

      <div className="print:hidden mt-8 text-xs text-gray-400">ID: {order.id}</div>
    </div>
  );
}
