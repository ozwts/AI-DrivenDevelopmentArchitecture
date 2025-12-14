import { ReactNode } from "react";

type EmptyStateProps = {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
};

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) => {
  return (
    <div className="text-center">
      {icon && <div className="flex justify-center">{icon}</div>}
      <h3 className="text-lg font-medium text-neutral-900">{title}</h3>
      {description && <p className="text-neutral-600">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};
