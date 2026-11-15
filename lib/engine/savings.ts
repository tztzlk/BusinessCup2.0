import type { Finding } from "../types";
import { round2, sum } from "./money";

// What a finding's amountUsd measures, and the household's "potential savings": money the household
// gets back or stops losing by acting on a finding. Kept here so every screen counts it the same way.

/**
 * Unit of Finding.amountUsd:
 * - "year": a full year (401(k) match, withholding vs. W-4 x pay periods);
 * - "paycheck": the checked pay stub only (overtime, FICA, net pay, YTD);
 * - "april": the projected balance due or refund at filing;
 * - "w2": the difference on one W-2 box.
 */
export type ImpactPeriod = "year" | "paycheck" | "april" | "w2";

const PERIOD: Record<string, ImpactPeriod> = {
  UNDERWITHHOLDING: "april",
  OVERWITHHOLDING: "april",
  WITHHOLDING_DIFFERS_FROM_W4: "year",
  MATCH_LEFT_ON_TABLE: "year",
  MATCH_UNDERPAID: "year",
  NET_PAY_MISMATCH: "paycheck",
  YTD_DECREASED: "paycheck",
  SOCIAL_SECURITY_MISMATCH: "paycheck",
  MEDICARE_MISMATCH: "paycheck",
  OVERTIME_UNDERPAID: "paycheck",
  POSSIBLE_UNPAID_OVERTIME: "paycheck",
};

/** null = a code this version doesn't know; show its amount without a unit. */
export function findingPeriod(code: string): ImpactPeriod | null {
  if (PERIOD[code]) return PERIOD[code];
  if (/^W2_BOX\w+_MISMATCH$/.test(code)) return "w2";
  return null;
}

export interface SavingsItem {
  finding: Finding;
  period: "year" | "paycheck";
}

export interface PotentialSavings {
  /** Recurring: 401(k) match the household misses or isn't paid, per year. */
  perYear: number;
  /** Owed on the pay stubs that were checked: unpaid overtime, FICA overcharged, net pay short. */
  onCheckedPaychecks: number;
  /** The findings counted, each once. */
  items: SavingsItem[];
}

const num = (v: number | string | undefined) => (typeof v === "number" ? v : null);

/**
 * Money the household can recover. Counted:
 * - MATCH_LEFT_ON_TABLE, MATCH_UNDERPAID (per year);
 * - OVERTIME_UNDERPAID, POSSIBLE_UNPAID_OVERTIME (on the checked stub);
 * - SOCIAL_SECURITY_MISMATCH, MEDICARE_MISMATCH only when the stub took more than expected;
 * - NET_PAY_MISMATCH only when the printed net is below what the stub's own lines add up to.
 * Not counted: UNDERWITHHOLDING / OVERWITHHOLDING (the same tax, paid earlier or later),
 * WITHHOLDING_DIFFERS_FROM_W4 (overlaps the April balance), YTD_DECREASED and W-2 box differences
 * (a correction to a record, not money). The counted checks look at different lines of a stub,
 * so no dollar is in two of them; each finding is counted once.
 */
export function potentialSavings(findings: readonly Finding[]): PotentialSavings {
  const items: SavingsItem[] = [];
  const seen = new Set<Finding>();
  for (const f of findings) {
    if (seen.has(f) || !(f.amountUsd > 0)) continue;
    seen.add(f);
    switch (f.code) {
      case "MATCH_LEFT_ON_TABLE":
      case "MATCH_UNDERPAID":
        items.push({ finding: f, period: "year" });
        break;
      case "OVERTIME_UNDERPAID":
      case "POSSIBLE_UNPAID_OVERTIME":
        items.push({ finding: f, period: "paycheck" });
        break;
      case "SOCIAL_SECURITY_MISMATCH":
      case "MEDICARE_MISMATCH": {
        const printed = num(f.inputs.printed);
        const expected = num(f.inputs.expected);
        if (printed !== null && expected !== null && printed > expected) items.push({ finding: f, period: "paycheck" });
        break;
      }
      case "NET_PAY_MISMATCH": {
        const printed = num(f.inputs.printedNet);
        const expected = num(f.inputs.expectedNet);
        if (printed !== null && expected !== null && printed < expected) items.push({ finding: f, period: "paycheck" });
        break;
      }
    }
  }
  return {
    perYear: round2(sum(items.filter((i) => i.period === "year").map((i) => i.finding.amountUsd))),
    onCheckedPaychecks: round2(sum(items.filter((i) => i.period === "paycheck").map((i) => i.finding.amountUsd))),
    items,
  };
}
