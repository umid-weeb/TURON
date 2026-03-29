import React from 'react';
import { useCartStore } from '../../store/useCartStore';
import { useCheckoutStore } from '../../store/useCheckoutStore';
import { ShoppingBag, Truck, Tag, CreditCard } from 'lucide-react';

const OrderSummaryCard: React.FC = () => {
  const { getSubtotal, getDiscount, appliedPromo, getFinalTotal, items } = useCartStore();
  const { deliveryFee, paymentMethod } = useCheckoutStore();

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const finalTotal = getFinalTotal(deliveryFee);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-white rounded-[40px] p-6 shadow-2xl shadow-gray-200 border border-gray-100 space-y-5 animate-in slide-in-from-bottom duration-500">
      <h3 className="font-black text-lg text-gray-900 uppercase tracking-tight mb-2">Buyurtma Xulosasi</h3>
      
      <div className="space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between items-center text-sm font-bold text-gray-500">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-gray-400" />
            <span>Tanlangan taomlar ({itemCount} ta)</span>
          </div>
          <span className="text-gray-900">{subtotal.toLocaleString()} so'm</span>
        </div>

        {/* Delivery Fee */}
        <div className="flex justify-between items-center text-sm font-bold text-gray-500">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-gray-400" />
            <span>Yetkazib berish</span>
          </div>
          <span className="text-gray-900">{deliveryFee === 0 ? 'Bepul' : `+ ${deliveryFee.toLocaleString()} so'm`}</span>
        </div>

        {/* Discount */}
        {discount > 0 && (
          <div className="flex justify-between items-center text-sm font-black text-amber-600 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <Tag size={16} />
              <span>Chegirma {appliedPromo ? `(${appliedPromo.code})` : ''}</span>
            </div>
            <span>- {discount.toLocaleString()} so'm</span>
          </div>
        )}
      </div>

      <div className="pt-5 border-t border-gray-100 flex justify-between items-center">
        <span className="text-gray-400 font-black uppercase tracking-widest text-[11px]">Umumiy summa:</span>
        <span className="text-3xl font-black text-gray-900 tracking-tight">{finalTotal.toLocaleString()} so'm</span>
      </div>
      
      {/* Mini info about payment */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-gray-400 justify-center pt-2">
         <CreditCard size={12} />
         <span>To'lov turi: {paymentMethod === 'CASH' ? 'Naqd pul' : (paymentMethod === 'ONLINE' ? 'Online' : 'Karta')}</span>
      </div>
    </div>
  );
};

export default OrderSummaryCard;
