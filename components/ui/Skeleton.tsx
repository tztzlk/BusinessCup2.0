import { cn } from "./cn";

/** Grey placeholder block while data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-control bg-slate-200/70", className)} />;
}

/** Page-level loading state: a few placeholder cards, announced once to screen readers. */
export function PageSkeleton({ label = "Loading…", cards = 3 }: { label?: string; cards?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-card" />
        ))}
      </div>
      <Skeleton className="mt-4 h-64 rounded-card" />
    </div>
  );
}
