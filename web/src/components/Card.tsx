import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

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
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
          {title && (
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  );
};
