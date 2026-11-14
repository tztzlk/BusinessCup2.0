import { cn } from "./cn";

export function ProgressBar({ value, label, className }: { value: number | null; label: string; className?: string }) {
  const pct = value === null ? null : Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? undefined}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-[width] duration-300", pct === null && "w-1/3 animate-pulse")}
        style={pct === null ? undefined : { width: `${pct}%` }}
      />
    </div>
  );
}
