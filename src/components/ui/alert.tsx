import { HTMLAttributes, ReactNode } from "react";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant: "info" | "success" | "warning" | "error";
  icon?: ReactNode;
  title?: string;
}

export function Alert({
  variant,
  icon,
  title,
  className = "",
  children,
  ...props
}: AlertProps) {
  const variantClasses = {
    info: "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]",
    success: "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]",
    warning: "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]",
    error: "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]",
  };

  const iconColors = {
    info: "text-[#2563EB]",
    success: "text-brand-green",
    warning: "text-[#D97706]",
    error: "text-[#DC2626]",
  };

  return (
    <div
      className={`rounded-lg p-4 border ${variantClasses[variant]} ${className}`}
      role="alert"
      {...props}
    >
      <div className="flex gap-3 items-start">
        {icon !== undefined ? (
          icon && <div className={`flex-shrink-0 ${iconColors[variant]} mt-0.5`}>{icon}</div>
        ) : (
          <div className={`flex-shrink-0 ${iconColors[variant]} mt-0.5`}>
            {variant === "success" && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {variant === "info" && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {variant === "warning" && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {variant === "error" && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && <p className="font-bold text-xs uppercase tracking-wider mb-1">{title}</p>}
          <div className="text-xs md:text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
