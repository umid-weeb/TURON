import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  subtitle?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, showBack = false, onBack, subtitle }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    navigate(-1);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 uppercase tracking-widest mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
};

export interface AppBottomNavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  isActive?: boolean;
}

export const AppBottomNav: React.FC<{ items: AppBottomNavItem[] }> = ({ items }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] h-20 flex items-center justify-around px-2">
      {items.map((item) => (
        <a
          key={item.path}
          href={item.path}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wide ${item.isActive ? 'text-sky-600' : 'text-slate-400'}`}
        >
          <div className="relative">
            {item.icon}
            {item.badge && item.badge > 0 && (
              <span className="absolute -top-1 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                {item.badge}
              </span>
            )}
          </div>
          {item.label}
        </a>
      ))}
    </nav>
  );
};

export const AppContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <main className="flex-1 p-4 sm:p-5 pb-28 bg-slate-50 overflow-y-auto min-h-screen max-w-screen-sm mx-auto w-full">
      {children}
    </main>
  );
};
