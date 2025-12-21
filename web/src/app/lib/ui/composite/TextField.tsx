import { InputHTMLAttributes, forwardRef, useId } from "react";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  readonly label?: string;
  readonly error?: string;
  readonly helperText?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, helperText, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const hasError = error !== undefined && error !== "";
    const hasHelper =
      helperText !== undefined && helperText !== "" && !hasError;

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
            {props.required && <span className="text-error-600 ml-1">*</span>}
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
            disabled:bg-neutral-100 disabled:cursor-not-allowed
            ${hasError ? "border-error-600" : "border-border-light"}
          `}
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

TextField.displayName = "TextField";
