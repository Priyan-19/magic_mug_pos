import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Receipt,
  BarChart3,
  BookOpen,
  DollarSign,
  LogOut,
  Keyboard,
  Clock,
  Wifi,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenShortcuts: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenShortcuts }) => {
  const { user, logout, isOwner } = useAuth();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'pos', label: 'POS Terminal', icon: Coffee, ownerOnly: false },
    { id: 'history', label: 'Order Vault', icon: Receipt, ownerOnly: false },
    { id: 'analytics', label: 'Sales Intelligence', icon: BarChart3, ownerOnly: true },
    { id: 'catalog', label: 'Menu Catalog', icon: BookOpen, ownerOnly: true },
    { id: 'expenses', label: 'Expenses', icon: DollarSign, ownerOnly: true },
  ];

  return (
    <header className="bg-cafe-900/90 border-b border-cafe-750 backdrop-blur-md sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-glow-amber">
              <Coffee className="w-6 h-6 text-cafe-950 stroke-[2.2]" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-wider text-cafe-100 flex items-center gap-2">
                <span>MAGIC MUG</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  POS v1.0
                </span>
              </div>
              <div className="text-xs text-cafe-400 flex items-center gap-2">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Wifi className="w-3 h-3 animate-pulse" /> Live Server
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-cafe-300">
                  <Clock className="w-3 h-3 text-cafe-400" /> {timeStr}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-cafe-850 p-1 rounded-xl border border-cafe-750">
            {navItems.map((item) => {
              if (item.ownerOnly && !isOwner) return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-600 text-cafe-950 font-bold shadow-md shadow-amber-600/30'
                      : 'text-cafe-400 hover:text-cafe-200 hover:bg-cafe-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cafe-950' : 'text-cafe-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right User Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenShortcuts}
              title="Keyboard Shortcuts"
              className="p-2 rounded-lg bg-cafe-850 hover:bg-cafe-800 text-cafe-400 hover:text-amber-400 border border-cafe-750 transition-colors"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-cafe-750">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-cafe-200 leading-tight">
                  {user?.full_name || 'Staff User'}
                </div>
                <div className="text-[10px] tracking-wider font-semibold uppercase">
                  <span className="text-amber-400 font-bold">User</span>
                </div>
              </div>

              <button
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-lg bg-cafe-850 hover:bg-rose-950/40 text-cafe-400 hover:text-rose-400 border border-cafe-750 hover:border-rose-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-cafe-800 no-scrollbar">
          {navItems.map((item) => {
            if (item.ownerOnly && !isOwner) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  isActive ? 'bg-amber-600 text-cafe-950' : 'text-cafe-400 bg-cafe-850'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
