import type { FilingStatus } from "../types";
import type { FederalParams } from "./params";
import { pos, round2 } from "./money";

/** Regular income tax on taxable income using the year's bracket schedule. */
export function bracketTax(taxable: number, status: FilingStatus, p: FederalParams): number {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of p.brackets[status]) {
    const top = upper ?? Infinity;
    if (taxable <= lower) break;
    tax += (Math.min(taxable, top) - lower) * rate;
    lower = top;
  }
  return round2(tax);
}

const isJoint = (s: FilingStatus) => s === "married_joint";

/** No Tax on Overtime deduction (2025-2028): half-time premium, capped, phased out by MAGI. */
export function overtimeDeduction(premium: number, magi: number, status: FilingStatus, p: FederalParams): number {
  if (premium <= 0 || status === "married_separate") return 0;
  const od = p.overtimeDeduction;
  const cap = isJoint(status) ? od.cap.married_joint : od.cap.other;
  const threshold = isJoint(status) ? od.phaseOutThreshold.married_joint : od.phaseOutThreshold.other;
  // Schedule 1-A line 19: a partial $1,000 step is dropped ("decrease the result to the next lower whole number").
  const reduction = Math.floor(pos(magi - threshold) / 1000) * od.phaseOutPer1000;
  return round2(pos(Math.min(premium, cap) - reduction));
}

export interface CreditResult {
  nonRefundable: number;
  refundable: number;
}

/** Child Tax Credit + credit for other dependents, with phase-out and refundable portion. */
export function childCredits(
  tax: number,
  childrenUnder17: number,
  otherDependents: number,
  agi: number,
  earnedIncome: number,
  status: FilingStatus,
  p: FederalParams,
): CreditResult {
  const c = p.childTaxCredit;
  const threshold = isJoint(status) ? c.phaseOutThreshold.married_joint : c.phaseOutThreshold.other;
  const gross = childrenUnder17 * c.perChild + otherDependents * c.otherDependentCredit;
  const reduction = Math.ceil(pos(agi - threshold) / 1000) * c.phaseOutPer1000;
  const total = pos(gross - reduction);
  const nonRefundable = Math.min(total, tax);
  const childPart = Math.min(total, childrenUnder17 * c.perChild);
  const refundableCap = Math.min(childrenUnder17 * c.refundablePerChild, childPart);
  const refundable = Math.min(
    pos(total - nonRefundable),
    refundableCap,
    pos(earnedIncome - c.refundableEarnedIncomeFloor) * c.refundableRate,
  );
  return { nonRefundable: round2(nonRefundable), refundable: round2(pos(refundable)) };
}

/** Additional Medicare Tax owed on the return beyond what employers withheld. */
export function additionalMedicareDue(
  medicareWagesByJob: number[],
  status: FilingStatus,
  p: FederalParams,
): { liability: number; withheld: number } {
  const f = p.fica;
  const total = medicareWagesByJob.reduce((a, b) => a + b, 0);
  const liability = pos(total - f.additionalMedicareThreshold[status]) * f.additionalMedicareRate;
  const withheld = medicareWagesByJob.reduce(
    (a, w) => a + pos(w - f.additionalMedicareEmployerWithholdingThreshold) * f.additionalMedicareRate,
    0,
  );
  return { liability: round2(liability), withheld: round2(withheld) };
}
