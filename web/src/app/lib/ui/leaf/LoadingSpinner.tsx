import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const spinnerWrapperVariants = cva("flex items-center justify-center");

const spinnerVariants = cva(
  "animate-spin rounded-full border-4 border-neutral-200 border-t-secondary-600",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const pageWrapperVariants = cva("flex items-center justify-center min-h-screen");

const pageContentVariants = cva("text-center");

const pageTextVariants = cva("mt-4 text-neutral-600");

type LoadingSpinnerProps = Omit<ComponentPropsWithoutRef<"div">, "className"> &
  VariantProps<typeof spinnerVariants>;

export const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size, ...props }, ref) => (
    <div
      ref={ref}
      className={spinnerWrapperVariants()}
      role="status"
      aria-live="polite"
      aria-label="読み込み中"
      {...props}
    >
      <div className={spinnerVariants({ size })} />
    </div>
  ),
);

LoadingSpinner.displayName = "LoadingSpinner";

type LoadingPageProps = Omit<ComponentPropsWithoutRef<"div">, "className">;

export const LoadingPage = forwardRef<HTMLDivElement, LoadingPageProps>(
  (props, ref) => (
    <div ref={ref} className={pageWrapperVariants()} {...props}>
      <div className={pageContentVariants()}>
        <LoadingSpinner size="lg" />
        <p className={pageTextVariants()}>読み込み中...</p>
      </div>
    </div>
  ),
);

LoadingPage.displayName = "LoadingPage";
