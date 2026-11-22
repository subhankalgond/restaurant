import React, { createContext, useContext, useState } from 'react';
import { CheckIcon, CloseIcon } from '../components/common/Icons';

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Strip */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => {
          let borderClass = 'border-l-4 border-l-forest-800';
          if (toast.type === 'success') borderClass = 'border-l-4 border-l-forest-700';
          else if (toast.type === 'warning') borderClass = 'border-l-4 border-l-earthAmber';
          else if (toast.type === 'error') borderClass = 'border-l-4 border-l-earthRed';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between p-3 rounded bg-white border border-surfaceBorder shadow-sm ${borderClass} text-xs text-charcoal-900`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' && (
                  <span className="w-4 h-4 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-3 h-3" />
                  </span>
                )}
                <span className="font-medium">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 text-charcoal-500 hover:text-charcoal-900 p-0.5 rounded"
                title="Dismiss"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
