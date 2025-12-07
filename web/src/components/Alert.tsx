import { ReactNode } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

type AlertVariant = "success" | "warning" | "error" | "info";

type AlertProps = {
  variant: AlertVariant;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
};

const variantConfig: Record<
  AlertVariant,
  { icon: typeof CheckCircleIcon; bgColor: string; iconColor: string }
> = {
  success: {
    icon: CheckCircleIcon,
    bgColor: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: "bg-yellow-50 border-yellow-200",
    iconColor: "text-yellow-600",
  },
  error: {
    icon: XCircleIcon,
    bgColor: "bg-red-50 border-red-200",
    iconColor: "text-red-600",
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
  },
};

export const Alert = ({ variant, title, children, onClose }: AlertProps) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`
        rounded-lg border p-4
        ${config.bgColor}
      `}
    >
      <div className="flex items-start">
        <Icon className={`h-5 w-5 ${config.iconColor} mt-0.5`} />
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          )}
          <div className="text-sm text-gray-700 mt-1">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 text-gray-400 hover:text-gray-600"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};
