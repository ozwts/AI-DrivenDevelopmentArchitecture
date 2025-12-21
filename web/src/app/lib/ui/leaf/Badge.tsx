import { forwardRef, ComponentPropsWithoutRef } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";
type BadgeSize = "sm" | "md" | "lg";

type BadgeProps = Omit<ComponentPropsWithoutRef<"span">, "className"> & {
  readonly variant?: BadgeVariant;
  readonly size?: BadgeSize;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-neutral-100 text-neutral-800",
  success: "bg-success-100 text-success-800",
  warning: "bg-warning-100 text-warning-800",
  danger: "bg-error-100 text-error-800",
  info: "bg-info-100 text-info-800",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
  lg: "px-3 py-1 text-base",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = "default", size = "md", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center
          rounded-full font-medium
          ${variantStyles[variant]}
          ${sizeStyles[size]}
        `}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";
