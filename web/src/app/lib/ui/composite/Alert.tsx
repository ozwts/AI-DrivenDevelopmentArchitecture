import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const alertVariants = cva("rounded-lg border p-4", {
  variants: {
    variant: {
      success: "bg-success-50 border-success-200",
      warning: "bg-warning-50 border-warning-200",
      error: "bg-error-50 border-error-200",
      info: "bg-info-50 border-info-200",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const alertContentVariants = cva("flex items-start gap-3");

const iconVariants = cva("h-5 w-5 flex-shrink-0", {
  variants: {
    variant: {
      success: "text-success-600",
      warning: "text-warning-600",
      error: "text-error-600",
      info: "text-info-600",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const alertBodyVariants = cva("flex-1");

const alertTitleVariants = cva("text-sm font-medium text-neutral-900 mb-1");

const alertTextVariants = cva("text-sm text-neutral-700");

const closeButtonVariants = cva("text-neutral-400 hover:text-neutral-600");

const closeIconVariants = cva("h-5 w-5");

// アイコンマッピング（CVAでは非文字列値を扱えないため別途定義）
const variantIcons = {
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
} as const;

type AlertProps = Omit<ComponentPropsWithoutRef<"div">, "className" | "title"> &
  VariantProps<typeof alertVariants> & {
    readonly title?: string;
    readonly onClose?: () => void;
  };

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant, title, children, onClose, ...props }, ref) => {
    const Icon = variantIcons[variant ?? "info"];

    return (
      <div
        ref={ref}
        role="alert"
        className={alertVariants({ variant })}
        {...props}
      >
        <div className={alertContentVariants()}>
          <Icon className={iconVariants({ variant })} aria-hidden="true" />
          <div className={alertBodyVariants()}>
            {title !== undefined && (
              <h3 className={alertTitleVariants()}>{title}</h3>
            )}
            <div className={alertTextVariants()}>{children}</div>
          </div>
          {onClose !== undefined && (
            <button
              type="button"
              onClick={onClose}
              className={closeButtonVariants()}
              aria-label="閉じる"
            >
              <XCircleIcon className={closeIconVariants()} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  },
);

Alert.displayName = "Alert";
