import type { Finding, HouseholdData, Paystub } from "../types";
import { type CheckupResult, runCheckup } from "./index";
import { round2 } from "./money";
import { sortByPayDate } from "./paystub";
import { type PotentialSavings, potentialSavings } from "./savings";

// The dashboard's numbers, all taken from the checkup: April outlook, income and withholding from the
// projection, potential savings, and a change vs. the previous pay stub when the two are comparable.

export type AprilOutlook = "owe" | "refund" | "on_track";

/**
 * The engine raises a balance finding only when the gap is worth acting on (UNDERWITHHOLDING /
 * OVERWITHHOLDING); without one the household is on track, even if the raw balance is a few dollars.
 */
export function aprilOutlook(findings: readonly Finding[]): AprilOutlook {
  if (findings.some((f) => f.code === "UNDERWITHHOLDING")) return "owe";
  if (findings.some((f) => f.code === "OVERWITHHOLDING")) return "refund";
  return "on_track";
}

export interface Change {
  previous: number;
  /** Percent change from the previous value, one decimal. */
  percent: number;
}

export interface HouseholdOverview {
  taxYear: number;
  /** Projected adjusted gross income for the year (wages after pre-tax deductions). null = no projection. */
  annualIncome: number | null;
  /** Projected federal income tax withheld for the year. */
  totalWithholding: number | null;
  /** > 0 = owe in April, < 0 = refund. */
  balance: number | null;
  outlook: AprilOutlook | null;
  /** Findings in the report. */
  attention: number;
  savings: PotentialSavings;
  /**
   * Change since the checkup before the newest pay stub. Only when that job has an earlier stub this
   * year, so both projections rest on real stubs for every job; a value is null when a percent would
   * mislead (previous value 0, or the balance flipped between owing and a refund).
   */
  change: { annualIncome: Change | null; totalWithholding: Change | null; balance: Change | null } | null;
}

function change(previous: number, current: number, signMustMatch = false): Change | null {
  if (previous === 0) return null;
  if (signMustMatch && Math.sign(previous) !== Math.sign(current)) return null;
  return { previous, percent: round2(Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10) };
}

/** The household without its newest pay stub, if that stub's job has an earlier one this tax year. */
function beforeNewestStub(data: HouseholdData, result: CheckupResult): HouseholdData | null {
  const stubs = data.documents.filter((d) => d.docType === "paystub" && d.taxYear === result.taxYear);
  const newest = sortByPayDate(stubs.map((d) => ({ doc: d, payDate: (d.fields as Paystub).payDate })))[0];
  if (!newest) return null;
  const sameJob = (d: (typeof stubs)[number]) =>
    newest.doc.employerId ? d.employerId === newest.doc.employerId : (d.fields as Paystub).employerName === (newest.doc.fields as Paystub).employerName;
  if (stubs.filter(sameJob).length < 2) return null;
  return { ...data, documents: data.documents.filter((d) => d.id !== newest.doc.id) };
}

export function householdOverview(data: HouseholdData, result: CheckupResult = runCheckup(data), asOf?: string): HouseholdOverview {
  const proj = result.projection;
  const overview: HouseholdOverview = {
    taxYear: result.taxYear,
    annualIncome: proj ? proj.inputs.agi ?? null : null,
    totalWithholding: proj ? proj.projectedWithholding : null,
    balance: proj ? proj.balance : null,
    outlook: proj ? aprilOutlook(result.findings) : null,
    attention: result.findings.length,
    savings: potentialSavings(result.findings),
    change: null,
  };
  if (!proj) return overview;

  const before = beforeNewestStub(data, result);
  const prev = before ? runCheckup(before, asOf).projection : null;
  if (prev && prev.taxYear === proj.taxYear) {
    overview.change = {
      annualIncome: prev.inputs.agi !== undefined && overview.annualIncome !== null ? change(prev.inputs.agi, overview.annualIncome) : null,
      totalWithholding: change(prev.projectedWithholding, proj.projectedWithholding),
      balance: change(prev.balance, proj.balance, true),
    };
  }
  return overview;
}
