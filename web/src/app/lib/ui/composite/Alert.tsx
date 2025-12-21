import { forwardRef, ReactNode } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

type AlertVariant = "success" | "warning" | "error" | "info";

type AlertProps = {
  readonly variant: AlertVariant;
  readonly title?: string;
  readonly children: ReactNode;
  readonly onClose?: () => void;
};

const variantConfig: Record<
  AlertVariant,
  { icon: typeof CheckCircleIcon; bgColor: string; iconColor: string }
> = {
  success: {
    icon: CheckCircleIcon,
    bgColor: "bg-success-50 border-success-200",
    iconColor: "text-success-600",
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: "bg-warning-50 border-warning-200",
    iconColor: "text-warning-600",
  },
  error: {
    icon: XCircleIcon,
    bgColor: "bg-error-50 border-error-200",
    iconColor: "text-error-600",
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: "bg-info-50 border-info-200",
    iconColor: "text-info-600",
  },
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant, title, children, onClose }, ref) => {
    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
      <div
        ref={ref}
        role="alert"
        className={`rounded-lg border p-4 ${config.bgColor}`}
      >
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 flex-shrink-0 ${config.iconColor}`} />
          <div className="flex-1">
            {title && (
              <h3 className="text-sm font-medium text-neutral-900 mb-1">
                {title}
              </h3>
            )}
            <div className="text-sm text-neutral-700">{children}</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    );
  },
);

Alert.displayName = "Alert";
