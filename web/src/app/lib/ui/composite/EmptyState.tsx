import { forwardRef, ReactNode } from "react";

type EmptyStateProps = {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
};

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action }, ref) => {
    return (
      <div ref={ref} className="text-center py-12 px-6">
        {icon && <div className="flex justify-center mb-4">{icon}</div>}
        <h3 className="text-lg font-medium text-text-primary mb-2">{title}</h3>
        {description && (
          <p className="text-text-secondary mb-6">{description}</p>
        )}
        {action && <div>{action}</div>}
      </div>
    );
  },
);

EmptyState.displayName = "EmptyState";
