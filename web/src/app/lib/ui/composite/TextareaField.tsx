import { TextareaHTMLAttributes, forwardRef, useId } from "react";

type TextareaFieldProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className"
> & {
  readonly label?: string;
  readonly error?: string;
  readonly helperText?: string;
};

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, helperText, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-text-primary mb-1"
          >
            {label}
            {props.required && <span className="text-error-600 ml-1">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={`
            w-full px-3 py-2
            border rounded-md
            text-text-primary bg-white
            placeholder-text-tertiary
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:bg-neutral-100 disabled:cursor-not-allowed
            resize-y
            ${error ? "border-error-600" : "border-border-light"}
          `}
          rows={4}
          {...props}
        />
        {error && (
          <p role="alert" className="mt-1 text-sm text-error-600">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-text-tertiary">{helperText}</p>
        )}
      </div>
    );
  },
);

TextareaField.displayName = "TextareaField";
