/* eslint-disable react-refresh/only-export-components */
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastPayload {
  message: string;
  variant: ToastVariant;
}

interface ToastOptions {
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setToast({
      message: trimmed,
      variant: options?.variant ?? 'info',
    });

    timerRef.current = window.setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, options?.durationMs ?? 2400);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  const tone =
    toast?.variant === 'success'
      ? 'border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-200'
      : toast?.variant === 'error'
      ? 'border-red-200 dark:border-red-900 text-red-700 dark:text-red-200'
      : 'border-slate-200 dark:border-slate-900 text-slate-700 dark:text-slate-200';

  const Icon =
    toast?.variant === 'success'
      ? CheckCircle2
      : toast?.variant === 'error'
      ? AlertCircle
      : Info;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className={`toast ${tone}`} role="status" aria-live="polite">
          <div className="flex items-start gap-2">
            <Icon className="mt-0.5" size={18} />
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
