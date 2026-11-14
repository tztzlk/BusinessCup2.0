import type { EmploymentSettings, Finding, HouseholdProfile, Paystub, Projection } from "../types";
import type { FederalParams } from "./params";
import { pos, round2, sum } from "./money";
import { federalWages, ficaWages, overtimePay, remainingPayPeriods, tax } from "./paystub";
import { additionalMedicareDue, bracketTax, childCredits, overtimeDeduction } from "./tax";

export interface JobInput {
  settings: EmploymentSettings;
  latestStub: Paystub;
}

export interface ProjectionDetail extends Projection {
  inputs: Record<string, number>;
}

/**
 * Full-year projection for the household: year-to-date from each job's latest stub
 * plus the current paycheck repeated for the remaining pay periods.
 * Standard deduction only (itemizing is out of scope for now).
 */
export function projectYear(jobs: JobInput[], profile: HouseholdProfile, p: FederalParams): ProjectionDetail {
  const status = profile.filingStatus;
  const rows = jobs.map(({ settings, latestStub: s }) => {
    const n = remainingPayPeriods(s.payDate, s.payFrequency, p);
    const ytd = (cur: number, y: number) => y + cur * n;
    return {
      employerId: settings.id,
      remaining: n,
      fedWages: ytd(federalWages(s, "current"), federalWages(s, "ytd")),
      ficaWages: ytd(ficaWages(s, "current"), ficaWages(s, "ytd")),
      withheld: ytd(tax(s, "federal_income", "current"), tax(s, "federal_income", "ytd")),
      overtime: ytd(overtimePay(s, "current"), overtimePay(s, "ytd")),
    };
  });

  const agi = sum(rows.map((r) => r.fedWages));
  const otPremium = sum(rows.map((r) => r.overtime)) / 3; // the "half" in time-and-a-half
  const otDeduction = overtimeDeduction(otPremium, agi, status, p);
  const taxable = pos(agi - p.standardDeduction[status] - otDeduction);
  const regularTax = bracketTax(taxable, status, p);
  const credits = childCredits(regularTax, profile.dependentsUnder17, profile.otherDependents, agi, agi, status, p);
  const addl = additionalMedicareDue(rows.map((r) => r.ficaWages), status, p);
  const projectedTax = round2(pos(regularTax - credits.nonRefundable) + addl.liability - credits.refundable);
  const projectedWithholding = round2(sum(rows.map((r) => r.withheld)) + addl.withheld);
  const balance = round2(projectedTax - projectedWithholding);

  const totalWages = sum(rows.map((r) => r.fedWages)) || 1;
  const perEmployer = rows.map((r) => ({
    employerId: r.employerId,
    remainingPayPeriods: r.remaining,
    recommendedStep4c: balance > 0 && r.remaining > 0 ? Math.ceil((balance * (r.fedWages / totalWages)) / r.remaining) : 0,
  }));

  return {
    taxYear: p.taxYear,
    projectedTax,
    projectedWithholding,
    balance,
    perEmployer,
    inputs: {
      agi: round2(agi),
      standardDeduction: p.standardDeduction[status],
      overtimeDeduction: otDeduction,
      taxableIncome: round2(taxable),
      regularTax,
      childCreditsNonRefundable: credits.nonRefundable,
      childCreditsRefundable: credits.refundable,
      additionalMedicareLiability: addl.liability,
    },
  };
}

export function projectionFindings(proj: ProjectionDetail, jobs: JobInput[]): Finding[] {
  const findings: Finding[] = [];
  const twoJobs = jobs.length > 1;
  const noStep2 = jobs.every((j) => !j.settings.w4.step2Checked);

  if (proj.balance > 100) {
    const lines = proj.perEmployer
      .filter((e) => e.recommendedStep4c > 0)
      .map((e) => {
        const name = jobs.find((j) => j.settings.id === e.employerId)?.settings.employerName ?? "this job";
        return `add ${usd(e.recommendedStep4c)} per paycheck in Step 4(c) at ${name}`;
      });
    const step2 = twoJobs && noStep2 ? " Both jobs have the W-4 Step 2 box unchecked, which is the most common cause for two-earner households." : "";
    findings.push({
      code: "UNDERWITHHOLDING",
      severity: proj.balance > 1000 ? "critical" : "warning",
      amountUsd: proj.balance,
      employerId: null,
      inputs: { ...proj.inputs, projectedTax: proj.projectedTax, projectedWithholding: proj.projectedWithholding },
      action: {
        kind: "w4_change",
        details: lines.length > 0
          ? `To avoid owing about ${usd(proj.balance)} in April: ${lines.join("; ")}.${step2}`
          : `No paychecks left this year to fix it. For next year, update your W-4.${step2}`,
      },
    });
  } else if (proj.balance < -500) {
    const periods = sum(proj.perEmployer.map((e) => e.remainingPayPeriods));
    findings.push({
      code: "OVERWITHHOLDING",
      severity: "info",
      amountUsd: round2(-proj.balance),
      employerId: null,
      inputs: { ...proj.inputs, projectedTax: proj.projectedTax, projectedWithholding: proj.projectedWithholding },
      action: {
        kind: "w4_change",
        details: periods > 0
          ? `You're on track for a refund of about ${usd(-proj.balance)}. That's money you could keep in your paychecks instead: review your W-4 for next year.`
          : `You're on track for a refund of about ${usd(-proj.balance)}.`,
      },
    });
  }
  return findings;
}

/** Whole dollars with thousands separators, for action texts. */
function usd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
