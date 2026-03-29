import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrdersStore } from '../../store/useOrdersStore';
import { OrderCard, OrdersEmptyState } from '../../components/customer/OrderHistoryComponents';
import { ShoppingBag, RefreshCw } from 'lucide-react';

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders } = useOrdersStore();

  const handleOrderClick = (orderId: string) => {
    navigate(`/customer/orders/${orderId}`);
  };

  const activeOrders = orders.filter(o => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED');
  const pastOrders = orders.filter(o => o.orderStatus === 'DELIVERED' || o.orderStatus === 'CANCELLED');

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-right duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Buyurtmalarim</h2>
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">Buyurtmalar tarixi va holati</p>
      </div>

      {orders.length > 0 ? (
        <>
          {/* Active Orders Section */}
          {activeOrders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 ml-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-800">Faol buyurtmalar</h3>
              </div>
              {activeOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onClick={() => handleOrderClick(order.id)} 
                />
              ))}
            </div>
          )}

          {/* Past Orders Section */}
          {pastOrders.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Tarix</h3>
              {pastOrders.map(order => (
                <div key={order.id} className="opacity-75 hover:opacity-100 transition-opacity">
                  <OrderCard 
                    order={order} 
                    onClick={() => handleOrderClick(order.id)} 
                  />
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-8 border-t border-slate-100 flex justify-center">
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-amber-500 transition-colors"
            >
              <RefreshCw size={14} />
              Ma'lumotlarni yangilash
            </button>
          </div>
        </>
      ) : (
        <OrdersEmptyState onShop={() => navigate('/customer')} />
      )}
    </div>
  );
};

export default OrdersPage;
