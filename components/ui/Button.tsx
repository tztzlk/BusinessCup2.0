import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-soft-sm hover:bg-primary-hover active:bg-primary-active disabled:bg-brand-300 disabled:shadow-none",
  secondary:
    "border border-border-strong bg-surface text-fg-primary hover:bg-slate-50 active:bg-slate-100 disabled:text-fg-muted disabled:hover:bg-surface",
  ghost: "text-brand-700 hover:bg-primary-50 active:bg-primary-100 disabled:text-fg-muted disabled:hover:bg-transparent",
  danger: "bg-danger text-white shadow-soft-sm hover:bg-danger-hover active:bg-danger-active disabled:opacity-50 disabled:shadow-none",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-5 text-base",
};

const BASE =
  "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-control font-medium transition-colors disabled:cursor-not-allowed";

export function buttonClass({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth,
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  fullWidth,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClass({ variant, size, fullWidth, className })} {...props}>
      {icon}
      {children}
    </Link>
  );
}
