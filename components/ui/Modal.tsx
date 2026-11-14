"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

/**
 * Native <dialog> opened with showModal(): the browser traps focus, makes the page behind inert,
 * closes on Escape and returns focus to the button that opened it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> itself, not on its content.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "no-print m-auto w-[calc(100%-2rem)] rounded-card border border-border bg-surface p-0 text-fg-primary shadow-soft-md backdrop:bg-slate-950/40",
        size === "sm" ? "max-w-md" : size === "md" ? "max-w-lg" : "max-w-2xl",
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-0.5 text-sm text-fg-secondary">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 rounded-control p-2 text-fg-muted hover:bg-slate-100 hover:text-fg-primary"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>
          )}
        </div>
      )}
    </dialog>
  );
}
