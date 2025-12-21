import { SelectHTMLAttributes, forwardRef, useId } from "react";

type SelectOption = {
  readonly value: string;
  readonly label: string;
};

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
  readonly label?: string;
  readonly error?: string;
  readonly options: readonly SelectOption[];
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, options, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-text-primary mb-1"
          >
            {label}
            {props.required && <span className="text-error-600 ml-1">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`
            w-full px-3 py-2
            border rounded-md
            text-text-primary bg-white
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:bg-neutral-100 disabled:cursor-not-allowed
            ${error ? "border-error-600" : "border-border-light"}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p role="alert" className="mt-1 text-sm text-error-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

SelectField.displayName = "SelectField";
