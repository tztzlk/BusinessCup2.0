"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card } from "./ui";
import { label, money, shortDate } from "@/lib/format";
import { findingTitle, inputRow } from "@/lib/findingCopy";
import { statusForSeverity, type CheckStatus, type StubChecks } from "@/lib/engine/checkSummary";
import type { GlossaryKey } from "@/lib/glossary";
import { Term, TermText } from "./Term";
import type {
  ChecklistItem,
  ChecklistStatus,
  EmploymentSettings,
  Finding,
  HouseholdProfile,
  Paystub,
  Projection,
  StoredDocument,
  W2,
} from "@/lib/types";

// Report building blocks shared by the demo and the real /report page.

export type AprilOutlook = "owe" | "refund" | "on_track";

/**
 * The engine raises a balance finding only when the gap is worth acting on (UNDERWITHHOLDING /
 * OVERWITHHOLDING); without one the household is on track, even if the raw balance is a few dollars.
 */
export function aprilOutlook(findings: Finding[]): AprilOutlook {
  if (findings.some((f) => f.code === "UNDERWITHHOLDING")) return "owe";
  if (findings.some((f) => f.code === "OVERWITHHOLDING")) return "refund";
  return "on_track";
}

export function ProjectionBanner({ projection, outlook }: { projection: Projection; outlook: AprilOutlook }) {
  const amount = Math.abs(projection.balance);
  const tone =
    outlook === "owe"
      ? "bg-rose-50 text-rose-950 ring-1 ring-rose-200"
      : "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200";
  const headline =
    outlook === "owe"
      ? `You may owe ~${money(amount, true)} in April`
      : outlook === "refund"
        ? `You may get a ~${money(amount, true)} refund`
        : "You're on track for April";
  return (
    <div className={`rounded-2xl px-6 py-6 ${tone}`}>
      <p className="text-sm font-medium opacity-75">April {projection.taxYear + 1} projection</p>
      <p className="mt-2 text-2xl font-semibold sm:text-3xl">{headline}</p>
      <p className="mt-2 text-sm opacity-80">
        Projected {projection.taxYear} federal tax {money(projection.projectedTax, true)} vs. projected <Term k="withholding">withholding</Term>{" "}
        {money(projection.projectedWithholding, true)}
        {outlook === "on_track"
          ? amount < 1
            ? ": they match."
            : `: about ${money(amount, true)} apart, so no W-4 change needed.`
          : "."}
      </p>
    </div>
  );
}

// Three levels across the report: the finding cards and "What we checked" use the same labels.
const STATUS_TONE = { fix_now: "danger", worth_checking: "warning", ok: "success" } as const;
const STATUS_LABEL: Record<CheckStatus, string> = { fix_now: "Fix now", worth_checking: "Worth checking", ok: "Looks right" };
const STATUS_DOT: Record<CheckStatus, string> = { fix_now: "bg-rose-500", worth_checking: "bg-amber-400", ok: "bg-emerald-500" };

/** Terms explained in finding titles, e.g. "Withholding doesn't match your W-4". */
const TITLE_TERMS: GlossaryKey[] = ["w2", "w4", "withholding", "match401k", "socialSecurity", "medicare", "ytd"];

export function FindingCard({
  finding,
  employerName,
  explanation,
  explaining = false,
}: {
  finding: Finding;
  employerName?: string;
  /** Claude's plain-English text, already checked against the engine's numbers. */
  explanation?: string;
  explaining?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[statusForSeverity(finding.severity)]}>{STATUS_LABEL[statusForSeverity(finding.severity)]}</Badge>
            {employerName && <span className="text-xs text-slate-500">{employerName}</span>}
          </div>
          <h3 className="mt-2 font-semibold text-slate-900">
            <TermText text={findingTitle(finding)} terms={TITLE_TERMS} />
          </h3>
        </div>
        <p className="text-xl font-semibold text-slate-900">
          {money(finding.amountUsd, true)}
          <span className="block text-right text-xs font-normal text-slate-500">at stake</span>
        </p>
      </div>
      <p className="mt-3 text-sm text-slate-700">{explanation ?? finding.action.details}</p>
      {explaining && !explanation && (
        <p className="no-print mt-2 animate-pulse text-xs text-slate-400" aria-live="polite">
          Writing a plain-English explanation…
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="no-print mt-3 text-sm font-medium text-brand-700 hover:underline"
        aria-expanded={open}
      >
        {open ? "Hide calculation" : "Show calculation"}
      </button>
      {open && explanation && (
        <p className="mt-3 text-xs text-slate-500">
          Explanation written by Claude from the numbers below. Rule from our engine: {finding.action.details}
        </p>
      )}
      {open && (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
          {Object.entries(finding.inputs).map(([k, v]) => {
            const row = inputRow(k, v);
            return (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-slate-500">{row.label}</dt>
                <dd className="text-right font-mono text-slate-800">{row.value}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </Card>
  );
}

const CHECK_TERMS: GlossaryKey[] = ["additionalMedicare", "medicare", "socialSecurity", "withholding", "w4", "match401k", "ytd"];

/** "What we checked": every check that ran on each job's latest pay stub, from lib/engine/checkSummary. */
export function ChecksSummary({ stubs, memberOf }: { stubs: StubChecks[]; memberOf: (employerId: string) => string | undefined }) {
  if (stubs.length === 0) return null;
  return (
    <div className={`grid gap-4 ${stubs.length > 1 ? "lg:grid-cols-2" : ""}`}>
      {stubs.map((s) => {
        const issues = s.checks.filter((c) => c.status !== "ok").length;
        return (
          <Card key={s.employerId} className="!p-0">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                {memberOf(s.employerId) ? `${memberOf(s.employerId)} · ` : ""}pay stub of {shortDate(s.payDate)}
              </p>
              <h3 className="font-semibold text-slate-900">{s.employerName}</h3>
              <p className="mt-0.5 text-sm text-slate-600">
                {s.checks.length} checks · {issues === 0 ? "all look right" : `${issues} to look at, ${s.checks.length - issues} look right`}
              </p>
            </div>
            <ul className="divide-y divide-slate-100 text-sm">
              {s.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[c.status]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      <TermText text={c.label} terms={CHECK_TERMS} />
                    </p>
                    <p className="text-xs text-slate-500">{c.detail}</p>
                  </div>
                  <span className="shrink-0">
                    <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
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

export function W4Card({
  employer,
  recommendedStep4c,
  remainingPayPeriods,
}: {
  employer: EmploymentSettings;
  recommendedStep4c: number;
  remainingPayPeriods: number;
}) {
  return (
    <Card>
      <p className="text-xs text-slate-500">
        W-4 · {employer.member === "self" ? "You" : "Spouse"}
      </p>
      <h3 className="mt-1 font-semibold text-slate-900">{employer.employerName}</h3>
      <p className="mt-3 text-sm text-slate-600">
        <Term k="w4Step4c">Step 4(c)</Term> extra withholding per paycheck
      </p>
      <p className="text-2xl font-semibold tabular-nums text-brand-700">{money(recommendedStep4c, true)}</p>
      <p className="mt-2 text-xs text-slate-500">
        {remainingPayPeriods} paychecks left this year · currently {money(employer.w4.step4cExtraWithholding, true)}
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
        <h3 className="font-semibold text-slate-900">Profile</h3>
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
                <p className="text-xs text-slate-500">{e.member === "self" ? "You" : "Spouse"}</p>
                <h3 className="font-semibold text-slate-900">{e.employerName}</h3>
              </div>
              {onEditEmployer && (
                <button
                  type="button"
                  className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50"
                  aria-label={`Edit job: ${e.employerName}`}
                  onClick={() => onEditEmployer(e.id)}
                >
                  Edit job
                </button>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {e.payType === "salary" ? `${money(e.annualSalary ?? null, true)} salary` : `${money(e.hourlyRate ?? null)}/hour`}
              {e.match401k ? ` · match ${e.match401k.matchPercent}% up to ${e.match401k.upToPercentOfPay}%` : ""}
            </p>
            {latest ? (
              <dl className="mt-3 space-y-1 text-sm">
                <Row k={`Latest stub (${shortDate(latest.fields.payDate)})`} v="" />
                <Row k="Gross" v={money(latest.fields.grossCurrent)} />
                <Row k="Federal income tax" v={money(tax("federal_income"))} />
                <Row k="Social Security + Medicare" v={money((tax("social_security") ?? 0) + (tax("medicare") ?? 0))} />
                <Row k="Net pay" v={money(latest.fields.netCurrent)} />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No pay stubs yet.</p>
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
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-800">{v}</dd>
    </div>
  );
}

const statusTone: Record<ChecklistStatus, "neutral" | "success" | "danger" | "warning"> = {
  expected: "neutral",
  received: "success",
  mismatch: "danger",
  overdue: "warning",
};

export function ChecklistView({
  items,
  onStatusChange,
}: {
  items: ChecklistItem[];
  onStatusChange?: (id: string, status: ChecklistStatus) => void;
}) {
  if (items.length === 0) return <p className="text-sm text-slate-500">No documents expected yet.</p>;
  return (
    <Card padding="none">
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="font-medium text-slate-900">{item.formType}</p>
              <p className="text-sm text-slate-500">
                {item.source} · due {shortDate(item.dueDate)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone[item.status]}>{label(item.status)}</Badge>
              {onStatusChange && item.formType !== "W-2" && (item.status === "expected" || item.status === "overdue") && (
                <button
                  type="button"
                  onClick={() => onStatusChange(item.id, "received")}
                  className="no-print text-sm font-medium text-brand-700 hover:underline"
                >
                  Mark received
                </button>
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

export function W2Box({ w2 }: { w2: W2 }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      <Row k="Box 1 wages" v={money(w2.box1Wages)} />
      <Row k="Box 2 federal withheld" v={money(w2.box2FederalWithheld)} />
      <Row k="Box 3 SS wages" v={money(w2.box3SsWages)} />
      <Row k="Box 5 Medicare wages" v={money(w2.box5MedicareWages)} />
    </dl>
  );
}
