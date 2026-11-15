"use client";

import { useState, type ReactNode } from "react";
import { get, useFieldArray, type FieldValues, type UseFormReturn } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button, ConfidenceBadge, Input, Select, cn } from "./ui";
import { optionalNumber, requiredNumber } from "@/lib/formSchemas";
import type { Confidence, Paystub } from "@/lib/types";

// Confirmation forms for an extracted pay stub or W-2, driven by React Hook Form. The form's values
// are { employerId, fields }; `fields` is checked with the API's PaystubSchema / W2Schema on submit.
// Every field shows how sure the reader was; medium and low are highlighted with "Please verify".

type ConfidenceMap = Record<string, Confidence>;
type Form = UseFormReturn<FieldValues>;

/** "fields.earnings.0.current" → "earnings[0].current", the reader's path format. */
export function confidencePath(name: string): string {
  return name.replace(/^fields\./, "").replace(/\.(\d+)(?=\.|$)/g, "[$1]");
}

const FLAG: Record<Confidence, string> = {
  high: "",
  medium: "border-warning bg-warning-soft/60 ring-1 ring-warning-border",
  low: "border-danger bg-danger-soft/60 ring-1 ring-danger-border",
};

const PAY_FREQUENCIES: Array<[Paystub["payFrequency"], string]> = [
  ["weekly", "Weekly"],
  ["biweekly", "Every 2 weeks"],
  ["semimonthly", "Twice a month"],
  ["monthly", "Monthly"],
  ["unknown", "Not sure"],
];

function FieldShell({
  form,
  name,
  label,
  conf,
  children,
  compact = false,
}: {
  form: Form;
  name: string;
  label: string;
  conf: ConfidenceMap;
  children: (props: { id: string; className: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
  compact?: boolean;
}) {
  const level = conf[confidencePath(name)];
  const error = (get(form.formState.errors, name) as { message?: string } | undefined)?.message;
  const id = `doc-${name.replace(/\./g, "-")}`;
  const flagged = level === "medium" || level === "low";
  const describedBy = [error ? `${id}-error` : null, flagged ? `${id}-flag` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="min-w-0">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
        <label htmlFor={id} className={cn("font-medium text-fg-primary", compact ? "text-xs" : "text-sm")}>
          {label}
        </label>
        <ConfidenceBadge level={level} compact />
      </div>
      {children({ id, className: level ? FLAG[level] : "", "aria-describedby": describedBy, "aria-invalid": !!error || level === "low" || undefined })}
      {flagged && (
        <span id={`${id}-flag`} className={cn("mt-0.5 block text-xs font-medium", level === "low" ? "text-danger" : "text-warning")}>
          {level === "low" ? "Likely misread. " : ""}Compare with your document.
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="mt-0.5 block text-xs font-medium text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

function NumberField({ form, name, label, conf, nullable = false, compact }: { form: Form; name: string; label: string; conf: ConfidenceMap; nullable?: boolean; compact?: boolean }) {
  return (
    <FieldShell form={form} name={name} label={label} conf={conf} compact={compact}>
      {(p) => (
        <Input
          {...p}
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder={nullable ? "—" : "0.00"}
          className={cn("px-2 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none", p.className)}
          {...form.register(name, { setValueAs: nullable ? (v: unknown) => optionalNumber(v) ?? null : requiredNumber })}
        />
      )}
    </FieldShell>
  );
}

function TextField({ form, name, label, conf, type = "text" }: { form: Form; name: string; label: string; conf: ConfidenceMap; type?: string }) {
  return (
    <FieldShell form={form} name={name} label={label} conf={conf}>
      {(p) => <Input {...p} type={type} {...form.register(name)} />}
    </FieldShell>
  );
}

const ITEM_LABELS: Record<string, Record<string, string>> = {
  earnings: { regular: "Regular pay", overtime: "Overtime", bonus: "Bonus", pto: "Paid time off", holiday: "Holiday pay", other: "Other earnings" },
  taxes: {
    federal_income: "Federal income tax",
    social_security: "Social Security",
    medicare: "Medicare",
    state_income: "State income tax",
    local: "Local tax",
    other: "Other tax",
  },
  deductions: {
    "401k_pretax": "401(k)",
    "401k_roth": "Roth 401(k)",
    health: "Health insurance",
    dental: "Dental",
    vision: "Vision",
    hsa: "HSA",
    fsa: "FSA",
    other: "Other deduction",
  },
  employerContributions: { "401k_match": "401(k) match", hsa: "HSA contribution", other: "Other" },
};

type ListKey = "earnings" | "taxes" | "deductions" | "employerContributions";

/** A new, empty line of the given type, in the shape PaystubSchema expects. */
function newLine(listKey: ListKey, type: string): Record<string, unknown> {
  const line: Record<string, unknown> = { type, current: 0, ytd: null };
  if (listKey === "earnings") Object.assign(line, { hours: null, rate: null });
  if (listKey === "deductions") line.preTax = type !== "401k_roth" && type !== "other";
  return line;
}

// The reader may miss a line (e.g. an overtime line), so the user can add one and remove a wrong one.
function AmountTable({ form, listKey, title, hint, conf }: { form: Form; listKey: ListKey; title: string; hint?: string; conf: ConfidenceMap }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: `fields.${listKey}` });
  const rows = (form.watch(`fields.${listKey}`) ?? []) as Array<{ type: string; preTax?: boolean }>;
  const types = Object.entries(ITEM_LABELS[listKey] ?? {});
  const [addType, setAddType] = useState(types[0]?.[0] ?? "other");
  return (
    <fieldset className="mt-6">
      <legend className="text-sm font-semibold text-fg-primary">{title}</legend>
      {hint && <p className="text-[13px] text-fg-muted">{hint}</p>}
      {fields.length > 0 && (
      <ul className="mt-2 divide-y divide-border rounded-control border border-border">
        {fields.map((field, i) => {
          const type = rows[i]?.type ?? "other";
          const name = ITEM_LABELS[listKey]?.[type] ?? type.replace(/_/g, " ");
          const base = `fields.${listKey}.${i}`;
          return (
            <li key={field.id} className="px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-fg-primary">{name}</p>
                <div className="flex items-center gap-3">
                  {listKey === "deductions" && (
                    <label className="inline-flex items-center gap-1.5 text-xs text-fg-secondary">
                      <input type="checkbox" className="h-4 w-4 accent-brand-600" {...form.register(`${base}.preTax`)} />
                      Pre-tax
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="inline-flex items-center gap-1 rounded text-xs font-medium text-fg-muted hover:text-danger"
                    aria-label={`Remove the ${name} line`}
                  >
                    <Trash2Icon aria-hidden="true" className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
              <div className={cn("grid gap-3", listKey === "earnings" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}>
                {listKey === "earnings" && (
                  <>
                    <NumberField compact form={form} conf={conf} name={`${base}.hours`} label="Hours" nullable />
                    <NumberField compact form={form} conf={conf} name={`${base}.rate`} label="Rate ($/h)" nullable />
                  </>
                )}
                <NumberField compact form={form} conf={conf} name={`${base}.current`} label="This paycheck" />
                <NumberField compact form={form} conf={conf} name={`${base}.ytd`} label="Year to date" nullable />
              </div>
            </li>
          );
        })}
      </ul>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Select
          aria-label={`Type of ${title.toLowerCase()} line to add`}
          value={addType}
          onChange={(e) => setAddType(e.target.value)}
          className="w-auto py-1.5 text-sm"
        >
          {types.map(([t, label]) => (
            <option key={t} value={t}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" size="sm" icon={<PlusIcon aria-hidden="true" className="h-4 w-4" />} onClick={() => append(newLine(listKey, addType))}>
          Add a line
        </Button>
      </div>
    </fieldset>
  );
}

export function PaystubEditor({ form, confidence }: { form: Form; confidence: ConfidenceMap }) {
  const freqLevel = confidence.payFrequency;
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField form={form} conf={confidence} name="fields.employerName" label="Employer" />
        <TextField form={form} conf={confidence} name="fields.payDate" label="Pay date" type="date" />
        <TextField form={form} conf={confidence} name="fields.payPeriodStart" label="Period start" type="date" />
        <TextField form={form} conf={confidence} name="fields.payPeriodEnd" label="Period end" type="date" />
        <FieldShell form={form} conf={confidence} name="fields.payFrequency" label="Pay frequency">
          {(p) => (
            <Select {...p} className={freqLevel ? FLAG[freqLevel] : undefined} {...form.register("fields.payFrequency")}>
              {PAY_FREQUENCIES.map(([f, text]) => (
                <option key={f} value={f}>
                  {text}
                </option>
              ))}
            </Select>
          )}
        </FieldShell>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NumberField form={form} conf={confidence} name="fields.grossCurrent" label="Gross pay" />
        <NumberField form={form} conf={confidence} name="fields.netCurrent" label="Net pay" />
        <NumberField form={form} conf={confidence} name="fields.grossYtd" label="Gross YTD" nullable />
      </div>
      <AmountTable form={form} conf={confidence} listKey="earnings" title="Earnings" hint="Hours and rate are optional for salaried pay." />
      <AmountTable form={form} conf={confidence} listKey="taxes" title="Taxes withheld" />
      <AmountTable
        form={form}
        conf={confidence}
        listKey="deductions"
        title="Deductions"
        hint="Pre-tax deductions lower your taxable wages. Untick if the stub lists it as after-tax."
      />
      <AmountTable form={form} conf={confidence} listKey="employerContributions" title="Paid by your employer" hint="Not taken from your pay, e.g. the 401(k) match." />
    </div>
  );
}

const W2_BOXES: Array<[string, string]> = [
  ["box1Wages", "Box 1 · Wages, tips, other comp."],
  ["box2FederalWithheld", "Box 2 · Federal income tax withheld"],
  ["box3SsWages", "Box 3 · Social Security wages"],
  ["box4SsWithheld", "Box 4 · Social Security tax withheld"],
  ["box5MedicareWages", "Box 5 · Medicare wages"],
  ["box6MedicareWithheld", "Box 6 · Medicare tax withheld"],
];

export function W2Editor({ form, confidence }: { form: Form; confidence: ConfidenceMap }) {
  const box12 = (form.watch("fields.box12") ?? []) as Array<{ code: string }>;
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField form={form} conf={confidence} name="fields.employerName" label="Employer" />
        <FieldShell form={form} conf={confidence} name="fields.taxYear" label="Tax year">
          {(p) => <Input {...p} type="number" inputMode="numeric" {...form.register("fields.taxYear", { setValueAs: requiredNumber })} />}
        </FieldShell>
        {W2_BOXES.map(([key, text]) => (
          <NumberField key={key} form={form} conf={confidence} name={`fields.${key}`} label={text} />
        ))}
      </div>
      {box12.length > 0 && (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-fg-primary">Box 12</legend>
          <p className="mb-2 text-[13px] text-fg-muted">A letter code and an amount. Code D is your 401(k) contributions.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {box12.map((_, i) => (
              <div key={i} className="grid grid-cols-[5rem_1fr] gap-2">
                <FieldShell compact form={form} conf={confidence} name={`fields.box12.${i}.code`} label={`12${String.fromCharCode(97 + i)} code`}>
                  {(p) => (
                    <Input
                      {...p}
                      maxLength={3}
                      className={cn("text-center font-mono uppercase", p.className)}
                      {...form.register(`fields.box12.${i}.code`, { setValueAs: (v: unknown) => String(v ?? "").toUpperCase() })}
                    />
                  )}
                </FieldShell>
                <NumberField compact form={form} conf={confidence} name={`fields.box12.${i}.amount`} label="Amount" />
              </div>
            ))}
          </div>
        </fieldset>
      )}
      <label className="mt-4 inline-flex items-center gap-2 text-sm text-fg-secondary">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" {...form.register("fields.box13RetirementPlan")} />
        Box 13 · &ldquo;Retirement plan&rdquo; is checked
      </label>
    </div>
  );
}
