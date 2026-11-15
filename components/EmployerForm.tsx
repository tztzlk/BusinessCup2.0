"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Field, Input, Select, describedBy } from "./ui";
import {
  EmployerFormSchema,
  employerFormValues,
  employerSettingsFrom,
  formError,
  optionalNumber,
  requiredNumber,
  type EmployerFormValues,
} from "@/lib/formSchemas";
import type { EmploymentSettings } from "@/lib/types";

// Job settings form (React Hook Form + the API's zod schema), used to add and edit jobs on /settings.

export type EmployerSettings = Omit<EmploymentSettings, "id">;

export function newEmployerSettings(member: EmploymentSettings["member"]): EmployerSettings {
  return {
    member,
    employerName: "",
    payType: "salary",
    annualSalary: undefined,
    hourlyRate: undefined,
    overtimeEligible: false,
    match401k: { matchPercent: 50, upToPercentOfPay: 6 },
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
  const [err, setErr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployerFormValues, unknown, EmployerFormValues>({ resolver: zodResolver(EmployerFormSchema, { error: formError }), defaultValues: employerFormValues(initial) });
  const member = watch("member");
  const payType = watch("payType");
  const hasMatch = watch("hasMatch");

  const submit = handleSubmit(async (values) => {
    setErr(null);
    try {
      await onSubmit(employerSettingsFrom(values));
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Something went wrong.");
    }
  });

  const money = (name: "w4.step3Credits" | "w4.step4aOtherIncome" | "w4.step4bDeductions" | "w4.step4cExtraWithholding", label: string) => {
    const id = `ef-${name.replace(".", "-")}`;
    const error = name.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], errors) as { message?: string } | undefined;
    return (
      <Field label={label} htmlFor={id} error={error?.message}>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          invalid={!!error}
          aria-describedby={describedBy(id, { error: !!error })}
          {...register(name, { setValueAs: requiredNumber })}
        />
      </Field>
    );
  };

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
      <Field label="Whose job" htmlFor="ef-member">
        <Select id="ef-member" {...register("member")}>
          <option value="self">Mine</option>
          <option value="spouse">My spouse&apos;s</option>
        </Select>
      </Field>
      {member === "spouse" && notMarried && (
        <div className="sm:col-span-2">
          <Alert tone="warning">
            Your household is set to file as single or head of household, so the forecast won&apos;t count a spouse&apos;s income the way a
            joint return does. If you&apos;re married, change the filing status in{" "}
            <Link href="/settings#profile" className="font-medium underline">
              Settings
            </Link>
            . If this is your own second job, choose &quot;Mine&quot;.
          </Alert>
        </div>
      )}
      <Field label="Employer name" htmlFor="ef-name" error={errors.employerName?.message}>
        <Input
          id="ef-name"
          maxLength={200}
          invalid={!!errors.employerName}
          aria-describedby={describedBy("ef-name", { error: !!errors.employerName })}
          {...register("employerName")}
        />
      </Field>
      <Field label="Pay type" htmlFor="ef-paytype">
        <Select id="ef-paytype" {...register("payType")}>
          <option value="salary">Salary</option>
          <option value="hourly">Hourly</option>
        </Select>
      </Field>
      {payType === "salary" ? (
        <Field label="Annual salary (USD)" htmlFor="ef-salary" error={errors.annualSalary?.message}>
          <Input
            id="ef-salary"
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            invalid={!!errors.annualSalary}
            aria-describedby={describedBy("ef-salary", { error: !!errors.annualSalary })}
            {...register("annualSalary", { setValueAs: optionalNumber })}
          />
        </Field>
      ) : (
        <Field label="Hourly rate (USD)" htmlFor="ef-rate" error={errors.hourlyRate?.message}>
          <Input
            id="ef-rate"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            invalid={!!errors.hourlyRate}
            aria-describedby={describedBy("ef-rate", { error: !!errors.hourlyRate })}
            {...register("hourlyRate", { setValueAs: optionalNumber })}
          />
        </Field>
      )}
      <label className="flex items-center gap-2 text-sm text-fg-secondary sm:col-span-2">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" {...register("overtimeEligible")} />
        Eligible for overtime pay (non-exempt)
      </label>

      <fieldset className="rounded-control border border-border p-4 sm:col-span-2">
        <legend className="sr-only">401(k) match</legend>
        <label className="flex items-center gap-2 text-sm font-medium text-fg-primary">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" {...register("hasMatch")} />
          Employer matches 401(k) contributions
        </label>
        {hasMatch && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Matches (%)" hint="e.g. 50 = 50 cents per dollar" htmlFor="ef-match" error={errors.match401k?.matchPercent?.message}>
              <Input
                id="ef-match"
                type="number"
                inputMode="decimal"
                min={0}
                max={200}
                invalid={!!errors.match401k?.matchPercent}
                aria-describedby={describedBy("ef-match", { hint: true, error: !!errors.match401k?.matchPercent })}
                {...register("match401k.matchPercent", { setValueAs: requiredNumber })}
              />
            </Field>
            <Field label="Up to (% of pay)" htmlFor="ef-upto" error={errors.match401k?.upToPercentOfPay?.message}>
              <Input
                id="ef-upto"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                invalid={!!errors.match401k?.upToPercentOfPay}
                aria-describedby={describedBy("ef-upto", { error: !!errors.match401k?.upToPercentOfPay })}
                {...register("match401k.upToPercentOfPay", { setValueAs: requiredNumber })}
              />
            </Field>
          </div>
        )}
      </fieldset>

      <fieldset className="rounded-control border border-border p-4 sm:col-span-2">
        <legend className="px-1 text-sm font-medium text-fg-primary">Current W-4 at this job</legend>
        <p className="text-[13px] text-fg-muted">
          From the W-4 you gave HR, or your payroll portal. Not sure? Leave the zeros — most people never fill these in.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm text-fg-secondary">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" {...register("w4.step2Checked")} />
          Step 2 checkbox is checked (multiple jobs / spouse works)
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {money("w4.step3Credits", "Step 3 credits ($/yr)")}
          {money("w4.step4aOtherIncome", "Step 4(a) other income ($/yr)")}
          {money("w4.step4bDeductions", "Step 4(b) deductions ($/yr)")}
          {money("w4.step4cExtraWithholding", "Step 4(c) extra ($/paycheck)")}
        </div>
      </fieldset>

      {err && (
        <div className="sm:col-span-2">
          <Alert tone="danger">{err}</Alert>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
