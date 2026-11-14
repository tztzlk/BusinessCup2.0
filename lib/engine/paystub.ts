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

export function periodsPerYear(freq: PayFrequency, p: FederalParams): number {
  return freq === "unknown" ? p.withholding.payPeriods.biweekly : p.withholding.payPeriods[freq];
}

/** Pay dates left in the calendar year after `payDate`. */
export function remainingPayPeriods(payDate: string, freq: PayFrequency, p: FederalParams): number {
  const date = new Date(`${payDate}T00:00:00Z`);
  const endOfYear = Date.UTC(date.getUTCFullYear(), 11, 31);
  const daysLeft = Math.max(0, Math.round((endOfYear - date.getTime()) / 86_400_000));
  const daysPerPeriod = 365 / periodsPerYear(freq, p);
  return Math.floor(daysLeft / daysPerPeriod);
}

/** Latest stub first. */
export function sortByPayDate<T extends { payDate: string }>(stubs: T[]): T[] {
  return [...stubs].sort((a, b) => b.payDate.localeCompare(a.payDate));
}
