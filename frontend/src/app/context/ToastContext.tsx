import { createContext, useContext, useState } from "react";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type ToastContextType = {
  showToast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();

    setToasts((current) => [...current, { ...toast, id }]);

    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  };

  const styles = {
    success: {
      icon: CheckCircle,
      card: "border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950 dark:text-green-300",
      iconColor: "text-green-600 dark:text-green-400",
    },
    error: {
      icon: AlertTriangle,
      card: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950 dark:text-red-300",
      iconColor: "text-red-600 dark:text-red-400",
    },
    warning: {
      icon: AlertTriangle,
      card: "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950 dark:text-yellow-300",
      iconColor: "text-yellow-600 dark:text-yellow-400",
    },
    info: {
      icon: Info,
      card: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950 dark:text-blue-300",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div className="fixed right-5 top-5 z-[9999] flex w-[92vw] max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const item = styles[toast.type];
          const Icon = item.icon;

          return (
            <div
              key={toast.id}
              className={`rounded-2xl border p-4 shadow-xl backdrop-blur ${item.card}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-5 w-5 ${item.iconColor}`} />

                <div className="flex-1">
                  <p className="font-bold">{toast.title}</p>

                  {toast.message && (
                    <p className="mt-1 text-sm opacity-90">{toast.message}</p>
                  )}
                </div>

                <button onClick={() => removeToast(toast.id)}>
                  <X className="h-4 w-4 opacity-70 hover:opacity-100" />
                </button>
              </div>
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
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}