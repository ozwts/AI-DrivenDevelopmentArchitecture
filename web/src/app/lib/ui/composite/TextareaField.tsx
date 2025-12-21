import { forwardRef, useId, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const textareaVariants = cva(
  [
    "w-full px-3 py-2",
    "border rounded-md",
    "text-text-primary bg-white",
    "placeholder-text-tertiary",
    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
    "disabled:bg-neutral-100 disabled:cursor-not-allowed",
    "resize-y",
  ],
  {
    variants: {
      hasError: {
        true: "border-error-600",
        false: "border-border-light",
      },
    },
    defaultVariants: {
      hasError: false,
    },
  },
);

type TextareaFieldProps = Omit<
  ComponentPropsWithoutRef<"textarea">,
  "className"
> &
  VariantProps<typeof textareaVariants> & {
    readonly label?: string;
    readonly error?: string;
    readonly helperText?: string;
  };

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, helperText, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;
    const hasError = error !== undefined && error !== "";
    const hasHelper =
      helperText !== undefined && helperText !== "" && !hasError;

    // aria-describedby: エラーまたはヘルパーテキストのIDを設定
    const describedBy = hasError ? errorId : hasHelper ? helperId : undefined;

    return (
      <div className="w-full">
        {label !== undefined && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-text-primary mb-1"
          >
            {label}
            {props.required === true && (
              <span className="text-error-600 ml-1">*</span>
            )}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={textareaVariants({ hasError })}
          rows={4}
          {...props}
        />
        {hasError && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-error-600">
            {error}
          </p>
        )}
        {hasHelper && (
          <p id={helperId} className="mt-1 text-sm text-text-tertiary">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

TextareaField.displayName = "TextareaField";
