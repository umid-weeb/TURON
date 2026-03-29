import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Minus, ShoppingBag, X, ChevronLeft, Home, ClipboardList, ShoppingCart } from 'lucide-react';
import { Product, Category } from '../../data/mockData';
import { useCartStore } from '../../store/useCartStore';

export const CategoryCard: React.FC<{ category: Category }> = ({ category }) => (
  <NavLink 
    to={`/customer/category/${category.id}`}
    className="flex flex-col items-center min-w-[80px] space-y-2 group active:scale-95 transition-transform"
  >
    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md group-active:border-amber-500 bg-white">
      <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
    </div>
    <span className="text-[11px] font-bold text-gray-700 uppercase text-center overflow-hidden w-full px-1">{category.name}</span>
  </NavLink>
);

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart, items } = useCartStore();
  const quantityInCart = items.find(item => item.id === product.id)?.quantity || 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-full active:scale-98 transition-transform">
      <NavLink to={`/customer/product/${product.id}`} className="relative h-44 overflow-hidden">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-sm border border-white/20">
          <span className="text-[13px] font-black text-amber-600 tracking-tight">{product.price.toLocaleString()} so'm</span>
        </div>
      </NavLink>
      
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-[15px] font-bold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
        <p className="text-[11px] text-gray-400 line-clamp-2 mb-4 flex-1 leading-tight">{product.description}</p>
        
        <button 
          onClick={handleAdd}
          className={`
            w-full h-11 rounded-2xl flex items-center justify-center gap-2 font-bold text-[13px] transition-all
            ${quantityInCart > 0 
              ? 'bg-amber-50 text-amber-600 border border-amber-100' 
              : 'bg-amber-500 text-white shadow-lg shadow-amber-200 active:bg-amber-600'}
          `}
        >
          {quantityInCart > 0 ? (
            <>
              <ShoppingBag size={16} />
              Savatda ({quantityInCart})
            </>
          ) : (
            <>
              <Plus size={16} />
              Qo’shish
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export const QuantitySelector: React.FC<{ 
  quantity: number; 
  onIncrease: () => void; 
  onDecrease: () => void; 
}> = ({ quantity, onIncrease, onDecrease }) => (
  <div className="flex items-center bg-gray-50 p-1.5 rounded-[22px] border border-gray-100">
    <button 
      onClick={onDecrease}
      className="w-11 h-11 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-800 active:scale-90 transition-transform"
    >
      <Minus size={20} />
    </button>
    <span className="px-6 font-black text-xl min-w-[50px] text-center text-gray-900">{quantity}</span>
    <button 
      onClick={onIncrease}
      className="w-11 h-11 bg-amber-500 rounded-2xl shadow-lg shadow-amber-100 flex items-center justify-center text-white active:scale-90 transition-transform"
    >
      <Plus size={20} />
    </button>
  </div>
);

export const ProductGrid: React.FC<{ products: Product[] }> = ({ products }) => (
  <div className="grid grid-cols-2 gap-4 pb-4">
    {products.map(product => (
      <ProductCard key={product.id} product={product} />
    ))}
  </div>
);

export const CartItemCard: React.FC<{ 
  item: Product & { quantity: number };
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}> = ({ item, onUpdateQuantity, onRemove }) => (
  <div className="bg-white rounded-[28px] p-3 shadow-sm border border-gray-50 flex gap-4 items-center animate-in slide-in-from-left duration-300">
    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-bold text-gray-900 text-[14px] truncate pr-2">{item.name}</h4>
        <button onClick={() => onRemove(item.id)} className="text-gray-300 p-1 active:text-red-500 transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="font-black text-amber-600 text-[13px]">{item.price.toLocaleString()} so'm</span>
        <div className="flex items-center bg-gray-50 rounded-xl p-0.5 border border-gray-100">
          <button 
            onClick={() => onUpdateQuantity(item.id, -1)}
            className="w-7 h-7 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
          >
            <Minus size={14} />
          </button>
          <span className="w-7 text-center font-bold text-xs">{item.quantity}</span>
          <button 
            onClick={() => onUpdateQuantity(item.id, 1)}
            className="w-7 h-7 flex items-center justify-center text-amber-600 active:scale-90 transition-transform"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  </div>
);

export const HeaderBar: React.FC<{ title: string; showBack?: boolean }> = ({ title, showBack }) => {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-900 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="font-black text-xl text-gray-900 tracking-tight">{title}</h1>
      </div>
    </header>
  );
};

export const BottomNavbar: React.FC = () => {
  const location = useLocation();
  const { getTotalItems } = useCartStore();
  const cartCount = getTotalItems();

  const navItems = [
    { icon: Home, label: 'Asosiy', path: '/customer' },
    { icon: ShoppingCart, label: 'Savat', path: '/customer/cart', badge: cartCount },
    { icon: ClipboardList, label: 'Buyurtmalar', path: '/customer/orders' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-100 flex justify-around items-center h-20 pb-2 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || (item.path === '/customer' && (location.pathname.startsWith('/customer/category') || location.pathname.startsWith('/customer/product')));
        return (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all relative ${isActive ? 'text-amber-500' : 'text-gray-400'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-amber-50' : ''}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {item.badge > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in duration-300">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-40 bg-gray-100 rounded-3xl w-full"></div>
    <div className="flex gap-4">
      <div className="h-8 bg-gray-100 rounded-lg w-1/2"></div>
      <div className="h-8 bg-gray-100 rounded-lg w-1/4"></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="h-48 bg-gray-100 rounded-3xl"></div>
      <div className="h-48 bg-gray-100 rounded-3xl"></div>
    </div>
  </div>
);

export const EmptyState: React.FC<{ message: string; subMessage?: string }> = ({ message, subMessage }) => (
  <div className="flex flex-col items-center justify-center py-20 px-10 text-center animate-in fade-in zoom-in duration-500">
    <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
      <ShoppingBag size={40} />
    </div>
    <h3 className="text-gray-900 font-black text-lg mb-2">{message}</h3>
    {subMessage && <p className="text-gray-400 text-sm font-bold uppercase tracking-widest leading-relaxed opacity-60 italic">{subMessage}</p>}
  </div>
);
