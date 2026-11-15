"use client";

import Link from "next/link";
import { useEffect, useRef, type ComponentType, type ReactNode, type SVGProps } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

/**
 * App navigation. Desktop (xl, 1280+): full sidebar. Tablet (md, 768-1279): icons only, the label
 * stays as the link's accessible name and shows as a tooltip. Phones: hidden; the header opens
 * the same links in <MobileDrawer>.
 */
export function Sidebar({ header, footer, children, label = "Main" }: { header: ReactNode; footer?: ReactNode; children: ReactNode; label?: string }) {
  return (
    <aside className="no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface md:flex md:w-[76px] xl:w-64">
      <div className="flex h-16 items-center px-4 md:justify-center xl:justify-start xl:px-6">{header}</div>
      <nav aria-label={label} className="flex-1 overflow-y-auto px-3 py-2">
        {children}
      </nav>
      {footer && <div className="px-3 pb-4">{footer}</div>}
    </aside>
  );
}

export function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  rail = true,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  active: boolean;
  /** In the sidebar the label collapses to a tooltip on tablets; in the drawer it is always shown. */
  rail?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
        rail && "md:justify-center xl:justify-start",
        active ? "bg-primary-50 text-brand-700" : "text-fg-secondary hover:bg-slate-100 hover:text-fg-primary",
      )}
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span className={rail ? "md:sr-only xl:not-sr-only" : undefined}>{label}</span>
      {rail && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full top-1/2 z-40 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-control bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-soft-md md:group-hover:block md:group-focus-visible:block xl:!hidden"
        >
          {label}
        </span>
      )}
    </Link>
  );
}

/** Left drawer for phones, a native modal <dialog>: focus stays inside, Escape closes. */
export function MobileDrawer({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="no-print m-0 h-dvh max-h-dvh w-72 max-w-[85vw] border-r border-border bg-surface p-0 backdrop:bg-slate-950/40 md:hidden"
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex justify-end px-3 pt-3">
            <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-control p-2 text-fg-muted hover:bg-slate-100">
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
