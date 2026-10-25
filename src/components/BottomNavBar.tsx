import React from 'react';
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  Receipt
} from 'lucide-react';

interface Props {
  currentTab: string;
  lang: 'ar' | 'en';
  isEmployee?: boolean;
  isModalActive?: boolean;
  onSelectTab: (tab: string) => void;
  onOpenQuickSale?: () => void;
}

export const BottomNavBar: React.FC<Props> = ({
  currentTab,
  lang,
  isEmployee = false,
  isModalActive = false,
  onSelectTab,
  onOpenQuickSale
}) => {
  const isAr = lang === 'ar';

  const navItems = isEmployee
    ? [
        {
          id: 'home',
          label: isAr ? 'الرئيسية' : 'Home',
          icon: Home,
        },
        {
          id: 'sell',
          label: isAr ? 'المبيعات' : 'Sales',
          icon: ShoppingCart,
        },
        {
          id: 'stock',
          label: isAr ? 'المخزون' : 'Stock',
          icon: Package,
        },
        {
          id: 'cust',
          label: isAr ? 'الزبائن' : 'Customers',
          icon: Users,
        },
      ]
    : [
        {
          id: 'home',
          label: isAr ? 'الرئيسية' : 'Home',
          icon: Home,
        },
        {
          id: 'sell',
          label: isAr ? 'المبيعات' : 'Sales',
          icon: ShoppingCart,
        },
        {
          id: 'stock',
          label: isAr ? 'المخزون' : 'Stock',
          icon: Package,
        },
        {
          id: 'cust',
          label: isAr ? 'الزبائن' : 'Customers',
          icon: Users,
        },
        {
          id: 'dash',
          label: isAr ? 'اللوحة' : 'Analytics',
          icon: BarChart3,
        },
        {
          id: 'set',
          label: isAr ? 'الإعدادات' : 'Settings',
          icon: Settings,
        },
      ];

  return (
    <nav
      aria-label={isAr ? 'شريط التنقل السريع' : 'Quick Navigation'}
      className={`fixed bottom-3 inset-x-0 mx-auto w-[calc(100%-1.25rem)] max-w-lg z-30 transition-all duration-200 ${
        isModalActive ? 'pointer-events-none opacity-20 select-none' : 'pointer-events-auto opacity-100'
      }`}
    >
      <div className="bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 dark:border-slate-800 shadow-2xl rounded-2xl p-1.5 flex items-center justify-around gap-1 text-slate-300">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-xl transition-all duration-200 active:scale-90 group select-none ${
                isActive
                  ? 'text-teal-400 bg-teal-950/40 font-bold shadow-inner'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-medium'
              }`}
            >
              {/* Active Indicator Top Glow */}
              {isActive && (
                <span className="absolute -top-1 w-5 h-1 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
              )}

              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'scale-110 stroke-[2.25]' : 'group-hover:scale-105 stroke-[1.75]'
                }`}
              />

              <span className="text-[10px] mt-0.5 leading-tight truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
