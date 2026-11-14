import type { EmploymentSettings, Finding, HouseholdProfile, Paystub, Projection } from "../types";
import type { FederalParams } from "./params";
import { pos, round2, sum } from "./money";
import {
  DEFAULT_PAY_FREQUENCY,
  elapsedPayPeriods,
  federalWages,
  ficaWages,
  hasNonRecurringPay,
  overtimePay,
  periodsPerYear,
  preTaxForFederal,
  preTaxForFica,
  recurringGross,
  remainingPayPeriods,
  tax,
  withEstimatedYtd,
  withKnownFrequency,
} from "./paystub";
import { additionalMedicareDue, bracketTax, childCredits, overtimeDeduction } from "./tax";
import { expectedWithholding } from "./withholding";

export interface JobInput {
  settings: EmploymentSettings;
  /** null = no pay stub yet: the job is estimated from its settings (salary or hourly rate, W-4). */
  latestStub: Paystub | null;
}

export interface ProjectionDetail extends Projection {
  inputs: Record<string, number>;
  /** Some numbers are estimates (missing YTD, a job without a stub, a one-time bonus, a guessed pay frequency). */
  estimated: boolean;
  /** A job has neither a stub nor a pay rate: the totals leave it out and must not be shown as the household's. */
  incomplete: boolean;
  notes: string[];
}

interface JobRow {
  employerId: string;
  remaining: number;
  fedWages: number;
  ficaWages: number;
  withheld: number;
  overtime: number;
}

/**
 * Full-year projection for the household: year-to-date from each job's latest stub
 * plus the current recurring paycheck repeated for the remaining pay periods.
 * A job without a stub is estimated from its settings (Pub. 15-T Worksheet 1A for withholding).
 * Standard deduction only (itemizing is out of scope for now).
 */
export function projectYear(jobs: JobInput[], profile: HouseholdProfile, p: FederalParams): ProjectionDetail {
  const status = profile.filingStatus;
  const notes: string[] = [];
  let estimated = false;
  let incomplete = false;
  const stubDates = jobs.flatMap((j) => (j.latestStub ? [j.latestStub.payDate] : [])).sort();
  const asOfPayDate = stubDates[stubDates.length - 1] ?? null;

  const rows: JobRow[] = [];
  for (const { settings, latestStub } of jobs) {
    const name = settings.employerName;
    if (!latestStub) {
      const row = estimateJobWithoutStub(settings, asOfPayDate, status, p);
      if (!row) {
        incomplete = true;
        notes.push(`No ${p.taxYear} pay stub for ${name} and no salary or hourly rate in its settings, so the April projection would be incomplete. Add a pay stub or the pay rate for this job.`);
        continue;
      }
      estimated = true;
      notes.push(`No ${p.taxYear} pay stub for ${name} yet: the projection estimates this job from the pay rate and W-4 in its settings (${usd(row.fedWages)} a year, before pre-tax deductions). Add a stub for exact numbers.`);
      rows.push(row);
      continue;
    }

    const freq = withKnownFrequency(latestStub);
    if (freq.note) {
      estimated = true;
      notes.push(freq.note);
    }
    const { stub: s, estimated: ytdEstimated } = withEstimatedYtd(freq.stub, p);
    if (ytdEstimated) {
      estimated = true;
      notes.push(`Some year-to-date amounts are missing on the ${name} stub; we estimated them as this paycheck times ${elapsedPayPeriods(s.payDate, s.payFrequency, p)} pay periods so far.`);
    }

    const n = remainingPayPeriods(s.payDate, s.payFrequency, p);
    const regular = recurringGross(s);
    const fedPerPeriod = round2(regular - preTaxForFederal(s, "current"));
    const ficaPerPeriod = round2(regular - preTaxForFica(s, "current"));
    // A one-time payment can be withheld at the flat supplemental rate, so this paycheck's withholding
    // doesn't repeat: estimate the regular paychecks from the W-4 instead.
    const oneOff = hasNonRecurringPay(s);
    const withheldPerPeriod = oneOff
      ? expectedWithholding(fedPerPeriod, periodsPerYear(s.payFrequency, p), status, settings.w4, p)
      : tax(s, "federal_income", "current");
    if (oneOff) {
      estimated = true;
      notes.push(`The bonus or other one-time pay on the ${name} stub is counted once, not repeated for the remaining paychecks.`);
    }
    rows.push({
      employerId: settings.id,
      remaining: n,
      fedWages: federalWages(s, "ytd") + fedPerPeriod * n,
      ficaWages: ficaWages(s, "ytd") + ficaPerPeriod * n,
      withheld: tax(s, "federal_income", "ytd") + withheldPerPeriod * n,
      overtime: overtimePay(s, "ytd") + overtimePay(s, "current") * n,
    });
  }

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
    estimated,
    incomplete,
    notes,
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

/**
 * A full year for a job with no pay stub, from its settings: salary, or hourly rate x standard hours.
 * Paid on the default frequency; remaining paychecks counted from the household's latest stub. null = no pay info.
 */
function estimateJobWithoutStub(settings: EmploymentSettings, asOfPayDate: string | null, status: HouseholdProfile["filingStatus"], p: FederalParams): JobRow | null {
  const annual =
    settings.annualSalary && settings.annualSalary > 0
      ? settings.annualSalary
      : settings.hourlyRate && settings.hourlyRate > 0
        ? settings.hourlyRate * p.estimates.standardHoursPerYear
        : null;
  if (annual === null) return null;
  const periods = periodsPerYear(DEFAULT_PAY_FREQUENCY, p);
  const withheld = expectedWithholding(annual / periods, periods, status, settings.w4, p) * periods;
  return {
    employerId: settings.id,
    remaining: asOfPayDate ? remainingPayPeriods(asOfPayDate, DEFAULT_PAY_FREQUENCY, p) : 0,
    fedWages: round2(annual),
    ficaWages: round2(annual),
    withheld: round2(withheld),
    overtime: 0,
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
