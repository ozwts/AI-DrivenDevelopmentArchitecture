import { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  readonly children: ReactNode;
  readonly title?: string;
  readonly actions?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export const Card = ({
  children,
  title,
  actions,
  className = "",
  ...props
}: CardProps) => {
  return (
    <div
      className={`
        bg-white rounded-md shadow-sm border border-border-light
        overflow-hidden
        ${className}
      `}
      {...props}
    >
      {(title !== undefined || actions !== undefined) && (
        <div className="border-b border-border-light flex items-center justify-between">
          {title && (
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
