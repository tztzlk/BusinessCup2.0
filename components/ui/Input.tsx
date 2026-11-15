"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "./cn";

export const inputClass =
  "block h-10 w-full rounded-control border border-border-strong bg-surface px-3 text-sm text-fg-primary placeholder:text-fg-muted transition-colors hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-fg-muted aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger-soft";

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input className={cn(inputClass, className)} aria-invalid={invalid || props["aria-invalid"] || undefined} {...props} />;
}

/** aria-describedby value for a control inside <Field htmlFor={id}>. */
export function describedBy(id: string, { hint = false, error = false }: { hint?: boolean; error?: boolean }): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

/**
 * Label, hint and error for one control. With `htmlFor`, give the control that id and
 * aria-describedby={describedBy(id, …)}; without it, the label wraps the control.
 * zod errors render right under the field.
 */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  const fallback = useId();
  const base = htmlFor ?? fallback;
  const notes = (
    <>
      {hint && !error && (
        <span id={`${base}-hint`} className="mt-1 block text-[13px] text-fg-muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${base}-error`} className="mt-1 block text-[13px] font-medium text-danger">
          {error}
        </span>
      )}
    </>
  );
  if (htmlFor) {
    return (
      <div className={cn("block", className)}>
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-fg-primary">
          {label}
        </label>
        {children}
        {notes}
      </div>
    );
  }
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-fg-primary">{label}</span>
      {children}
      {notes}
    </label>
  );
}
