import { forwardRef, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const emptyStateVariants = cva("text-center py-12 px-6");

const iconContainerVariants = cva("flex justify-center mb-4");

const titleVariants = cva("text-lg font-medium text-text-primary mb-2");

const descriptionVariants = cva("text-text-secondary mb-6");

type EmptyStateProps = Omit<ComponentPropsWithoutRef<"div">, "className"> &
  VariantProps<typeof emptyStateVariants> & {
    readonly icon?: ReactNode;
    readonly title: string;
    readonly description?: string;
    readonly action?: ReactNode;
  };

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, ...props }, ref) => {
    return (
      <div ref={ref} className={emptyStateVariants()} {...props}>
        {icon !== undefined && (
          <div className={iconContainerVariants()}>{icon}</div>
        )}
        <h3 className={titleVariants()}>{title}</h3>
        {description !== undefined && (
          <p className={descriptionVariants()}>{description}</p>
        )}
        {action !== undefined && <div>{action}</div>}
      </div>
    );
  },
);

EmptyState.displayName = "EmptyState";
