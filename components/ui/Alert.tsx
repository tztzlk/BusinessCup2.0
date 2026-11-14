import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "./cn";
import type { Tone } from "./Badge";

const STYLE: Record<Tone, string> = {
  neutral: "border-border bg-slate-50 text-fg-secondary",
  primary: "border-brand-200 bg-primary-50 text-brand-900",
  info: "border-info-border bg-info-soft text-info-strong",
  success: "border-success-border bg-success-soft text-success-strong",
  warning: "border-warning-border bg-warning-soft text-warning-strong",
  danger: "border-danger-border bg-danger-soft text-danger-strong",
};

const ICON: Record<Tone, ReactNode> = {
  neutral: <Info className="h-5 w-5 text-fg-muted" />,
  primary: <Info className="h-5 w-5 text-primary" />,
  info: <Info className="h-5 w-5 text-info" />,
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  danger: <XCircle className="h-5 w-5 text-danger" />,
};

/** Inline message. Danger is announced right away (role="alert"); the rest politely (role="status"). */
export function Alert({
  tone = "info",
  title,
  action,
  icon,
  className,
  children,
}: {
  tone?: Tone;
  title?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode | false;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-control border px-4 py-3 text-sm", STYLE[tone], className)}>
      {icon !== false && (
        <span aria-hidden="true" className="mt-px shrink-0">
          {icon ?? ICON[tone]}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
