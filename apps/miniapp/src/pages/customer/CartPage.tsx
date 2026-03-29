import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/useCartStore';
import { useCheckoutStore } from '../../store/useCheckoutStore';
import { CartItemCard } from '../../components/customer/CustomerComponents';
import { EmptyCartState } from '../../components/customer/CheckoutComponents';
import PromoCodeCard from '../../components/customer/PromoCodeCard';
import { ArrowRight, Trash2, ShoppingBag } from 'lucide-react';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, getSubtotal, getDiscount, getFinalTotal, clearCart } = useCartStore();
  const { deliveryFee } = useCheckoutStore();
  
  const subtotal = getSubtotal();
  const discount = getDiscount();
  const finalTotal = getFinalTotal(deliveryFee);

  if (items.length === 0) {
    return <EmptyCartState />;
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-44">
      {/* Header Info */}
      <div className="flex items-center justify-between mx-1">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Sizning Savatchangiz</h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none italic">{items.length} xil taom tanlandi</p>
        </div>
        <button 
          onClick={clearCart}
          className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center active:bg-red-100 active:scale-95 transition-all shadow-sm"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Cart Items List */}
      <section className="space-y-3">
        {items.map(item => (
          <CartItemCard 
            key={item.id} 
            item={item} 
            onUpdateQuantity={updateQuantity} 
            onRemove={removeFromCart} 
          />
        ))}
      </section>

      {/* Promo Code Block */}
      <PromoCodeCard />

      {/* Totals Summary */}
      <section className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm font-bold text-gray-500">
            <span>Buyurtma summasi</span>
            <span className="text-gray-900">{subtotal.toLocaleString()} so'm</span>
          </div>
          
          <div className="flex justify-between items-center text-sm font-bold text-gray-500">
            <span>Yetkazib berish</span>
            <span className="text-gray-900">+{deliveryFee.toLocaleString()} so'm</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between items-center text-sm font-black text-amber-600 animate-in fade-in duration-300">
              <span>Promo-kod chegirmasi</span>
              <span>- {discount.toLocaleString()} so'm</span>
            </div>
          )}
        </div>
        
        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-gray-400 font-black uppercase tracking-widest text-[11px]">Umumiy:</span>
          <span className="text-2xl font-black text-gray-900 tracking-tight">{finalTotal.toLocaleString()} so'm</span>
        </div>
      </section>

      {/* Checkout Sticky Footer */}
      <div className="fixed bottom-24 left-0 right-0 px-6 z-40 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pt-10 pb-2">
        <button 
          onClick={() => navigate('/customer/checkout')}
          className="w-full h-16 bg-amber-500 text-white rounded-[28px] font-black text-lg shadow-2xl shadow-amber-200 active:bg-amber-600 active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <span>Buyurtma berish</span>
          <ArrowRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default CartPage;
