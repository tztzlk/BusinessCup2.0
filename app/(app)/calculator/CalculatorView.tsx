"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalculatorIcon, MinusIcon, PlusIcon } from "lucide-react";
import { EstimateResult } from "@/components/QuickEstimate";
import { Alert, Button, Card, CardHeader, Field, Input, PageHeader, Select, describedBy } from "@/components/ui";
import { quickEstimate, type QuickEstimateResult } from "@/lib/engine/quickEstimate";
import { CalculatorSchema, formError, requiredNumber, type CalculatorValues } from "@/lib/formSchemas";

// A quick federal estimate from salaries only. Everything is calculated by lib/engine/quickEstimate.ts
// (Pub. 15-T withholding, 2026 brackets, Child Tax Credit); nothing is saved or sent anywhere.

const DEFAULTS: CalculatorValues = {
  filingStatus: "married_joint",
  salary: 0,
  spouseSalary: 0,
  childrenUnder17: 0,
  otherIncome: 0,
  extraWithholdingPerPaycheck: 0,
  step2Checked: false,
  childrenOnW4: false,
};

export function CalculatorView() {
  const [result, setResult] = useState<{ r: QuickEstimateResult; twoEarners: boolean } | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CalculatorValues, unknown, CalculatorValues>({ resolver: zodResolver(CalculatorSchema, { error: formError }), defaultValues: DEFAULTS });
  const status = watch("filingStatus");
  const married = status === "married_joint";

  const submit = handleSubmit((v) => {
    const r = quickEstimate({ ...v, spouseSalary: married ? v.spouseSalary : 0 });
    setResult(r ? { r, twoEarners: r.earners > 1 } : null);
  });

  const money = (name: "salary" | "spouseSalary" | "otherIncome" | "extraWithholdingPerPaycheck", label: string, hint?: string) => {
    const id = `calc-${name}`;
    const error = errors[name]?.message;
    return (
      <Field label={label} hint={hint} htmlFor={id} error={error}>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fg-muted">
            $
          </span>
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            min={0}
            className="pl-7 tabular-nums"
            invalid={!!error}
            aria-describedby={describedBy(id, { hint: !!hint, error: !!error })}
            {...register(name, { setValueAs: requiredNumber })}
          />
        </div>
      </Field>
    );
  };

  const children = watch("childrenUnder17");
  const step = (d: number) => setValue("childrenUnder17", Math.max(0, Math.min(20, (Number(getValues("childrenUnder17")) || 0) + d)), { shouldValidate: true });

  return (
    <div>
      <PageHeader title="Tax calculator" subtitle="A quick estimate of your federal refund or balance due in April, from salaries only." />
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader icon={<CalculatorIcon className="h-5 w-5" />} title="Your household" subtitle="Nothing here is saved or sent anywhere." />
          <form className="mt-5 grid gap-4" onSubmit={submit} noValidate>
            <Field label="Filing status" htmlFor="calc-status">
              <Select id="calc-status" {...register("filingStatus")}>
                <option value="married_joint">Married filing jointly</option>
                <option value="single">Single</option>
                <option value="head_of_household">Head of household</option>
              </Select>
            </Field>
            <div className={married ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
              {money("salary", married ? "Your annual salary" : "Annual salary", "Before taxes")}
              {married && money("spouseSalary", "Spouse's annual salary", "0 if they don't work")}
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-fg-primary">Children under 17</legend>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" aria-label="One child fewer" onClick={() => step(-1)} disabled={!children} icon={<MinusIcon aria-hidden="true" className="h-4 w-4" />} />
                <label htmlFor="calc-children" className="sr-only">
                  Children under 17
                </label>
                <Input
                  id="calc-children"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={20}
                  className="w-20 text-center tabular-nums"
                  invalid={!!errors.childrenUnder17}
                  aria-describedby={describedBy("calc-children", { error: !!errors.childrenUnder17 })}
                  {...register("childrenUnder17", { setValueAs: requiredNumber })}
                />
                <Button variant="secondary" size="sm" aria-label="One more child" onClick={() => step(1)} icon={<PlusIcon aria-hidden="true" className="h-4 w-4" />} />
              </div>
              {errors.childrenUnder17 && (
                <span id="calc-children-error" className="mt-1 block text-[13px] font-medium text-danger">
                  {errors.childrenUnder17.message}
                </span>
              )}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              {money("otherIncome", "Additional income ($ a year)", "With nothing withheld, e.g. interest or side work")}
              {money("extraWithholdingPerPaycheck", "Additional withholding ($ per paycheck)", "W-4 Step 4(c), if you already have one")}
            </div>

            <fieldset className="space-y-2 rounded-control border border-border p-4">
              <legend className="px-1 text-sm font-medium text-fg-primary">Your W-4 today</legend>
              <label className="flex items-start gap-2 text-sm text-fg-secondary">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" {...register("step2Checked")} />
                Step 2 (&quot;multiple jobs or spouse works&quot;) is checked
              </label>
              <label className="flex items-start gap-2 text-sm text-fg-secondary">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" {...register("childrenOnW4")} />
                Children are claimed in Step 3
              </label>
            </fieldset>

            <Button type="submit" loading={isSubmitting} fullWidth>
              {result ? "Recalculate" : "Calculate"}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          {result ? (
            <EstimateResult r={result.r} twoEarnerWording={result.twoEarners} actions={false} />
          ) : (
            <Card>
              <p className="text-sm text-fg-secondary">Enter your salary and press Calculate to see whether you&apos;re on track for April.</p>
            </Card>
          )}
          <Alert tone="info" title="Estimate based on salaries only">
            It assumes a full year of paychecks every two weeks and the standard deduction. Your real pay stubs give exact numbers, including
            overtime, 401(k) and what was withheld so far.{" "}
            <Link href="/upload" className="font-medium underline">
              Check a pay stub
            </Link>
          </Alert>
        </div>
      </div>
    </div>
  );
}
