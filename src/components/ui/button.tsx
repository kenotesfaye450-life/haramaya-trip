import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "dark" | "destructive" | "ghost";
  size?: "default" | "large" | "sm";
  fullWidth?: boolean;
  asChild?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "default",
      fullWidth = false,
      asChild = false,
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variantClasses = {
      // Primary action uses the shared brand-green token.
      primary:
        "bg-brand-green text-white hover:bg-[#066044] active:bg-[#064E3B] shadow-sm hover:shadow border border-transparent",
      // Secondary: White surface with clean neutral border
      secondary:
        "bg-white text-[#171717] border border-[#E3E8E5] hover:bg-[#F3F6F4] hover:border-[#D1D8D4] active:bg-[#EAEFEA]",
      // Dark / Structural
      dark:
        "bg-[#0A0A0A] text-white hover:bg-[#262626] active:bg-[#171717] border border-transparent",
      // Destructive: Red
      destructive:
        "bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] border border-transparent",
      // Ghost
      ghost:
        "bg-transparent text-[#171717] hover:bg-[#ECFDF5] hover:text-brand-green active:bg-[#D1FAE5] border border-transparent",
    };

    const sizeClasses = {
      sm: "h-8 px-3 text-xs rounded-md",
      default: "h-10 px-4 text-sm rounded-lg",
      large: "h-12 px-6 text-base rounded-lg",
    };

    const widthClass = fullWidth ? "w-full" : "";
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`;

    if (asChild) {
      return children as ReactNode;
    }

    return (
      <button ref={ref} className={classes} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
