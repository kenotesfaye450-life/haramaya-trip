import { HTMLAttributes, ReactNode } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant: "success" | "error" | "warning" | "pending" | "neutral";
  icon?: ReactNode;
}

export function Badge({
  variant,
  icon,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const variantClasses = {
    success: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
    error: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
    warning: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
    pending: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
    neutral: "bg-[#F3F6F4] text-[#4B5563] border-[#E5E7EB]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="font-normal inline-flex items-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
