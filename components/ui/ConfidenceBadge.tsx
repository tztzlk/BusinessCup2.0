import type { ReactNode } from "react";
import { AlertTriangle, CircleHelp, ShieldCheck } from "lucide-react";
import type { Confidence } from "@/lib/types";
import { Badge } from "./Badge";

const CONFIDENCE: Record<Confidence, { label: string; tone: "success" | "warning" | "danger"; icon: ReactNode }> = {
  high: { label: "High", tone: "success", icon: <ShieldCheck aria-hidden="true" /> },
  medium: { label: "Medium · please verify", tone: "warning", icon: <CircleHelp aria-hidden="true" /> },
  low: { label: "Low · please verify", tone: "danger", icon: <AlertTriangle aria-hidden="true" /> },
};

/**
 * How sure the document reader was about one field. The reader lists only the fields it was
 * unsure of (medium, low); a field it didn't flag counts as high.
 */
export function ConfidenceBadge({ level, compact = false }: { level: Confidence | undefined; compact?: boolean }) {
  const c = CONFIDENCE[level ?? "high"];
  return (
    <Badge tone={c.tone} icon={c.icon} className="px-2">
      <span className={compact ? "sr-only" : undefined}>Confidence: </span>
      {compact ? (level ?? "high") === "high" ? "High" : "Please verify" : c.label}
    </Badge>
  );
}
