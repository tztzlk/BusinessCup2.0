"use client";

import { useMemo } from "react";
import { runCheckup } from "@/lib/engine";
import { Button, Card, Notice, Section } from "./ui";
import { ChecklistView, FindingCard, ProjectionBanner, W4Card } from "./report";
import { money } from "@/lib/format";
import type { ChecklistItem, ChecklistStatus, HouseholdData } from "@/lib/types";

// Renders the engine's output for a household. Used by the demo and by /report.
// All numbers come from lib/engine (deterministic, tested); nothing here is computed by an LLM.

export function CheckupView({
  data,
  asOf,
  mode,
  onChecklistStatus,
  packetTitle,
}: {
  data: HouseholdData;
  asOf: string;
  mode: "november" | "january";
  onChecklistStatus?: (item: ChecklistItem, status: ChecklistStatus) => void;
  packetTitle: string;
}) {
  const result = useMemo(() => runCheckup(data, asOf), [data, asOf]);
  const employerName = (id: string | null) => data.employers.find((e) => e.id === id)?.employerName;

  const checklistItems: ChecklistItem[] = result.checklist.map((c) => ({
    id: data.checklist.find((x) => x.formType === c.formType)?.id ?? c.key,
    formType: c.formType,
    source: c.source,
    status: c.status,
    dueDate: c.dueDate,
  }));

  const findings = mode === "january" ? result.findings : result.findings.filter((f) => !f.code.startsWith("W2_"));

  return (
    <div>
      {result.notes.length > 0 && (
        <div className="mt-6 space-y-2">
          {result.notes.map((n) => (
            <Notice key={n} tone="info">
              {n}
            </Notice>
          ))}
        </div>
      )}

      {mode === "january" && (
        <>
          <div className="print-only mb-4">
            <h2 className="text-xl font-bold">{packetTitle}</h2>
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
            <ChecklistView
              items={checklistItems}
              onStatusChange={
                onChecklistStatus
                  ? (id, status) => {
                      const item = checklistItems.find((i) => i.id === id);
                      if (item) onChecklistStatus(item, status);
                    }
                  : undefined
              }
            />
          </Section>

          <Section title="W-2 reconciliation" subtitle="Each W-2 box compared with your last pay stub of the year.">
            {result.reconciliation.length === 0 ? (
              <p className="text-sm text-slate-500">Upload your W-2s to reconcile them against your pay stubs.</p>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Box</th>
                      <th className="px-4 py-2 text-right font-medium">W-2</th>
                      <th className="px-4 py-2 text-right font-medium">Pay stubs</th>
                      <th className="px-4 py-2 text-right font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.reconciliation.flatMap((rec) =>
                      rec.rows
                        .filter((r) => r.w2 !== 0 || r.expected !== 0)
                        .map((r) => (
                          <tr key={`${rec.employerId}-${r.box}`}>
                            <td className="px-4 py-2">
                              <p className="font-medium text-slate-900">
                                Box {r.box} · {r.label}
                              </p>
                              <p className="text-xs text-slate-500">{rec.employerName}</p>
                            </td>
                            <td className="px-4 py-2 text-right font-mono">{money(r.w2)}</td>
                            <td className="px-4 py-2 text-right font-mono">{money(r.expected)}</td>
                            <td className={`px-4 py-2 text-right font-medium ${r.matches ? "text-emerald-700" : "text-rose-700"}`}>
                              {r.matches ? "Matches" : `Off by ${money(Math.abs(r.w2 - r.expected))}`}
                            </td>
                          </tr>
                        )),
                    )}
                  </tbody>
                </table>
              </Card>
            )}
          </Section>
        </>
      )}

      {result.projection && (
        <div className="mt-6">
          <ProjectionBanner projection={result.projection} />
        </div>
      )}

      <Section title="What we found" subtitle="Each finding shows the dollars at stake and what to do.">
        {findings.length === 0 ? (
          <p className="text-sm text-slate-500">No issues found on your pay stubs.</p>
        ) : (
          <div className="grid gap-4">
            {findings.map((f, i) => (
              <FindingCard key={`${f.code}-${f.employerId}-${i}`} finding={f} employerName={employerName(f.employerId)} />
            ))}
          </div>
        )}
      </Section>

      {mode === "november" && result.projection && result.projection.balance > 0 && (
        <Section title="Fix it on your W-4" subtitle="Give each employer a new W-4 with this Step 4(c) amount.">
          <div className="grid gap-4 sm:grid-cols-2">
            {result.projection.perEmployer.map((p) => {
              const employer = data.employers.find((e) => e.id === p.employerId);
              return employer ? (
                <W4Card key={p.employerId} employer={employer} recommendedStep4c={p.recommendedStep4c} remainingPayPeriods={p.remainingPayPeriods} />
              ) : null;
            })}
          </div>
        </Section>
      )}

      {result.projection && (
        <details className="no-print mt-6 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">How we calculated the {result.taxYear} projection</summary>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
            {Object.entries(result.projection.inputs).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-mono text-slate-800">{money(v)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2">
            Federal income tax only. Uses IRS Pub. 15-T (2026), Rev. Proc. 2025-32 and the standard deduction. State tax not included.
          </p>
        </details>
      )}
    </div>
  );
}
