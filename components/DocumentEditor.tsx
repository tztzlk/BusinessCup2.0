"use client";

import { useId } from "react";
import type { Confidence, Paystub, W2 } from "@/lib/types";
import { inputClass } from "./ui";

// Editable confirmation forms for extracted documents. Fields the model flagged as
// uncertain are highlighted (medium = amber, low = red) with a short hint to compare with the document.

type ConfidenceMap = Record<string, Confidence>;

const PAY_FREQUENCIES: Array<[Paystub["payFrequency"], string]> = [
  ["weekly", "Weekly"],
  ["biweekly", "Every 2 weeks"],
  ["semimonthly", "Twice a month"],
  ["monthly", "Monthly"],
  ["unknown", "Not sure"],
];

function tone(conf: ConfidenceMap, path: string): string {
  const c = conf[path];
  if (c === "low") return "border-rose-400 bg-rose-50 ring-1 ring-rose-200";
  if (c === "medium") return "border-amber-400 bg-amber-50 ring-1 ring-amber-200";
  return "";
}

const CHECK_HINT = "Check this against your document";

/** Hint under a field the model was unsure about; the input points to it with aria-describedby. */
function FlagHint({ id, conf, path }: { id: string; conf: ConfidenceMap; path: string }) {
  const c = conf[path];
  if (!c) return null;
  return (
    <span id={id} className={`mt-0.5 block text-[11px] leading-tight ${c === "low" ? "text-rose-700" : "text-amber-700"}`}>
      {c === "low" ? "Likely misread. " : ""}
      {CHECK_HINT}
    </span>
  );
}

function NumberInput({
  value,
  onChange,
  path,
  conf,
  nullable = false,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  path: string;
  conf: ConfidenceMap;
  nullable?: boolean;
  ariaLabel: string;
}) {
  const hintId = useId();
  return (
    <>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        aria-label={ariaLabel}
        aria-describedby={conf[path] ? hintId : undefined}
        aria-invalid={conf[path] === "low" || undefined}
        className={`${inputClass} px-2 text-right font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${tone(conf, path)}`}
        value={value ?? ""}
        placeholder={nullable ? "—" : "0.00"}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") onChange(nullable ? null : 0);
          else {
            const n = Number(raw);
            if (!Number.isNaN(n)) onChange(n);
          }
        }}
      />
      <FlagHint id={hintId} conf={conf} path={path} />
    </>
  );
}

function TextInput({
  value,
  onChange,
  path,
  conf,
  type = "text",
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  path: string;
  conf: ConfidenceMap;
  type?: string;
  ariaLabel: string;
}) {
  const hintId = useId();
  return (
    <>
      <input
        type={type}
        aria-label={ariaLabel}
        aria-describedby={conf[path] ? hintId : undefined}
        aria-invalid={conf[path] === "low" || undefined}
        className={`${inputClass} ${tone(conf, path)}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <FlagHint id={hintId} conf={conf} path={path} />
    </>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </div>
  );
}

type Row = { type: string; current: number; ytd: number | null };

const ITEM_LABELS: Record<string, Record<string, string>> = {
  earnings: {
    regular: "Regular pay",
    overtime: "Overtime",
    bonus: "Bonus",
    pto: "Paid time off",
    holiday: "Holiday pay",
    other: "Other earnings",
  },
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
  employerContributions: {
    "401k_match": "401(k) match",
    hsa: "HSA contribution",
    other: "Other",
  },
};

function itemLabel(listKey: string, type: string): string {
  return ITEM_LABELS[listKey]?.[type] ?? type.replace(/_/g, " ");
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="mb-0.5 block text-xs text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function AmountTable<T extends Row>({
  title,
  hint,
  listKey,
  rows,
  conf,
  onRowChange,
  extra,
  aside,
}: {
  title: string;
  hint?: string;
  listKey: string;
  rows: T[];
  conf: ConfidenceMap;
  onRowChange: (i: number, row: T) => void;
  /** Extra inputs placed before the amounts (e.g. hours and rate). */
  extra?: (row: T, i: number, name: string) => React.ReactNode;
  /** Small control shown next to the item name (e.g. pre-tax checkbox). */
  aside?: (row: T, i: number) => React.ReactNode;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {rows.map((row, i) => {
          const name = itemLabel(listKey, row.type);
          return (
            <li key={i} className="grid gap-2 px-3 py-3 sm:grid-cols-[11rem_1fr] sm:items-end">
              <div className="flex items-center justify-between gap-2 sm:block sm:pb-2">
                <p className="text-sm font-medium text-slate-800">{name}</p>
                {aside?.(row, i)}
              </div>
              <div className={`grid gap-2 ${extra ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
                {extra?.(row, i, name)}
                <Mini label="This paycheck">
                  <NumberInput
                    ariaLabel={`${name} this paycheck`}
                    value={row.current}
                    path={`${listKey}[${i}].current`}
                    conf={conf}
                    onChange={(v) => onRowChange(i, { ...row, current: v ?? 0 })}
                  />
                </Mini>
                <Mini label="Year to date">
                  <NumberInput
                    ariaLabel={`${name} year to date`}
                    value={row.ytd}
                    nullable
                    path={`${listKey}[${i}].ytd`}
                    conf={conf}
                    onChange={(v) => onRowChange(i, { ...row, ytd: v })}
                  />
                </Mini>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PaystubEditor({
  value,
  onChange,
  confidence,
}: {
  value: Paystub;
  onChange: (v: Paystub) => void;
  confidence: ConfidenceMap;
}) {
  const formId = useId();
  const set = <K extends keyof Paystub>(key: K, v: Paystub[K]) => onChange({ ...value, [key]: v });
  const setRow =
    <K extends "earnings" | "taxes" | "deductions" | "employerContributions">(key: K) =>
    (i: number, row: Paystub[K][number]) => {
      const list = [...value[key]] as Paystub[K][number][];
      list[i] = row;
      onChange({ ...value, [key]: list });
    };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Employer">
          <TextInput ariaLabel="Employer" value={value.employerName} path="employerName" conf={confidence} onChange={(v) => set("employerName", v)} />
        </Labeled>
        <Labeled label="Pay date">
          <TextInput ariaLabel="Pay date" type="date" value={value.payDate} path="payDate" conf={confidence} onChange={(v) => set("payDate", v)} />
        </Labeled>
        <Labeled label="Period start">
          <TextInput
            ariaLabel="Period start"
            type="date"
            value={value.payPeriodStart}
            path="payPeriodStart"
            conf={confidence}
            onChange={(v) => set("payPeriodStart", v)}
          />
        </Labeled>
        <Labeled label="Period end">
          <TextInput
            ariaLabel="Period end"
            type="date"
            value={value.payPeriodEnd}
            path="payPeriodEnd"
            conf={confidence}
            onChange={(v) => set("payPeriodEnd", v)}
          />
        </Labeled>
        <Labeled label="Pay frequency">
          <select
            aria-label="Pay frequency"
            className={`${inputClass} ${tone(confidence, "payFrequency")}`}
            value={value.payFrequency}
            onChange={(e) => set("payFrequency", e.target.value as Paystub["payFrequency"])}
            aria-describedby={confidence.payFrequency ? `${formId}-freq-hint` : undefined}
          >
            {PAY_FREQUENCIES.map(([f, text]) => (
              <option key={f} value={f}>
                {text}
              </option>
            ))}
          </select>
          <FlagHint id={`${formId}-freq-hint`} conf={confidence} path="payFrequency" />
        </Labeled>
        <div className="grid grid-cols-3 gap-2 sm:col-span-2">
          <Labeled label="Gross pay">
            <NumberInput ariaLabel="Gross pay this paycheck" value={value.grossCurrent} path="grossCurrent" conf={confidence} onChange={(v) => set("grossCurrent", v ?? 0)} />
          </Labeled>
          <Labeled label="Net pay">
            <NumberInput ariaLabel="Net pay this paycheck" value={value.netCurrent} path="netCurrent" conf={confidence} onChange={(v) => set("netCurrent", v ?? 0)} />
          </Labeled>
          <Labeled label="Gross YTD">
            <NumberInput ariaLabel="Gross year to date" value={value.grossYtd} nullable path="grossYtd" conf={confidence} onChange={(v) => set("grossYtd", v)} />
          </Labeled>
        </div>
      </div>

      <AmountTable
        title="Earnings"
        listKey="earnings"
        rows={value.earnings}
        conf={confidence}
        onRowChange={setRow("earnings")}
        hint="Hours and rate are optional for salaried pay."
        extra={(row, i, name) => (
          <>
            <Mini label="Hours">
              <NumberInput
                ariaLabel={`${name} hours`}
                value={row.hours}
                nullable
                path={`earnings[${i}].hours`}
                conf={confidence}
                onChange={(v) => setRow("earnings")(i, { ...row, hours: v })}
              />
            </Mini>
            <Mini label="Rate ($/h)">
              <NumberInput
                ariaLabel={`${name} hourly rate`}
                value={row.rate}
                nullable
                path={`earnings[${i}].rate`}
                conf={confidence}
                onChange={(v) => setRow("earnings")(i, { ...row, rate: v })}
              />
            </Mini>
          </>
        )}
      />
      <AmountTable title="Taxes withheld" listKey="taxes" rows={value.taxes} conf={confidence} onRowChange={setRow("taxes")} />
      <AmountTable
        title="Deductions"
        hint="Pre-tax deductions lower your taxable wages. Untick if the stub lists it as after-tax."
        listKey="deductions"
        rows={value.deductions}
        conf={confidence}
        onRowChange={setRow("deductions")}
        aside={(row, i) => (
          <label className="inline-flex items-center gap-1 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={row.preTax}
              onChange={(e) => setRow("deductions")(i, { ...row, preTax: e.target.checked })}
            />
            Pre-tax
          </label>
        )}
      />
      <AmountTable
        title="Paid by your employer"
        hint="Not taken from your pay, e.g. the 401(k) match."
        listKey="employerContributions"
        rows={value.employerContributions}
        conf={confidence}
        onRowChange={setRow("employerContributions")}
      />
    </div>
  );
}

const W2_BOXES: Array<[keyof W2, string]> = [
  ["box1Wages", "Box 1 · Wages, tips, other comp."],
  ["box2FederalWithheld", "Box 2 · Federal income tax withheld"],
  ["box3SsWages", "Box 3 · Social Security wages"],
  ["box4SsWithheld", "Box 4 · Social Security tax withheld"],
  ["box5MedicareWages", "Box 5 · Medicare wages"],
  ["box6MedicareWithheld", "Box 6 · Medicare tax withheld"],
];

export function W2Editor({ value, onChange, confidence }: { value: W2; onChange: (v: W2) => void; confidence: ConfidenceMap }) {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Employer">
          <TextInput
            ariaLabel="Employer"
            value={value.employerName}
            path="employerName"
            conf={confidence}
            onChange={(v) => onChange({ ...value, employerName: v })}
          />
        </Labeled>
        <Labeled label="Tax year">
          <NumberInput
            ariaLabel="Tax year"
            value={value.taxYear}
            path="taxYear"
            conf={confidence}
            onChange={(v) => onChange({ ...value, taxYear: Math.round(v ?? value.taxYear) })}
          />
        </Labeled>
        {W2_BOXES.map(([key, text]) => (
          <Labeled key={key} label={text}>
            <NumberInput
              ariaLabel={text}
              value={value[key] as number}
              path={key}
              conf={confidence}
              onChange={(v) => onChange({ ...value, [key]: v ?? 0 })}
            />
          </Labeled>
        ))}
      </div>
      {value.box12.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-800">Box 12</h4>
          <p className="mb-2 text-xs text-slate-500">A letter code and an amount. Code D is your 401(k) contributions.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {value.box12.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-slate-500">12{String.fromCharCode(97 + i)}</span>
                <input
                  aria-label={`Box 12 code ${i + 1}`}
                  className={`${inputClass} w-16 text-center font-mono ${tone(confidence, `box12[${i}].code`)}`}
                  value={b.code}
                  onChange={(e) => {
                    const box12 = [...value.box12];
                    box12[i] = { ...b, code: e.target.value.toUpperCase().slice(0, 3) };
                    onChange({ ...value, box12 });
                  }}
                />
                <NumberInput
                  ariaLabel={`Box 12 amount ${i + 1}`}
                  value={b.amount}
                  path={`box12[${i}].amount`}
                  conf={confidence}
                  onChange={(v) => {
                    const box12 = [...value.box12];
                    box12[i] = { ...b, amount: v ?? 0 };
                    onChange({ ...value, box12 });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.box13RetirementPlan}
          onChange={(e) => onChange({ ...value, box13RetirementPlan: e.target.checked })}
        />
        Box 13 · &ldquo;Retirement plan&rdquo; is checked
      </label>
    </div>
  );
}
