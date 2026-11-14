"use client";

import { useState } from "react";
import mock from "@/mocks/couple.json";
import { Button, ButtonLink, Card, Notice, SampleLabel, Section } from "@/components/ui";
import { ChecklistView, FindingCard, HouseholdSummary, ProjectionBanner, W4Card } from "@/components/report";
import { money } from "@/lib/format";
import type { ChecklistItem, ChecklistStatus, Finding, HouseholdData, Projection } from "@/lib/types";

const data = mock as unknown as { household: HouseholdData; report: { projection: Projection; findings: Finding[] } };

// Illustrative reconciliation rows for the January view. Labeled as sample in the UI;
// the real values come from lib/engine reconcileW2 once it is built.
const SAMPLE_RECON = [
  { employer: "Northwind Logistics (SAMPLE)", check: "Box 1 vs. pay stub YTD taxable wages", w2: 87210.4, stubs: 87210.4 },
  { employer: "Northwind Logistics (SAMPLE)", check: "Box 12 code D vs. pay stub 401(k) YTD", w2: 4384.56, stubs: 4384.56 },
  { employer: "Bluebonnet Health (SAMPLE)", check: "Box 1 vs. pay stub YTD taxable wages", w2: 78000, stubs: 78000 },
  { employer: "Bluebonnet Health (SAMPLE)", check: "Box 12 code D vs. pay stub 401(k) YTD", w2: 1560, stubs: 0 },
];

export function CoupleDemo() {
  const { household, report } = data;
  const [mode, setMode] = useState<"november" | "january">("november");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(household.checklist);
  const employerName = (id: string | null) => household.employers.find((e) => e.id === id)?.employerName;

  const markReceived = (id: string, status: ChecklistStatus) =>
    setChecklist((items) => items.map((i) => (i.id === id ? { ...i, status } : i)));

  return (
    <div>
      <div className="no-print">
        <SampleLabel />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alex &amp; Jordan</h1>
          <p className="text-slate-600">Married filing jointly · Texas · two salaried jobs</p>
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

      {mode === "november" ? (
        <>
          <div className="mt-6">
            <ProjectionBanner projection={report.projection} />
          </div>

          <Section title="What we found" subtitle="Each finding shows the dollars at stake and what to do.">
            <div className="grid gap-4">
              {report.findings.map((f) => (
                <FindingCard key={f.code} finding={f} employerName={employerName(f.employerId)} />
              ))}
            </div>
          </Section>

          <Section title="Fix it on your W-4" subtitle="Give each employer a new W-4 with this Step 4(c) amount.">
            <div className="grid gap-4 sm:grid-cols-2">
              {report.projection.perEmployer.map((p) => {
                const employer = household.employers.find((e) => e.id === p.employerId);
                return employer ? (
                  <W4Card
                    key={p.employerId}
                    employer={employer}
                    recommendedStep4c={p.recommendedStep4c}
                    remainingPayPeriods={p.remainingPayPeriods}
                  />
                ) : null;
              })}
            </div>
          </Section>

          <Section title="Household">
            <HouseholdSummary profile={household.profile} employers={household.employers} documents={household.documents} />
          </Section>
        </>
      ) : (
        <>
          <div className="print-only mb-4">
            <h2 className="text-xl font-bold">Accountant packet — Alex &amp; Jordan (sample, fictional)</h2>
            <p className="text-sm">Prepared with PayTrail. Estimates only. Not tax advice.</p>
          </div>

          <Section
            title="Tax documents to expect"
            subtitle="Built from your pay stubs and household profile."
            action={
              <Button type="button" variant="secondary" className="no-print" onClick={() => window.print()}>
                Download accountant packet
              </Button>
            }
          >
            <ChecklistView items={checklist} onStatusChange={markReceived} />
          </Section>

          <Section title="W-2 reconciliation" subtitle="Upload W-2s to reconcile them against your pay stubs.">
            <Notice tone="warning">Sample rows for illustration — fictional values.</Notice>
            <Card className="mt-3 overflow-x-auto p-0">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Check</th>
                    <th className="px-4 py-2 text-right font-medium">W-2</th>
                    <th className="px-4 py-2 text-right font-medium">Pay stubs</th>
                    <th className="px-4 py-2 text-right font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SAMPLE_RECON.map((r) => {
                    const diff = r.w2 - r.stubs;
                    return (
                      <tr key={r.employer + r.check}>
                        <td className="px-4 py-2">
                          <p className="font-medium text-slate-900">{r.check}</p>
                          <p className="text-xs text-slate-500">{r.employer}</p>
                        </td>
                        <td className="px-4 py-2 text-right font-mono">{money(r.w2)}</td>
                        <td className="px-4 py-2 text-right font-mono">{money(r.stubs)}</td>
                        <td className={`px-4 py-2 text-right font-medium ${diff === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {diff === 0 ? "Matches" : `Off by ${money(Math.abs(diff))}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
            <p className="mt-2 text-sm text-slate-600">
              A mismatch means asking the employer for a corrected W-2 (Form W-2c) before you file.
            </p>
          </Section>

          <Section title="April projection">
            <ProjectionBanner projection={report.projection} />
          </Section>
        </>
      )}

      <div className="no-print mt-10 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/check">Check my own pay stub</ButtonLink>
        <ButtonLink href="/demo" variant="secondary">
          Back to demo households
        </ButtonLink>
      </div>
    </div>
  );
}
