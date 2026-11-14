import type { Paystub, PayFrequency } from "../types";
import type { FederalParams } from "./params";
import { round2, sum } from "./money";

// Classification of deductions for each tax base.
// Section 125 (health, dental, vision), payroll HSA and FSA are excluded from federal income tax AND FICA.
// Traditional 401(k) is excluded from federal income tax only. Roth 401(k) is excluded from neither.
const SECTION_125 = new Set(["health", "dental", "vision", "hsa", "fsa"]);

type Period = "current" | "ytd";
const val = (a: { current: number; ytd: number | null }, k: Period) => (k === "current" ? a.current : (a.ytd ?? 0));

export function gross(s: Paystub, k: Period): number {
  if (k === "current") return s.grossCurrent;
  return s.grossYtd ?? sum(s.earnings.map((e) => e.ytd ?? 0));
}

export function preTaxForFederal(s: Paystub, k: Period): number {
  return sum(
    s.deductions.filter((d) => d.preTax && (d.type === "401k_pretax" || SECTION_125.has(d.type) || d.type === "other")).map((d) => val(d, k)),
  );
}

export function preTaxForFica(s: Paystub, k: Period): number {
  return sum(s.deductions.filter((d) => d.preTax && SECTION_125.has(d.type)).map((d) => val(d, k)));
}

export const federalWages = (s: Paystub, k: Period) => round2(gross(s, k) - preTaxForFederal(s, k));
export const ficaWages = (s: Paystub, k: Period) => round2(gross(s, k) - preTaxForFica(s, k));

export function tax(s: Paystub, type: Paystub["taxes"][number]["type"], k: Period): number {
  return sum(s.taxes.filter((t) => t.type === type).map((t) => val(t, k)));
}

export function deduction(s: Paystub, type: Paystub["deductions"][number]["type"], k: Period): number {
  return sum(s.deductions.filter((d) => d.type === type).map((d) => val(d, k)));
}

export function overtimePay(s: Paystub, k: Period): number {
  return sum(s.earnings.filter((e) => e.type === "overtime").map((e) => val(e, k)));
}

/** Assumed when neither the stub nor its pay period dates tell the frequency. */
export const DEFAULT_PAY_FREQUENCY = "biweekly" as const;

export function periodsPerYear(freq: PayFrequency, p: FederalParams): number {
  return p.withholding.payPeriods[freq === "unknown" ? DEFAULT_PAY_FREQUENCY : freq];
}

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

// Calendar length of one pay period for the fixed-length frequencies.
const FIXED_PERIOD_DAYS: Partial<Record<PayFrequency, number>> = { weekly: 7, biweekly: 14 };

/** Pay dates left in the calendar year after `payDate` (a payday on Dec 31 still counts). */
export function remainingPayPeriods(payDate: string, freq: PayFrequency, p: FederalParams): number {
  const daysLeft = Math.max(0, daysBetween(payDate, `${payDate.slice(0, 4)}-12-31`));
  const known = freq === "unknown" ? DEFAULT_PAY_FREQUENCY : freq;
  const daysPerPeriod = FIXED_PERIOD_DAYS[known] ?? 365 / periodsPerYear(known, p);
  return Math.floor(daysLeft / daysPerPeriod);
}

/** Pay dates in the year up to and including `payDate` (at least 1). */
export function elapsedPayPeriods(payDate: string, freq: PayFrequency, p: FederalParams): number {
  return Math.max(1, periodsPerYear(freq, p) - remainingPayPeriods(payDate, freq, p));
}

/** Frequency from the pay period length (inclusive days); null when the dates don't fit any. */
function frequencyFromDates(start: string, end: string): Exclude<PayFrequency, "unknown"> | null {
  const days = daysBetween(start, end) + 1;
  if (!Number.isFinite(days) || days < 5) return null;
  if (days <= 10) return "weekly";
  if (days <= 14) return "biweekly";
  if (days <= 17) return "semimonthly";
  if (days >= 26 && days <= 32) return "monthly";
  return null;
}

/** The stub with a known pay frequency: read from the pay period dates, else the default. Note says which. */
export function withKnownFrequency(s: Paystub): { stub: Paystub; note: string | null } {
  if (s.payFrequency !== "unknown") return { stub: s, note: null };
  const inferred = frequencyFromDates(s.payPeriodStart, s.payPeriodEnd);
  const payFrequency = inferred ?? DEFAULT_PAY_FREQUENCY;
  const note = inferred
    ? `Pay frequency is not on the ${s.employerName} stub; we used ${inferred} from the pay period dates (${s.payPeriodStart} to ${s.payPeriodEnd}).`
    : `Pay frequency is not on the ${s.employerName} stub and the pay period dates don't tell it; we assumed ${DEFAULT_PAY_FREQUENCY}.`;
  return { stub: { ...s, payFrequency }, note };
}

/**
 * The stub with every missing year-to-date amount estimated as this paycheck times the pay periods
 * so far (Pub. 15-T Worksheet 1A line 1c annualizes the same way). `estimated` says whether any was missing.
 */
export function withEstimatedYtd(s: Paystub, p: FederalParams): { stub: Paystub; estimated: boolean } {
  const n = elapsedPayPeriods(s.payDate, s.payFrequency, p);
  let estimated = false;
  const fill = <T extends { current: number; ytd: number | null }>(x: T): T => {
    if (x.ytd !== null) return x;
    estimated = true;
    return { ...x, ytd: round2(x.current * n) };
  };
  const earnings = s.earnings.map(fill);
  const out: Paystub = {
    ...s,
    earnings,
    taxes: s.taxes.map(fill),
    deductions: s.deductions.map(fill),
    employerContributions: s.employerContributions.map(fill),
  };
  if (s.grossYtd === null) {
    out.grossYtd = s.earnings.length > 0 ? round2(sum(earnings.map((e) => e.ytd ?? 0))) : round2(s.grossCurrent * n);
    estimated = true;
  }
  return { stub: out, estimated };
}

// One-time pay that must not be repeated for the remaining paychecks; it counts only through YTD.
const NON_RECURRING = new Set(["bonus", "other"]);

/** Gross pay of this paycheck that recurs every pay period (regular, overtime, PTO, holiday). */
export function recurringGross(s: Paystub): number {
  return round2(s.grossCurrent - sum(s.earnings.filter((e) => NON_RECURRING.has(e.type)).map((e) => e.current)));
}

export const hasNonRecurringPay = (s: Paystub) => s.earnings.some((e) => NON_RECURRING.has(e.type) && e.current > 0);

/** Latest stub first. */
export function sortByPayDate<T extends { payDate: string }>(stubs: T[]): T[] {
  return [...stubs].sort((a, b) => b.payDate.localeCompare(a.payDate));
}
