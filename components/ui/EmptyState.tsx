import type { ReactNode } from "react";
import { cn } from "./cn";

export function EmptyState({
  icon,
  title,
  description,
  actions,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      {icon && (
        <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </span>
      )}
      <h2 className="mt-4 text-lg font-semibold text-fg-primary">{title}</h2>
      {description && <div className="mt-1 max-w-md text-sm text-fg-secondary">{description}</div>}
      {actions && <div className="mt-5 flex flex-col gap-2 sm:flex-row">{actions}</div>}
    </div>
  );
}
