import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  className?: string;
}

export function FormField({
  label,
  error,
  required = false,
  children,
  hint,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      
      {children}
      
      {hint && !error && (
        <p className="text-xs text-gray-600">{hint}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
