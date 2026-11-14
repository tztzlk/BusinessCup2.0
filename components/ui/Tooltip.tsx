"use client";

import { cloneElement, isValidElement, useId, useState, type ReactElement, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Shows `content` on hover and on keyboard focus; Escape hides it. The trigger gets
 * aria-describedby, so screen readers read the tooltip with it. The trigger must be focusable.
 */
export function Tooltip({
  content,
  side = "top",
  className,
  children,
}: {
  content: ReactNode;
  side?: "top" | "bottom" | "right";
  className?: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const trigger = isValidElement(children) ? cloneElement(children, { "aria-describedby": id }) : children;
  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute z-40 w-max max-w-[16rem] rounded-control bg-slate-900 px-2.5 py-1.5 text-xs font-normal leading-snug text-white shadow-soft-md transition-opacity",
          side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
          side === "bottom" && "left-1/2 top-full mt-2 -translate-x-1/2",
          side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
