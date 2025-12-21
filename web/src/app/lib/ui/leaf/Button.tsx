import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500 disabled:bg-secondary-300 disabled:text-white",
        secondary:
          "bg-white text-secondary-600 border-2 border-secondary-600 hover:bg-secondary-50 focus:ring-secondary-400 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200",
        danger:
          "bg-error-600 text-white hover:bg-error-700 focus:ring-error-600 disabled:bg-error-200 disabled:text-white",
        ghost:
          "bg-transparent text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 focus:ring-secondary-400 disabled:text-neutral-400",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
        iconOnly: "p-2",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

const loadingIconVariants = cva("-ml-1 mr-2 h-4 w-4 animate-spin");

const loadingCircleVariants = cva("opacity-25");

const loadingPathVariants = cva("opacity-75");

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> &
  VariantProps<typeof buttonVariants> & {
    readonly isLoading?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant, size, fullWidth, isLoading = false, disabled, children, ...props },
    ref,
  ) => {
    const isDisabled = (disabled ?? false) || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        className={buttonVariants({ variant, size, fullWidth })}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className={loadingIconVariants()}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              role="status"
              aria-label="読み込み中"
            >
              <circle
                className={loadingCircleVariants()}
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className={loadingPathVariants()}
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>処理中...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
