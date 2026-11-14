import type { EmploymentSettings, FilingStatus } from "../types";
import { type FederalParams, withholdingStatus } from "./params";
import { pos, round2 } from "./money";

/**
 * Federal income tax an employer should withhold for one pay period, following
 * IRS Pub. 15-T Worksheet 1A (Percentage Method, Form W-4 from 2020 or later).
 */
export function expectedWithholding(
  periodTaxableWages: number,
  periodsPerYear: number,
  status: FilingStatus,
  w4: EmploymentSettings["w4"],
  p: FederalParams,
): number {
  const ws = withholdingStatus(status);
  const w = p.withholding;
  const annual = periodTaxableWages * periodsPerYear + w4.step4aOtherIncome; // 1c + 1d
  const adjustment = w4.step2Checked ? 0 : ws === "married_joint" ? w.step2NotCheckedAdjustment.married_joint : w.step2NotCheckedAdjustment.other;
  const adjusted = pos(annual - (w4.step4bDeductions + adjustment)); // 1i

  const table = (w4.step2Checked ? w.step2Checked : w.standard)[ws];
  let row = table[0];
  for (const r of table) if (adjusted >= r[0]) row = r;
  const [atLeast, base, rate] = row;
  const annualTentative = base + (adjusted - atLeast) * rate; // 2g
  const tentative = annualTentative / periodsPerYear; // 2h
  const afterCredits = pos(tentative - w4.step3Credits / periodsPerYear); // 3c
  return round2(afterCredits + w4.step4cExtraWithholding); // 4b
}
