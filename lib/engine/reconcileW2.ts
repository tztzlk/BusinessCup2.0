import type { Finding, Paystub, W2 } from "../types";
import type { FederalParams } from "./params";
import { differs, round2, sum } from "./money";
import { deduction, federalWages, ficaWages, tax } from "./paystub";

export interface ReconcileRow {
  box: string;
  label: string;
  w2: number;
  expected: number;
  matches: boolean;
  /** |W-2 − pay stubs|, rounded to cents. */
  difference: number;
}

/** Compares a W-2 with the year-end totals on the last pay stub of the same year. */
export function reconcileW2(w2: W2, lastStub: Paystub, employerId: string | null, p: FederalParams): { rows: ReconcileRow[]; findings: Finding[] } {
  const fica = ficaWages(lastStub, "ytd");
  const box12 = (code: string) => sum(w2.box12.filter((b) => b.code.toUpperCase() === code).map((b) => b.amount));
  const hsaEmployer = sum(lastStub.employerContributions.filter((c) => c.type === "hsa").map((c) => c.ytd ?? 0));

  const rows: ReconcileRow[] = [
    { box: "1", label: "Wages, tips, other compensation", w2: w2.box1Wages, expected: federalWages(lastStub, "ytd") },
    { box: "2", label: "Federal income tax withheld", w2: w2.box2FederalWithheld, expected: tax(lastStub, "federal_income", "ytd") },
    { box: "3", label: "Social Security wages", w2: w2.box3SsWages, expected: Math.min(fica, p.fica.socialSecurityWageBase) },
    { box: "4", label: "Social Security tax withheld", w2: w2.box4SsWithheld, expected: tax(lastStub, "social_security", "ytd") },
    { box: "5", label: "Medicare wages", w2: w2.box5MedicareWages, expected: fica },
    { box: "6", label: "Medicare tax withheld", w2: w2.box6MedicareWithheld, expected: tax(lastStub, "medicare", "ytd") },
    { box: "12 D", label: "401(k) elective deferrals", w2: box12("D"), expected: deduction(lastStub, "401k_pretax", "ytd") },
    { box: "12 W", label: "HSA contributions", w2: box12("W"), expected: deduction(lastStub, "hsa", "ytd") + hsaEmployer },
  ].map((r) => ({ ...r, expected: round2(r.expected), matches: !differs(r.w2, r.expected), difference: round2(Math.abs(r.w2 - r.expected)) }));

  const findings: Finding[] = rows
    .filter((r) => !r.matches)
    .map((r) => ({
      code: `W2_BOX${r.box.replace(/\s+/g, "")}_MISMATCH`,
      severity: "warning" as const,
      amountUsd: round2(Math.abs(r.w2 - r.expected)),
      employerId,
      inputs: { box: r.box, onW2: r.w2, fromPayStubs: r.expected },
      action: {
        kind: "ask_w2c" as const,
        details: `W-2 box ${r.box} (${r.label}) differs from your year-end pay stub by $${Math.abs(round2(r.w2 - r.expected)).toLocaleString("en-US", { minimumFractionDigits: 2 })}. Ask your employer to confirm it or issue a corrected W-2 (W-2c) before you file.`,
      },
    }));

  return { rows, findings };
}
