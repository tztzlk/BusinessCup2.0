"use client";

import type { Confidence, Paystub, W2 } from "@/lib/types";
import { inputClass } from "./ui";

// Editable confirmation forms for extracted documents. Fields the model flagged as
// uncertain are highlighted: medium = amber, low = red.

type ConfidenceMap = Record<string, Confidence>;

function tone(conf: ConfidenceMap, path: string): string {
  const c = conf[path];
  if (c === "low") return "border-rose-400 bg-rose-50 ring-1 ring-rose-200";
  if (c === "medium") return "border-amber-400 bg-amber-50 ring-1 ring-amber-200";
  return "";
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
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      aria-label={ariaLabel}
      title={conf[path] ? `Please check: ${conf[path]} confidence` : undefined}
      className={`${inputClass} text-right font-mono ${tone(conf, path)}`}
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
  return (
    <input
      type={type}
      aria-label={ariaLabel}
      className={`${inputClass} ${tone(conf, path)}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
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

function AmountTable<T extends Row>({
  title,
  listKey,
  rows,
  conf,
  onRowChange,
  extra,
}: {
  title: string;
  listKey: string;
  rows: T[];
  conf: ConfidenceMap;
  onRowChange: (i: number, row: T) => void;
  extra?: (row: T, i: number) => React.ReactNode;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-5">
      <h4 className="mb-2 text-sm font-semibold text-slate-800">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th className="pb-1 font-medium">Item</th>
              {extra && <th className="pb-1 font-medium">Details</th>}
              <th className="pb-1 text-right font-medium">This period</th>
              <th className="pb-1 text-right font-medium">Year to date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="py-1 pr-2 text-slate-700">{row.type.replace(/_/g, " ").replace("401k", "401(k)")}</td>
                {extra && <td className="py-1 pr-2">{extra(row, i)}</td>}
                <td className="w-32 py-1 pr-2">
                  <NumberInput
                    ariaLabel={`${title} ${row.type} this period`}
                    value={row.current}
                    path={`${listKey}[${i}].current`}
                    conf={conf}
                    onChange={(v) => onRowChange(i, { ...row, current: v ?? 0 })}
                  />
                </td>
                <td className="w-32 py-1">
                  <NumberInput
                    ariaLabel={`${title} ${row.type} year to date`}
                    value={row.ytd}
                    nullable
                    path={`${listKey}[${i}].ytd`}
                    conf={conf}
                    onChange={(v) => onRowChange(i, { ...row, ytd: v })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
          >
            {["weekly", "biweekly", "semimonthly", "monthly", "unknown"].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Labeled>
        <div className="grid grid-cols-3 gap-2">
          <Labeled label="Gross">
            <NumberInput ariaLabel="Gross this period" value={value.grossCurrent} path="grossCurrent" conf={confidence} onChange={(v) => set("grossCurrent", v ?? 0)} />
          </Labeled>
          <Labeled label="Net">
            <NumberInput ariaLabel="Net this period" value={value.netCurrent} path="netCurrent" conf={confidence} onChange={(v) => set("netCurrent", v ?? 0)} />
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
        extra={(row, i) => (
          <div className="flex gap-1">
            <NumberInput
              ariaLabel={`Earnings ${row.type} hours`}
              value={row.hours}
              nullable
              path={`earnings[${i}].hours`}
              conf={confidence}
              onChange={(v) => setRow("earnings")(i, { ...row, hours: v })}
            />
            <NumberInput
              ariaLabel={`Earnings ${row.type} rate`}
              value={row.rate}
              nullable
              path={`earnings[${i}].rate`}
              conf={confidence}
              onChange={(v) => setRow("earnings")(i, { ...row, rate: v })}
            />
          </div>
        )}
      />
      <AmountTable title="Taxes" listKey="taxes" rows={value.taxes} conf={confidence} onRowChange={setRow("taxes")} />
      <AmountTable
        title="Deductions"
        listKey="deductions"
        rows={value.deductions}
        conf={confidence}
        onRowChange={setRow("deductions")}
        extra={(row, i) => (
          <label className="inline-flex items-center gap-1 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={row.preTax}
              onChange={(e) => setRow("deductions")(i, { ...row, preTax: e.target.checked })}
            />
            pre-tax
          </label>
        )}
      />
      <AmountTable
        title="Employer contributions"
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
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Box 12</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {value.box12.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
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
        Box 13 · Retirement plan
      </label>
    </div>
  );
}
