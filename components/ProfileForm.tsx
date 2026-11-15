"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Field, Input, Select, describedBy } from "./ui";
import { formError, ProfileFormSchema, requiredNumber, type ProfileFormValues } from "@/lib/formSchemas";
import type { HouseholdProfile } from "@/lib/types";

// Household profile form (React Hook Form + the API's zod schema), used on /settings.

export const DEFAULT_HOUSEHOLD_PROFILE: HouseholdProfile = {
  filingStatus: "married_joint",
  state: "TX",
  dependentsUnder17: 0,
  otherDependents: 0,
  flags: { mortgage: false, bankInterest: false, brokerage: false, hsa: false },
};

export const US_STATES =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  );

export const FILING_LABEL: Record<HouseholdProfile["filingStatus"], string> = {
  married_joint: "Married filing jointly",
  single: "Single",
  head_of_household: "Head of household",
  married_separate: "Married filing separately",
};

const FLAGS: Array<[keyof HouseholdProfile["flags"], string]> = [
  ["mortgage", "A mortgage"],
  ["bankInterest", "Bank interest (savings)"],
  ["brokerage", "A brokerage account"],
  ["hsa", "An HSA"],
];

export function ProfileForm({
  initial = DEFAULT_HOUSEHOLD_PROFILE,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: HouseholdProfile;
  submitLabel: string;
  onSubmit: (p: HouseholdProfile) => Promise<void>;
  onCancel?: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues, unknown, ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema, { error: formError }),
    defaultValues: initial as ProfileFormValues,
  });

  const submit = handleSubmit(async (values) => {
    setErr(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Something went wrong.");
    }
  });

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
      <Field label="Filing status" hint="How you file your federal tax return." htmlFor="pf-filing" error={errors.filingStatus?.message}>
        <Select id="pf-filing" aria-describedby={describedBy("pf-filing", { hint: true, error: !!errors.filingStatus })} {...register("filingStatus")}>
          {Object.entries(FILING_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="State" htmlFor="pf-state" error={errors.state?.message}>
        <Select id="pf-state" invalid={!!errors.state} aria-describedby={describedBy("pf-state", { error: !!errors.state })} {...register("state")}>
          {US_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Field label="Children under 17" hint="For the Child Tax Credit." htmlFor="pf-kids" error={errors.dependentsUnder17?.message}>
        <Input
          id="pf-kids"
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          invalid={!!errors.dependentsUnder17}
          aria-describedby={describedBy("pf-kids", { hint: true, error: !!errors.dependentsUnder17 })}
          {...register("dependentsUnder17", { setValueAs: requiredNumber })}
        />
      </Field>
      <Field label="Other dependents" hint="Older children or relatives you support." htmlFor="pf-other" error={errors.otherDependents?.message}>
        <Input
          id="pf-other"
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          invalid={!!errors.otherDependents}
          aria-describedby={describedBy("pf-other", { hint: true, error: !!errors.otherDependents })}
          {...register("otherDependents", { setValueAs: requiredNumber })}
        />
      </Field>
      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="text-sm font-medium text-fg-primary">Do you also have…</legend>
        <p className="text-[13px] text-fg-muted">So we know which tax forms to expect in January.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {FLAGS.map(([k, text]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-fg-secondary">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" {...register(`flags.${k}`)} />
              {text}
            </label>
          ))}
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
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
