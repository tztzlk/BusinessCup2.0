"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { ButtonLink, inputClass } from "./ui";
import { DISCLAIMER } from "./Footer";
import { Term } from "./Term";
import { money } from "@/lib/format";
import { type QuickEstimateResult, type QuickFilingStatus, quickEstimate } from "@/lib/engine/quickEstimate";

// Landing-page calculator. Every number comes from lib/engine (quickEstimate -> projectYear, Pub. 15-T
// Worksheet 1A, brackets and credits from params). Runs only in the browser: nothing is sent anywhere.

const STATUSES: Array<[QuickFilingStatus, string]> = [
  ["married_joint", "Married filing jointly"],
  ["single", "Single"],
  ["head_of_household", "Head of household"],
];

const parseDollars = (s: string) => {
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Why a salary field can't be used yet, or null when it's fine. Empty and negative amounts are not guessed. */
const dollarProblem = (s: string): string | null => {
  if (s.trim() === "") return "Enter a yearly amount, or 0.";
  if (/-/.test(s)) return "Enter an amount of 0 or more.";
  if (!/^[\s$0-9,.]+$/.test(s) || !Number.isFinite(Number(s.replace(/[^0-9.]/g, "")))) return "Use digits only, like 60,000.";
  return null;
};

function YesNo({ label, value, onChange }: { label: ReactNode; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <fieldset className="text-sm">
      <legend className="mb-1 font-medium text-slate-700">{label}</legend>
      <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`rounded-md px-4 py-1.5 font-medium ${value === v ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function DollarInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const problem = dollarProblem(value);
  return (
    <div>
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">$</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? `${id}-error` : undefined}
        className={`${inputClass} pl-7 tabular-nums`}
      />
    </div>
      {problem && (
        <span id={`${id}-error`} className="mt-1 block text-xs font-medium text-danger">
          {problem}
        </span>
      )}
    </div>
  );
}

/** The estimate in words: owe / refund / even, the Step 4(c) fix and the likely cause. Shared with /calculator. */
export function EstimateResult({ r, twoEarnerWording, actions = true }: { r: QuickEstimateResult; twoEarnerWording: boolean; actions?: boolean }) {
  const owe = r.balance > 0 && !r.aboutEven;
  const refund = r.balance < 0 && !r.aboutEven;
  const april = `April ${r.taxYear + 1}`;
  const tone = owe ? "bg-warning-soft text-warning-strong ring-warning-border" : refund ? "bg-success-soft text-success-strong ring-success-border" : "bg-slate-50 text-fg-primary ring-border";

  return (
    <div className={`flex h-full flex-col rounded-xl p-5 ring-1 ${tone}`} aria-live="polite">
      <p className="text-sm font-medium opacity-75">Estimated for tax year {r.taxYear}</p>
      <p className="mt-1 text-2xl font-semibold leading-tight sm:text-[28px]">
        {owe && <>You may owe about {money(r.balance, true)} in {april}</>}
        {refund && <>You may get about {money(-r.balance, true)} back in {april}</>}
        {!owe && !refund && <>You&apos;re about even for {april}</>}
      </p>
      <p className="mt-2 text-sm tabular-nums opacity-80">
        Federal tax after credits {money(r.annualTax, true)} vs. <Term k="withholding">withheld</Term> from {r.payPeriods} paychecks {money(r.annualWithholding, true)}
        {r.annualTax < 0 ? " (below zero: part of the Child Tax Credit is refundable)" : ""}.
      </p>

      {r.step4cPerPaycheck > 0 && (
        <div className="mt-4 rounded-lg bg-white px-4 py-3 text-sm text-slate-800 ring-1 ring-brand-200">
          <p>
            <span className="font-semibold text-brand-700">Fix:</span> add{" "}
            <span className="font-mono font-semibold">{money(r.step4cPerPaycheck, true)}</span> per paycheck in W-4 <Term k="w4Step4c">Step 4(c)</Term>
            {twoEarnerWording ? " on one of your W-4s" : ""}.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            That closes the gap over a full year of {r.payPeriods} paychecks. Later in the year it takes more per paycheck; your pay stubs give the
            exact amount.
          </p>
        </div>
      )}

      {r.cause === "two_jobs_no_step2" && (
        <p className="mt-4 text-sm">
          <span className="font-semibold">Why:</span> with Step 2 unchecked, each employer withholds as if its paycheck were your household&apos;s only
          income, so both apply the full standard deduction and the lowest tax brackets.
          {r.balanceIfStep2Checked !== null &&
            (Math.abs(r.balanceIfStep2Checked) < r.payPeriods
              ? " Checking Step 2 on both W-4s would bring you to about even."
              : r.balanceIfStep2Checked > 0
                ? ` Checking Step 2 on both W-4s would cut this to about ${money(r.balanceIfStep2Checked, true)}.`
                : ` Checking Step 2 on both W-4s would turn this into a refund of about ${money(-r.balanceIfStep2Checked, true)}.`)}
        </p>
      )}
      {r.cause === "step2_one_job" && (
        <p className="mt-4 text-sm">
          <span className="font-semibold">Why:</span> Step 2 tells payroll there is a second job, so it withholds at higher rates than one income
          needs. With one job in the household, leave Step 2 unchecked.
        </p>
      )}
      {r.cause === "children_not_on_w4" && (
        <p className="mt-4 text-sm">
          <span className="font-semibold">Why:</span> your children aren&apos;t claimed in W-4 Step 3, so payroll withholds as if there were no{" "}
          <Term k="childTaxCredit">Child Tax Credit</Term>. It comes back as a refund, or claim it in Step 3 to get it in each paycheck instead.
        </p>
      )}

      {actions && (
      <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
        <ButtonLink href="/upload">Check your real pay stub</ButtonLink>
        <ButtonLink href="/demo/couple" variant="secondary">
          See a sample report
        </ButtonLink>
      </div>
      )}
    </div>
  );
}

export function QuickEstimate() {
  const id = useId();
  // Example values so the result shows right away. Deliberately not the sample household's salaries:
  // its report also counts 401(k) and health deductions from real stubs, so the numbers would differ.
  const [status, setStatus] = useState<QuickFilingStatus>("married_joint");
  const [salary, setSalary] = useState("85,000");
  const [spouseSalary, setSpouseSalary] = useState("65,000");
  const [children, setChildren] = useState(2);
  const [step2, setStep2] = useState(false);
  const [childrenOnW4, setChildrenOnW4] = useState(true);

  const married = status === "married_joint";
  const twoEarners = married && parseDollars(spouseSalary) > 0 && parseDollars(salary) > 0;
  const invalid = dollarProblem(salary) !== null || (married && dollarProblem(spouseSalary) !== null);
  const result = useMemo(
    () =>
      invalid ? null : quickEstimate({
        filingStatus: status,
        salary: parseDollars(salary),
        spouseSalary: married ? parseDollars(spouseSalary) : 0,
        childrenUnder17: children,
        step2Checked: step2,
        childrenOnW4: children > 0 && childrenOnW4,
      }),
    [invalid, status, salary, spouseSalary, married, children, step2, childrenOnW4],
  );

  return (
    <section id="quick-estimate" className="mt-10 scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Will you owe in April? Quick estimate</h2>
          <p className="mt-1 text-sm text-slate-600">Rough estimate from salary only. Your pay stubs make it exact.</p>
        </div>
        <p className="text-xs text-slate-500">Example values. Change them to yours.</p>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2" htmlFor={`${id}-status`}>
            <span className="mb-1 block font-medium text-slate-700">Filing status</span>
            <select id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value as QuickFilingStatus)} className={inputClass}>
              {STATUSES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className={`block text-sm ${married ? "" : "sm:col-span-2"}`} htmlFor={`${id}-salary`}>
            <span className="mb-1 block font-medium text-slate-700">Your annual salary</span>
            <DollarInput id={`${id}-salary`} value={salary} onChange={setSalary} placeholder="60,000" />
          </label>
          {married && (
            <label className="block text-sm" htmlFor={`${id}-spouse`}>
              <span className="mb-1 block font-medium text-slate-700">Spouse&apos;s annual salary</span>
              <DollarInput id={`${id}-spouse`} value={spouseSalary} onChange={setSpouseSalary} placeholder="0" />
              <span className="mt-1 block text-xs text-slate-500">0 if only one of you works</span>
            </label>
          )}
          <label className="block text-sm sm:col-span-2" htmlFor={`${id}-children`}>
            <span className="mb-1 block font-medium text-slate-700">Children under 17</span>
            <select id={`${id}-children`} value={children} onChange={(e) => setChildren(Number(e.target.value))} className={`${inputClass} sm:w-32`}>
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <YesNo
              label={
                <>
                  {married ? "Did either of you check the “multiple jobs / spouse works” box" : "Did you check the “multiple jobs” box"}{" "}
                  <span className="whitespace-nowrap">
                    (<Term k="w4Step2">Step 2</Term>)
                  </span>{" "}
                  on your <Term k="w4">W-4</Term>?
                </>
              }
              value={step2}
              onChange={setStep2}
            />
          </div>
          {children > 0 && (
            <div className="sm:col-span-2">
              <YesNo
                label={
                  <>
                    Are your children claimed on a W-4{" "}
                    <span className="whitespace-nowrap">
                      (<Term k="w4Step3">Step 3</Term>)?
                    </span>
                  </>
                }
                value={childrenOnW4}
                onChange={setChildrenOnW4}
              />
            </div>
          )}
        </div>

        {result ? (
          <EstimateResult r={result} twoEarnerWording={twoEarners} />
        ) : (
          <div className="flex items-center rounded-xl bg-slate-50 p-5 text-sm text-slate-600 ring-1 ring-slate-200">
            {invalid ? "Fix the amount above to see your estimate." : "Enter a salary to see your estimate."}
          </div>
        )}
      </div>

      <p className="mt-5 text-xs text-slate-500">
        Federal income tax only. Assumes biweekly pay, the <Term k="standardDeduction">standard deduction</Term>, no other income and a W-4 from 2020 or later. Nothing you type
        leaves this page. {DISCLAIMER}
      </p>
    </section>
  );
}
