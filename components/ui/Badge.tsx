import type { ReactNode } from "react";
import { cn } from "./cn";

export type Tone = "neutral" | "primary" | "info" | "success" | "warning" | "danger";

export const TONE_SOFT: Record<Tone, string> = {
  neutral: "bg-slate-100 text-fg-secondary",
  primary: "bg-primary-50 text-brand-700",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:h-3.5 [&_svg]:w-3.5",
        TONE_SOFT[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
