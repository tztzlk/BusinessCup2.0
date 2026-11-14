import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";
import { inputClass } from "./Input";

/** Native select (keyboard and screen readers work out of the box) with the input look. */
export function Select({
  className,
  wrapperClassName,
  invalid,
  children,
  ...props
}: ComponentProps<"select"> & { invalid?: boolean; wrapperClassName?: string }) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        className={cn(inputClass, "appearance-none pr-9", className)}
        aria-invalid={invalid || props["aria-invalid"] || undefined}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
    </div>
  );
}
