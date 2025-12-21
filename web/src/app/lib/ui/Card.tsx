import { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  readonly children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <div
      className={`
        bg-white rounded-md shadow-sm border border-border-light
        overflow-hidden
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
