import { sortByPayDate } from "./engine/paystub";
import type { CheckupResult } from "./engine";
import type { HouseholdData, Paystub, StoredDocument } from "./types";

// Every saved pay stub, newest first. Amounts are the confirmed stub fields; the findings count comes
// from the engine's checkup, which checks the latest stub of each job in the tax year (runCheckup).

export interface PaycheckHistoryRow {
  id: string;
  stub: Paystub;
  employerName: string;
  /** null = the engine didn't check this stub (only the latest one per job is checked). */
  findings: number | null;
}

export function paycheckHistoryRows(data: HouseholdData, result: CheckupResult): PaycheckHistoryRow[] {
  const stubs = data.documents.filter((d): d is StoredDocument & { fields: Paystub } => d.docType === "paystub");
  const belongsTo = (d: StoredDocument & { fields: Paystub }, id: string, name: string) =>
    d.employerId === id || (!d.employerId && d.fields.employerName === name);

  // Same selection as runCheckup: per job, the latest stub of the checkup's tax year.
  const checked = new Map<string, number>();
  for (const e of data.employers) {
    const own = sortByPayDate(
      stubs.filter((d) => d.taxYear === result.taxYear && belongsTo(d, e.id, e.employerName)).map((d) => ({ id: d.id, payDate: d.fields.payDate })),
    );
    if (own.length === 0) continue;
    // Pay stub checks carry the job's id; W-2 reconciliation findings (W2_*) are about the W-2, not a stub.
    checked.set(own[0].id, result.findings.filter((f) => f.employerId === e.id && !f.code.startsWith("W2_")).length);
  }

  return sortByPayDate(stubs.map((d) => ({ ...d, payDate: d.fields.payDate }))).map((d) => {
    const employer = data.employers.find((e) => belongsTo(d, e.id, e.employerName));
    return {
      id: d.id,
      stub: d.fields,
      employerName: employer?.employerName ?? d.fields.employerName,
      findings: checked.get(d.id) ?? null,
    };
  });
}
