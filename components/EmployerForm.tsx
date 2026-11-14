"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Field, inputClass, Alert } from "./ui";
import type { EmploymentSettings } from "@/lib/types";

// Job settings form, shared by the employer step of /check and "Edit job" on /report.

export type EmployerSettings = Omit<EmploymentSettings, "id">;

const DEFAULT_MATCH = { matchPercent: 50, upToPercentOfPay: 6 };

export function newEmployerSettings(member: EmploymentSettings["member"]): EmployerSettings {
  return {
    member,
    employerName: "",
    payType: "salary",
    annualSalary: undefined,
    hourlyRate: undefined,
    overtimeEligible: false,
    match401k: DEFAULT_MATCH,
    w4: { step2Checked: false, step3Credits: 0, step4aOtherIncome: 0, step4bDeductions: 0, step4cExtraWithholding: 0 },
  };
}

export function EmployerForm({
  initial,
  notMarried = false,
  submitLabel,
  onSubmit,
  onCancel,
  cancelLabel = "Cancel",
}: {
  initial: EmployerSettings;
  notMarried?: boolean;
  submitLabel: string;
  onSubmit: (s: EmployerSettings) => Promise<void>;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const [s, setS] = useState<EmployerSettings>({ ...initial, match401k: initial.match401k ?? DEFAULT_MATCH });
  // A job saved without a match rule opens with the box unchecked.
  const [hasMatch, setHasMatch] = useState(initial.match401k !== undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const num = (v: string) => (v === "" ? 0 : Number(v) || 0);
  const w4 = (k: keyof EmploymentSettings["w4"], v: number | boolean) => setS({ ...s, w4: { ...s.w4, [k]: v } });

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await onSubmit({
            ...s,
            annualSalary: s.payType === "salary" ? s.annualSalary : undefined,
            hourlyRate: s.payType === "hourly" ? s.hourlyRate : undefined,
            match401k: hasMatch ? s.match401k : undefined,
          });
        } catch (error) {
          setErr(error instanceof Error ? error.message : "Something went wrong.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Whose job">
        <select className={inputClass} value={s.member} onChange={(e) => setS({ ...s, member: e.target.value as "self" | "spouse" })}>
          <option value="self">Mine</option>
          <option value="spouse">My spouse&apos;s</option>
        </select>
      </Field>
      {s.member === "spouse" && notMarried && (
        <div className="sm:col-span-2">
          <Alert tone="warning">
            Your household is set to file as single or head of household, so the forecast won&apos;t count a spouse&apos;s
            income the way a joint return does. If you&apos;re married, change the filing status on your{" "}
            <Link href="/report" className="font-medium underline">
              report
            </Link>{" "}
            (Edit profile). If this is your own second job, choose &quot;Mine&quot;.
          </Alert>
        </div>
      )}
      <Field label="Employer name">
        <input required maxLength={200} className={inputClass} value={s.employerName} onChange={(e) => setS({ ...s, employerName: e.target.value })} />
      </Field>
      <Field label="Pay type">
        <select className={inputClass} value={s.payType} onChange={(e) => setS({ ...s, payType: e.target.value as "salary" | "hourly" })}>
          <option value="salary">Salary</option>
          <option value="hourly">Hourly</option>
        </select>
      </Field>
      {s.payType === "salary" ? (
        <Field label="Annual salary (USD)">
          <input
            required
            type="number"
            min={0}
            step="1"
            className={inputClass}
            value={s.annualSalary ?? ""}
            onChange={(e) => setS({ ...s, annualSalary: e.target.value === "" ? undefined : num(e.target.value) })}
          />
        </Field>
      ) : (
        <Field label="Hourly rate (USD)">
          <input
            required
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={s.hourlyRate ?? ""}
            onChange={(e) => setS({ ...s, hourlyRate: e.target.value === "" ? undefined : num(e.target.value) })}
          />
        </Field>
      )}
      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
        <input type="checkbox" checked={s.overtimeEligible} onChange={(e) => setS({ ...s, overtimeEligible: e.target.checked })} />
        Eligible for overtime pay (non-exempt)
      </label>

      <div className="rounded-lg border border-slate-200 p-4 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={hasMatch} onChange={(e) => setHasMatch(e.target.checked)} />
          Employer matches 401(k) contributions
        </label>
        {hasMatch && s.match401k && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Matches (%)" hint="e.g. 50 = 50 cents per dollar">
              <input
                type="number"
                min={0}
                max={200}
                className={inputClass}
                value={s.match401k.matchPercent}
                onChange={(e) => setS({ ...s, match401k: { ...s.match401k!, matchPercent: num(e.target.value) } })}
              />
            </Field>
            <Field label="Up to (% of pay)">
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                value={s.match401k.upToPercentOfPay}
                onChange={(e) => setS({ ...s, match401k: { ...s.match401k!, upToPercentOfPay: num(e.target.value) } })}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 p-4 sm:col-span-2">
        <p className="text-sm font-medium text-slate-700">Current W-4 at this job</p>
        <p className="text-xs text-slate-500">
          From the W-4 you gave HR, or your payroll portal. Not sure? Leave the zeros — most people never fill these in.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={s.w4.step2Checked} onChange={(e) => w4("step2Checked", e.target.checked)} />
          Step 2 checkbox is checked (multiple jobs / spouse works)
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Step 3 credits ($/yr)">
            <input type="number" min={0} className={inputClass} value={s.w4.step3Credits} onChange={(e) => w4("step3Credits", num(e.target.value))} />
          </Field>
          <Field label="Step 4(a) other income ($/yr)">
            <input type="number" min={0} className={inputClass} value={s.w4.step4aOtherIncome} onChange={(e) => w4("step4aOtherIncome", num(e.target.value))} />
          </Field>
          <Field label="Step 4(b) deductions ($/yr)">
            <input type="number" min={0} className={inputClass} value={s.w4.step4bDeductions} onChange={(e) => w4("step4bDeductions", num(e.target.value))} />
          </Field>
          <Field label="Step 4(c) extra ($/paycheck)">
            <input
              type="number"
              min={0}
              className={inputClass}
              value={s.w4.step4cExtraWithholding}
              onChange={(e) => w4("step4cExtraWithholding", num(e.target.value))}
            />
          </Field>
        </div>
      </div>

      {err && (
        <div className="sm:col-span-2">
          <Alert tone="danger">{err}</Alert>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
