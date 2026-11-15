import type { HouseholdData, Paystub } from "../types";
import { type CheckupResult, runCheckup } from "./index";
import type { CheckStatus } from "./checkSummary";

// The checkup as it stood on an earlier pay stub. runCheckup checks the latest stub of each job; to see
// an older stub's checks, run it on the household as of that stub's pay date: same jobs and profile,
// pay stubs up to that date, no W-2s (those come after the year ends).

/** The household's data as of one saved pay stub, or null if there is no such stub. */
export function householdAsOfStub(data: HouseholdData, stubId: string): HouseholdData | null {
  const stub = data.documents.find((d) => d.id === stubId && d.docType === "paystub");
  if (!stub) return null;
  const payDate = (stub.fields as Paystub).payDate;
  return {
    ...data,
    documents: data.documents.filter(
      (d) => d.docType === "paystub" && d.taxYear === stub.taxYear && (d.fields as Paystub).payDate <= payDate,
    ),
  };
}

export interface StubCheckup {
  result: CheckupResult;
  /** Worst status of the checks that ran on this stub; null if no check ran (e.g. its job isn't on file). */
  status: CheckStatus | null;
  /** Findings about this stub (not the household-wide April balance). */
  findings: number;
}

const RANK: Record<CheckStatus, number> = { ok: 0, worth_checking: 1, fix_now: 2 };

/** The checks of one pay stub, run as if it were the job's latest. */
export function checkupAsOfStub(data: HouseholdData, stubId: string, asOf?: string): StubCheckup | null {
  const scoped = householdAsOfStub(data, stubId);
  if (!scoped) return null;
  const stub = data.documents.find((d) => d.id === stubId)!;
  const fields = stub.fields as Paystub;
  const result = runCheckup(scoped, asOf ?? fields.payDate);
  const own = result.checks.find(
    (c) => c.payDate === fields.payDate && (stub.employerId ? c.employerId === stub.employerId : c.employerName === fields.employerName),
  );
  const status = own && own.checks.length > 0 ? own.checks.reduce<CheckStatus>((w, c) => (RANK[c.status] > RANK[w] ? c.status : w), "ok") : null;
  const findings = own ? result.findings.filter((f) => f.employerId === own.employerId && !f.code.startsWith("W2_")).length : 0;
  return { result, status, findings };
}
