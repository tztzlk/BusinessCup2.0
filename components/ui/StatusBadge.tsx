import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { CheckStatus } from "@/lib/engine/checkSummary";
import { Badge } from "./Badge";

const STATUS: Record<CheckStatus, { label: string; tone: "success" | "warning" | "danger"; icon: ReactNode }> = {
  ok: { label: "Healthy", tone: "success", icon: <CheckCircle2 aria-hidden="true" /> },
  worth_checking: { label: "Review", tone: "warning", icon: <AlertTriangle aria-hidden="true" /> },
  fix_now: { label: "Fix now", tone: "danger", icon: <XCircle aria-hidden="true" /> },
};

/** Healthy / Review / Fix now: icon and text, never color alone. */
export function StatusBadge({ status }: { status: CheckStatus }) {
  const s = STATUS[status];
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {s.label}
    </Badge>
  );
}

export const STATUS_LABEL: Record<CheckStatus, string> = { ok: "Healthy", worth_checking: "Review", fix_now: "Fix now" };

/** Marks fictional sample data (demo households). */
export function DemoBadge({ children = "Demo · fictional household" }: { children?: ReactNode }) {
  return (
    <Badge tone="warning" className="border border-warning-border px-3 py-1">
      {children}
    </Badge>
  );
}
