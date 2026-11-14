import type { Finding, HouseholdData, Paystub, W2 } from "../types";
import { federalParams, SUPPORTED_YEARS } from "./params";
import { sortByPayDate } from "./paystub";
import { checkPaystub } from "./checks";
import { type JobInput, type ProjectionDetail, projectionFindings, projectYear } from "./projection";
import { type ReconcileRow, reconcileW2 } from "./reconcileW2";
import { type ExpectedDoc, expectedDocs } from "./expectedDocs";

export type { ProjectionDetail, ReconcileRow, ExpectedDoc };
export { federalParams, SUPPORTED_YEARS };

export interface CheckupResult {
  taxYear: number;
  projection: ProjectionDetail | null;
  findings: Finding[];
  reconciliation: Array<{ employerId: string | null; employerName: string; rows: ReconcileRow[] }>;
  checklist: ExpectedDoc[];
  notes: string[];
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

  for (const settings of data.employers) {
    const own = sortByPayDate(
      stubs
        .filter((d) => d.taxYear === taxYear && (d.employerId === settings.id || (!d.employerId && (d.fields as Paystub).employerName === settings.employerName)))
        .map((d) => d.fields as Paystub),
    );
    if (own.length === 0) {
      notes.push(`No ${taxYear} pay stub yet for ${settings.employerName}. Add one to include this job.`);
      continue;
    }
    findings.push(...checkPaystub(own[0], own[1] ?? null, settings, status, p));
    jobs.push({ settings, latestStub: own[0] });
    lastStubByEmployer.set(settings.id, own[0]);
  }

  let projection: ProjectionDetail | null = null;
  if (jobs.length > 0) {
    projection = projectYear(jobs, data.profile, p);
    findings.push(...projectionFindings(projection, jobs));
    if (data.employers.length > jobs.length) notes.push("The projection only includes jobs with a pay stub.");
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
  return { taxYear, projection, findings, reconciliation, checklist: expectedDocs(data, taxYear, asOf, mismatched), notes };
}
