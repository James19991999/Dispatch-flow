"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cx } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark active:scale-[0.98] shadow-card-1",
  secondary: "bg-surface text-ink border border-outline-variant hover:bg-surface-container active:scale-[0.98]",
  ghost: "bg-transparent text-ink hover:bg-surface-container",
  danger: "bg-critical text-white hover:brightness-95 active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  md: "h-12 px-5 text-sm font-semibold rounded-control",
  sm: "h-9 px-3.5 text-sm font-semibold rounded-control",
  icon: "h-12 w-12 rounded-control",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cx(
          "inline-flex items-center justify-center gap-2 transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...rest}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
