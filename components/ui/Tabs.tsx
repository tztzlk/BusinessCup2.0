"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export interface TabItem {
  id: string;
  label: ReactNode;
  badge?: ReactNode;
}

const tabId = (base: string, id: string) => `${base}-tab-${id}`;
const panelId = (base: string, id: string) => `${base}-panel-${id}`;

/** WAI-ARIA tabs: arrow keys, Home and End move between tabs; only the active tab is in the tab order. */
export function Tabs({
  idBase,
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  idBase: string;
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (e: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1) : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cn("no-print flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(idBase, t.id)}
            aria-selected={active}
            aria-controls={panelId(idBase, t.id)}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => move(e, i)}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2.5 text-sm font-medium transition-colors sm:gap-2 sm:px-4",
              active ? "border-primary text-brand-700" : "border-transparent text-fg-secondary hover:border-border-strong hover:text-fg-primary",
            )}
          >
            {t.label}
            {t.badge}
          </button>
        );
      })}
    </div>
  );
}

/** Panel for one tab. Hidden panels still print, so "Print or save as PDF" includes every tab. */
export function TabPanel({ idBase, id, active, className, children }: { idBase: string; id: string; active: boolean; className?: string; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={panelId(idBase, id)}
      aria-labelledby={tabId(idBase, id)}
      tabIndex={0}
      className={cn(active ? "block" : "hidden print:block", "focus-visible:rounded-card", className)}
    >
      {children}
    </div>
  );
}
