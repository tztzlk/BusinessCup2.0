"use client";

import { useMemo, useState } from "react";
import { AlertTriangleIcon, CalendarClockIcon, CircleCheckIcon, PiggyBankIcon, PrinterIcon, WrenchIcon } from "lucide-react";
import { Alert, Button, Card, Section, StatCard, TabPanel, Tabs } from "./ui";
import { ChecklistView, ChecksSummary, FindingCard, PaycheckHistoryTable, ProjectionBanner, type W4Advice } from "./report";
import { Paywall } from "./Paywall";
import { RemindersCard } from "./RemindersCard";
import { useExplanations } from "./useExplanations";
import { runCheckup, type CheckupResult } from "@/lib/engine";
import { householdOverview } from "@/lib/engine/overview";
import { inputRow } from "@/lib/findingCopy";
import { money, shortDate } from "@/lib/format";
import { nextCheck } from "@/lib/calendar";
import { paycheckHistoryRows } from "@/lib/paycheckHistory";
import type { ChecklistItem, ChecklistStatus, HouseholdData } from "@/lib/types";

// The checkup report: summary cards and Overview / Details / History / Tax season tabs.
// Used by /report and by the demo households. Numbers come from lib/engine only.

/**
 * The January checklist from the engine (expectedDocs). W-2 rows come from uploaded W-2s (one per
 * employer), so they keep the engine key; other forms map to the stored checklist row so status
 * changes can be saved.
 */
export function checklistItemsFor(data: HouseholdData, result: CheckupResult): ChecklistItem[] {
  return result.checklist.map((c) => ({
    id: c.formType === "W-2" ? c.key : (data.checklist.find((x) => x.formType === c.formType)?.id ?? c.key),
    formType: c.formType,
    source: c.source,
    status: c.status,
    dueDate: c.dueDate,
  }));
}

export type ReportTab = "overview" | "details" | "history" | "tax_season";

export function ReportBody({
  data,
  asOf,
  packetTitle,
  locked = false,
  onChecklistStatus,
  initialTab = "overview",
  idBase = "report",
}: {
  data: HouseholdData;
  asOf: string;
  packetTitle: string;
  /** Free plan: the exact W-4 fix, tax season and reminders are shown as an Annual paywall. */
  locked?: boolean;
  onChecklistStatus?: (item: ChecklistItem, status: ChecklistStatus) => void;
  initialTab?: ReportTab;
  idBase?: string;
}) {
  const result = useMemo(() => runCheckup(data, asOf), [data, asOf]);
  const overview = useMemo(() => householdOverview(data, result, asOf), [data, result, asOf]);
  const rows = useMemo(() => paycheckHistoryRows(data, result), [data, result]);
  const [tab, setTab] = useState<ReportTab>(initialTab);
  const employerName = (id: string | null) => data.employers.find((e) => e.id === id)?.employerName;

  const findings = useMemo(
    () =>
      locked
        ? // The problem is free; the exact per-paycheck fix is part of Annual.
          result.findings.map((f) =>
            f.code === "UNDERWITHHOLDING"
              ? { ...f, action: { ...f.action, details: "Annual shows the exact Step 4(c) amount to put on each W-4 so you don't owe in April." } }
              : f,
          )
        : result.findings,
    [result, locked],
  );
  // On track: keep the raw balance away from Claude, so its summary doesn't talk about owing $4.
  // On track: send a zero balance instead of the raw one, so the summary neither talks about owing $4
  // nor (with no projection at all) claims that no projection is available.
  const explainProjection = useMemo(
    () => (overview.outlook === "on_track" && result.projection ? { ...result.projection, balance: 0 } : result.projection),
    [overview.outlook, result.projection],
  );
  const explained = useExplanations(findings, explainProjection);

  const checks = result.checks.flatMap((s) => s.checks);
  const passed = checks.filter((c) => c.status === "ok").length;
  const fixNow = findings.filter((f) => f.severity === "critical").length;

  const w4Advice: W4Advice[] = (result.projection?.perEmployer ?? [])
    .map((p) => {
      const e = data.employers.find((x) => x.id === p.employerId);
      return e && p.recommendedStep4c > 0
        ? { employerName: e.employerName, recommendedStep4c: p.recommendedStep4c, remainingPayPeriods: p.remainingPayPeriods, current: e.w4.step4cExtraWithholding }
        : null;
    })
    .filter((x): x is W4Advice => x !== null);

  const next = useMemo(() => nextCheck(data, asOf), [data, asOf]);

  const checklistItems = checklistItemsFor(data, result);
  const hasW2 = data.documents.some((d) => d.docType === "w2");
  const received = checklistItems.filter((c) => c.status === "received").length;
  const taxSeasonStarted = hasW2 || data.checklist.length > 0;

  const recRows = result.reconciliation.flatMap((rec) =>
    rec.rows.filter((r) => r.w2 !== 0 || r.expected !== 0).map((r) => ({ ...r, employerId: rec.employerId, employerName: rec.employerName })),
  );
  const recMismatches = recRows.filter((r) => !r.matches).length;

  return (
    <div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard
          tone={checks.length > 0 && passed === checks.length ? "success" : "neutral"}
          label="Checks passed"
          icon={<CircleCheckIcon className="text-success" />}
          value={checks.length > 0 ? passed : "—"}
          hint={checks.length > 0 ? `of ${checks.length} checks on your latest pay stubs` : "Add a pay stub to run the checks."}
        />
        <StatCard
          tone={findings.length > 0 ? "warning" : "neutral"}
          label="Issues to review"
          icon={<AlertTriangleIcon className="text-warning" />}
          value={findings.length}
          hint={findings.length === 0 ? "Nothing to fix." : `${fixNow} to fix now · ${findings.length - fixNow} to review`}
        />
        <StatCard
          tone={overview.savings.perYear + overview.savings.onCheckedPaychecks > 0 ? "success" : "neutral"}
          label={overview.savings.perYear > 0 ? "Unclaimed 401(k) match" : overview.savings.onCheckedPaychecks > 0 ? "Owed to you" : "Money to recover"}
          icon={<PiggyBankIcon className="text-success" />}
          value={
            overview.savings.perYear > 0 ? (
              <>
                {money(overview.savings.perYear, true)}
                <span className="text-base font-medium text-fg-secondary"> / year</span>
              </>
            ) : (
              money(overview.savings.onCheckedPaychecks, true)
            )
          }
          hint={
            overview.savings.perYear > 0 && overview.savings.onCheckedPaychecks > 0
              ? `Plus ${money(overview.savings.onCheckedPaychecks, true)} owed on the pay stubs we checked.`
              : overview.savings.perYear > 0
                ? "401(k) match you could be getting."
                : overview.savings.onCheckedPaychecks > 0
                  ? "Owed to you on the pay stubs we checked."
                  : "Nothing to recover on the pay stubs we checked."
          }
        />
      </div>

      <Tabs
        idBase={idBase}
        className="mt-8"
        label="Report sections"
        value={tab}
        onChange={(t) => setTab(t as ReportTab)}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "details", label: "Details", badge: findings.length > 0 ? <span className="rounded-full bg-warning-soft px-1.5 text-xs text-warning">{findings.length}</span> : undefined },
          { id: "history", label: "History" },
          { id: "tax_season", label: "Tax season" },
        ]}
      />

      <TabPanel idBase={idBase} id="overview" active={tab === "overview"} className="pt-6">
        <h2 className="print-only mb-2 text-lg font-semibold">Overview</h2>
        {result.notes.length > 0 && (
          <div className="mb-6 space-y-2">
            {result.notes.map((n) => (
              <Alert key={n} tone="info">
                {n}
              </Alert>
            ))}
          </div>
        )}
        {result.projection && <ProjectionBanner projection={result.projection} outlook={overview.outlook ?? "on_track"} />}
        {overview.outlook === "owe" && w4Advice.length > 0 && (
          <Card className="mt-4">
            <div className="flex items-start gap-3">
              <WrenchIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-fg-primary">The fix: extra withholding in W-4 Step 4(c)</p>
                {locked ? (
                  <p className="mt-1 text-fg-secondary">Annual shows the exact amount to put on each W-4 so you don&apos;t owe in April.</p>
                ) : (
                  <>
                    <ul className="mt-1 space-y-0.5 text-fg-secondary">
                      {w4Advice.map((a) => (
                        <li key={a.employerName}>
                          <span className="font-mono font-semibold text-fg-primary">+{money(a.recommendedStep4c, true)}</span> per paycheck at {a.employerName}
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="no-print mt-1 font-medium text-brand-700 underline underline-offset-2" onClick={() => setTab("details")}>
                      See how we got these amounts
                    </button>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}
        {next && (
          <p className="no-print mt-4 flex items-center gap-2 text-sm text-fg-secondary">
            <CalendarClockIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
            <span>
              Next check: <span className="font-medium text-fg-primary">{shortDate(next.date)}</span>, your next paycheck from {next.employerName}. Upload that pay
              stub to keep your April projection current.
            </span>
          </p>
        )}

        {result.checks.length > 0 ? (
          <Section
            title="What we checked"
            subtitle="Every check that ran on each job's latest pay stub. Healthy means the check ran and found nothing; checks that don't apply to a job are left out."
          >
            <ChecksSummary
              stubs={result.checks}
              memberOf={(id) => {
                const e = data.employers.find((x) => x.id === id);
                return e ? (e.member === "self" ? "You" : "Spouse") : undefined;
              }}
            />
          </Section>
        ) : (
          <Alert tone="info" className="mt-6">
            No pay stub checked yet for this tax year. Upload one to see what we check.
          </Alert>
        )}

        {(result.projection || taxSeasonStarted) && (
          <Section title="Tax readiness">
            <Card>
              <ul className="space-y-2 text-sm">
                {result.projection && (
                  <li className="flex items-start gap-2">
                    {overview.outlook === "owe" ? (
                      <AlertTriangleIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    ) : (
                      <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    )}
                    <span className="text-fg-secondary">
                      April {result.projection.taxYear + 1}:{" "}
                      <span className="font-medium text-fg-primary">
                        {overview.outlook === "owe"
                          ? `about ${money(result.projection.balance, true)} to pay unless your W-4s change`
                          : overview.outlook === "refund"
                            ? `a refund of about ${money(-result.projection.balance, true)}`
                            : "on track, no W-4 change needed"}
                      </span>
                    </span>
                  </li>
                )}
                {taxSeasonStarted && (
                  <li className="flex items-start gap-2">
                    <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
                    <span className="text-fg-secondary">
                      Tax forms: <span className="font-medium text-fg-primary">{received} of {checklistItems.length} received</span>
                    </span>
                  </li>
                )}
              </ul>
            </Card>
          </Section>
        )}

        {result.projection && (
          <details className="no-print mt-6 text-sm text-fg-secondary">
            <summary className="cursor-pointer font-medium text-fg-primary">How we calculated the {result.taxYear} projection</summary>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 rounded-control bg-slate-50 p-3 sm:grid-cols-2">
              {Object.entries(result.projection.inputs).map(([k, v]) => {
                const row = inputRow(k, v);
                return (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-fg-muted">{row.label}</dt>
                    <dd className="text-right tabular-nums text-fg-primary">{row.value}</dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-2">Federal income tax only. Uses IRS Pub. 15-T, Rev. Proc. 2025-32 and the standard deduction. State tax not included.</p>
          </details>
        )}

        {!locked && (
          <div className="no-print mt-8">
            <RemindersCard data={data} checklist={result.checklist} asOf={asOf} />
          </div>
        )}
        {locked && overview.outlook !== "owe" && (
          <Section title="Keep checking all year">
            <Paywall
              title="Check every paycheck with Annual"
              reason="The free plan checks one pay stub. Annual checks every paycheck for both of you, reminds you on payday and gets your tax forms ready in January."
            />
          </Section>
        )}
      </TabPanel>

      <TabPanel idBase={idBase} id="details" active={tab === "details"} className="pt-6">
        <h2 className="print-only mb-2 text-lg font-semibold">Details</h2>
        {findings.length === 0 ? (
          <Card>
            <p className="flex items-center gap-2 text-sm text-fg-secondary">
              <CircleCheckIcon aria-hidden="true" className="h-5 w-5 text-success" /> No issues found on your pay stubs.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {explained.summary && <p className="text-sm font-medium text-fg-primary">{explained.summary}</p>}
            {findings.map((f, i) => (
              <FindingCard
                key={`${f.code}-${f.employerId}-${i}`}
                finding={f}
                taxYear={result.taxYear}
                employerName={employerName(f.employerId)}
                explanation={explained.bodies.get(i)}
                explaining={explained.status === "loading"}
                w4Advice={f.code === "UNDERWITHHOLDING" && !locked ? w4Advice : undefined}
                w4Locked={
                  f.code === "UNDERWITHHOLDING" && locked ? (
                    <div className="mt-3">
                      <Paywall
                        title="Get the exact W-4 fix"
                        reason={`We know how much to add to each paycheck so you don't owe ~${money(f.amountUsd, true)} in April. Annual shows the Step 4(c) amount for every job.`}
                      />
                    </div>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </TabPanel>

      <TabPanel idBase={idBase} id="history" active={tab === "history"} className="pt-6">
        <h2 className="print-only mb-2 text-lg font-semibold">Paycheck history</h2>
        {rows.length === 0 ? (
          <Card>
            <p className="text-sm text-fg-secondary">No pay stubs saved yet.</p>
          </Card>
        ) : (
          <PaycheckHistoryTable rows={rows} />
        )}
      </TabPanel>

      <TabPanel idBase={idBase} id="tax_season" active={tab === "tax_season"} className="pt-6">
        <h2 className="print-only mb-2 text-lg font-semibold">Tax season</h2>
        {locked ? (
          <Paywall
            title="Tax season is part of Annual"
            reason="Your January checklist of tax forms, W-2 reconciliation against your pay stubs and the accountant packet are part of Annual."
          />
        ) : (
          <>
            <div className="print-only mb-4">
              <h2 className="text-xl font-semibold">{packetTitle}</h2>
              <p className="text-sm">Prepared with PayTrail. Estimates only. Not tax advice.</p>
            </div>
            <Section
              className="mt-0"
              title="Tax documents to expect"
              subtitle="Built from your pay stubs and household profile."
              action={
                <Button
                  variant="secondary"
                  className="no-print"
                  icon={<PrinterIcon aria-hidden="true" className="h-4 w-4" />}
                  onClick={() => window.print()}
                  title="Opens your browser's print window: choose “Save as PDF” to get a file"
                >
                  Print or save packet as PDF
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
                <Card>
                  <p className="text-sm text-fg-secondary">
                    {hasW2
                      ? `To reconcile a W-2, add the last pay stub of ${result.taxYear} from the same job (paid in December).`
                      : "Upload your W-2s to reconcile them against your pay stubs."}
                  </p>
                </Card>
              ) : (
                <>
                  <p className="mb-3 text-sm font-medium text-fg-primary">
                    {recMismatches === 0
                      ? `All ${recRows.length} boxes match your pay stubs.`
                      : `${recMismatches} of ${recRows.length} boxes ${recMismatches === 1 ? "doesn't" : "don't"} match your pay stubs.`}
                  </p>
                  <Card padding="none">
                    <ul className="divide-y divide-border text-sm">
                      {recRows.map((r) => (
                        <li
                          key={`${r.employerId}-${r.box}`}
                          className={`grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[1fr_8rem_8rem_9rem] sm:items-center ${r.matches ? "" : "bg-danger-soft/60"}`}
                        >
                          <div className="col-span-2 sm:col-span-1">
                            <p className="font-medium text-fg-primary">
                              Box {r.box} · {r.label}
                            </p>
                            <p className="text-xs text-fg-muted">{r.employerName}</p>
                          </div>
                          <p className="sm:text-right">
                            <span className="text-xs text-fg-muted sm:hidden">W-2 </span>
                            <span className="tabular-nums">{money(r.w2)}</span>
                          </p>
                          <p className="text-right">
                            <span className="text-xs text-fg-muted sm:hidden">Pay stubs </span>
                            <span className="tabular-nums">{money(r.expected)}</span>
                          </p>
                          <p className={`col-span-2 font-medium sm:col-span-1 sm:text-right ${r.matches ? "text-success" : "text-danger"}`}>
                            {r.matches ? "✓ Matches" : `Off by ${money(r.difference)}`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </>
              )}
            </Section>
          </>
        )}
      </TabPanel>
    </div>
  );
}
