import { sortByPayDate, tax } from "./engine/paystub";
import type { CheckupResult } from "./engine";
import type { HouseholdData, Paystub, StoredDocument } from "./types";

// Every saved pay stub, newest first. Amounts are the confirmed stub fields; the findings count comes
// from the engine's checkup, which checks the latest stub of each job in the tax year (runCheckup).

export interface PaycheckHistoryRow {
  id: string;
  stub: Paystub;
  employerId: string | null;
  employerName: string;
  /** Federal income tax withheld on this paycheck (the stub's federal_income lines). */
  federalWithheld: number;
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
      employerId: employer?.id ?? null,
      employerName: employer?.employerName ?? d.fields.employerName,
      federalWithheld: tax(d.fields, "federal_income", "current"),
      findings: checked.get(d.id) ?? null,
    };
  });
}

export type PaycheckMetric = "netCurrent" | "grossCurrent" | "federalWithheld";

export interface PaycheckChart {
  /** One line per job, in the order of `rows`. */
  series: Array<{ key: string; name: string }>;
  /** Oldest first; one point per pay date, with a value for each job paid that day. */
  points: Array<{ date: string } & Record<string, number | string>>;
}

/** First day of the window `months` back from `asOf` (YYYY-MM-DD). */
export function windowStart(asOf: string, months: number): string {
  const d = new Date(`${asOf}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

/** Paychecks paid in the last `months` months, ready for a line chart. Values are the stub amounts as saved. */
export function paycheckChart(rows: readonly PaycheckHistoryRow[], metric: PaycheckMetric, months: number, asOf: string): PaycheckChart {
  const from = windowStart(asOf, months);
  const inWindow = rows.filter((r) => r.stub.payDate >= from && r.stub.payDate <= asOf);
  const series: PaycheckChart["series"] = [];
  const keyOf = (r: PaycheckHistoryRow) => r.employerId ?? `name:${r.employerName}`;
  for (const r of inWindow) {
    const key = keyOf(r);
    if (!series.some((s) => s.key === key)) series.push({ key, name: r.employerName });
  }
  const byDate = new Map<string, { date: string } & Record<string, number | string>>();
  for (const r of [...inWindow].reverse()) {
    const point = byDate.get(r.stub.payDate) ?? { date: r.stub.payDate };
    point[keyOf(r)] = metric === "federalWithheld" ? r.federalWithheld : r.stub[metric];
    byDate.set(r.stub.payDate, point);
  }
  return { series, points: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}
