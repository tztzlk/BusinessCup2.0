import type { EmploymentSettings, FilingStatus, HouseholdProfile, Member } from "../types";
import { type FederalParams, federalParams, SUPPORTED_YEARS } from "./params";
import { DEFAULT_PAY_FREQUENCY, periodsPerYear } from "./paystub";
import { type JobInput, projectYear } from "./projection";
import { round2 } from "./money";

/**
 * "Quick estimate" from salaries only, for the landing page: no pay stubs, no PII, runs in the browser.
 * Each job is estimated by the same code the full projection uses for a job without a stub
 * (projectYear -> Pub. 15-T Worksheet 1A per paycheck, default pay frequency, a full year of paychecks),
 * and the annual tax comes from the bracket schedule, standard deduction and Child Tax Credit in params.
 */

export type QuickFilingStatus = Extract<FilingStatus, "married_joint" | "single" | "head_of_household">;

export interface QuickEstimateInput {
  filingStatus: QuickFilingStatus;
  /** Annual salary, dollars. */
  salary: number;
  /** Spouse's annual salary; used only for married filing jointly. 0 = one earner. */
  spouseSalary: number;
  childrenUnder17: number;
  /** W-4 Step 2 ("multiple jobs or spouse works") checked. With two earners it applies to both W-4s, as the form says. */
  step2Checked: boolean;
  /** Children claimed in W-4 Step 3 (on the higher-paying job's W-4, as the form instructs). */
  childrenOnW4: boolean;
  /** Yearly income with nothing withheld (e.g. bank interest). Added to AGI as ordinary income; no self-employment tax. */
  otherIncome?: number;
  /** Extra withholding per paycheck already on the W-4 (Step 4(c)), on the higher-paying job. */
  extraWithholdingPerPaycheck?: number;
}

/** Plain-English reason for the result, when one of the common causes applies. */
export type QuickEstimateCause =
  /** Two earners, Step 2 unchecked: each paycheck is withheld as if it were the household's only job. */
  | "two_jobs_no_step2"
  /** One earner with Step 2 checked: withholding assumes a second job that doesn't exist. */
  | "step2_one_job"
  /** Children not on the W-4: payroll ignores the Child Tax Credit, which comes back as a refund. */
  | "children_not_on_w4";

export interface QuickEstimateResult {
  taxYear: number;
  annualTax: number;
  annualWithholding: number;
  /** > 0 = owe in April, < 0 = refund. */
  balance: number;
  /** Less than a dollar per paycheck either way. */
  aboutEven: boolean;
  payPeriods: number;
  /** Extra withholding per paycheck (on one W-4) that closes the gap over a full year of paychecks; 0 if nothing to close. */
  step4cPerPaycheck: number;
  earners: number;
  cause: QuickEstimateCause | null;
  /** Two earners with Step 2 unchecked: the balance if both W-4s had it checked. */
  balanceIfStep2Checked: number | null;
  inputs: Record<string, number>;
}

const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

function job(id: string, member: Member, salary: number, step2Checked: boolean, step3Credits: number, step4c: number): JobInput {
  const settings: EmploymentSettings = {
    id,
    member,
    employerName: member === "self" ? "Your job" : "Spouse's job",
    payType: "salary",
    annualSalary: salary,
    overtimeEligible: false,
    w4: { step2Checked, step3Credits, step4aOtherIncome: 0, step4bDeductions: 0, step4cExtraWithholding: step4c },
  };
  return { settings, latestStub: null };
}

function project(input: QuickEstimateInput, step2Checked: boolean, p: FederalParams) {
  const salary = clean(input.salary);
  const spouse = input.filingStatus === "married_joint" ? clean(input.spouseSalary) : 0;
  const children = Math.floor(clean(input.childrenUnder17));
  // W-4 Step 3: qualifying children x the per-child credit, claimed on the higher-paying job only.
  const step3 = input.childrenOnW4 ? children * p.childTaxCredit.perChild : 0;
  const selfGetsCredits = salary >= spouse;

  const extra = clean(input.extraWithholdingPerPaycheck ?? 0);
  const jobs: JobInput[] = [];
  if (salary > 0) jobs.push(job("self", "self", salary, step2Checked, selfGetsCredits ? step3 : 0, selfGetsCredits ? extra : 0));
  if (spouse > 0) jobs.push(job("spouse", "spouse", spouse, step2Checked, selfGetsCredits ? 0 : step3, selfGetsCredits ? 0 : extra));
  if (jobs.length === 0) return null;

  const profile: HouseholdProfile = {
    filingStatus: input.filingStatus,
    state: "",
    dependentsUnder17: children,
    otherDependents: 0,
    flags: { mortgage: false, bankInterest: false, brokerage: false, hsa: false },
  };
  return { proj: projectYear(jobs, profile, p, { otherIncome: clean(input.otherIncome ?? 0) }), earners: jobs.length, children };
}

export function quickEstimate(input: QuickEstimateInput, taxYear: number = SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1]): QuickEstimateResult | null {
  const p = federalParams(taxYear);
  const run = project(input, input.step2Checked, p);
  if (!run) return null;
  const { proj, earners, children } = run;

  const payPeriods = periodsPerYear(DEFAULT_PAY_FREQUENCY, p);
  const balance = proj.balance;
  const aboutEven = Math.abs(balance) < payPeriods;

  let cause: QuickEstimateCause | null = null;
  let balanceIfStep2Checked: number | null = null;
  if (earners > 1 && !input.step2Checked && balance > 0) {
    cause = "two_jobs_no_step2";
    balanceIfStep2Checked = project(input, true, p)?.proj.balance ?? null;
  } else if (earners === 1 && input.step2Checked && balance < 0 && !aboutEven) {
    cause = "step2_one_job";
  } else if (children > 0 && !input.childrenOnW4 && balance < 0 && !aboutEven) {
    cause = "children_not_on_w4";
  }

  return {
    taxYear: p.taxYear,
    annualTax: proj.projectedTax,
    annualWithholding: proj.projectedWithholding,
    balance,
    aboutEven,
    payPeriods,
    step4cPerPaycheck: balance > 0 && !aboutEven ? Math.ceil(balance / payPeriods) : 0,
    earners,
    cause,
    balanceIfStep2Checked: balanceIfStep2Checked === null ? null : round2(balanceIfStep2Checked),
    inputs: proj.inputs,
  };
}
