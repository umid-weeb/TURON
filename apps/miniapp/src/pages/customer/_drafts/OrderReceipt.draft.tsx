import React from 'react';

type DraftOrderItem = {
  id?: string | number;
  itemName?: string;
  name?: string;
  quantity: number;
  totalPrice: number;
};

type DraftOrder = {
  orderNumber: string;
  createdAt: string;
  customerName?: string;
  paymentMethod: 'CASH' | 'EXTERNAL_PAYMENT' | 'MANUAL_TRANSFER';
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: DraftOrderItem[];
};

function formatMoney(amount: number) {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} so'm`;
}

function formatDate(dateString: string) {
  if (!dateString) return '';

  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function OrderReceiptDraft({ order }: { order: DraftOrder | null }) {
  if (!order) return null;

  return (
    <div className="mx-auto w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 font-mono text-sm text-black shadow-sm print:max-w-full print:border-none print:p-0 print:shadow-none">
      <div className="mb-4 border-b-2 border-dashed border-gray-300 pb-4 text-center">
        <h2 className="text-2xl font-black uppercase tracking-widest text-gray-900">TURON KAFESI</h2>
        <p className="mt-1 text-gray-500">Buyurtma cheki</p>
      </div>

      <div className="mb-4 space-y-2 text-gray-700">
        <p className="flex justify-between">
          <span>Chek raqami:</span>
          <span className="font-bold text-gray-900">#{order.orderNumber}</span>
        </p>
        <p className="flex justify-between">
          <span>Sana:</span>
          <span>{formatDate(order.createdAt)}</span>
        </p>
        <p className="flex justify-between">
          <span>Mijoz:</span>
          <span className="max-w-[150px] truncate font-medium">{order.customerName || 'Mijoz'}</span>
        </p>
        <p className="flex justify-between">
          <span>To'lov usuli:</span>
          <span className="font-medium">
            {order.paymentMethod === 'CASH'
              ? 'Naqd pul'
              : order.paymentMethod === 'EXTERNAL_PAYMENT'
                ? 'Click/Payme'
                : 'Karta'}
          </span>
        </p>
      </div>

      <div className="mb-4 border-y-2 border-dashed border-gray-300 py-4">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase text-gray-500">
              <th className="w-1/2 pb-2 font-medium">Nomi</th>
              <th className="w-1/4 pb-2 text-center font-medium">Soni</th>
              <th className="w-1/4 pb-2 text-right font-medium">Summa</th>
            </tr>
          </thead>
          <tbody className="align-top text-gray-800">
            {order.items.map((item, index) => (
              <tr key={item.id ?? index}>
                <td className="pr-2 pt-3 font-medium">{item.name || item.itemName}</td>
                <td className="pt-3 text-center text-gray-600">x{item.quantity}</td>
                <td className="pt-3 text-right font-medium">{formatMoney(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-6 space-y-2">
        <p className="flex justify-between text-gray-600">
          <span>Mahsulotlar:</span>
          <span>{formatMoney(order.subtotal)}</span>
        </p>
        <p className="flex justify-between text-gray-600">
          <span>Yetkazish:</span>
          <span>{formatMoney(order.deliveryFee)}</span>
        </p>
        <div className="mt-3 flex justify-between border-t-2 border-gray-900 pt-3 text-lg font-black text-gray-900">
          <span>JAMI:</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center text-center text-xs text-gray-500">
        <svg className="mb-2 h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
        <p>Xaridingiz uchun rahmat!</p>
        <p>Yana kutib qolamiz.</p>
      </div>
    </div>
  );
}
