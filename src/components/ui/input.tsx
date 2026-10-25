import { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { error, label, helperText, className = "", id, required, ...props },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

    const baseClasses =
      "w-full px-3.5 rounded-lg bg-white text-[#171717] transition-all duration-150 focus:outline-none disabled:bg-[#F3F6F4] disabled:text-[#87918B] disabled:cursor-not-allowed";

    const sizeClasses = "h-11 text-sm md:text-base";

    const borderClasses = error
      ? "border border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
      : "border border-[#E3E8E5] hover:border-[#D1D8D4] focus:border-brand-green focus:ring-2 focus:ring-brand-green/15";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-[#171717] uppercase tracking-wider mb-1.5"
          >
            {label}
            {required && <span className="text-[#DC2626] ml-1 font-normal">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${baseClasses} ${sizeClasses} ${borderClasses} ${className}`}
          required={required}
          {...props}
        />
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

Input.displayName = "Input";
