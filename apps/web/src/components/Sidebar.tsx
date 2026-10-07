import React from 'react';
import {
  LayoutGrid,
  Clock,
  BarChart3,
  UtensilsCrossed,
  DollarSign,
  Keyboard,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import magicMugLogo from '../assets/logo.png';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenShortcuts: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenShortcuts,
}) => {
  const { logout } = useAuth();

  const navItems = [
    { id: 'pos', label: 'POS Terminal', icon: LayoutGrid },
    { id: 'history', label: 'Order History', icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'catalog', label: 'Menu Catalog', icon: UtensilsCrossed },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
  ];

  return (
    <>
      {/* Desktop / Tablet Vertical Sidebar */}
      <aside className="hidden md:flex w-20 bg-white border-r border-slate-200/80 flex-col items-center justify-between py-6 flex-shrink-0 z-30 select-none shadow-[2px_0_12px_-4px_rgba(0,0,0,0.03)]">
        {/* Top Logo */}
        <div className="flex flex-col items-center gap-6 w-full">
          <button
            onClick={() => setActiveTab('pos')}
            className="w-12 h-12 rounded-full overflow-hidden hover:scale-105 transition-transform p-1 border-2 border-maroon-700/20 bg-white shadow-sm flex items-center justify-center"
            title="Magic Mug POS"
          >
            <img
              src={magicMugLogo}
              alt="Magic Mug Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </button>

          {/* Navigation Icons Stack */}
          <nav className="flex flex-col items-center gap-3 w-full px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'bg-maroon-50 text-maroon-700 shadow-sm border border-maroon-200/70 font-bold'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Utility Actions */}
        <div className="flex flex-col items-center gap-3 w-full px-3">
          <button
            id="btn-shortcuts-modal"
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts"
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-maroon-700 hover:bg-slate-50 transition-colors"
          >
            <Keyboard className="w-5 h-5 stroke-[1.8]" />
          </button>

          <button
            onClick={logout}
            title="Sign Out"
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/90 flex items-center justify-around px-1 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-maroon-700 font-bold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-maroon-50' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="text-[9px] leading-none mt-0.5 truncate max-w-[48px]">
                {item.id === 'pos'
                  ? 'POS'
                  : item.id === 'history'
                  ? 'History'
                  : item.id === 'analytics'
                  ? 'Analytics'
                  : item.id === 'catalog'
                  ? 'Menu'
                  : 'Expenses'}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
