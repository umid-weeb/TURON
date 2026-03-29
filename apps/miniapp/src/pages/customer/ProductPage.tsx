import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_PRODUCTS } from '../../data/mockData';
import { QuantitySelector, EmptyState } from '../../components/customer/CustomerComponents';
import { useCartStore } from '../../store/useCartStore';
import { ShoppingBag, ChevronLeft } from 'lucide-react';

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = MOCK_PRODUCTS.find(p => p.id === id);
  const { addToCart, items } = useCartStore();
  
  const existingItem = items.find(item => item.id === id);
  const [quantity, setQuantity] = useState(existingItem?.quantity || 1);

  if (!product) {
    return <EmptyState message="Mahsulot topilmadi!" />;
  }

  const handleAddToCart = () => {
    // We can either add the chosen quantity or set it. 
    // To keep it simple, we use the current addToCart which increments.
    // If we want to SET, we'd need to clear first or have a setQuantity in store.
    // For now, let's just add it.
    addToCart(product, quantity);
    navigate('/customer/cart');
  };

  return (
    <div className="animate-in slide-in-from-bottom duration-500 pb-20 relative px-1">
      {/* Product Image */}
      <div className="relative h-[300px] -mx-5 -mt-4 mb-8 overflow-hidden rounded-b-[40px] shadow-lg">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        
        {/* Price Tag Overlay */}
        <div className="absolute bottom-6 left-6 bg-white rounded-2xl px-5 py-3 shadow-xl border border-gray-100/20 backdrop-blur-md">
          <span className="text-2xl font-black text-amber-600 tracking-tight">{product.price.toLocaleString()} so'm</span>
        </div>
      </div>

      {/* Product Details */}
      <div className="space-y-6">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{product.name}</h2>
        <div className="inline-block px-3 py-1 bg-amber-50 rounded-lg">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Premium Sifat</span>
        </div>
        
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider">Taom haqida</h3>
          <p className="text-gray-600 text-lg leading-relaxed">
            {product.description} Turon kafesining eng sara ingredientlaridan tayyorlangan mazali taom.
          </p>
        </div>

        {/* Quantity Selector */}
        <div className="pt-6 space-y-4">
          <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider text-center">Miqdorini tanlang</h3>
          <div className="flex justify-center">
            <QuantitySelector 
              quantity={quantity} 
              onIncrease={() => setQuantity(q => q + 1)} 
              onDecrease={() => setQuantity(q => Math.max(1, q - 1))} 
            />
          </div>
        </div>
      </div>

      {/* Sticky Bottom Button */}
      <div className="fixed bottom-24 left-0 right-0 px-6 z-40 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pt-10 pb-2">
        <button 
          onClick={handleAddToCart}
          className="w-full h-16 bg-amber-500 text-white rounded-[24px] font-black text-lg shadow-2xl shadow-amber-200 active:bg-amber-600 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <ShoppingBag size={24} />
          <span>Savatga Qo'shish</span>
        </button>
      </div>
    </div>
  );
};

export default ProductPage;
