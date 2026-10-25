import { SelectHTMLAttributes, forwardRef } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  label?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      error,
      label,
      helperText,
      options,
      className = "",
      id,
      required,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;

    const baseClasses =
      "w-full px-3.5 rounded-lg bg-white text-[#171717] transition-all duration-150 focus:outline-none disabled:bg-[#F3F6F4] disabled:text-[#87918B] disabled:cursor-not-allowed appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20width%3d%2212%22%20height%3d%228%22%20viewBox%3d%220%200%2012%208%22%20fill%3d%22none%22%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%3e%3cpath%20d%3d%22M1.5%201.75L6%206.25L10.5%201.75%22%20stroke%3d%22%23087A55%22%20stroke-width%3d%222%22%20stroke-linecap%3d%22round%22%20stroke-linejoin%3d%22round%22%2f%3e%3c%2fsvg%3e')] bg-no-repeat bg-[center_right_1rem]";

    const sizeClasses = "h-11 text-sm md:text-base pr-10";

    const borderClasses = error
      ? "border border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
      : "border border-[#E3E8E5] hover:border-[#D1D8D4] focus:border-brand-green focus:ring-2 focus:ring-brand-green/15";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-[#171717] uppercase tracking-wider mb-1.5"
          >
            {label}
            {required && <span className="text-[#DC2626] ml-1 font-normal">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`${baseClasses} ${sizeClasses} ${borderClasses} ${className}`}
          required={required}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {helperText && (
          <p
            className={`mt-1.5 text-xs ${
              error ? "text-[#DC2626] font-semibold" : "text-[#66706A]"
            }`}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
