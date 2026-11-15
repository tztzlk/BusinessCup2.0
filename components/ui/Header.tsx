"use client";

import type { ReactNode } from "react";
import { Menu } from "lucide-react";

/** Top bar of the app. On phones the menu button opens the navigation drawer. */
export function Header({
  onOpenMenu,
  menuOpen,
  left,
  right,
}: {
  onOpenMenu: () => void;
  menuOpen: boolean;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-canvas/90 backdrop-blur md:border-transparent">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          className="-ml-2 rounded-control p-2 text-fg-secondary hover:bg-slate-100 md:hidden"
        >
          <Menu aria-hidden="true" className="h-6 w-6" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3">{left}</div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">{right}</div>
      </div>
    </header>
  );
}
