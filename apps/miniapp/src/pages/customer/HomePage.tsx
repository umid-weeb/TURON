import React from 'react';
import { Heart, MapPin, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  CategoryCard,
  HomePromoStrip,
  HomeProductRail,
  LoadingSkeleton,
} from '../../components/customer/CustomerComponents';
import { OrderStatus } from '../../data/types';
import { getLocalizedOrderStatusLabel, useCustomerLanguage } from '../../features/i18n/customerLocale';
import {
  buildCustomerHomeSections,
  getCustomerCategoryLabel,
  sortCustomerCategories,
} from '../../features/menu/customerCatalog';
import { useAddresses } from '../../hooks/queries/useAddresses';
import { useCategories, useProducts } from '../../hooks/queries/useMenu';
import { useMyOrders } from '../../hooks/queries/useOrders';
import { useAddressStore } from '../../store/useAddressStore';
import { useAuthStore } from '../../store/useAuthStore';

const PROMO_STRIP_LABELS = [
  { id: 'hot', label: 'Issiq taomlar', match: ['osh', "sho'rva", 'shorva'] },
  { id: 'pizza', label: 'Pitsalar', match: ['pitsa', 'pizza'] },
  { id: 'lavash', label: 'Lavashlar', match: ['lavash'] },
  { id: 'popular', label: "Eng ko'p sotilgan", match: ['fast food', 'kombo', 'combo'] },
  { id: 'bakery', label: 'Pishiriqlar', match: ['somsa', 'tort', 'cake'] },
];

const QUICK_CHIPS = [
  { id: 'chip-pitsa', label: 'Pitsalar', match: ['pitsa', 'pizza'] },
  { id: 'chip-lavash', label: 'Lavashlar', match: ['lavash'] },
  { id: 'chip-burger', label: 'Burgerlar', match: ['burger'] },
  { id: 'chip-donar', label: 'Donarlar', match: ['donar', 'doner', 'shawarma'] },
  { id: 'chip-drink', label: 'Ichimliklar', match: ['ichimlik', 'drink', 'juice', 'cola'] },
  { id: 'chip-sweet', label: 'Shirinliklar', match: ['shirinlik', 'dessert', 'desert', 'tort', 'cake'] },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[´`']/g, '')
    .replace(/\s+/g, ' ');

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { formatText, language } = useCustomerLanguage();
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
  const { data: products = [], isLoading: isProductsLoading } = useProducts();
  const { data: addresses = [] } = useAddresses();
  const { data: orders = [] } = useMyOrders();
  const { selectedAddressId } = useAddressStore();

  const firstName =
    (user as { firstName?: string; name?: string; fullName?: string } | null)?.firstName ||
    (user as { firstName?: string; name?: string; fullName?: string } | null)?.name ||
    (user as { firstName?: string; name?: string; fullName?: string } | null)?.fullName?.split(' ')[0] ||
    'Mijoz';

  const sortedCategories = React.useMemo(() => sortCustomerCategories(categories), [categories]);
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) || addresses[0];
  const activeOrder = orders.find(
    (order) => order.orderStatus !== OrderStatus.DELIVERED && order.orderStatus !== OrderStatus.CANCELLED,
  );
  const sections = React.useMemo(() => buildCustomerHomeSections(products), [products]);

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Xayrli tong, ${formatText(firstName)}`;
    if (hour < 18) return `Xayrli kun, ${formatText(firstName)}`;
    return `Xayrli kech, ${formatText(firstName)}`;
  }, [firstName, formatText]);

  const promoItems = React.useMemo(() => {
    const normalized = sortedCategories.map((category) => ({
      category,
      label: normalize(getCustomerCategoryLabel(category.name)),
    }));

    return PROMO_STRIP_LABELS.map((item) => {
      const match = normalized.find((entry) => item.match.some((token) => entry.label.includes(token)));
      return {
        id: item.id,
        label: item.label,
        targetPath: match ? `/customer/category/${match.category.id}` : '/customer/search',
      };
    });
  }, [sortedCategories]);

  const quickChips = React.useMemo(() => {
    const normalized = sortedCategories.map((category) => ({
      category,
      label: normalize(getCustomerCategoryLabel(category.name)),
    }));

    return QUICK_CHIPS.map((chip) => {
      const match = normalized.find((entry) => chip.match.some((token) => entry.label.includes(token)));
      return {
        id: chip.id,
        label: chip.label,
        targetPath: match ? `/customer/category/${match.category.id}` : '/customer/search',
      };
    });
  }, [sortedCategories]);

  if (isCategoriesLoading || isProductsLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500"
      style={{
        paddingTop: 'calc(64px + var(--tg-header-safe, env(safe-area-inset-top, 0px)))',
        paddingBottom: 'calc(var(--customer-floating-content-clearance, 164px) + 16px)',
      }}
    >
      <header
        className="fixed inset-x-0 top-0 z-40 border-b border-white/8 bg-[#0b1220]/96 backdrop-blur-xl"
        style={{ paddingTop: 'var(--tg-header-safe, env(safe-area-inset-top, 0px))' }}
      >
        <div className="mx-auto flex h-[64px] w-full max-w-[430px] items-center justify-between px-4">
          <h1 className="text-[18px] font-semibold text-white">Turon Bot</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/customer/search')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white"
            >
              <Search size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/customer/favorites')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white"
            >
              <Heart size={18} />
            </button>
          </div>
        </div>
      </header>

      <section className="px-4 pb-4">
        <button
          type="button"
          onClick={() => navigate('/customer/addresses')}
          className="flex h-[48px] w-full items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.04] px-3 text-left"
        >
          <div className="flex h-6 w-6 items-center justify-center text-white/80">
            <MapPin size={16} />
          </div>
          <span className="text-[13px] font-medium text-white/80">
            {selectedAddress ? formatText(selectedAddress.addressText) : 'Xaritada tanlangan nuqta'}
          </span>
        </button>

        <div className="mt-3">
          <p className="text-[20px] font-bold leading-tight text-white">{greeting}</p>
          <p className="mt-1 text-[14px] text-white/65">Turon kafesiga xush kelibsiz</p>
        </div>

        <div className="mt-4">
          <HomePromoStrip items={promoItems} />
        </div>

        <div className="scrollbar-hide -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {quickChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => navigate(chip.targetPath)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 text-[12px] font-semibold text-white/85"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {activeOrder ? (
          <button
            type="button"
            onClick={() => navigate(`/customer/orders/${activeOrder.id}`)}
            className="mt-4 flex w-full items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.04] px-3 py-2 text-left"
          >
            <div>
              <p className="text-[11px] font-semibold text-white/60">Faol buyurtma</p>
              <p className="mt-1 text-[13px] font-semibold text-white">#{activeOrder.orderNumber}</p>
              <p className="mt-1 text-[12px] text-white/55">
                {getLocalizedOrderStatusLabel(activeOrder.orderStatus, language)}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-white/70">Batafsil</span>
          </button>
        ) : null}
      </section>

      <section className="px-4 pt-4">
        <h2 className="text-[16px] font-bold text-white">Menyu bo'limlari</h2>
        <div className="scrollbar-hide -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
          {sortedCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section className="px-4 pt-5">
        <div>
          <h2 className="text-[16px] font-bold text-white">Aksiya</h2>
          <p className="mt-1 text-[12px] text-white/50">Chegirmadagi taomlar</p>
        </div>
        <div className="mt-3">
          <HomeProductRail products={sections.discounted} />
        </div>
      </section>

      <section className="px-4 pt-5">
        <h2 className="text-[16px] font-bold text-white">Ommabop</h2>
        <div className="mt-3">
          <HomeProductRail products={sections.popular} />
        </div>
      </section>

      <section className="px-4 pt-5">
        <h2 className="text-[16px] font-bold text-white">Yangi</h2>
        <div className="mt-3">
          <HomeProductRail products={sections.newest} />
        </div>
      </section>
    </div>
  );
};

export default HomePage;
