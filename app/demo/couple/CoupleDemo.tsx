"use client";

import { useMemo, useState } from "react";
import { ButtonLink, SampleLabel, Section } from "@/components/ui";
import { HouseholdSummary } from "@/components/report";
import { CheckupView } from "@/components/CheckupView";
import { coupleJanuary, coupleNovember, DEMO_JANUARY_AS_OF, DEMO_NOVEMBER_AS_OF } from "@/lib/demo";
import type { ChecklistItem, ChecklistStatus } from "@/lib/types";

export function CoupleDemo({ initialMode = "november" }: { initialMode?: "november" | "january" }) {
  const [mode, setMode] = useState<"november" | "january">(initialMode);
  const november = useMemo(() => coupleNovember(), []);
  const januaryBase = useMemo(() => coupleJanuary(), []);
  const [manual, setManual] = useState<ChecklistItem[]>([]);

  const january = useMemo(
    () => ({ ...januaryBase, checklist: [...januaryBase.checklist, ...manual] }),
    [januaryBase, manual],
  );
  const data = mode === "november" ? november : january;

  const markReceived = (item: ChecklistItem, status: ChecklistStatus) =>
    setManual((items) => [...items.filter((i) => i.formType !== item.formType), { ...item, status }]);

  return (
    <div>
      <div className="no-print">
        <SampleLabel />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alex &amp; Jordan</h1>
          <p className="text-slate-600">Married filing jointly · Texas · two salaried jobs · one child</p>
        </div>
        <div className="no-print inline-flex rounded-lg border border-slate-300 bg-white p-1 text-sm" role="tablist">
          {(["november", "january"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-md px-4 py-1.5 font-medium ${mode === m ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >
              {m === "november" ? "November: checkup" : "January: tax season"}
            </button>
          ))}
        </div>
      </div>

      <CheckupView
        data={data}
        asOf={mode === "november" ? DEMO_NOVEMBER_AS_OF : DEMO_JANUARY_AS_OF}
        mode={mode}
        onChecklistStatus={markReceived}
        packetTitle="Accountant packet — Alex & Jordan (sample, fictional)"
      />

      <Section title="Household">
        <HouseholdSummary profile={data.profile} employers={data.employers} documents={data.documents} />
      </Section>

      <div className="no-print mt-10 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/check">Check my own pay stub</ButtonLink>
        <ButtonLink href="/demo" variant="secondary">
          Back to demo households
        </ButtonLink>
      </div>
    </div>
  );
}
