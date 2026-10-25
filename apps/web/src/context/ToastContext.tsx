import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, description?: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, description?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, description }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((msg: string, desc?: string) => showToast('success', msg, desc), [showToast]);
  const error = useCallback((msg: string, desc?: string) => showToast('error', msg, desc), [showToast]);
  const info = useCallback((msg: string, desc?: string) => showToast('info', msg, desc), [showToast]);
  const warning = useCallback((msg: string, desc?: string) => showToast('warning', msg, desc), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl shadow-xl border p-4 flex items-start gap-3 animate-fade-in backdrop-blur-md transition-all ${
                isSuccess
                  ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
                  : isError
                  ? 'bg-rose-50/95 border-rose-200 text-rose-950'
                  : isWarning
                  ? 'bg-amber-50/95 border-amber-200 text-amber-950'
                  : 'bg-slate-900/95 border-slate-700 text-white'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />}

              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold leading-tight">
                  {toast.message}
                </div>
                {toast.description && (
                  <div className="text-[11px] sm:text-xs mt-0.5 opacity-80 leading-relaxed">
                    {toast.description}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="opacity-50 hover:opacity-100 p-0.5 rounded-lg transition-opacity flex-shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
