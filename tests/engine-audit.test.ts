import { describe, expect, it } from "vitest";
import { federalParams } from "../lib/engine/params";
import { additionalMedicareDue, bracketTax, childCredits, overtimeDeduction } from "../lib/engine/tax";
import { expectedWithholding } from "../lib/engine/withholding";
import { remainingPayPeriods } from "../lib/engine/paystub";
import { checkPaystub } from "../lib/engine/checks";
import { projectYear } from "../lib/engine/projection";
import { reconcileW2 } from "../lib/engine/reconcileW2";
import { runCheckup } from "../lib/engine";
import { coupleNovember, DEMO_NOVEMBER_AS_OF } from "../lib/demo";
import type { EmploymentSettings, HouseholdProfile, Paystub } from "../lib/types";

// Audit of lib/engine against primary sources (14.11.2026). Every test asserts the CORRECT behavior.
// Sources:
//   Rev. Proc. 2025-32 (2026 brackets, std deduction, CTC): https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
//   Pub. 15-T (2026), Worksheet 1A + annual tables:           https://www.irs.gov/publications/p15t
//   Schedule 1-A (Form 1040), Part III (overtime):             https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf
//   Additional Medicare Tax:                                   https://www.irs.gov/taxtopics/tc560
//   Excess Social Security withheld:                           https://www.irs.gov/taxtopics/tc608
//   401(k) 2026 limit:                                         https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500
//   SS wage base 2026 ($184,500):                              https://www.ssa.gov/oact/COLA/cbb.html

const p = federalParams(2026);
const noW4 = { step2Checked: false, step3Credits: 0, step4aOtherIncome: 0, step4bDeductions: 0, step4cExtraWithholding: 0 };

const single: HouseholdProfile = {
  filingStatus: "single",
  state: "TX",
  dependentsUnder17: 0,
  otherDependents: 0,
  flags: { mortgage: false, bankInterest: false, brokerage: false, hsa: false },
};

function job(id: string, over: Partial<EmploymentSettings> = {}): EmploymentSettings {
  return { id, member: "self", employerName: `Employer ${id} (SAMPLE)`, payType: "salary", overtimeEligible: false, w4: noW4, ...over };
}

/** Biweekly salaried stub: `current` gross per paycheck, `paid` paychecks so far (YTD = current * paid). */
function stub(current: number, paid: number, over: Partial<Paystub> = {}): Paystub {
  const fed = expectedWithholding(current, 26, "single", noW4, p);
  return {
    employerName: "Employer (SAMPLE)",
    payPeriodStart: "2026-10-18",
    payPeriodEnd: "2026-10-31",
    payDate: "2026-10-31",
    payFrequency: "biweekly",
    earnings: [{ type: "regular", hours: 80, rate: null, current, ytd: current * paid }],
    taxes: [
      { type: "federal_income", current: fed, ytd: fed * paid },
      { type: "social_security", current: current * 0.062, ytd: current * 0.062 * paid },
      { type: "medicare", current: current * 0.0145, ytd: current * 0.0145 * paid },
    ],
    deductions: [],
    employerContributions: [],
    grossCurrent: current,
    netCurrent: current - fed - current * 0.0765,
    grossYtd: current * paid,
    ...over,
  };
}

// ---------------------------------------------------------------------------------------------
// 1. Parameters that were verified against the sources (regression locks; pass today).
// ---------------------------------------------------------------------------------------------
describe("params 2026 verified against IRS/SSA", () => {
  it("standard deduction (Rev. Proc. 2025-32 sec. 4.15 / IRS release)", () => {
    const { single: s, married_joint: mfj, married_separate: mfs, head_of_household: hoh } = p.standardDeduction;
    expect([s, mfj, mfs, hoh]).toEqual([16100, 32200, 16100, 24150]);
  });
  it("HOH brackets (Rev. Proc. 2025-32 Table 2): $60,000 taxable = 1,770 + 12% * 42,300", () => {
    expect(bracketTax(60000, "head_of_household", p)).toBe(6846);
  });
  it("Pub. 15-T 2026 Worksheet 1A line 1g adjustments and table anchors", () => {
    expect(p.withholding.step2NotCheckedAdjustment).toEqual({ married_joint: 12900, other: 8600 });
    expect(p.withholding.standard.married_joint[7]).toEqual([788000, 206583.5, 0.37]);
    expect(p.withholding.step2Checked.single[4]).toEqual([60900, 8983, 0.24]);
    expect(p.withholding.step2Checked.head_of_household[7]).toEqual([332375, 95585.5, 0.37]);
  });
  it("FICA, 401(k), CTC (SSA; IRS tc560; IR 401k; Rev. Proc. 2025-32 sec. 4.05)", () => {
    expect(p.fica.socialSecurityWageBase).toBe(184500);
    expect(p.fica.additionalMedicareThreshold).toEqual({ single: 200000, married_joint: 250000, married_separate: 125000, head_of_household: 200000 });
    expect(p.fica.additionalMedicareEmployerWithholdingThreshold).toBe(200000);
    expect(p.retirement.electiveDeferralLimit).toBe(24500);
    expect([p.childTaxCredit.perChild, p.childTaxCredit.refundablePerChild]).toEqual([2200, 1700]);
  });
});

// ---------------------------------------------------------------------------------------------
// 2. Findings (fail today).
// ---------------------------------------------------------------------------------------------
describe("F1 married filing separately uses the single schedule above $384,350", () => {
  it("MFS $500,000 taxable: 103,291.75 + 37% * (500,000 - 384,350)", () => {
    // Rev. Proc. 2025-32 Table 4: "Over $384,350: $103,291.75 plus 37% of the excess over $384,350".
    expect(bracketTax(500000, "married_separate", p)).toBe(146082.25);
  });
});

describe("F2 overtime deduction phase-out rounds down, not up", () => {
  it("single, MAGI $150,500: 0.5 -> 0 steps, deduction stays $12,500", () => {
    // Schedule 1-A line 19: "If the resulting number isn't a whole number, decrease the result to the next lower whole number."
    expect(overtimeDeduction(20000, 150500, "single", p)).toBe(12500);
  });
  it("single, MAGI $155,999: 5 steps -> $500 reduction", () => {
    expect(overtimeDeduction(20000, 155999, "single", p)).toBe(12000);
  });
});

describe("F3 remainingPayPeriods misses a payday that falls exactly on Dec 31", () => {
  it("biweekly paid Thu 2026-12-17: next payday Thu 2026-12-31 is still in 2026", () => {
    expect(remainingPayPeriods("2026-12-17", "biweekly", p)).toBe(1);
  });
  it("weekly paid Thu 2026-12-24: next payday 2026-12-31", () => {
    expect(remainingPayPeriods("2026-12-24", "weekly", p)).toBe(1);
  });
  it("biweekly paid 2026-01-01: 26 more paydays (Jan 15 ... Dec 31), a 27-payday year", () => {
    expect(remainingPayPeriods("2026-01-01", "biweekly", p)).toBe(26);
  });
  it("(regression, passes) demo pay date Oct 31 -> 4; Dec 26 -> 0", () => {
    expect(remainingPayPeriods("2026-10-31", "biweekly", p)).toBe(4);
    expect(remainingPayPeriods("2026-12-26", "biweekly", p)).toBe(0);
  });
});

describe("F4 YTD missing (null) makes the projection ignore Jan-Oct", () => {
  it("all YTD null: full-year wages must not be just the remaining 4 paychecks", () => {
    const s = stub(3000, 22);
    const noYtd: Paystub = {
      ...s,
      earnings: s.earnings.map((e) => ({ ...e, ytd: null })),
      taxes: s.taxes.map((t) => ({ ...t, ytd: null })),
      grossYtd: null,
    };
    const proj = projectYear([{ settings: job("a"), latestStub: noYtd }], single, p);
    // Without YTD the only defensible estimate is Pub. 15-T line 1c annualization: 3,000 * 26.
    // Today: agi = 3,000 * 4 = 12,000 and the user is told about a refund.
    expect(proj.inputs.agi).toBeCloseTo(78000, 0);
    expect(proj.estimated).toBe(true);
    expect(proj.notes.some((n) => n.includes("year-to-date"))).toBe(true);
  });
  it("gross YTD present but tax YTD null: withholding must not be treated as $0 so far", () => {
    const s = stub(3000, 22);
    const partial: Paystub = { ...s, taxes: s.taxes.map((t) => ({ ...t, ytd: null })) };
    const proj = projectYear([{ settings: job("a"), latestStub: partial }], single, p);
    const fed = s.taxes[0].current;
    expect(proj.projectedWithholding).toBeCloseTo(fed * 26, 0);
  });
});

describe("F5 a bonus on the latest stub is repeated for every remaining paycheck", () => {
  it("one-time $5,000 bonus is counted once", () => {
    const s = stub(3000, 22);
    const withBonus: Paystub = {
      ...s,
      earnings: [...s.earnings, { type: "bonus", hours: null, rate: null, current: 5000, ytd: 5000 }],
      grossCurrent: 8000,
      grossYtd: 3000 * 22 + 5000,
    };
    const proj = projectYear([{ settings: job("a"), latestStub: withBonus }], single, p);
    // 66,000 regular + 5,000 bonus YTD + 4 more regular paychecks of 3,000. Today: 71,000 + 8,000 * 4 = 103,000.
    expect(proj.inputs.agi).toBeCloseTo(83000, 0);
  });
});

describe("F6 couple with one spouse's stub missing gets a refund message", () => {
  it("demo couple without Alex's stub: no OVERWITHHOLDING claim from a half-household projection", () => {
    const data = coupleNovember();
    data.documents = data.documents.filter((d) => d.employerId !== "emp_alex");
    const r = runCheckup(data, DEMO_NOVEMBER_AS_OF);
    // With both incomes the couple owes ~$7.5k (see demo test); projecting one income alone at MFJ rates
    // tells them "refund of about $2,200". Either project the missing job (annualSalary) or suppress the finding.
    expect(r.findings.map((f) => f.code)).not.toContain("OVERWITHHOLDING");
  });
  it("the job without a stub is estimated from its settings: $95,000 salary + Jordan's 78,000, owes, marked estimated", () => {
    const data = coupleNovember();
    data.documents = data.documents.filter((d) => d.employerId !== "emp_alex");
    const r = runCheckup(data, DEMO_NOVEMBER_AS_OF);
    expect(r.projection!.inputs.agi).toBeCloseTo(173000, 2);
    expect(r.projection!.estimated).toBe(true);
    expect(r.findings.map((f) => f.code)).toContain("UNDERWITHHOLDING");
    expect(r.notes.some((n) => n.includes("estimates this job"))).toBe(true);
  });
  it("no salary or hourly rate for the missing job: no projection, no April finding, an 'incomplete' note", () => {
    const data = coupleNovember();
    data.documents = data.documents.filter((d) => d.employerId !== "emp_alex");
    data.employers = data.employers.map((e) => (e.id === "emp_alex" ? { ...e, annualSalary: undefined, hourlyRate: undefined } : e));
    const r = runCheckup(data, DEMO_NOVEMBER_AS_OF);
    expect(r.projection).toBeNull();
    expect(r.findings.map((f) => f.code)).not.toContain("OVERWITHHOLDING");
    expect(r.findings.map((f) => f.code)).not.toContain("UNDERWITHHOLDING");
    expect(r.notes.some((n) => n.includes("incomplete"))).toBe(true);
  });
  it("hourly job without a stub: rate x standard hours per year (params)", () => {
    const proj = projectYear(
      [{ settings: job("a"), latestStub: stub(3000, 22) }, { settings: job("b", { payType: "hourly", hourlyRate: 25 }), latestStub: null }],
      single,
      p,
    );
    expect(proj.inputs.agi).toBeCloseTo(78000 + 25 * p.estimates.standardHoursPerYear, 2);
    expect(proj.perEmployer[1].remainingPayPeriods).toBe(4);
  });
});

describe("F7 excess Social Security from two jobs of the same person is not credited", () => {
  // deferred: excess Social Security credit (Schedule 3 line 11) needs per-person job grouping; team decision, post-hackathon.
  it.skip("single, two jobs x $120,000: excess SS 2*7,440 - 11,439 = 3,441 counts as a payment", () => {
    // IRS Topic 608: if more than one employer withheld SS and total wages > wage base, the excess is a credit
    // (Schedule 3 line 11). Max employee SS 2026 = 6.2% * 184,500 = 11,439.
    const yearEnd = (name: string): Paystub =>
      stub(120000 / 26, 26, { employerName: name, payDate: "2026-12-26", payPeriodEnd: "2026-12-26" });
    const a = yearEnd("A"), b = yearEnd("B");
    const proj = projectYear(
      [{ settings: job("a"), latestStub: a }, { settings: job("b"), latestStub: b }],
      single,
      p,
    );
    const fedWithheld = a.taxes[0].ytd! + b.taxes[0].ytd!;
    expect(proj.projectedWithholding).toBeCloseTo(fedWithheld + 3441, 0);
  });
});

describe("F8 401(k) elective deferral limit ($24,500) is never applied", () => {
  // deferred: 402(g) cap on extrapolated deferrals; team decision, post-hackathon.
  it.skip("projection caps 401(k) at the limit when extrapolating", () => {
    const s = stub(5000, 22, { deductions: [{ type: "401k_pretax", preTax: true, current: 1000, ytd: 22000 }] });
    const proj = projectYear([{ settings: job("a"), latestStub: s }], single, p);
    // Payroll stops deferrals at $24,500 (IRC 402(g)); box 1 = 130,000 - 24,500. Today: 130,000 - 26,000.
    expect(proj.inputs.agi).toBeCloseTo(105500, 0);
  });
  // deferred: match advice must check YTD deferrals against the 402(g) limit; team decision, post-hackathon.
  it.skip("no 'raise your contribution' advice after the employee has hit the limit", () => {
    const s = stub(10000, 22, { deductions: [{ type: "401k_pretax", preTax: true, current: 0, ytd: 24500 }] });
    const settings = job("a", { annualSalary: 260000, match401k: { matchPercent: 50, upToPercentOfPay: 6 } });
    const codes = checkPaystub(s, null, settings, "single", p).map((f) => f.code);
    expect(codes).not.toContain("MATCH_LEFT_ON_TABLE");
  });
});

describe("F9 pay frequency 'unknown' is silently treated as biweekly", () => {
  it("a stub whose period is a calendar month projects 2 more paychecks after Oct 31, not 4", () => {
    const s = stub(6500, 10, { payFrequency: "unknown", payPeriodStart: "2026-10-01", payPeriodEnd: "2026-10-31" });
    const proj = projectYear([{ settings: job("a"), latestStub: s }], single, p);
    expect(proj.perEmployer[0].remainingPayPeriods).toBe(2);
    expect(proj.notes.some((n) => n.includes("monthly"))).toBe(true);
  });
  it("dates that fit no frequency fall back to biweekly, with a note", () => {
    const s = stub(3000, 22, { payFrequency: "unknown", payPeriodStart: "", payPeriodEnd: "" });
    const proj = projectYear([{ settings: job("a"), latestStub: s }], single, p);
    expect(proj.perEmployer[0].remainingPayPeriods).toBe(4);
    expect(proj.notes.some((n) => n.includes("assumed biweekly"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
// 3. Edge cases that are handled correctly (regression locks; pass today).
// ---------------------------------------------------------------------------------------------
describe("edge cases handled correctly", () => {
  it("SS wage base crossed mid-period: only the part under $184,500 is taxed", () => {
    // YTD before this check 183,500; this check 2,000 -> 1,000 taxable -> $62.
    const s = stub(2000, 1, {
      earnings: [{ type: "regular", hours: 80, rate: null, current: 2000, ytd: 185500 }],
      grossYtd: 185500,
      taxes: [
        { type: "federal_income", current: expectedWithholding(2000, 26, "single", noW4, p), ytd: 30000 },
        { type: "social_security", current: 62, ytd: 11439 },
        { type: "medicare", current: 29, ytd: 2689.75 },
      ],
    });
    s.netCurrent = 2000 - s.taxes.reduce((a, t) => a + t.current, 0);
    const codes = checkPaystub(s, null, job("a"), "single", p).map((f) => f.code);
    expect(codes).not.toContain("SOCIAL_SECURITY_MISMATCH");
  });

  it("Additional Medicare: MFJ 210k + 190k -> liability 0.9% * (400k - 250k), withheld only on the 10k over 200k at job 1", () => {
    expect(additionalMedicareDue([210000, 190000], "married_joint", p)).toEqual({ liability: 1350, withheld: 90 });
  });

  it("December stub (0 periods left): no NaN/Infinity in Step 4(c)", () => {
    const s = stub(3000, 26, { payDate: "2026-12-26" });
    const proj = projectYear([{ settings: job("a"), latestStub: s }], single, p);
    expect(proj.perEmployer[0].recommendedStep4c).toBe(0);
    expect(Number.isFinite(proj.balance)).toBe(true);
  });

  it("zero-gross stub does not crash and withholds 0", () => {
    const s = stub(0, 0);
    expect(() => checkPaystub(s, null, job("a", { match401k: { matchPercent: 50, upToPercentOfPay: 6 } }), "single", p)).not.toThrow();
    expect(expectedWithholding(-100, 26, "single", noW4, p)).toBe(0);
  });

  it("MFS gets no overtime deduction; CTC phase-out rounds up per $1,000 (IRC 24(b))", () => {
    expect(overtimeDeduction(5000, 50000, "married_separate", p)).toBe(0);
    // AGI 200,001 single -> 1 step -> $50 off one $2,200 credit
    expect(childCredits(10000, 1, 0, 200001, 200001, "single", p).nonRefundable).toBe(2150);
  });

  it("W-2 box 3 is capped at the SS wage base, box 5 is not", () => {
    const s = stub(200000 / 26, 26, { payDate: "2026-12-26" });
    const r = reconcileW2(
      {
        taxYear: 2026, employerName: "x", box1Wages: 200000, box2FederalWithheld: s.taxes[0].ytd!, box3SsWages: 184500,
        box4SsWithheld: s.taxes[1].ytd!, box5MedicareWages: 200000, box6MedicareWithheld: s.taxes[2].ytd!, box12: [],
        box13RetirementPlan: false, state: [],
      },
      s, "a", p,
    );
    expect(r.rows.find((x) => x.box === "3")!.matches).toBe(true);
    expect(r.rows.find((x) => x.box === "5")!.matches).toBe(true);
  });

  it("main demo November: exact projection (hand-checked against Rev. Proc. 2025-32)", () => {
    // AGI = (80,384.70 - 4,019.18 - 2,640 + 4 * 3,351.16) + (66,000 + 4 * 3,000) = 87,130.16 + 78,000 = 165,130.16
    // taxable 132,930.16 -> 11,600 + 22% * 32,130.16 = 18,668.64; minus CTC 2,200 = 16,468.64
    // withheld 3,296.26 + 4 * 149.83 + 4,230.82 + 4 * 192.31 = 8,895.64 -> balance 7,573.00
    const r = runCheckup(coupleNovember(), DEMO_NOVEMBER_AS_OF);
    expect(r.projection!.inputs.agi).toBeCloseTo(165130.16, 2);
    expect(r.projection!.projectedTax).toBeCloseTo(16468.64, 2);
    expect(r.projection!.projectedWithholding).toBeCloseTo(8895.64, 2);
    expect(r.projection!.balance).toBeCloseTo(7573, 2);
  });
});
