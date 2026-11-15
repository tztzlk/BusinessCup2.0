"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CalculatorIcon, CheckIcon, ChevronDownIcon, ExternalLinkIcon, WrenchIcon } from "lucide-react";
import { Badge, Button, Card, Modal, StatusBadge, Table, cn, type Column } from "./ui";
import { label, money, shortDate } from "@/lib/format";
import { findingTitle, inputRow } from "@/lib/findingCopy";
import { statusForSeverity, type StubChecks } from "@/lib/engine/checkSummary";
import { explainCalculation } from "@/lib/engine/calculation";
import { findingPeriod } from "@/lib/engine/savings";
import { federalParams } from "@/lib/engine/params";
import type { AprilOutlook } from "@/lib/engine/overview";
import type { PaycheckHistoryRow } from "@/lib/paycheckHistory";
import type { GlossaryKey } from "@/lib/glossary";
import { Term, TermText } from "./Term";
import type { ChecklistItem, ChecklistStatus, EmploymentSettings, Finding, HouseholdProfile, Paystub, Projection, StoredDocument } from "@/lib/types";

// Report building blocks shared by the demo and the real /report page. Every number comes from
// lib/engine; components only format and lay it out.

export { aprilOutlook, type AprilOutlook } from "@/lib/engine/overview";

export function ProjectionBanner({ projection, outlook }: { projection: Projection; outlook: AprilOutlook }) {
  const amount = Math.abs(projection.balance);
  const owe = outlook === "owe";
  const headline = owe
    ? `You may owe ~${money(amount, true)} in April`
    : outlook === "refund"
      ? `You may get a ~${money(amount, true)} refund`
      : "You're on track for April";
  return (
    <div className={cn("rounded-card border px-5 py-5 sm:px-6", owe ? "border-warning-border bg-warning-soft" : "border-success-border bg-success-soft")}>
      <p className="text-[13px] font-medium text-fg-secondary">April {projection.taxYear + 1} projection</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums sm:text-[28px]", owe ? "text-warning-strong" : "text-success-strong")}>{headline}</p>
      <p className="mt-2 text-sm text-fg-secondary">
        Projected {projection.taxYear} federal tax {money(projection.projectedTax, true)} vs. projected <Term k="withholding">withholding</Term>{" "}
        {money(projection.projectedWithholding, true)}
        {outlook === "on_track" ? (amount < 1 ? ": they match." : `: about ${money(amount, true)} apart, so no W-4 change needed.`) : "."}
      </p>
    </div>
  );
}

const CHECK_TERMS: GlossaryKey[] = ["additionalMedicare", "medicare", "socialSecurity", "withholding", "w4", "match401k", "ytd"];

/** "What we checked": every check that ran on each job's latest pay stub, from lib/engine/checkSummary. */
export function ChecksSummary({ stubs, memberOf }: { stubs: StubChecks[]; memberOf: (employerId: string) => string | undefined }) {
  if (stubs.length === 0) return null;
  return (
    <div className={cn("grid gap-4", stubs.length > 1 && "lg:grid-cols-2")}>
      {stubs.map((s) => {
        const issues = s.checks.filter((c) => c.status !== "ok").length;
        return (
          <Card key={s.employerId} padding="none">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs text-fg-muted">
                {memberOf(s.employerId) ? `${memberOf(s.employerId)} · ` : ""}pay stub of {shortDate(s.payDate)}
              </p>
              <h3 className="font-semibold text-fg-primary">{s.employerName}</h3>
              <p className="mt-0.5 text-sm text-fg-secondary">
                {s.checks.length} checks · {issues === 0 ? "all healthy" : `${issues} to review, ${s.checks.length - issues} healthy`}
              </p>
            </div>
            <ul className="divide-y divide-border text-sm">
              {s.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-fg-primary">
                      <TermText text={c.label} terms={CHECK_TERMS} />
                    </p>
                    <p className="text-xs text-fg-muted">{c.detail}</p>
                  </div>
                  <span className="shrink-0">
                    <StatusBadge status={c.status} />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

/** Terms explained in finding titles, e.g. "Withholding doesn't match your W-4". */
const TITLE_TERMS: GlossaryKey[] = ["w2", "w4", "withholding", "match401k", "socialSecurity", "medicare", "ytd"];

/** The headline amount of a finding, in the unit the engine measured it in. */
function impactLine(f: Finding): string {
  const amount = money(f.amountUsd, true);
  switch (findingPeriod(f.code)) {
    case "year":
      return `Potential loss: ${amount} per year`;
    case "paycheck":
      return `At stake: ${amount} on this paycheck`;
    case "april":
      return f.code === "OVERWITHHOLDING" ? `Refund of about ${amount} in April` : `You may owe ${amount} in April`;
    case "w2":
      return `Off by ${amount} on the W-2`;
    default:
      return `${amount} at stake`;
  }
}

export interface W4Advice {
  employerName: string;
  recommendedStep4c: number;
  remainingPayPeriods: number;
  current: number;
}

export function FindingCard({
  finding,
  employerName,
  explanation,
  explaining = false,
  w4Advice,
  w4Locked,
  taxYear,
}: {
  finding: Finding;
  employerName?: string;
  /** Claude's plain-English text, already checked against the engine's numbers. */
  explanation?: string;
  explaining?: boolean;
  /** Step 4(c) per job from projection.perEmployer, for the April balance finding. */
  w4Advice?: W4Advice[];
  /** Free plan: the exact Step 4(c) amounts are part of Annual. */
  w4Locked?: ReactNode;
  /** Tax year of the checkup: which params the calculation cites. */
  taxYear: number;
}) {
  const [inline, setInline] = useState(false);
  const [modal, setModal] = useState(false);
  const status = statusForSeverity(finding.severity);
  const title = findingTitle(finding);
  const toggle = () => {
    if (window.matchMedia("(min-width: 768px)").matches) setInline((v) => !v);
    else setModal(true);
  };

  return (
    <Card className="break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {employerName && <span className="text-xs text-fg-muted">{employerName}</span>}
          </div>
          <h3 className="mt-2 text-base font-semibold text-fg-primary">
            <TermText text={title} terms={TITLE_TERMS} />
          </h3>
        </div>
        <p className={cn("rounded-full px-3 py-1 text-sm font-semibold tabular-nums", status === "fix_now" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning")}>
          {impactLine(finding)}
        </p>
      </div>

      {/* Claude's plain-English text when it arrives; the rule's own text is always under "How to fix it". */}
      {explanation && <p className="mt-3 text-sm text-fg-secondary">{explanation}</p>}
      {explaining && !explanation && (
        <p className="no-print mt-2 animate-pulse text-xs text-fg-muted" aria-live="polite">
          Writing a plain-English explanation…
        </p>
      )}

      <div className="mt-4 rounded-control bg-slate-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
          <WrenchIcon aria-hidden="true" className="h-4 w-4 text-primary" />
          How to fix it
        </p>
        <p className="mt-1 text-sm text-fg-secondary">{finding.action.details}</p>
        {w4Advice && w4Advice.length > 0 && (
          <ul className="mt-2 space-y-1.5 text-sm">
            {w4Advice.map((a) => (
              <li key={a.employerName} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-fg-secondary">
                  New W-4 at <span className="font-medium text-fg-primary">{a.employerName}</span>: <Term k="w4Step4c">Step 4(c)</Term>
                </span>
                <span className="font-semibold tabular-nums text-brand-700">
                  {money(a.recommendedStep4c, true)} per paycheck
                  <span className="ml-1 font-normal text-fg-muted">
                    ({a.remainingPayPeriods} left, now {money(a.current, true)})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {w4Locked}
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-expanded={inline}
        className="no-print mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
        <CalculatorIcon aria-hidden="true" className="h-4 w-4" />
        {inline ? "Hide calculation" : "Show calculation"}
        <ChevronDownIcon aria-hidden="true" className={cn("hidden h-4 w-4 transition-transform md:inline", inline && "rotate-180")} />
      </button>
      {/* Desktop: opens in place. It always prints, so the PDF includes every calculation. */}
      <div className={cn("mt-3", inline ? "hidden md:block" : "hidden print:block")}>
        <CalculationPanel finding={finding} explained={!!explanation} taxYear={taxYear} />
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="How we calculated it" description={title} size="lg">
        <CalculationPanel finding={finding} explained={!!explanation} taxYear={taxYear} />
      </Modal>
    </Card>
  );
}

/** Show calculation: inputs, the rule in words and with numbers, expected vs. actual, the source. */
export function CalculationPanel({ finding, explained, taxYear }: { finding: Finding; explained: boolean; taxYear: number }) {
  const p = federalParams(taxYear);
  const c = explainCalculation(finding, p);
  const unit = c.unit === "paycheck" ? "per paycheck" : c.unit === "year" ? "per year" : c.unit === "april" ? "for the year" : "";
  const inputs = Object.entries(finding.inputs);
  return (
    <div className="space-y-4 rounded-control border border-border bg-surface p-4 text-sm">
      {c.formula && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">The rule</p>
          <p className="mt-1 text-fg-primary">{c.formula}</p>
          {c.substituted && <p className="mt-1.5 rounded bg-slate-50 px-2.5 py-1.5 font-mono text-[13px] tabular-nums text-fg-primary">{c.substituted}</p>}
        </div>
      )}

      {(c.expected !== null || c.actual !== null || c.difference !== null) && (
        <dl className="grid gap-2 sm:grid-cols-3">
          {c.expected !== null && (
            <div className="rounded-control bg-slate-50 p-2.5">
              <dt className="text-xs text-fg-muted">{c.expectedLabel}</dt>
              <dd className="font-semibold tabular-nums text-fg-primary">{money(c.expected)}</dd>
            </div>
          )}
          {c.actual !== null && (
            <div className="rounded-control bg-slate-50 p-2.5">
              <dt className="text-xs text-fg-muted">{c.actualLabel}</dt>
              <dd className="font-semibold tabular-nums text-fg-primary">{money(c.actual)}</dd>
            </div>
          )}
          {c.difference !== null && (
            <div className="rounded-control bg-warning-soft p-2.5">
              <dt className="text-xs text-fg-muted">Difference {unit && <span>({unit})</span>}</dt>
              <dd className="font-semibold tabular-nums text-warning-strong">
                {c.difference > 0 ? "+" : ""}
                {money(c.difference)}
              </dd>
            </div>
          )}
        </dl>
      )}

      {inputs.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Numbers we used</p>
          <dl className="mt-1.5 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {inputs.map(([k, v]) => {
              const row = inputRow(k, v);
              return (
                <div key={k} className="flex justify-between gap-3">
                  <dt className={cn("text-fg-muted", !row.known && "font-mono text-xs")}>{row.label}</dt>
                  <dd className="text-right tabular-nums text-fg-primary">{row.value}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {c.sources.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Source</p>
          <ul className="mt-1 space-y-0.5">
            {c.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                  {s.label}
                  <ExternalLinkIcon aria-hidden="true" className="h-3.5 w-3.5" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        c.formula && <p className="text-xs text-fg-muted">An arithmetic check of the numbers printed on your document; no tax rule involved.</p>
      )}
      {explained && <p className="text-xs text-fg-muted">The explanation above was written by Claude from these numbers. Every number is calculated by our own engine.</p>}
    </div>
  );
}

export function W4Card({ employer, recommendedStep4c, remainingPayPeriods }: { employer: EmploymentSettings; recommendedStep4c: number; remainingPayPeriods: number }) {
  return (
    <Card>
      <p className="text-xs text-fg-muted">W-4 · {employer.member === "self" ? "You" : "Spouse"}</p>
      <h3 className="mt-1 font-semibold text-fg-primary">{employer.employerName}</h3>
      <p className="mt-3 text-sm text-fg-secondary">
        <Term k="w4Step4c">Step 4(c)</Term> extra withholding per paycheck
      </p>
      <p className="text-2xl font-bold tabular-nums text-brand-700">{money(recommendedStep4c, true)}</p>
      <p className="mt-2 text-xs text-fg-muted">
        {remainingPayPeriods} paychecks left this year · currently {money(employer.w4.step4cExtraWithholding, true)}
      </p>
    </Card>
  );
}

/** Every saved pay stub, newest first (lib/paycheckHistory.ts). Phones get one card per stub. */
export function PaycheckHistoryTable({ rows }: { rows: PaycheckHistoryRow[] }) {
  const columns: Column<PaycheckHistoryRow>[] = [
    { id: "date", header: "Pay date", cell: (r) => shortDate(r.stub.payDate), sortValue: (r) => r.stub.payDate },
    { id: "employer", header: "Employer", cell: (r) => <span className="text-fg-secondary">{r.employerName}</span>, sortValue: (r) => r.employerName },
    { id: "gross", header: "Gross pay", align: "right", cell: (r) => money(r.stub.grossCurrent), sortValue: (r) => r.stub.grossCurrent },
    { id: "fed", header: "Federal withholding", align: "right", cell: (r) => money(r.federalWithheld), sortValue: (r) => r.federalWithheld },
    { id: "net", header: "Net pay", align: "right", cell: (r) => money(r.stub.netCurrent), sortValue: (r) => r.stub.netCurrent },
    {
      id: "status",
      header: "Status",
      cell: (r) =>
        r.findings === null ? (
          <Badge>Not checked</Badge>
        ) : r.findings === 0 ? (
          <StatusBadge status="ok" />
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge status="worth_checking" />
            <span className="text-xs text-fg-muted">
              {r.findings} {r.findings === 1 ? "finding" : "findings"}
            </span>
          </span>
        ),
      sortValue: (r) => r.findings ?? -1,
    },
  ];
  return (
    <Card padding="none">
      <Table caption="Paycheck history" columns={columns} rows={rows} rowKey={(r) => r.id} initialSort={{ column: "date", direction: "desc" }} />
      <p className="border-t border-border px-4 py-2.5 text-xs text-fg-muted">
        The checkup runs on the latest pay stub from each job; older stubs are kept for your history and the year-to-date totals.
      </p>
    </Card>
  );
}

function isPaystub(doc: StoredDocument): doc is StoredDocument & { fields: Paystub } {
  return doc.docType === "paystub";
}

export function HouseholdSummary({
  profile,
  employers,
  documents,
  onEditEmployer,
}: {
  profile: HouseholdProfile;
  employers: EmploymentSettings[];
  documents: StoredDocument[];
  onEditEmployer?: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <h3 className="font-semibold text-fg-primary">Profile</h3>
        <dl className="mt-3 space-y-1 text-sm">
          <Row k="Filing status" v={label(profile.filingStatus)} />
          <Row k="State" v={profile.state} />
          <Row k="Children under 17" v={String(profile.dependentsUnder17)} />
          <Row
            k="Also has"
            v={
              Object.entries(profile.flags)
                .filter(([, on]) => on)
                .map(([k]) => ({ mortgage: "Mortgage", bankInterest: "Bank interest", brokerage: "Brokerage", hsa: "HSA" })[k])
                .join(", ") || "—"
            }
          />
        </dl>
      </Card>
      {employers.map((e) => {
        const latest = documents.filter((d) => d.employerId === e.id).filter(isPaystub).at(-1);
        const tax = (type: string) => latest?.fields.taxes.find((t) => t.type === type)?.current ?? null;
        return (
          <Card key={e.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-fg-muted">{e.member === "self" ? "You" : "Spouse"}</p>
                <h3 className="font-semibold text-fg-primary">{e.employerName}</h3>
              </div>
              {onEditEmployer && (
                <Button size="sm" variant="ghost" aria-label={`Edit job: ${e.employerName}`} onClick={() => onEditEmployer(e.id)}>
                  Edit job
                </Button>
              )}
            </div>
            <p className="text-sm text-fg-muted">
              {e.payType === "salary" ? `${money(e.annualSalary ?? null, true)} salary` : `${money(e.hourlyRate ?? null)}/hour`}
              {e.match401k ? ` · match ${e.match401k.matchPercent}% up to ${e.match401k.upToPercentOfPay}%` : ""}
            </p>
            {latest ? (
              <dl className="mt-3 space-y-1 text-sm">
                <Row k={`Latest stub (${shortDate(latest.fields.payDate)})`} v="" />
                <Row k="Gross" v={money(latest.fields.grossCurrent)} />
                <Row k="Federal income tax" v={money(tax("federal_income"))} />
                <Row k="Social Security" v={money(tax("social_security"))} />
                <Row k="Medicare" v={money(tax("medicare"))} />
                <Row k="Net pay" v={money(latest.fields.netCurrent)} />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-fg-muted">No pay stubs yet.</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-fg-muted">{k}</dt>
      <dd className="text-right font-medium tabular-nums text-fg-primary">{v}</dd>
    </div>
  );
}

const STATUS_BADGE: Record<ChecklistStatus, { tone: "neutral" | "success" | "danger" | "warning"; text: string }> = {
  expected: { tone: "neutral", text: "Expected" },
  received: { tone: "success", text: "Received" },
  mismatch: { tone: "danger", text: "Mismatch" },
  overdue: { tone: "warning", text: "Overdue" },
};

export function ChecklistView({ items, onStatusChange }: { items: ChecklistItem[]; onStatusChange?: (id: string, status: ChecklistStatus) => void }) {
  if (items.length === 0) return <p className="text-sm text-fg-muted">No documents expected yet.</p>;
  return (
    <Card padding="none">
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="font-medium text-fg-primary">{item.formType}</p>
              <p className="text-sm text-fg-muted">
                {item.source} · due {shortDate(item.dueDate)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_BADGE[item.status].tone} icon={item.status === "received" ? <CheckIcon aria-hidden="true" /> : undefined}>
                {STATUS_BADGE[item.status].text}
              </Badge>
              {onStatusChange && item.formType !== "W-2" && (item.status === "expected" || item.status === "overdue") && (
                <Button size="sm" variant="ghost" className="no-print" onClick={() => onStatusChange(item.id, "received")}>
                  Mark received
                </Button>
              )}
              {/* A W-2 counts as received once it is uploaded and reconciled, not by a click. */}
              {onStatusChange && item.formType === "W-2" && (item.status === "expected" || item.status === "overdue") && (
                <Link href="/upload" className="no-print text-sm font-medium text-brand-700 hover:underline">
                  Upload W-2
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
