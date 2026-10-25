import { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "status";
  statusColor?: "green" | "red" | "amber" | "blue";
  hover?: boolean;
}

export function Card({
  statusColor,
  hover = false,
  className = "",
  children,
  ...props
}: CardProps) {
  const baseClasses = "bg-white border border-[#E3E8E5] rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]";

  const statusBorderClasses = statusColor
    ? {
        green: "border-l-4 border-l-brand-green",
        red: "border-l-4 border-l-[#DC2626]",
        amber: "border-l-4 border-l-[#D97706]",
        blue: "border-l-4 border-l-[#2563EB]",
      }[statusColor]
    : "";

  const hoverClasses = hover
    ? "cursor-pointer transition-all duration-150 hover:border-[#A7F3D0] hover:shadow-sm"
    : "";

  return (
    <div
      className={`${baseClasses} ${statusBorderClasses} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = "",
}: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between px-5 pt-5 pb-3 border-b border-[#F3F6F4] ${className}`}>
      <div>
        <h3 className="text-base font-bold text-[#171717] tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-[#66706A] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}

export type CardContentProps = HTMLAttributes<HTMLDivElement>;

export function CardContent({
  className = "",
  children,
  ...props
}: CardContentProps) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export function CardFooter({
  className = "",
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={`px-5 py-3.5 border-t border-[#F3F6F4] bg-[#F8FAF9] rounded-b-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
