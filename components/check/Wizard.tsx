"use client";

import { useEffect, useRef, type ComponentType, type ReactNode, type SVGProps } from "react";
import { Button, Notice } from "../ui";
import { IconArrowLeft, IconArrowRight, IconInfo, IconMinus, IconPlus } from "../Icons";

// Building blocks for /check: one question per screen, with a progress bar and a back link.

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export function QuestionShell({
  section,
  index,
  total,
  icon: Icon,
  question,
  hint,
  why,
  error,
  busy = false,
  continueLabel = "Continue",
  continueDisabled = false,
  onBack,
  onContinue,
  extraAction,
  children,
}: {
  section: string;
  index: number;
  total: number;
  icon: IconType;
  question: string;
  hint?: ReactNode;
  /** Why we ask: shown in a calm info box under the answers. */
  why?: ReactNode;
  error?: string | null;
  busy?: boolean;
  continueLabel?: string;
  continueDisabled?: boolean;
  onBack?: () => void;
  onContinue: () => void;
  extraAction?: ReactNode;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Move focus to the new question so screen readers and keyboards follow the step change.
  useEffect(() => {
    heading.current?.focus();
  }, [question]);

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!continueDisabled && !busy) onContinue();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md py-1 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <IconArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <span />
        )}
        <span className="text-xs font-medium text-slate-500">
          {section} · {index} of {total}
        </span>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={`${section} progress`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index}
      >
        <div className="h-full origin-left rounded-full bg-brand-500 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `scaleX(${index / total})` }} />
      </div>

      <div className="mt-6 flex items-start gap-4">
        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 sm:flex">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold text-slate-900 outline-none sm:text-2xl">
            {question}
          </h2>
          {hint && <p className="mt-1 text-slate-600">{hint}</p>}
        </div>
      </div>

      <div className="mt-6">{children}</div>

      {why && (
        <div className="mt-5 flex gap-2.5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <div>{why}</div>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={continueDisabled || busy} className="sm:min-w-40">
          {busy ? "Saving…" : continueLabel}
          {!busy && <IconArrowRight className="h-4 w-4" />}
        </Button>
        {extraAction}
      </div>
    </form>
  );
}

/** A big selectable card used as a radio button. */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  icon: Icon,
  title,
  description,
  type = "radio",
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: IconType;
  title: string;
  description?: string;
  type?: "radio" | "checkbox";
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
        checked ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
      }`}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
      />
      {Icon && <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${checked ? "text-brand-600" : "text-slate-400"}`} />}
      <span className="min-w-0">
        <span className="block font-medium text-slate-900">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-slate-600">{description}</span>}
      </span>
    </label>
  );
}

/** − 2 + counter for small whole numbers. */
export function Counter({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        {hint && <p className="text-sm text-slate-600">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={`Fewer: ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <IconMinus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center text-lg font-semibold tabular-nums text-slate-900" aria-live="polite" aria-label={`${label}: ${value}`}>
          {value}
        </span>
        <button
          type="button"
          aria-label={`More: ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <IconPlus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** "Check your answers" list: each row has a Change link back to its question. */
export function AnswerList({ rows }: { rows: Array<{ label: string; value: ReactNode; onChange: () => void }> }) {
  return (
    <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
          <dt className="text-sm text-slate-500">{r.label}</dt>
          <dd className="flex items-baseline gap-3 text-sm font-medium text-slate-900">
            <span className="text-right">{r.value}</span>
            <button type="button" onClick={r.onChange} className="text-sm font-medium text-brand-700 hover:underline" aria-label={`Change ${r.label.toLowerCase()}`}>
              Change
            </button>
          </dd>
        </div>
      ))}
    </dl>
  );
}
