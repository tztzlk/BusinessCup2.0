"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "./cn";

type ToastTone = "success" | "info" | "warning" | "danger";

interface ToastInput {
  tone?: ToastTone;
  title: string;
  description?: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

const ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  info: <Info className="h-5 w-5 text-info" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  danger: <XCircle className="h-5 w-5 text-danger" />,
};

/** Toasts for saves, deletions and network errors. Announced through an aria-live region. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (t: ToastInput) => {
      const id = next.current++;
      setItems((all) => [...all.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === "danger" ? 8000 : 5000);
    },
    [dismiss],
  );
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "danger" ? "alert" : "status"}
            className={cn("pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-border bg-surface px-4 py-3 shadow-soft-md")}
          >
            <span aria-hidden="true" className="mt-px shrink-0">
              {ICON[t.tone ?? "success"]}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-fg-primary">{t.title}</p>
              {t.description && <p className="mt-0.5 text-fg-secondary">{t.description}</p>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-mr-1 rounded p-1 text-fg-muted hover:text-fg-primary">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** toast({ tone, title, description }). Outside a provider it does nothing. */
export function useToast(): (t: ToastInput) => void {
  return useContext(ToastContext) ?? noop;
}

function noop() {}
