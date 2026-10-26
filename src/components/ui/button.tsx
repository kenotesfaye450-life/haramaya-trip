import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "neutral"
  | "dark"
  | "destructive"
  | "danger"
  | "success"
  | "warning"
  | "ghost";

export type ButtonSize = "default" | "large" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  asChild?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-brand-green text-white hover:bg-[#066044] active:bg-[#064E3B] focus-visible:ring-brand-green/35",
  secondary:
    "border border-transparent bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:bg-[#1E40AF] focus-visible:ring-blue-600/35",
  neutral:
    "border border-[#CBD5E1] bg-white text-[#102A43] hover:border-[#AFC2D4] hover:bg-[#F4F8FC] active:bg-[#E7F0FA] focus-visible:ring-slate-500/30",
  dark:
    "border border-transparent bg-[#111827] text-white hover:bg-[#273449] active:bg-[#0B1220] focus-visible:ring-slate-700/35",
  destructive:
    "border border-transparent bg-[#B42318] text-white hover:bg-[#912018] active:bg-[#7A1B15] focus-visible:ring-red-700/35",
  danger:
    "border border-transparent bg-[#B42318] text-white hover:bg-[#912018] active:bg-[#7A1B15] focus-visible:ring-red-700/35",
  success:
    "border border-transparent bg-brand-green text-white hover:bg-[#066044] active:bg-[#064E3B] focus-visible:ring-brand-green/35",
  warning:
    "border border-transparent bg-[#F4B740] text-[#30220A] hover:bg-[#E2A52F] active:bg-[#C78C1C] focus-visible:ring-amber-600/35",
  ghost:
    "border border-transparent bg-transparent text-[#102A43] hover:bg-[#EAF1F8] active:bg-[#DCE8F4] focus-visible:ring-slate-500/30",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 rounded-md px-3.5 py-2 text-xs",
  default: "min-h-10 rounded-lg px-4 py-2.5 text-sm",
  large: "min-h-11 rounded-lg px-5 py-3 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "default",
      fullWidth = false,
      asChild = false,
      className = "",
      disabled = false,
      type = "button",
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const classes = [
      "inline-flex shrink-0 items-center justify-center gap-2 text-center font-semibold leading-tight",
      "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-55 disabled:saturate-50",
      variantClasses[variant],
      sizeClasses[size],
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (asChild) {
      if (!isValidElement(children)) {
        throw new Error("Button with asChild requires one element child.");
      }

      const child = children as ReactElement<Record<string, unknown>>;
      const childProps = child.props;
      const childOnClick = childProps.onClick as
        | ((event: MouseEvent<HTMLElement>) => void)
        | undefined;
      const mergedProps: Record<string, unknown> = {
        ...childProps,
        ...props,
        className: [classes, disabled ? "pointer-events-none" : "", childProps.className]
          .filter((value): value is string => typeof value === "string" && value.length > 0)
          .join(" "),
        ...(disabled ? { "aria-disabled": true, tabIndex: -1 } : {}),
      };

      if (childOnClick || onClick) {
        mergedProps.onClick = (event: MouseEvent<HTMLElement>) => {
          if (disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          childOnClick?.(event);
          if (!event.defaultPrevented) {
            onClick?.(event as unknown as MouseEvent<HTMLButtonElement>);
          }
        };
      }

      return cloneElement(child, mergedProps);
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
