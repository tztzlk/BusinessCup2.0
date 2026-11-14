"use client";

import { useState } from "react";
import { Button, Field, inputClass, Notice } from "./ui";
import type { HouseholdProfile } from "@/lib/types";

// Household profile form, shared by the first step of /check and "Edit profile" on /report.

export const DEFAULT_HOUSEHOLD_PROFILE: HouseholdProfile = {
  filingStatus: "married_joint",
  state: "TX",
  dependentsUnder17: 0,
  otherDependents: 0,
  flags: { mortgage: false, bankInterest: false, brokerage: false, hsa: false },
};

const US_STATES =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  );

const count = (v: string) => Math.max(0, Math.min(20, Number(v) || 0));

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
  const [p, setP] = useState<HouseholdProfile>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const flag = (k: keyof HouseholdProfile["flags"], text: string) => (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={p.flags[k]} onChange={(e) => setP({ ...p, flags: { ...p.flags, [k]: e.target.checked } })} />
      {text}
    </label>
  );

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await onSubmit(p);
        } catch (error) {
          setErr(error instanceof Error ? error.message : "Something went wrong.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Filing status" hint="How you file your federal tax return.">
        <select
          className={inputClass}
          value={p.filingStatus}
          onChange={(e) => setP({ ...p, filingStatus: e.target.value as HouseholdProfile["filingStatus"] })}
        >
          <option value="married_joint">Married filing jointly</option>
          <option value="single">Single</option>
          <option value="head_of_household">Head of household</option>
          <option value="married_separate">Married filing separately</option>
        </select>
      </Field>
      <Field label="State">
        <select className={inputClass} value={p.state} onChange={(e) => setP({ ...p, state: e.target.value })}>
          {US_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Children under 17" hint="For the Child Tax Credit.">
        <input
          type="number"
          min={0}
          max={20}
          className={inputClass}
          value={p.dependentsUnder17}
          onChange={(e) => setP({ ...p, dependentsUnder17: count(e.target.value) })}
        />
      </Field>
      <Field label="Other dependents" hint="Older children or relatives you support.">
        <input
          type="number"
          min={0}
          max={20}
          className={inputClass}
          value={p.otherDependents}
          onChange={(e) => setP({ ...p, otherDependents: count(e.target.value) })}
        />
      </Field>
      <div className="space-y-2 sm:col-span-2">
        <div>
          <p className="text-sm font-medium text-slate-700">Do you also have…</p>
          <p className="text-xs text-slate-500">So we know which tax forms to expect in January.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {flag("mortgage", "A mortgage")}
          {flag("bankInterest", "Bank interest (savings)")}
          {flag("brokerage", "A brokerage account")}
          {flag("hsa", "An HSA")}
        </div>
      </div>
      {err && (
        <div className="sm:col-span-2">
          <Notice tone="danger">{err}</Notice>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
