import {
  createContext,
  useState,
  useCallback,
  useContext,
  ReactNode,
} from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

export type ToastContextType = {
  showToast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ToastContextType | undefined>(
  undefined,
);

const toastConfig: Record<
  ToastType,
  { icon: typeof CheckCircleIcon; bgColor: string; iconColor: string }
> = {
  success: {
    icon: CheckCircleIcon,
    bgColor: "bg-success-50 border-success-200",
    iconColor: "text-success-600",
  },
  error: {
    icon: XCircleIcon,
    bgColor: "bg-error-50 border-error-200",
    iconColor: "text-error-600",
  },
  warning: {
    icon: ExclamationCircleIcon,
    bgColor: "bg-warning-50 border-warning-200",
    iconColor: "text-warning-600",
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: "bg-info-50 border-info-200",
    iconColor: "text-info-600",
  },
};

type ToastProviderProps = {
  readonly children: ReactNode;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    success: (message) => {
      showToast("success", message);
    },
    error: (message) => {
      showToast("error", message);
    },
    warning: (message) => {
      showToast("warning", message);
    },
    info: (message) => {
      showToast("info", message);
    },
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;

          return (
            <div
              key={toast.id}
              className={`
                flex items-start gap-3 p-4 rounded-lg border shadow-lg
                min-w-72 max-w-md
                animate-in slide-in-from-right
                ${config.bgColor}
              `}
            >
              <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0`} />
              <p className="text-sm text-neutral-800 flex-1">{toast.message}</p>
              <button
                onClick={() => {
                  removeToast(toast.id);
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
