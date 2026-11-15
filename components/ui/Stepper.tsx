import { CheckCircle2 } from "lucide-react";
import { cn } from "./cn";

/** Small numbered steps. `current` is the index of the active step; earlier steps are done. */
export function Stepper({ steps, current, label = "Progress" }: { steps: string[]; current: number; label?: string }) {
  return (
    <ol aria-label={label} className="flex items-start">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s} aria-current={state === "current" ? "step" : undefined} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "invisible" : i <= current ? "bg-primary" : "bg-border")} />
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  state === "done" && "bg-primary text-white",
                  state === "current" && "bg-primary text-white ring-4 ring-primary-100",
                  state === "todo" && "border border-border-strong bg-surface text-fg-muted",
                )}
              >
                {state === "done" ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn("h-0.5 flex-1", i === steps.length - 1 ? "invisible" : i < current ? "bg-primary" : "bg-border")} />
            </div>
            <span className={cn("mt-2 text-[13px] font-medium sm:text-sm", state === "todo" ? "text-fg-muted" : state === "current" ? "text-brand-700" : "text-fg-primary")}>
              <span className="sr-only">
                Step {i + 1} of {steps.length}
                {state === "done" ? ", done" : ""}:{" "}
              </span>
              {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
