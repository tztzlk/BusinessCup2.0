"use client";

import { useMemo, useState } from "react";
import { inputRow } from "@/lib/findingCopy";
import { useExplanations } from "./useExplanations";
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

  // W-2 rows come from uploaded W-2s (one per employer), so they keep the engine key; other forms map to
  // the stored checklist row so status changes can be saved.
  const checklistItems: ChecklistItem[] = result.checklist.map((c) => ({
    id: c.formType === "W-2" ? c.key : (data.checklist.find((x) => x.formType === c.formType)?.id ?? c.key),
    formType: c.formType,
    source: c.source,
    status: c.status,
    dueDate: c.dueDate,
  }));

  const [showAllBoxes, setShowAllBoxes] = useState(false);
  const recRows = result.reconciliation.flatMap((rec) =>
    rec.rows
      .filter((r) => r.w2 !== 0 || r.expected !== 0)
      .map((r) => ({ ...r, employerId: rec.employerId, employerName: rec.employerName })),
  );
  const recMismatches = recRows.filter((r) => !r.matches).length;

  const findings = useMemo(
    () => (mode === "january" ? result.findings : result.findings.filter((f) => !f.code.startsWith("W2_"))),
    [mode, result],
  );
  const explained = useExplanations(findings, result.projection);

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
            {recRows.length === 0 ? (
              <p className="text-sm text-slate-500">Upload your W-2s to reconcile them against your pay stubs.</p>
            ) : (
              <>
                <p className="mb-3 text-sm font-medium text-slate-700">
                  {recMismatches === 0
                    ? `All ${recRows.length} boxes match your pay stubs.`
                    : `${recMismatches} of ${recRows.length} boxes ${recMismatches === 1 ? "doesn't" : "don't"} match your pay stubs.`}
                </p>
                <Card className="p-0">
                  <ul className="divide-y divide-slate-100 text-sm">
                    {recRows.map((r) => (
                      <li
                        key={`${r.employerId}-${r.box}`}
                        className={`grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[1fr_8rem_8rem_9rem] sm:items-center ${
                          r.matches && !showAllBoxes ? "hidden print:grid" : ""
                        } ${r.matches ? "" : "bg-rose-50/60"}`}
                      >
                        <div className="col-span-2 sm:col-span-1">
                          <p className="font-medium text-slate-900">
                            Box {r.box} · {r.label}
                          </p>
                          <p className="text-xs text-slate-500">{r.employerName}</p>
                        </div>
                        <p className="sm:text-right">
                          <span className="text-xs text-slate-500 sm:hidden">W-2 </span>
                          <span className="font-mono">{money(r.w2)}</span>
                        </p>
                        <p className="text-right">
                          <span className="text-xs text-slate-500 sm:hidden">Pay stubs </span>
                          <span className="font-mono">{money(r.expected)}</span>
                        </p>
                        <p className={`col-span-2 font-medium sm:col-span-1 sm:text-right ${r.matches ? "text-emerald-700" : "text-rose-700"}`}>
                          {r.matches ? "Matches" : `Off by ${money(Math.abs(r.w2 - r.expected))}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
                {recMismatches < recRows.length && (
                  <button
                    type="button"
                    onClick={() => setShowAllBoxes((v) => !v)}
                    className="no-print mt-3 text-sm font-medium text-indigo-700 hover:underline"
                    aria-expanded={showAllBoxes}
                  >
                    {showAllBoxes ? "Hide matching boxes" : `Show all ${recRows.length} boxes`}
                  </button>
                )}
              </>
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
            {explained.summary && <p className="text-sm font-medium text-slate-800">{explained.summary}</p>}
            {findings.map((f, i) => (
              <FindingCard
                key={`${f.code}-${f.employerId}-${i}`}
                finding={f}
                employerName={employerName(f.employerId)}
                explanation={explained.bodies.get(i)}
                explaining={explained.status === "loading"}
              />
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
            {Object.entries(result.projection.inputs).map(([k, v]) => {
              const row = inputRow(k, v);
              return (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{row.label}</dt>
                  <dd className="text-right font-mono text-slate-800">{row.value}</dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-2">
            Federal income tax only. Uses IRS Pub. 15-T (2026), Rev. Proc. 2025-32 and the standard deduction. State tax not included.
          </p>
        </details>
      )}
    </div>
  );
}
