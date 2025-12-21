import { forwardRef, useId, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const selectVariants = cva(
  [
    "w-full px-3 py-2",
    "border rounded-md",
    "text-text-primary bg-white",
    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
    "disabled:bg-neutral-100 disabled:cursor-not-allowed",
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

type SelectOption = {
  readonly value: string;
  readonly label: string;
};

type SelectFieldProps = Omit<ComponentPropsWithoutRef<"select">, "className"> &
  VariantProps<typeof selectVariants> & {
    readonly label?: string;
    readonly error?: string;
    readonly options: readonly SelectOption[];
  };

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, options, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;
    const hasError = error !== undefined && error !== "";

    return (
      <div className="w-full">
        {label !== undefined && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-text-primary mb-1"
          >
            {label}
            {props.required === true && (
              <span className="text-error-600 ml-1">*</span>
            )}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={selectVariants({ hasError })}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {hasError && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-error-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

SelectField.displayName = "SelectField";
