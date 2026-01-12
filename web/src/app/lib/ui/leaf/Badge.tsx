import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium",
  {
    variants: {
      variant: {
        default: "bg-neutral-100 text-neutral-800",
        primary: "bg-primary-100 text-primary-800",
        secondary: "bg-secondary-100 text-secondary-800",
        neutral: "bg-neutral-100 text-neutral-700",
        success: "bg-success-100 text-success-800",
        warning: "bg-warning-100 text-warning-800",
        danger: "bg-error-100 text-error-800",
        info: "bg-info-100 text-info-800",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-sm",
        lg: "px-3 py-1 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

type BadgeProps = Omit<ComponentPropsWithoutRef<"span">, "className"> &
  VariantProps<typeof badgeVariants>;

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={badgeVariants({ variant, size })}
      {...props}
    >
      {children}
    </span>
  ),
);

Badge.displayName = "Badge";
