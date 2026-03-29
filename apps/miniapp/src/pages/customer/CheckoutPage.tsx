import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/useCartStore';
import { useCheckoutStore } from '../../store/useCheckoutStore';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useAddressStore } from '../../store/useAddressStore';
import { CheckoutSectionCard, CheckoutNoteField, EmptyCartState } from '../../components/customer/CheckoutComponents';
import { SelectedAddressCard } from '../../components/customer/AddressComponents';
import PaymentMethodSelector from '../../components/customer/PaymentMethodSelector';
import OrderSummaryCard from '../../components/customer/OrderSummaryCard';
import { MapPin, CreditCard, ShoppingBag, CheckCircle2, ChevronRight, Plus } from 'lucide-react';
import { Order } from '../../data/types';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, getSubtotal, getDiscount, appliedPromo, getFinalTotal, clearCart } = useCartStore();
  const { paymentMethod, note, deliveryFee, resetCheckout } = useCheckoutStore();
  const { addOrder } = useOrdersStore();
  const { getSelectedAddress, setInitialDraft } = useAddressStore();

  const selectedAddress = getSelectedAddress();
  const subtotal = getSubtotal();
  const discount = getDiscount();
  const finalTotal = getFinalTotal(deliveryFee);

  if (items.length === 0) {
    return <EmptyCartState />;
  }

  const handleConfirmOrder = () => {
    // 1. Validation
    if (!selectedAddress) {
      alert('Iltimos, yetkazib berish manzilini tanlang!');
      return;
    }
    if (!paymentMethod) {
      alert('Iltimos, to\'lov turini tanlang!');
      return;
    }

    // 2. Create Order Object
    const order: Order = {
      id: Math.random().toString(36).substr(2, 9),
      orderNumber: `T${Math.floor(1000 + Math.random() * 9000)}`,
      items: [...items],
      subtotal,
      discount,
      deliveryFee,
      total: finalTotal,
      paymentMethod,
      paymentStatus: paymentMethod === 'CASH' ? 'PENDING' : 'PENDING_VERIFICATION',
      promoCode: appliedPromo?.code,
      note: note || selectedAddress.note, // Use checkout note or address note
      createdAt: new Date().toISOString(),
      orderStatus: 'NEW',
      customerAddress: selectedAddress,
    };

    // 3. Save Order
    addOrder(order);

    // 4. Cleanup
    clearCart();
    resetCheckout();

    // 5. Navigate
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    navigate('/customer/order-success', { state: { order } });
  };

  const handleAddNewAddress = () => {
    setInitialDraft();
    navigate('/customer/address/new');
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-44 px-1">
      {/* Address Section */}
      <div className="space-y-3">
        <label className="text-slate-400 text-[11px] font-black uppercase tracking-widest ml-1">Yetkazib berish manzili</label>
        {selectedAddress ? (
          <SelectedAddressCard 
            address={selectedAddress} 
            actionLabel="O'zgartirish"
            onAction={() => navigate('/customer/addresses')}
          />
        ) : (
          <button 
            onClick={handleAddNewAddress}
            className="w-full h-20 bg-amber-50 border-2 border-dashed border-amber-200 rounded-[28px] flex items-center justify-center gap-3 text-amber-600 font-bold active:bg-amber-100 transition-colors"
          >
            <Plus size={24} />
            <span>Manzil qo'shish</span>
          </button>
        )}
      </div>

      {/* Payment Method Section */}
      <CheckoutSectionCard title="To'lov usuli">
        <PaymentMethodSelector />
      </CheckoutSectionCard>

      {/* Order Items Section */}
      <CheckoutSectionCard title="Sizning buyurtmangiz">
        <div className="space-y-3">
          {items.map(item => (
             <div key={item.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                   <span className="font-black text-amber-500 text-xs w-6">{item.quantity}x</span>
                   <span className="font-bold text-gray-700">{item.name}</span>
                </div>
                <span className="font-black text-gray-900">{(item.price * item.quantity).toLocaleString()} so'm</span>
             </div>
          ))}
        </div>
      </CheckoutSectionCard>

      {/* Note Section */}
      <CheckoutSectionCard title="Eslatma (ixtiyoriy)">
        <CheckoutNoteField />
      </CheckoutSectionCard>

      {/* Totals Summary */}
      <OrderSummaryCard />

      {/* Submit Sticky Footer */}
      <div className="fixed bottom-24 left-0 right-0 px-6 z-40 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pt-10 pb-2">
        <button 
          onClick={handleConfirmOrder}
          disabled={!paymentMethod || !selectedAddress}
          className="w-full h-16 bg-amber-600 text-white rounded-[28px] font-black text-lg shadow-2xl shadow-amber-200 active:bg-amber-700 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
        >
          <span>Buyurtmani Tasdiqlash</span>
          <CheckCircle2 size={24} />
        </button>
        {!selectedAddress && (
           <p className="text-center text-red-500 text-[10px] uppercase font-bold tracking-widest mt-3 animate-pulse">
              Iltimos, manzilni tanlang
           </p>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
