import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Padding = "none" | "sm" | "md" | "lg";
const PADDING: Record<Padding, string> = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" };

export function Card({ padding = "md", className, children, ...props }: ComponentProps<"div"> & { padding?: Padding }) {
  return (
    <div className={cn("rounded-card border border-border bg-surface shadow-soft-sm", PADDING[padding], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  as: Heading = "h2",
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span aria-hidden="true" className="mt-0.5 shrink-0 text-primary">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <Heading className="text-base font-semibold text-fg-primary">{title}</Heading>
          {subtitle && <p className="mt-0.5 text-[13px] text-fg-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** A titled block of a page. */
export function Section({
  title,
  subtitle,
  action,
  id,
  className,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("mt-8", className)}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-fg-primary">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-fg-muted sm:text-sm">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Page title block: H1 + subtitle + actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-fg-primary sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
