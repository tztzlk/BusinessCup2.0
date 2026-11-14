"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onSelect?: () => void;
  tone?: "default" | "danger";
}

/**
 * Menu button (WAI-ARIA): Enter/Space/ArrowDown open it, arrows move, Escape closes and
 * returns focus to the button, a click outside closes it.
 */
export function Dropdown({
  label,
  trigger,
  items,
  header,
  align = "end",
  buttonClassName,
}: {
  /** Accessible name of the menu button. */
  label: string;
  trigger: ReactNode;
  items: DropdownItem[];
  header?: ReactNode;
  align?: "start" | "end";
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    itemRefs.current[0]?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const els = itemRefs.current.filter((x): x is HTMLElement => x !== null);
    const at = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(at + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(at - 1 + els.length) % els.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      els[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      els[els.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const itemClass = (tone: DropdownItem["tone"]) =>
    cn(
      "flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm outline-none focus-visible:bg-slate-100 hover:bg-slate-100 [&_svg]:h-4 [&_svg]:w-4",
      tone === "danger" ? "text-danger" : "text-fg-primary",
    );

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={buttonClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cn(
            "absolute z-40 mt-2 w-64 rounded-card border border-border bg-surface p-1.5 shadow-soft-md",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {header && <div className="border-b border-border px-3 pb-2 pt-1.5">{header}</div>}
          <div className={header ? "pt-1" : undefined}>
            {items.map((item, i) =>
              item.href ? (
                <Link
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  href={item.href}
                  role="menuitem"
                  tabIndex={-1}
                  className={itemClass(item.tone)}
                  onClick={() => close(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={itemClass(item.tone)}
                  onClick={() => {
                    close(false);
                    item.onSelect?.();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
