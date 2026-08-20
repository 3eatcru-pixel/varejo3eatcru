import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const showSuccess = useCallback((message: string, title?: string) => showToast(message, 'success', title || 'Sucesso'), [showToast]);
  const showError = useCallback((message: string, title?: string) => showToast(message, 'error', title || 'Atenção'), [showToast]);
  const showWarning = useCallback((message: string, title?: string) => showToast(message, 'warning', title || 'Aviso'), [showToast]);
  const showInfo = useCallback((message: string, title?: string) => showToast(message, 'info', title || 'Informação'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-3 ${
                isSuccess
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100'
                  : isError
                  ? 'bg-rose-950/90 border-rose-500/30 text-rose-100'
                  : isWarning
                  ? 'bg-amber-950/90 border-amber-500/30 text-amber-100'
                  : 'bg-slate-900/90 border-slate-700/50 text-slate-100'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <XCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-sky-400" />}
              </div>
              <div className="flex-1 min-w-0">
                {toast.title && <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-90">{toast.title}</h4>}
                <p className="text-sm font-medium leading-relaxed break-words">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Safe fallback if used outside provider
    return {
      showToast: (msg: string) => console.log('[Toast]', msg),
      showSuccess: (msg: string) => console.log('[Toast Success]', msg),
      showError: (msg: string) => console.log('[Toast Error]', msg),
      showWarning: (msg: string) => console.log('[Toast Warning]', msg),
      showInfo: (msg: string) => console.log('[Toast Info]', msg),
    };
  }
  return context;
}
