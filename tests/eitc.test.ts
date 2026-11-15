import { describe, expect, it } from "vitest";
import { runCheckup } from "../lib/engine";
import { findingTitle, inputRow } from "../lib/findingCopy";
import { federalParams } from "../lib/engine/params";
import { quickEstimate } from "../lib/engine/quickEstimate";
import { earnedIncomeCredit } from "../lib/engine/tax";
import { SYNTHETIC } from "./engine-crosscheck.cases";

// Earned Income Tax Credit, 2026.
// Amounts: Rev. Proc. 2025-32 section 4.06(1) table and 4.06(2), pp. 14-15 (https://www.irs.gov/pub/irs-drop/rp-25-32.pdf).
// Rates: IRC 32(b)(1) table (https://www.law.cornell.edu/uscode/text/26/32).
// Totals are cross-checked against PolicyEngine-US and Tax-Calculator in tests/engine-crosscheck.test.ts.

const p = federalParams(2026);

describe("2026 EITC parameters = Rev. Proc. 2025-32 sec. 4.06 and IRC 32(b)(1)", () => {
  it("table by number of qualifying children (0, 1, 2, 3 or more)", () => {
    const rows = p.earnedIncomeCredit.byQualifyingChildren;
    expect(rows.map((r) => r.children)).toEqual([0, 1, 2, 3]);
    expect(rows.map((r) => r.earnedIncomeAmount)).toEqual([8680, 13020, 18290, 18290]);
    expect(rows.map((r) => r.maxCredit)).toEqual([664, 4427, 7316, 8231]);
    expect(rows.map((r) => r.phaseOutStart.married_joint)).toEqual([18140, 31160, 31160, 31160]);
    expect(rows.map((r) => r.completedPhaseOut.married_joint)).toEqual([26820, 58863, 65899, 70244]);
    expect(rows.map((r) => r.phaseOutStart.other)).toEqual([10860, 23890, 23890, 23890]);
    expect(rows.map((r) => r.completedPhaseOut.other)).toEqual([19540, 51593, 58629, 62974]);
    expect(rows.map((r) => r.creditRate)).toEqual([0.0765, 0.34, 0.4, 0.45]);
    expect(rows.map((r) => r.phaseOutRate)).toEqual([0.0765, 0.1598, 0.2106, 0.2106]);
    expect(p.earnedIncomeCredit.investmentIncomeLimit).toBe(12200);
  });

  it("the Rev. Proc. amounts are consistent with the statutory rates (max credit = rate x earned income amount, to the dollar)", () => {
    for (const r of p.earnedIncomeCredit.byQualifyingChildren) {
      expect(Math.abs(r.creditRate * r.earnedIncomeAmount - r.maxCredit)).toBeLessThanOrEqual(0.5);
      for (const k of ["married_joint", "other"] as const) {
        // The credit reaches zero within a dollar of the completed phaseout amount.
        expect(Math.abs(r.phaseOutStart[k] + r.maxCredit / r.phaseOutRate - r.completedPhaseOut[k])).toBeLessThan(1);
      }
    }
  });
});

describe("earnedIncomeCredit()", () => {
  it("phase-in: credit rate x earned income", () => {
    expect(earnedIncomeCredit(10000, 10000, 1, "head_of_household", p)).toBe(3400); // 34% x 10,000
    expect(earnedIncomeCredit(5000, 5000, 0, "single", p)).toBe(382.5); // 7.65% x 5,000
  });

  it("plateau: the maximum credit from the earned income amount to the phaseout threshold", () => {
    expect(earnedIncomeCredit(18290, 18290, 3, "married_joint", p)).toBe(8231); // at the earned income amount: the Rev. Proc. maximum
    expect(earnedIncomeCredit(23890, 23890, 2, "head_of_household", p)).toBe(7316);
    expect(earnedIncomeCredit(31160, 31160, 1, "married_joint", p)).toBe(4427);
  });

  it("phase-out: maximum - phaseout rate x (income - threshold)", () => {
    expect(earnedIncomeCredit(55000, 55000, 2, "head_of_household", p)).toBe(764.23); // 7,316 - 21.06% x 31,110
    expect(earnedIncomeCredit(15000, 15000, 0, "single", p)).toBe(347.29); // 664 - 7.65% x 4,140
  });

  it("zero at or above the completed phaseout amount", () => {
    expect(earnedIncomeCredit(58629, 58629, 2, "head_of_household", p)).toBe(0);
    expect(earnedIncomeCredit(51593, 51593, 1, "single", p)).toBe(0); // the formula alone would leave $0.06
    expect(earnedIncomeCredit(70244, 70244, 5, "married_joint", p)).toBe(0);
    expect(earnedIncomeCredit(70243, 70243, 5, "married_joint", p)).toBeGreaterThan(0);
  });

  it("4 or more children use the three-or-more row", () => {
    expect(earnedIncomeCredit(40000, 40000, 4, "married_joint", p)).toBe(earnedIncomeCredit(40000, 40000, 3, "married_joint", p));
  });

  it("phases out on AGI when AGI is greater than earned income (IRC 32(a)(2))", () => {
    // Earned 10,000 -> phase-in 3,400; AGI 40,000 -> ceiling 4,427 - 15.98% x 16,110 = 1,852.62
    expect(earnedIncomeCredit(10000, 40000, 1, "single", p)).toBe(1852.62);
  });

  it("married filing separately: no credit (IRC 32(d)(1); the separated-spouse exception is not modeled)", () => {
    expect(earnedIncomeCredit(20000, 20000, 1, "married_separate", p)).toBe(0);
  });

  it("no credit without earned income or with investment income over $12,200 (IRC 32(i))", () => {
    expect(earnedIncomeCredit(0, 0, 2, "head_of_household", p)).toBe(0);
    expect(earnedIncomeCredit(20000, 20000, 2, "head_of_household", p, 12200)).toBe(7316);
    expect(earnedIncomeCredit(20000, 20000, 2, "head_of_household", p, 12201)).toBe(0);
  });
});

describe("earnedIncomeCredit() edges, computed by hand from the Rev. Proc. 2025-32 sec. 4.06 table", () => {
  it.each([
    // [earned = AGI, qualifying children, status, expected]
    [8680, 0, "single", 664], // exactly the earned income amount: the table maximum (7.65% x 8,680 = 664.02)
    [8679, 0, "single", 663.94], // $1 below: 7.65% x 8,679 = 663.9435
    [10860, 0, "single", 664], // exactly the threshold phaseout amount
    [10861, 0, "single", 663.92], // $1 above: 664 - 7.65% x 1
    [19539, 0, "single", 0.06], // $1 below completed phaseout: 664 - 7.65% x 8,679
    [19540, 0, "single", 0], // exactly the completed phaseout amount
    [26819, 0, "married_joint", 0.06], // MFJ: 664 - 7.65% x (26,819 - 18,140)
    [26820, 0, "married_joint", 0],
    [13019, 1, "head_of_household", 4426.46], // 34% x 13,019
    [13020, 1, "head_of_household", 4427],
    [31161, 2, "married_joint", 7315.79], // 7,316 - 21.06% x 1
    [65898, 2, "married_joint", 0.18], // 7,316 - 21.06% x 34,738 = 0.1772
    [65899, 2, "married_joint", 0],
    [18290, 4, "married_joint", 8231], // 4 children = three-or-more row
    [50000, 6, "married_joint", 4263.3], // 8,231 - 21.06% x 18,840
    [62973, 3, "single", 0.12], // 8,231 - 21.06% x 39,083 = 0.1202
    [62974, 3, "single", 0],
  ] as const)("earned %d, %d children, %s -> %d", (income, kids, status, expected) => {
    expect(earnedIncomeCredit(income, income, kids, status, p)).toBe(expected);
  });
});

describe("EITC in the annual projection", () => {
  it("is a refundable credit: it can turn the balance into a refund beyond the withholding", () => {
    const r = quickEstimate({ filingStatus: "head_of_household", salary: 25000, spouseSalary: 0, childrenUnder17: 1, step2Checked: false, childrenOnW4: false })!;
    expect(r.inputs.earnedIncomeCredit).toBe(4249.62);
    // 85 regular tax - 85 CTC - 1,700 refundable CTC - 4,249.62 EITC
    expect(r.annualTax).toBe(-5949.62);
    expect(r.balance).toBeLessThan(-r.annualWithholding);
  });

  it("does not appear above the phase-out (inputs stay as before)", () => {
    const r = quickEstimate({ filingStatus: "married_joint", salary: 90000, spouseSalary: 0, childrenUnder17: 2, step2Checked: false, childrenOnW4: false })!;
    expect(r.inputs.earnedIncomeCredit).toBeUndefined();
  });

  it("the refund finding separates refundable credits from withholding a W-4 change could keep", () => {
    const c = SYNTHETIC.find((x) => x.name === "hoh_25k_1kid_eitc")!;
    const r = runCheckup(c.household, "2026-12-31");
    const proj = r.projection!;
    const f = r.findings.find((x) => x.code === "OVERWITHHOLDING")!;
    expect(f.amountUsd).toBe(-proj.balance);
    expect(-proj.balance).toBeGreaterThan(proj.projectedWithholding);
    expect(f.action.details).toContain("refundable credits");
    expect(r.notes.some((n) => n.includes("Earned Income Tax Credit of $4,250"))).toBe(true);
    // Mostly refundable credits, not over-withholding: the title doesn't say "overpaying".
    expect(findingTitle(f)).toBe("You're on track for a refund");
    expect(inputRow("earnedIncomeCredit", f.inputs.earnedIncomeCredit as number)).toEqual({ label: "Earned income credit", value: "$4,249.62", known: true });
  });

  it("a refund that is mostly withheld tax keeps the over-withholding title", () => {
    const inputs = { projectedTax: 5000, projectedWithholding: 7000 };
    expect(findingTitle({ code: "OVERWITHHOLDING", inputs })).toBe("You're overpaying tax every paycheck");
    // Credits beyond the tax (1,000) are less than the withholding (3,000): most of the 4,000 refund was withheld.
    expect(findingTitle({ code: "OVERWITHHOLDING", inputs: { projectedTax: -1000, projectedWithholding: 3000 } })).toBe("You're overpaying tax every paycheck");
    expect(findingTitle({ code: "OVERWITHHOLDING", inputs: { projectedTax: -3000, projectedWithholding: 1000 } })).toBe("You're on track for a refund");
  });
});
