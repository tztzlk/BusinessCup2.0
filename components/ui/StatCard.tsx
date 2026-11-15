import type { ReactNode } from "react";
import { cn } from "./cn";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  footer,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
  footer?: ReactNode;
  className?: string;
}) {
  const bg = {
    neutral: "bg-surface border-border",
    success: "bg-success-soft border-success-border",
    warning: "bg-warning-soft border-warning-border",
    danger: "bg-danger-soft border-danger-border",
    primary: "bg-primary-50 border-brand-200",
  }[tone];
  return (
    <div className={cn("rounded-card border p-5 shadow-soft-sm", bg, className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-fg-secondary sm:text-sm">{label}</p>
        {icon && (
          <span aria-hidden="true" className="shrink-0 [&_svg]:h-5 [&_svg]:w-5">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-[28px] font-bold leading-tight tracking-tight tabular-nums text-fg-primary sm:text-[32px]">{value}</p>
      {hint && <div className="mt-1 text-[13px] text-fg-secondary">{hint}</div>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
