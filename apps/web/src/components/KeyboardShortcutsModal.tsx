import React, { useEffect } from 'react';
import { X, Keyboard, Search, RotateCcw, CheckCircle2, CreditCard, PlusCircle } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  orKey?: string;
  action: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts: ShortcutItem[] = [
    {
      keys: ['F2'],
      orKey: '/',
      action: 'Focus Search Bar',
      description: 'Quickly find menu items by title or category',
      icon: Search,
    },
    {
      keys: ['Esc'],
      action: 'Clear Cart / Dismiss',
      description: 'Closes open popups, or clears current cart if none open',
      icon: RotateCcw,
    },
    {
      keys: ['Enter'],
      action: 'Save & Confirm Bill',
      description: 'Completes checkout and prints receipt (when cart has items)',
      icon: CheckCircle2,
    },
    {
      keys: ['1', '2', '3'],
      action: 'Switch Payment Mode',
      description: 'Instantly set payment method: 1=Cash, 2=Card, 3=UPI',
      icon: CreditCard,
    },
    {
      keys: ['N'],
      action: 'New Customer Order',
      description: 'Clears focus and prepares POS for the next guest',
      icon: PlusCircle,
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200/90 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-maroon-50 border border-maroon-100 flex items-center justify-center text-maroon-700 shadow-xs flex-shrink-0">
              <Keyboard className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                POS Keyboard Shortcuts
              </h3>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 line-clamp-1">
                Supercharge checkout speed with cashier hotkeys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 active:scale-95 transition-all flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-3.5 sm:p-6 space-y-2.5 sm:space-y-3 bg-white overflow-y-auto">
          {shortcuts.map((sc, idx) => {
            const IconComponent = sc.icon;
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 sm:p-3.5 rounded-2xl bg-surface-100 hover:bg-slate-100/80 border border-slate-200/70 transition-all group gap-2"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center text-slate-500 group-hover:text-maroon-700 group-hover:border-maroon-200 transition-colors shadow-2xs flex-shrink-0">
                    <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-tight truncate">
                      {sc.action}
                    </div>
                    {sc.description && (
                      <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-medium truncate sm:whitespace-normal">
                        {sc.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-1">
                  {sc.keys.map((k, kIdx) => (
                    <React.Fragment key={kIdx}>
                      {kIdx > 0 && <span className="text-[10px] sm:text-xs font-bold text-slate-300">/</span>}
                      <kbd className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-mono font-extrabold text-slate-800 bg-white border border-slate-300 rounded-lg shadow-xs group-hover:border-maroon-300 group-hover:text-maroon-700 transition-colors">
                        {k}
                      </kbd>
                    </React.Fragment>
                  ))}
                  {sc.orKey && (
                    <>
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-400 px-0.5">or</span>
                      <kbd className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-mono font-extrabold text-slate-800 bg-white border border-slate-300 rounded-lg shadow-xs group-hover:border-maroon-300 group-hover:text-maroon-700 transition-colors">
                        {sc.orKey}
                      </kbd>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold bg-white border border-slate-200 rounded text-slate-500">
              Esc
            </kbd>
            to close
          </span>
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl bg-maroon-700 hover:bg-maroon-800 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-glow-maroon transition-all"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

