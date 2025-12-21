import { forwardRef, ComponentPropsWithoutRef } from "react";

type LoadingSpinnerProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "className"
> & {
  readonly size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className="flex items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="読み込み中"
        {...props}
      >
        <div
          className={`
            animate-spin rounded-full
            border-4 border-neutral-200
            border-t-secondary-600
            ${sizeClasses[size]}
          `}
        />
      </div>
    );
  },
);

LoadingSpinner.displayName = "LoadingSpinner";

type LoadingPageProps = Omit<ComponentPropsWithoutRef<"div">, "className">;

export const LoadingPage = forwardRef<HTMLDivElement, LoadingPageProps>(
  (props, ref) => {
    return (
      <div
        ref={ref}
        className="flex items-center justify-center min-h-screen"
        {...props}
      >
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-neutral-600">読み込み中...</p>
        </div>
      </div>
    );
  },
);

LoadingPage.displayName = "LoadingPage";
