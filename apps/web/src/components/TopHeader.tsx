import React, { useState, useEffect } from 'react';
import { Search, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import magicMugLogo from '../assets/logo.png';

interface TopHeaderProps {
  activeTab?: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchPlaceholder?: string;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab = 'pos',
  searchTerm,
  setSearchTerm,
  searchPlaceholder = 'Search menu...',
  searchInputRef,
}) => {
  const { user } = useAuth();
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

  const pageTitles: Record<string, string> = {
    pos: 'POS Terminal',
    history: 'Order History',
    analytics: 'Analytics & Reports',
    catalog: 'Menu Catalog',
    expenses: 'Expenses',
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dateFormatted = currentDateTime.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const timeFormatted = currentDateTime.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <header className="h-16 md:h-20 px-3 sm:px-6 md:px-8 flex items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-200/70 bg-white/70 backdrop-blur-md sticky top-0 z-20">
      {/* Mobile-Only Cafe Logo on Left */}
      <div className="md:hidden flex-shrink-0 flex items-center">
        <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center p-1 shadow-sm border-2 border-white ring-1 ring-slate-200 overflow-hidden">
          <img
            src={magicMugLogo}
            alt="Magic Mug Logo"
            className="w-full h-full object-contain rounded-xl"
          />
        </div>
      </div>

      {/* Search Input Bar (Visible on mobile only for POS page, hidden on mobile for other pages) */}
      <div className={`relative flex-1 max-w-md ${activeTab === 'pos' ? 'block' : 'hidden md:block'}`}>
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-maroon-700/60 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-maroon-700/10 transition-all shadow-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mobile Page Title for Non-POS Pages */}
      {activeTab !== 'pos' && (
        <div className="md:hidden flex-1 pl-1 min-w-0">
          <div className="font-extrabold text-sm text-slate-900 tracking-tight truncate">
            {pageTitles[activeTab] || 'Magic Mug'}
          </div>
        </div>
      )}

      {/* Live Date, Time & Profile Card */}
      <div className="flex items-center gap-2 sm:gap-4 pl-1 sm:pl-4 flex-shrink-0">
        {/* Live Date & Time Box (2 Columns inside a single box, no green dot) */}
        <div className="hidden md:flex items-center gap-2.5 lg:gap-3 px-3 lg:px-3.5 py-1.5 lg:py-2 rounded-2xl bg-slate-100/80 border border-slate-200/90 shadow-xs">
          {/* Col 1: Date */}
          <div className="flex items-center gap-1.5 lg:gap-2 text-[11px] lg:text-xs font-semibold text-slate-600">
            <Clock className="w-3.5 h-3.5 text-maroon-700 flex-shrink-0" />
            <span>{dateFormatted}</span>
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-slate-300" />

          {/* Col 2: Time */}
          <div className="font-mono font-bold text-[11px] lg:text-xs text-slate-900 tracking-tight">
            {timeFormatted}
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <div className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
            {(user?.full_name || 'Magic Mug').replace(/\bcafe\b/gi, '').trim() || 'Magic Mug'}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5 md:hidden">
            {dateFormatted} | {timeFormatted}
          </div>
        </div>

        {/* Avatar */}
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-maroon-700 to-maroon-900 text-white font-extrabold flex items-center justify-center shadow-sm text-xs sm:text-sm border-2 border-white ring-1 ring-slate-200 flex-shrink-0">
          {((user?.full_name || 'Magic Mug').replace(/\bcafe\b/gi, '').trim() || 'M').charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
};
