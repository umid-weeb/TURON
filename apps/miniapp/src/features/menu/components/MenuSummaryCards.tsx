import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, Layers, Package, Plus } from 'lucide-react';
import { ProductAvailabilityEnum } from '@turon/shared';
import type { MenuCategory, MenuProduct } from '../types';

interface Props {
  categories: MenuCategory[];
  products: MenuProduct[];
}

const MenuSummaryCards: React.FC<Props> = ({ categories, products }) => {
  const navigate = useNavigate();

  const totalCategories = categories.length;
  const activeProducts = products.filter((product) => product.isActive).length;
  const inactiveProducts = products.filter((product) => !product.isActive).length;
  const oosProducts = products.filter(
    (product) => product.availability === ProductAvailabilityEnum.OUT_OF_STOCK,
  ).length;

  const cards = [
    {
      label: 'Kategoriyalar',
      value: totalCategories,
      tone: 'neutral',
      onClick: () => navigate('/admin/menu/categories'),
    },
    {
      label: 'Faol taomlar',
      value: activeProducts,
      tone: 'active',
      onClick: () => navigate('/admin/menu/products?active=active'),
    },
    {
      label: 'Nofaol',
      value: inactiveProducts,
      tone: 'inactive',
      onClick: () => navigate('/admin/menu/products?active=inactive'),
    },
    {
      label: 'Tugagan',
      value: oosProducts,
      tone: 'danger',
      onClick: () => navigate(`/admin/menu/products?availability=${ProductAvailabilityEnum.OUT_OF_STOCK}`),
    },
  ] as const;

  return (
    <div className="space-y-6 admin-motion-up">
      <section className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
          Tezkor amallar
        </h3>
        <div className="grid gap-3">
          <QuickActionCard title="Kategoriya qo'shish" onClick={() => navigate('/admin/menu/categories/new')} />
          <QuickActionCard title="Taom qo'shish" onClick={() => navigate('/admin/menu/products/new')} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
          Ko'rsatkichlar
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card) => {
            const toneClasses =
              card.tone === 'active'
                ? 'text-emerald-700 border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.96)_0%,rgba(209,250,229,0.9)_100%)]'
                : card.tone === 'danger'
                  ? 'text-rose-700 border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,241,242,0.98)_0%,rgba(255,228,230,0.9)_100%)]'
                  : card.tone === 'inactive'
                    ? 'text-[var(--admin-pro-text)] border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(247,239,210,0.9)_100%)]'
                    : 'text-[var(--admin-pro-primary-contrast)] border-[rgba(255,190,11,0.18)] bg-[linear-gradient(180deg,rgba(255,250,235,0.98)_0%,rgba(255,243,208,0.9)_100%)]';

            const dotClass =
              card.tone === 'active'
                ? 'bg-emerald-500'
                : card.tone === 'danger'
                  ? 'bg-rose-500'
                  : card.tone === 'inactive'
                    ? 'bg-[rgba(125,106,76,0.6)]'
                    : 'bg-[var(--admin-pro-primary-strong)]';

            return (
              <button
                key={card.label}
                type="button"
                onClick={card.onClick}
                className={`group rounded-[24px] border px-4 py-4 text-left shadow-[0_10px_22px_rgba(74,56,16,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(74,56,16,0.1)] active:scale-[0.99] ${toneClasses}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-black uppercase tracking-[0.14em] opacity-80">{card.label}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="text-[30px] font-black leading-none">{card.value}</p>
                  <ArrowUpRight size={16} className="opacity-55 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--admin-pro-text-muted)]">
          Bo'limlar
        </h3>
        <NavSectionCard
          icon={<Layers size={20} />}
          title="Kategoriyalar"
          subtitle={`${totalCategories} ta`}
          onClick={() => navigate('/admin/menu/categories')}
        />
        <NavSectionCard
          icon={<Package size={20} />}
          title="Taomlar"
          subtitle={`${products.length} ta`}
          onClick={() => navigate('/admin/menu/products')}
        />
      </section>
    </div>
  );
};

const QuickActionCard: React.FC<{
  title: string;
  onClick: () => void;
}> = ({ title, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex min-h-[72px] w-full items-center justify-between rounded-[26px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,250,240,0.92)_100%)] px-4 py-4 text-left shadow-[0_12px_24px_rgba(74,56,16,0.06)] transition hover:-translate-y-0.5 hover:border-[rgba(255,190,11,0.26)] hover:shadow-[0_18px_34px_rgba(255,190,11,0.14)] active:scale-[0.99]"
  >
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[rgba(255,190,11,0.18)] bg-[linear-gradient(180deg,rgba(255,250,235,0.98)_0%,rgba(255,243,208,0.92)_100%)] text-[var(--admin-pro-primary-contrast)] shadow-[0_12px_24px_rgba(74,56,16,0.08)]">
        <Plus size={20} />
      </div>
      <span className="block text-[15px] font-black text-[var(--admin-pro-text)]">{title}</span>
    </div>
    <ChevronRight size={18} className="text-[var(--admin-pro-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--admin-pro-primary-contrast)]" />
  </button>
);

const NavSectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-center justify-between rounded-[24px] border border-[var(--admin-pro-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,250,240,0.92)_100%)] p-4 text-left shadow-[0_10px_22px_rgba(74,56,16,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(74,56,16,0.1)] active:scale-[0.99]"
  >
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[rgba(255,190,11,0.18)] bg-[linear-gradient(180deg,rgba(255,250,235,0.98)_0%,rgba(255,243,208,0.92)_100%)] text-[var(--admin-pro-primary-contrast)] shadow-[0_12px_24px_rgba(74,56,16,0.08)]">
        {icon}
      </div>
      <div className="text-left">
        <span className="block text-[15px] font-black text-[var(--admin-pro-text)]">{title}</span>
        <span className="text-xs font-semibold text-[var(--admin-pro-text-muted)]">{subtitle}</span>
      </div>
    </div>
    <ChevronRight size={18} className="text-[var(--admin-pro-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--admin-pro-primary-contrast)]" />
  </button>
);

export default MenuSummaryCards;
