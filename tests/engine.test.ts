import { describe, expect, it } from "vitest";
import { federalParams } from "../lib/engine/params";
import { bracketTax, childCredits, overtimeDeduction } from "../lib/engine/tax";
import { expectedWithholding } from "../lib/engine/withholding";
import { checkPaystub } from "../lib/engine/checks";
import { reconcileW2 } from "../lib/engine/reconcileW2";
import { runCheckup } from "../lib/engine";
import type { EmploymentSettings, HouseholdData, Paystub, W2 } from "../lib/types";

const p = federalParams(2026);
const noW4 = { step2Checked: false, step3Credits: 0, step4aOtherIncome: 0, step4bDeductions: 0, step4cExtraWithholding: 0 };

// Expected values below are worked by hand from Pub. 15-T (2026) and Rev. Proc. 2025-32.
describe("Pub. 15-T Worksheet 1A", () => {
  it("single, biweekly $3,000, default W-4", () => {
    // 3000*26 = 78,000 - 8,600 = 69,400 -> 5,800 + 22% * (69,400 - 57,900) = 8,330 -> /26
    expect(expectedWithholding(3000, 26, "single", noW4, p)).toBeCloseTo(320.38, 2);
  });

  it("married jointly, biweekly, Step 3 credits", () => {
    // 3351.16*26 = 87,130.16 - 12,900 = 74,230.16 -> 2,480 + 12% * 30,130.16 = 6,095.62 -> /26 = 234.45; - 2,200/26 = 84.62
    expect(expectedWithholding(3351.16, 26, "married_joint", { ...noW4, step3Credits: 2200 }, p)).toBeCloseTo(149.83, 2);
  });

  it("married jointly with the Step 2 box checked uses the higher schedule", () => {
    // 4000*26 = 104,000 (no adjustment) -> 5,800 + 22% * (104,000 - 66,500) = 14,050 -> /26
    expect(expectedWithholding(4000, 26, "married_joint", { ...noW4, step2Checked: true }, p)).toBeCloseTo(540.38, 2);
  });

  it("adds Step 4(c) extra withholding", () => {
    expect(expectedWithholding(3000, 26, "single", { ...noW4, step4cExtraWithholding: 50 }, p)).toBeCloseTo(370.38, 2);
  });

  it("withholds nothing below the zero bracket", () => {
    expect(expectedWithholding(500, 26, "married_joint", noW4, p)).toBe(0);
  });
});

describe("annual tax", () => {
  it("married jointly, $100,000 taxable", () => {
    // 10% * 24,800 + 12% * 75,200 = 2,480 + 9,024
    expect(bracketTax(100000, "married_joint", p)).toBe(11504);
  });
  it("single, $60,000 taxable", () => {
    // 1,240 + 12% * 38,000 + 22% * 9,600 = 1,240 + 4,560 + 2,112
    expect(bracketTax(60000, "single", p)).toBe(7912);
  });
  it("overtime deduction is capped and phased out", () => {
    expect(overtimeDeduction(20000, 100000, "single", p)).toBe(12500);
    // MAGI 160,000 is $10,000 over -> 10 * $100 = $1,000 reduction
    expect(overtimeDeduction(20000, 160000, "single", p)).toBe(11500);
    expect(overtimeDeduction(5000, 100000, "married_separate", p)).toBe(0);
  });
  it("child tax credit limited by tax, with refundable part", () => {
    const c = childCredits(1000, 2, 0, 50000, 50000, "married_joint", p);
    expect(c.nonRefundable).toBe(1000);
    // remaining 3,400; refundable cap 2 * 1,700 = 3,400; 15% * (50,000 - 2,500) = 7,125
    expect(c.refundable).toBe(3400);
  });
});

const settings: EmploymentSettings = {
  id: "e1",
  member: "self",
  employerName: "Acme (SAMPLE)",
  payType: "hourly",
  hourlyRate: 20,
  overtimeEligible: true,
  match401k: { matchPercent: 50, upToPercentOfPay: 6 },
  w4: noW4,
};

function stub(over: Partial<Paystub> = {}): Paystub {
  // Regular 80h * $20 = 1,600 + overtime 10h * $30 = 300 -> gross 1,900. 401(k) 3% = 57.
  const fed = expectedWithholding(1900 - 57, 26, "single", noW4, p);
  return {
    employerName: "Acme (SAMPLE)",
    payPeriodStart: "2026-10-18",
    payPeriodEnd: "2026-10-31",
    payDate: "2026-11-06",
    payFrequency: "biweekly",
    earnings: [
      { type: "regular", hours: 80, rate: 20, current: 1600, ytd: 35200 },
      { type: "overtime", hours: 10, rate: 30, current: 300, ytd: 3000 },
    ],
    taxes: [
      { type: "federal_income", current: fed, ytd: 3000 },
      { type: "social_security", current: 117.8, ytd: 2368 },
      { type: "medicare", current: 27.55, ytd: 553.8 },
    ],
    deductions: [{ type: "401k_pretax", preTax: true, current: 57, ytd: 1146 }],
    employerContributions: [{ type: "401k_match", current: 28.5, ytd: 573 }],
    grossCurrent: 1900,
    netCurrent: Math.round((1900 - fed - 117.8 - 27.55 - 57) * 100) / 100,
    grossYtd: 38200,
    ...over,
  };
}

describe("pay stub checks", () => {
  it("a correct stub only flags the missed 401(k) match", () => {
    const codes = checkPaystub(stub(), null, settings, "single", p).map((f) => f.code);
    expect(codes).toEqual(["MATCH_LEFT_ON_TABLE"]);
  });

  it("flags overtime paid at straight time", () => {
    const s = stub();
    s.earnings[1] = { type: "overtime", hours: 10, rate: 20, current: 200, ytd: 3000 };
    const f = checkPaystub(s, null, settings, "single", p).find((x) => x.code === "OVERTIME_UNDERPAID");
    expect(f?.amountUsd).toBe(100);
  });

  it("flags wrong Social Security and net pay arithmetic", () => {
    const codes = checkPaystub(stub({ netCurrent: 1500, taxes: stub().taxes.map((t) => (t.type === "social_security" ? { ...t, current: 100 } : t)) }), null, settings, "single", p).map((f) => f.code);
    expect(codes).toContain("SOCIAL_SECURITY_MISMATCH");
    expect(codes).toContain("NET_PAY_MISMATCH");
  });

  it("computes the missed match from contribution vs plan rule", () => {
    const f = checkPaystub(stub(), null, settings, "single", p).find((x) => x.code === "MATCH_LEFT_ON_TABLE")!;
    // contributing 3% of 1,900*26 = 49,400; missing 3% * 50% match = 741
    expect(f.amountUsd).toBe(741);
  });
});

describe("W-2 reconciliation", () => {
  const last = stub({ grossYtd: 49400, deductions: [{ type: "401k_pretax", preTax: true, current: 57, ytd: 1482 }] });
  const w2: W2 = {
    taxYear: 2026,
    employerName: "Acme (SAMPLE)",
    box1Wages: 47918,
    box2FederalWithheld: 3000,
    box3SsWages: 49400,
    box4SsWithheld: 2368,
    box5MedicareWages: 49400,
    box6MedicareWithheld: 553.8,
    box12: [{ code: "D", amount: 1482 }],
    box13RetirementPlan: true,
    state: [],
  };
  it("matches when boxes agree with the last stub", () => {
    const r = reconcileW2(w2, last, "e1", p);
    expect(r.findings).toEqual([]);
  });
  it("flags a box 12 code D mismatch", () => {
    const r = reconcileW2({ ...w2, box12: [{ code: "D", amount: 1000 }] }, last, "e1", p);
    expect(r.findings.map((f) => f.code)).toEqual(["W2_BOX12D_MISMATCH"]);
    expect(r.findings[0].amountUsd).toBe(482);
  });
});

describe("household checkup", () => {
  it("projects the year and recommends Step 4(c) when under-withheld", () => {
    const s = stub({ taxes: stub().taxes.map((t) => (t.type === "federal_income" ? { ...t, current: 50, ytd: 1000 } : t)) });
    const data: HouseholdData = {
      profile: { filingStatus: "single", state: "TX", dependentsUnder17: 0, otherDependents: 0, flags: { mortgage: true, bankInterest: false, brokerage: false, hsa: false } },
      employers: [settings],
      documents: [{ id: "d1", employerId: "e1", docType: "paystub", taxYear: 2026, fields: s, createdAt: "2026-11-07" }],
      checklist: [],
    };
    const r = runCheckup(data, "2026-11-14");
    expect(r.projection).not.toBeNull();
    expect(r.projection!.balance).toBeGreaterThan(0);
    expect(r.findings.some((f) => f.code === "UNDERWITHHOLDING")).toBe(true);
    expect(r.projection!.perEmployer[0].recommendedStep4c).toBeGreaterThan(0);
    expect(r.checklist.map((c) => c.formType)).toEqual(["W-2", "1098"]);
    expect(r.checklist.every((c) => c.status === "expected")).toBe(true);
    expect(runCheckup(data, "2027-02-15").checklist.every((c) => c.status === "overdue")).toBe(true);
  });
});
