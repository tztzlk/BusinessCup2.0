"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formError, ProfileFormSchema, type ProfileFormValues } from "@/lib/formSchemas";
import { inputClass } from "../ui";
import { DEFAULT_HOUSEHOLD_PROFILE } from "../ProfileForm";
import { CircleCheckIcon, HeartHandshakeIcon, HeartPulseIcon, HouseIcon, KeyRoundIcon, LandmarkIcon, MapPinIcon, TrendingUpIcon, UserIcon, UsersIcon } from "lucide-react";
import { AnswerList, ChoiceCard, Counter, QuestionShell } from "./Wizard";
import type { HouseholdProfile } from "@/lib/types";

// The household part of /check, one question per screen, ending with "Check your answers".

const US_STATES =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  );

const FILING: Array<{ value: HouseholdProfile["filingStatus"]; title: string; description: string; icon: typeof HeartHandshakeIcon }> = [
  { value: "married_joint", title: "Married filing jointly", description: "One return for both of you. Most married couples file this way.", icon: HeartHandshakeIcon },
  { value: "single", title: "Single", description: "Not married, and no one depends on you financially.", icon: UserIcon },
  { value: "head_of_household", title: "Head of household", description: "Not married, and you pay most of the costs of a home for a child or relative.", icon: HouseIcon },
  { value: "married_separate", title: "Married filing separately", description: "Married, but each of you files your own return.", icon: UsersIcon },
];

const EXTRAS: Array<{ key: keyof HouseholdProfile["flags"]; title: string; description: string; icon: typeof LandmarkIcon }> = [
  { key: "mortgage", title: "A mortgage", description: "Your lender sends Form 1098.", icon: KeyRoundIcon },
  { key: "bankInterest", title: "Savings with interest", description: "Your bank sends Form 1099-INT.", icon: LandmarkIcon },
  { key: "brokerage", title: "A brokerage account", description: "Your broker sends Form 1099-B or 1099-DIV.", icon: TrendingUpIcon },
  { key: "hsa", title: "A health savings account (HSA)", description: "Your HSA provider sends Form 1099-SA and 5498-SA.", icon: HeartPulseIcon },
];

const QUESTIONS = ["filing", "dependents", "state", "extras", "review"] as const;
type Q = (typeof QUESTIONS)[number];

export function ProfileWizard({ onDone }: { onDone: (p: HouseholdProfile) => Promise<void> }) {
  // Answers live in React Hook Form; the API's zod schema checks them on save.
  const form = useForm<ProfileFormValues, unknown, ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema, { error: formError }),
    defaultValues: DEFAULT_HOUSEHOLD_PROFILE as ProfileFormValues,
  });
  const p = form.watch() as HouseholdProfile;
  const setP = (next: HouseholdProfile) =>
    (Object.keys(next) as Array<keyof ProfileFormValues>).forEach((k) => form.setValue(k, next[k] as never, { shouldDirty: true }));
  const [q, setQ] = useState<Q>("filing");
  // After "Change" on the review screen, Continue goes straight back to the review.
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
  const common = { section: "Your household", index: i + 1, total: QUESTIONS.length, onBack: back };
  const filing = FILING.find((f) => f.value === p.filingStatus)!;
  const extras = EXTRAS.filter((e) => p.flags[e.key]);

  if (q === "filing")
    return (
      <QuestionShell
        {...common}
        icon={HeartHandshakeIcon}
        question="How do you file your federal taxes?"
        hint="Pick the status from your last tax return. This sets your tax brackets."
        why="With two incomes on one joint return, each job withholds as if it were the only one. That is a common reason couples owe in April, so we check both jobs together."
        onContinue={next}
      >
        <fieldset className="grid gap-3">
          <legend className="sr-only">Filing status</legend>
          {FILING.map((f) => (
            <ChoiceCard
              key={f.value}
              name="filing"
              value={f.value}
              checked={p.filingStatus === f.value}
              onChange={() => setP({ ...p, filingStatus: f.value })}
              icon={f.icon}
              title={f.title}
              description={f.description}
            />
          ))}
        </fieldset>
      </QuestionShell>
    );

  if (q === "dependents")
    return (
      <QuestionShell
        {...common}
        icon={UsersIcon}
        question="Who else is on your return?"
        hint="Count the people you claim as dependents. Leave both at 0 if none."
        why="Each child under 17 can lower your tax through the Child Tax Credit, so it changes whether you owe or get a refund."
        onContinue={next}
      >
        <div className="grid gap-3">
          <Counter
            label="Children under 17"
            hint="Under 17 at the end of the year"
            value={p.dependentsUnder17}
            onChange={(v) => setP({ ...p, dependentsUnder17: v })}
          />
          <Counter
            label="Other dependents"
            hint="Older children, parents or relatives you support"
            value={p.otherDependents}
            onChange={(v) => setP({ ...p, otherDependents: v })}
          />
        </div>
      </QuestionShell>
    );

  if (q === "state")
    return (
      <QuestionShell
        {...common}
        icon={MapPinIcon}
        question="Which state do you live in?"
        hint="The state on your tax return."
        why="Our paycheck checks and April projection cover federal tax. Your state is shown on your report."
        onContinue={next}
      >
        <label className="block max-w-xs">
          <span className="text-sm font-medium text-slate-700">State</span>
          <select className={`${inputClass} mt-1 text-base`} value={p.state} onChange={(e) => setP({ ...p, state: e.target.value })}>
            {US_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </QuestionShell>
    );

  if (q === "extras")
    return (
      <QuestionShell
        {...common}
        icon={KeyRoundIcon}
        question="Do you also have any of these?"
        hint="Tick all that apply, or none."
        why="Each one sends you a tax form in January. We add them to your tax-season checklist so nothing is missing when you file."
        onContinue={next}
      >
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Other accounts</legend>
          {EXTRAS.map((e) => (
            <ChoiceCard
              key={e.key}
              type="checkbox"
              name={e.key}
              value={e.key}
              checked={p.flags[e.key]}
              onChange={(checked) => setP({ ...p, flags: { ...p.flags, [e.key]: checked } })}
              icon={e.icon}
              title={e.title}
              description={e.description}
            />
          ))}
        </fieldset>
      </QuestionShell>
    );

  return (
    <QuestionShell
      {...common}
      icon={CircleCheckIcon}
      question="Check your answers"
      hint="You can change any of these later from your report."
      continueLabel="Save and continue"
      busy={busy}
      error={err}
      onContinue={async () => {
        setBusy(true);
        setErr(null);
        try {
          await form.handleSubmit(
            (values) => onDone(values as HouseholdProfile),
            () => setErr("Check your answers: one of them isn't valid."),
          )();
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Something went wrong.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <AnswerList
        rows={[
          { label: "Filing status", value: filing.title, onChange: change("filing") },
          { label: "Children under 17", value: p.dependentsUnder17, onChange: change("dependents") },
          { label: "Other dependents", value: p.otherDependents, onChange: change("dependents") },
          { label: "State", value: p.state, onChange: change("state") },
          { label: "Also has", value: extras.map((e) => e.title).join(", ") || "None", onChange: change("extras") },
        ]}
      />
    </QuestionShell>
  );
}
