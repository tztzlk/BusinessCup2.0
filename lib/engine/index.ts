import type { EmploymentSettings, Finding, HouseholdData, Paystub, W2 } from "../types";
import { federalParams, SUPPORTED_YEARS } from "./params";
import { deduction, sortByPayDate, withKnownFrequency } from "./paystub";
import { sum } from "./money";
import { type PaystubCheckId, runPaystubChecks } from "./checks";
import { type CheckLine, type CheckStatus, type StubChecks, summarizeStubChecks } from "./checkSummary";
import { type JobInput, type ProjectionDetail, projectionFindings, projectYear } from "./projection";
import { type ReconcileRow, reconcileW2 } from "./reconcileW2";
import { type ExpectedDoc, expectedDocs } from "./expectedDocs";

export type { ProjectionDetail, ReconcileRow, ExpectedDoc, CheckLine, CheckStatus, StubChecks };
export { federalParams, SUPPORTED_YEARS };

export interface CheckupResult {
  taxYear: number;
  projection: ProjectionDetail | null;
  findings: Finding[];
  reconciliation: Array<{ employerId: string | null; employerName: string; rows: ReconcileRow[] }>;
  checklist: ExpectedDoc[];
  notes: string[];
  /** "What we checked": the checks that ran on each job's latest pay stub, with a status from the findings. */
  checks: StubChecks[];
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

/**
 * Runs every check for a household. Pure function: same input, same output.
 * `asOf` (YYYY-MM-DD) drives checklist statuses; the demo uses it to switch November/January.
 */
export function runCheckup(data: HouseholdData, asOf: string = new Date().toISOString().slice(0, 10)): CheckupResult {
  const notes: string[] = [];
  const stubs = data.documents.filter((d) => d.docType === "paystub");
  const years = stubs.map((d) => d.taxYear).filter((y) => SUPPORTED_YEARS.includes(y));
  const taxYear = years.length > 0 ? Math.max(...years) : SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1];
  const p = federalParams(taxYear);
  const status = data.profile.filingStatus;

  const findings: Finding[] = [];
  const jobs: JobInput[] = [];
  const lastStubByEmployer = new Map<string, Paystub>();
  const previousStub = new Map<string, Paystub | null>();

  for (const settings of data.employers) {
    const own = sortByPayDate(
      stubs
        .filter((d) => d.taxYear === taxYear && (d.employerId === settings.id || (!d.employerId && (d.fields as Paystub).employerName === settings.employerName)))
        .map((d) => d.fields as Paystub),
    );
    if (own.length === 0) {
      jobs.push({ settings, latestStub: null });
      continue;
    }
    const latest = withKnownFrequency(own[0]);
    if (latest.note) notes.push(latest.note);
    previousStub.set(settings.id, own[1] ? withKnownFrequency(own[1]).stub : null);
    jobs.push({ settings, latestStub: latest.stub });
    lastStubByEmployer.set(settings.id, latest.stub);
  }

  // The 401(k) limit is per person, so each stub's check needs the deferrals at that person's other jobs.
  const deferralsYtd = (s: Paystub) => deduction(s, "401k_pretax", "ytd") + deduction(s, "401k_roth", "ytd");
  const ranChecks: Array<{ settings: EmploymentSettings; payDate: string; ran: PaystubCheckId[] }> = [];
  for (const { settings, latestStub } of jobs) {
    if (!latestStub) continue;
    const otherJobs = sum(
      jobs.filter((j) => j.latestStub && j.settings.id !== settings.id && j.settings.member === settings.member).map((j) => deferralsYtd(j.latestStub!)),
    );
    const run = runPaystubChecks(latestStub, previousStub.get(settings.id) ?? null, settings, status, p, otherJobs);
    findings.push(...run.findings);
    ranChecks.push({ settings, payDate: latestStub.payDate, ran: run.ran });
  }

  let projection: ProjectionDetail | null = null;
  if (jobs.some((j) => j.latestStub)) {
    const proj = projectYear(jobs, data.profile, p);
    notes.push(...proj.notes);
    // A projection that leaves out a job would show one income as the household's: no total, no W-4 advice.
    if (!proj.incomplete) {
      projection = proj;
      findings.push(...projectionFindings(proj, jobs));
    }
  } else {
    for (const j of jobs) notes.push(`No ${taxYear} pay stub yet for ${j.settings.employerName}. Add one to include this job.`);
  }

  const reconciliation: CheckupResult["reconciliation"] = [];
  const mismatched = new Set<string>();
  for (const d of data.documents.filter((x) => x.docType === "w2" && x.taxYear === taxYear)) {
    const w2 = d.fields as W2;
    const employer = data.employers.find((e) => e.id === d.employerId) ?? data.employers.find((e) => e.employerName === w2.employerName);
    const last = employer ? lastStubByEmployer.get(employer.id) : undefined;
    if (!employer || !last) {
      notes.push(`W-2 from ${w2.employerName}: add the last pay stub of ${taxYear} from this employer to reconcile it.`);
      continue;
    }
    const r = reconcileW2(w2, last, employer.id, p);
    reconciliation.push({ employerId: employer.id, employerName: employer.employerName, rows: r.rows });
    findings.push(...r.findings);
    if (r.findings.length > 0) mismatched.add(employer.id);
  }

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.amountUsd - a.amountUsd);
  const checks: StubChecks[] = ranChecks.map((r) => ({
    employerId: r.settings.id,
    employerName: r.settings.employerName,
    payDate: r.payDate,
    checks: summarizeStubChecks(r.ran, findings, r.settings.id, p),
  }));
  return { taxYear, projection, findings, reconciliation, checklist: expectedDocs(data, taxYear, asOf, mismatched), notes, checks };
}
