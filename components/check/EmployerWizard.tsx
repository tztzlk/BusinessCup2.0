"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Field, inputClass, Notice } from "../ui";
import { newEmployerSettings, type EmployerSettings } from "../EmployerForm";
import { IconBriefcase, IconCheckCircle, IconClock, IconDollar, IconFileText, IconPerson, IconPiggy, IconUsers } from "../Icons";
import { money } from "@/lib/format";
import { AnswerList, ChoiceCard, QuestionShell } from "./Wizard";
import type { EmploymentSettings } from "@/lib/types";

// The job part of /check, one topic per screen, ending with "Check your answers".

const QUESTIONS = ["job", "pay", "match", "w4", "review"] as const;
type Q = (typeof QUESTIONS)[number];
const DEFAULT_MATCH = { matchPercent: 50, upToPercentOfPay: 6 };

const num = (v: string) => (v === "" ? 0 : Number(v) || 0);

export function EmployerWizard({
  hasSelf,
  notMarried = false,
  onDone,
  onSkip,
}: {
  hasSelf: boolean;
  notMarried?: boolean;
  onDone: (s: EmployerSettings) => Promise<void>;
  /** Shown when the household already has a job: go straight to upload. */
  onSkip?: () => void;
}) {
  const [s, setS] = useState<EmployerSettings>(() => newEmployerSettings(hasSelf ? "spouse" : "self"));
  const [matchAnswer, setMatchAnswer] = useState<"yes" | "no" | "unsure" | null>(null);
  const hasMatch = matchAnswer === "yes";
  const [q, setQ] = useState<Q>("job");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const i = QUESTIONS.indexOf(q);
  const next = () => setQ(reviewing ? "review" : QUESTIONS[i + 1]);
  const back = i > 0 ? () => setQ(QUESTIONS[i - 1]) : undefined;
  const change = (target: Q) => () => {
    setReviewing(true);
    setQ(target);
  };
  const common = { section: "Your job", index: i + 1, total: QUESTIONS.length, onBack: back };
  const w4 = (k: keyof EmploymentSettings["w4"], v: number | boolean) => setS({ ...s, w4: { ...s.w4, [k]: v } });
  const match = s.match401k ?? DEFAULT_MATCH;
  const payOk = s.payType === "salary" ? (s.annualSalary ?? 0) > 0 : (s.hourlyRate ?? 0) > 0;
  const w4Changed =
    s.w4.step2Checked || s.w4.step3Credits > 0 || s.w4.step4aOtherIncome > 0 || s.w4.step4bDeductions > 0 || s.w4.step4cExtraWithholding > 0;

  if (q === "job")
    return (
      <QuestionShell
        {...common}
        icon={IconBriefcase}
        question="Whose job is this, and where?"
        hint="Add one job at a time. If you both work, you can add the second job right after."
        continueDisabled={s.employerName.trim() === ""}
        onContinue={next}
        extraAction={
          onSkip && (
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip — my jobs are already added
            </Button>
          )
        }
      >
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Whose job</legend>
          <ChoiceCard name="member" value="self" checked={s.member === "self"} onChange={() => setS({ ...s, member: "self" })} icon={IconPerson} title="Mine" />
          <ChoiceCard
            name="member"
            value="spouse"
            checked={s.member === "spouse"}
            onChange={() => setS({ ...s, member: "spouse" })}
            icon={IconUsers}
            title="My spouse's"
          />
        </fieldset>
        {s.member === "spouse" && notMarried && (
          <div className="mt-4">
            <Notice tone="warning">
              Your household is set to file as single or head of household, so a spouse&apos;s income won&apos;t be counted the
              way a joint return does. If you&apos;re married, change the filing status on your{" "}
              <Link href="/report" className="font-medium underline">
                report
              </Link>{" "}
              (Edit profile). If this is your own second job, choose &quot;Mine&quot;.
            </Notice>
          </div>
        )}
        <div className="mt-5 max-w-md">
          <Field label="Employer name" hint="As it appears at the top of the pay stub.">
            <input
              required
              maxLength={200}
              className={`${inputClass} text-base`}
              value={s.employerName}
              onChange={(e) => setS({ ...s, employerName: e.target.value })}
              placeholder="e.g. Acme Logistics LLC"
            />
          </Field>
        </div>
      </QuestionShell>
    );

  if (q === "pay")
    return (
      <QuestionShell
        {...common}
        icon={IconDollar}
        question="How are you paid at this job?"
        hint="Before taxes, as on your offer letter or pay stub."
        why="We use your pay to check each pay stub, like overtime paid at the regular rate, and to project your tax for the year."
        continueDisabled={!payOk}
        onContinue={next}
      >
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Pay type</legend>
          <ChoiceCard
            name="payType"
            value="salary"
            checked={s.payType === "salary"}
            onChange={() => setS({ ...s, payType: "salary" })}
            icon={IconBriefcase}
            title="Salary"
            description="A fixed amount per year"
          />
          <ChoiceCard
            name="payType"
            value="hourly"
            checked={s.payType === "hourly"}
            onChange={() => setS({ ...s, payType: "hourly", overtimeEligible: true })}
            icon={IconClock}
            title="Hourly"
            description="Paid for each hour you work"
          />
        </fieldset>
        <div className="mt-5 max-w-xs">
          {s.payType === "salary" ? (
            <Field label="Annual salary (USD)">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                className={`${inputClass} text-base`}
                value={s.annualSalary ?? ""}
                placeholder="65000"
                onChange={(e) => setS({ ...s, annualSalary: e.target.value === "" ? undefined : num(e.target.value) })}
              />
            </Field>
          ) : (
            <Field label="Hourly rate (USD)">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                className={`${inputClass} text-base`}
                value={s.hourlyRate ?? ""}
                placeholder="22.50"
                onChange={(e) => setS({ ...s, hourlyRate: e.target.value === "" ? undefined : num(e.target.value) })}
              />
            </Field>
          )}
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-brand-600"
            checked={s.overtimeEligible}
            onChange={(e) => setS({ ...s, overtimeEligible: e.target.checked })}
          />
          <span>
            <span className="block font-medium text-slate-900">I get paid overtime</span>
            <span className="block text-sm text-slate-600">
              1.5× pay after 40 hours a week. Most hourly jobs do; your offer letter may say &quot;non-exempt&quot;.
            </span>
          </span>
        </label>
      </QuestionShell>
    );

  if (q === "match")
    return (
      <QuestionShell
        {...common}
        icon={IconPiggy}
        question="Does this employer match your 401(k)?"
        hint="Many employers add money when you save for retirement. Check your benefits page if you're not sure."
        why="If you save less than the match, you leave free money on the table. We show exactly how much."
        continueDisabled={matchAnswer === null}
        onContinue={() => {
          setS({ ...s, match401k: hasMatch ? match : undefined });
          next();
        }}
      >
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="sr-only">401(k) match</legend>
          <ChoiceCard name="match" value="yes" checked={matchAnswer === "yes"} onChange={() => setMatchAnswer("yes")} title="Yes" description="They add to my 401(k)" />
          <ChoiceCard name="match" value="no" checked={matchAnswer === "no"} onChange={() => setMatchAnswer("no")} title="No" description="No match, or no 401(k)" />
          <ChoiceCard
            name="match"
            value="unsure"
            checked={matchAnswer === "unsure"}
            onChange={() => setMatchAnswer("unsure")}
            title="Not sure"
            description="Skip it — you can add it later"
          />
        </fieldset>
        {hasMatch && (
          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-600">
              Usually written like &quot;50% match up to 6% of pay&quot;: for every dollar you save, they add 50¢, on the first 6% of your pay.
            </p>
            <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
              <Field label="They match (%)">
                <input
                  type="number"
                  min={0}
                  max={200}
                  className={`${inputClass} text-base`}
                  value={match.matchPercent}
                  onChange={(e) => setS({ ...s, match401k: { ...match, matchPercent: num(e.target.value) } })}
                />
              </Field>
              <Field label="Up to (% of pay)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={`${inputClass} text-base`}
                  value={match.upToPercentOfPay}
                  onChange={(e) => setS({ ...s, match401k: { ...match, upToPercentOfPay: num(e.target.value) } })}
                />
              </Field>
            </div>
          </div>
        )}
      </QuestionShell>
    );

  if (q === "w4")
    return (
      <QuestionShell
        {...common}
        icon={IconFileText}
        question="What's on your W-4 at this job?"
        hint="The form you filled in for HR when you started. Optional — most people left these empty."
        why="We compare it with what your household really needs, then tell you the exact numbers to put on a new W-4."
        continueLabel={w4Changed ? "Continue" : "Continue — I left these empty"}
        onContinue={next}
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={s.w4.step2Checked} onChange={(e) => w4("step2Checked", e.target.checked)} />
          <span>
            <span className="block font-medium text-slate-900">Step 2 box is checked</span>
            <span className="block text-sm text-slate-600">&quot;Multiple jobs or spouse works&quot;</span>
          </span>
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Step 3 — credits ($ per year)">
            <input type="number" min={0} className={`${inputClass} text-base`} value={s.w4.step3Credits} onChange={(e) => w4("step3Credits", num(e.target.value))} />
          </Field>
          <Field label="Step 4(a) — other income ($ per year)">
            <input type="number" min={0} className={`${inputClass} text-base`} value={s.w4.step4aOtherIncome} onChange={(e) => w4("step4aOtherIncome", num(e.target.value))} />
          </Field>
          <Field label="Step 4(b) — deductions ($ per year)">
            <input type="number" min={0} className={`${inputClass} text-base`} value={s.w4.step4bDeductions} onChange={(e) => w4("step4bDeductions", num(e.target.value))} />
          </Field>
          <Field label="Step 4(c) — extra withholding ($ per paycheck)">
            <input
              type="number"
              min={0}
              className={`${inputClass} text-base`}
              value={s.w4.step4cExtraWithholding}
              onChange={(e) => w4("step4cExtraWithholding", num(e.target.value))}
            />
          </Field>
        </div>
      </QuestionShell>
    );

  const pay = s.payType === "salary" ? `${money(s.annualSalary ?? null, true)} a year` : `${money(s.hourlyRate ?? null)} an hour`;
  return (
    <QuestionShell
      {...common}
      icon={IconCheckCircle}
      question="Check your answers"
      hint="You can edit this job later from your report."
      continueLabel="Save job and continue"
      busy={busy}
      error={err}
      onContinue={async () => {
        setBusy(true);
        setErr(null);
        try {
          await onDone({
            ...s,
            employerName: s.employerName.trim(),
            annualSalary: s.payType === "salary" ? s.annualSalary : undefined,
            hourlyRate: s.payType === "hourly" ? s.hourlyRate : undefined,
          });
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Something went wrong.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <AnswerList
        rows={[
          { label: "Whose job", value: s.member === "self" ? "Mine" : "My spouse's", onChange: change("job") },
          { label: "Employer", value: s.employerName, onChange: change("job") },
          { label: "Pay", value: `${pay}${s.overtimeEligible ? " · overtime" : ""}`, onChange: change("pay") },
          {
            label: "401(k) match",
            value: s.match401k ? `${s.match401k.matchPercent}% up to ${s.match401k.upToPercentOfPay}% of pay` : "None",
            onChange: change("match"),
          },
          { label: "W-4", value: w4Changed ? "Filled in" : "Left empty", onChange: change("w4") },
        ]}
      />
    </QuestionShell>
  );
}
