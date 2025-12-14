import { ComponentPropsWithoutRef, ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

type BadgeProps = {
  readonly children: ReactNode;
  readonly variant?: BadgeVariant;
  readonly className?: string;
} & Omit<ComponentPropsWithoutRef<"span">, "children" | "className">;

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-neutral-100 text-neutral-800",
  success: "bg-success-100 text-success-800",
  warning: "bg-warning-100 text-warning-800",
  danger: "bg-error-100 text-error-800",
  info: "bg-info-100 text-info-800",
};

export const Badge = ({
  children,
  variant = "default",
  className = "",
  ...props
}: BadgeProps) => {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5
        rounded-full text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
};
