import { forwardRef, ComponentPropsWithoutRef } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

type BadgeProps = Omit<ComponentPropsWithoutRef<"span">, "className"> & {
  readonly variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-neutral-100 text-neutral-800",
  success: "bg-success-100 text-success-800",
  warning: "bg-warning-100 text-warning-800",
  danger: "bg-error-100 text-error-800",
  info: "bg-info-100 text-info-800",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center px-2.5 py-0.5
          rounded-full text-xs font-medium
          ${variantStyles[variant]}
        `}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";
