import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-copper text-canvas font-semibold hover:bg-copper-bright shadow-[0_4px_20px_-6px_rgb(var(--copper)/0.6)] border border-copper/40",
  secondary:
    "bg-surface-2 text-ink border border-line-strong hover:border-copper/50 hover:text-copper",
  ghost: "text-ink-dim hover:text-ink hover:bg-surface-2 border border-transparent",
  danger: "bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25",
  subtle: "bg-surface text-ink-dim border border-line hover:border-line-strong hover:text-ink",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-sm gap-2 rounded-xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, iconRight, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "btn-press inline-flex select-none items-center justify-center whitespace-nowrap",
        "disabled:cursor-not-allowed disabled:opacity-50",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  );
});
