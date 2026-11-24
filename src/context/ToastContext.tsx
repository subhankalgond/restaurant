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
      {/* Toast Notification Stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => {
          let indicatorBg = 'bg-[#078F36]';
          let borderClass = 'border-l-4 border-l-[#078F36]';
          if (toast.type === 'success') {
            indicatorBg = 'bg-[#078F36]';
            borderClass = 'border-l-4 border-l-[#078F36]';
          } else if (toast.type === 'warning') {
            indicatorBg = 'bg-[#F5BD3D]';
            borderClass = 'border-l-4 border-l-[#F5BD3D]';
          } else if (toast.type === 'error') {
            indicatorBg = 'bg-[#D94A43]';
            borderClass = 'border-l-4 border-l-[#D94A43]';
          } else {
            indicatorBg = 'bg-blue-600';
            borderClass = 'border-l-4 border-l-blue-600';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl bg-white border border-[#E7EBE8] shadow-lg ${borderClass} text-xs text-[#171B18] transition-all`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-3.5 h-3.5 rounded-full ${indicatorBg} text-white flex items-center justify-center flex-shrink-0 text-[10px]`}>
                  <CheckIcon className="w-2.5 h-2.5 text-white" />
                </span>
                <span className="font-bold text-[#171B18] text-xs">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 text-[#777F79] hover:text-[#171B18] p-1 rounded-lg hover:bg-[#F5F6F5]"
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
