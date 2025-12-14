import { InputHTMLAttributes, forwardRef, useId } from "react";

type InputProps = {
  readonly label?: string;
  readonly error?: string;
  readonly helperText?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const hasError = error !== undefined && error !== "";
    const hasHelper = helperText !== undefined && helperText !== "" && !hasError;

    // aria-describedby: エラーまたはヘルパーテキストのIDを設定
    const describedBy = hasError ? errorId : hasHelper ? helperId : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-primary mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={`
            w-full px-3 py-2
            border rounded-md
            text-text-primary bg-white
            placeholder-text-tertiary
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${hasError ? "border-red-500" : "border-border-light"}
            ${className}
          `}
          {...props}
        />
        {hasError && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
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

Input.displayName = "Input";
