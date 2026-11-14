"use client";

import { useMemo } from "react";
import { ButtonLink, DemoBadge, Section } from "./ui";
import { HouseholdSummary } from "./report";
import { CheckupView } from "./CheckupView";
import { DEMO_NOVEMBER_AS_OF } from "@/lib/demo";
import type { HouseholdData } from "@/lib/types";

// A one-month demo household (personas 2 and 3): the November checkup only, no tax-season tab.

export function PersonaDemo({
  household,
  name,
  subtitle,
  story,
}: {
  household: HouseholdData;
  name: string;
  subtitle: string;
  /** What to look for, shown above the checkup. */
  story: string;
}) {
  const data = useMemo(() => structuredClone(household), [household]);
  return (
    <div>
      <DemoBadge />
      <h1 className="text-2xl font-semibold text-slate-900">{name}</h1>
      <p className="text-slate-600">{subtitle}</p>
      <p className="mt-3 max-w-2xl rounded-lg bg-white/70 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">{story}</p>

      <CheckupView data={data} asOf={DEMO_NOVEMBER_AS_OF} mode="november" packetTitle={`Accountant packet — ${name} (sample, fictional)`} />

      <Section title="Household">
        <HouseholdSummary profile={data.profile} employers={data.employers} documents={data.documents} />
      </Section>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/upload">Check my own pay stub</ButtonLink>
        <ButtonLink href="/demo" variant="secondary">
          Back to demo households
        </ButtonLink>
      </div>
    </div>
  );
}
