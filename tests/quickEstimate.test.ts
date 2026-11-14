import { describe, expect, it } from "vitest";
import { federalParams } from "../lib/engine/params";
import { bracketTax, childCredits } from "../lib/engine/tax";
import { expectedWithholding } from "../lib/engine/withholding";
import { type QuickEstimateInput, quickEstimate } from "../lib/engine/quickEstimate";
import { runCheckup } from "../lib/engine";
import { coupleJanuary, coupleNovember, DEMO_JANUARY_AS_OF, DEMO_NOVEMBER_AS_OF } from "../lib/demo";
import { paycheckHistoryRows } from "../lib/paycheckHistory";

const p = federalParams(2026);
const base: QuickEstimateInput = {
  filingStatus: "married_joint",
  salary: 0,
  spouseSalary: 0,
  childrenUnder17: 0,
  step2Checked: false,
  childrenOnW4: false,
};
const noW4 = { step2Checked: false, step3Credits: 0, step4aOtherIncome: 0, step4bDeductions: 0, step4cExtraWithholding: 0 };
const biweekly = p.withholding.payPeriods.biweekly;

describe("quickEstimate", () => {
  it("MFJ, one earner $150k, no children: annual tax equals tax.ts for the same inputs", () => {
    const r = quickEstimate({ ...base, salary: 150000 })!;
    const tax = bracketTax(150000 - p.standardDeduction.married_joint, "married_joint", p);
    expect(r.annualTax).toBeCloseTo(tax, 2);
    // Worked by hand: 150,000 - 32,200 = 117,800 -> 2,480 + 9,120 + 22% * 17,000 = 15,340.
    expect(r.annualTax).toBeCloseTo(15340, 2);
    // Withholding is Pub. 15-T Worksheet 1A on salary / 26, for 26 paychecks.
    const perPaycheck = expectedWithholding(150000 / biweekly, biweekly, "married_joint", noW4, p);
    expect(r.annualWithholding).toBeCloseTo(perPaycheck * biweekly, 2);
    expect(r.earners).toBe(1);
  });

  it("matches tax.ts with children: Child Tax Credit from params", () => {
    const r = quickEstimate({ ...base, salary: 120000, childrenUnder17: 2, childrenOnW4: true })!;
    const regular = bracketTax(120000 - p.standardDeduction.married_joint, "married_joint", p);
    const credits = childCredits(regular, 2, 0, 120000, 120000, "married_joint", p);
    expect(r.annualTax).toBeCloseTo(regular - credits.nonRefundable - credits.refundable, 2);
  });

  it("two earners with Step 2 unchecked owe; checking Step 2 shrinks the gap", () => {
    // The demo couple's salaries: $95,000 + $78,000, one child claimed on the higher earner's W-4.
    const input = { ...base, salary: 95000, spouseSalary: 78000, childrenUnder17: 1, childrenOnW4: true };
    const unchecked = quickEstimate(input)!;
    const checked = quickEstimate({ ...input, step2Checked: true })!;
    expect(unchecked.balance).toBeGreaterThan(0);
    expect(unchecked.cause).toBe("two_jobs_no_step2");
    expect(unchecked.step4cPerPaycheck).toBe(Math.ceil(unchecked.balance / biweekly));
    expect(Math.abs(checked.balance)).toBeLessThan(unchecked.balance);
    expect(unchecked.balanceIfStep2Checked).toBeCloseTo(checked.balance, 2);
    // Same household, same tax: only withholding changes with the W-4.
    expect(checked.annualTax).toBeCloseTo(unchecked.annualTax, 2);
  });

  it("single earner with a standard W-4 is about even", () => {
    // Worksheet 1A subtracts $8,600 and its table starts $7,500 above zero: together the $16,100 standard
    // deduction, with the same bracket rates. So for one job and no other income, a year of withholding equals
    // the year's tax except for rounding each paycheck to the cent (here 26 x $0.003 = $0.08 over-withheld).
    const r = quickEstimate({ ...base, filingStatus: "single", salary: 60000 })!;
    expect(r.annualTax).toBeCloseTo(bracketTax(60000 - p.standardDeduction.single, "single", p), 2);
    expect(Math.abs(r.balance)).toBeLessThan(1);
    expect(Math.abs(r.balance)).toBeLessThan(r.annualTax * 0.01);
    expect(r.aboutEven).toBe(true);
    expect(r.step4cPerPaycheck).toBe(0);
    expect(r.cause).toBeNull();
  });

  it("children not on the W-4 means a refund, with the cause", () => {
    const r = quickEstimate({ ...base, filingStatus: "head_of_household", salary: 55000, childrenUnder17: 2 })!;
    expect(r.balance).toBeLessThan(0);
    expect(r.cause).toBe("children_not_on_w4");
  });

  it("ignores the spouse's salary unless married filing jointly, and needs a salary", () => {
    const single = quickEstimate({ ...base, filingStatus: "single", salary: 60000, spouseSalary: 50000 })!;
    expect(single.earners).toBe(1);
    expect(quickEstimate({ ...base })).toBeNull();
  });
});

describe("paycheckHistoryRows", () => {
  it("lists every demo pay stub newest first and counts findings only for stubs the engine checked", () => {
    for (const [data, asOf] of [
      [coupleNovember(), DEMO_NOVEMBER_AS_OF],
      [coupleJanuary(), DEMO_JANUARY_AS_OF],
    ] as const) {
      const result = runCheckup(data, asOf);
      const rows = paycheckHistoryRows(data, result);
      expect(rows).toHaveLength(data.documents.filter((d) => d.docType === "paystub").length);
      const dates = rows.map((r) => r.stub.payDate);
      expect([...dates].sort().reverse()).toEqual(dates);
      // One checked stub per job that has a stub in the checkup's year.
      const checked = rows.filter((r) => r.findings !== null);
      expect(checked.length).toBe(data.employers.length);
      const stubFindings = result.findings.filter((f) => f.employerId !== null && !f.code.startsWith("W2_")).length;
      expect(checked.reduce((a, r) => a + (r.findings ?? 0), 0)).toBe(stubFindings);
    }
  });

  it("is empty without pay stubs", () => {
    const data = { ...coupleNovember(), documents: [] };
    expect(paycheckHistoryRows(data, runCheckup(data, DEMO_NOVEMBER_AS_OF))).toEqual([]);
  });
});

describe("quickEstimate: refund causes", () => {
  it("does not suggest a W-4 change when the refund comes from refundable credits (EITC)", () => {
    const r = quickEstimate({ filingStatus: "head_of_household", salary: 25000, spouseSalary: 0, childrenUnder17: 2, step2Checked: false, childrenOnW4: false });
    expect(r!.balance).toBeLessThan(0);
    expect(r!.annualTax).toBeLessThan(0);
    expect(r!.cause).toBeNull();
  });
});
