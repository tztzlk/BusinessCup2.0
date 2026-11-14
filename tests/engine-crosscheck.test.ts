import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runCheckup } from "../lib/engine";
import { federalParams } from "../lib/engine/params";
import { projectYear, type JobInput } from "../lib/engine/projection";
import { additionalMedicareDue } from "../lib/engine/tax";
import { expectedWithholding } from "../lib/engine/withholding";
import { coupleNovember, DEMO_NOVEMBER_AS_OF } from "../lib/demo";
import type { EmploymentSettings, FilingStatus, HouseholdData, Paystub } from "../lib/types";
import hourly from "../mocks/hourly.json";
import salaried from "../mocks/salaried.json";
import pub15t from "./fixtures/pub15t-2026.json";
import { SYNTHETIC, type SyntheticCase } from "./engine-crosscheck.cases";

// Cross-check of the federal engine against independent references. Method, sources and results:
// docs/ENGINE-CROSSCHECK.md. Every expected number here comes from an IRS publication or from an
// independent model (PolicyEngine-US, PSL Tax-Calculator), never from the engine itself.

const p = federalParams(2026);
const W4: EmploymentSettings["w4"] = { step2Checked: false, step3Credits: 0, step4aOtherIncome: 0, step4bDeductions: 0, step4cExtraWithholding: 0 };

// ---------------------------------------------------------------------------------------------
// 1. IRS Pub. 15-T (2026): the engine's tables are the IRS tables, number for number.
// Source: https://www.irs.gov/pub/irs-pdf/p15t.pdf, section 1, "2026 Percentage Method Tables for
// Automated Payroll Systems" (p. 12), transcribed from the PDF text by scripts/engine-crosscheck/parse_p15t.py.
// ---------------------------------------------------------------------------------------------
describe("Pub. 15-T 2026 annual percentage tables = lib/engine/params/2026/federal.json", () => {
  for (const sched of ["standard", "step2Checked"] as const) {
    for (const st of ["married_joint", "single", "head_of_household"] as const) {
      it(`${sched} / ${st}: all 8 rows (A, C, D)`, () => {
        expect(p.withholding[sched][st]).toEqual(pub15t.annual[sched][st]);
      });
    }
  }
  it("Worksheet 1A line 1g: $12,900 MFJ / $8,600 otherwise (Pub. 15-T 2026 p. 10)", () => {
    expect(p.withholding.step2NotCheckedAdjustment).toEqual({ married_joint: 12900, other: 8600 });
  });
});

// ---------------------------------------------------------------------------------------------
// 2. Worksheet 1A test vectors. Expected values are worked line by line from the Worksheet 1A text
// (Pub. 15-T 2026 p. 10) and the annual table above, by an independent implementation
// (scripts/engine-crosscheck/ws1a.py), rounded to the cent. Comment = worksheet lines.
// ---------------------------------------------------------------------------------------------
type Vector = [name: string, wages: number, periods: number, status: FilingStatus, w4: EmploymentSettings["w4"], expected: number];
const VECTORS: Vector[] = [
  // 1c 2,500x26=65,000; 1g 8,600; 1i 56,400; row A=19,900 C=1,240 D=12%; 2g 5,620; 2h 216.1538 -> 216.15
  ["V1 biweekly single $2,500, default W-4", 2500, 26, "single", W4, 216.15],
  // 1c 4,000x26=104,000; 1g 12,900; 1i 91,100; row A=44,100 C=2,480 D=12%; 2g 8,120; 2h 312.3077 -> 312.31
  ["V2 biweekly MFJ $4,000, Step 2 not checked", 4000, 26, "married_joint", W4, 312.31],
  // 1c 4,000x26=104,000; 1g 0; 1i 104,000; row A=66,500 C=5,800 D=22%; 2g 14,050; 2h 540.3846 -> 540.38
  ["V3 biweekly MFJ $4,000, Step 2 checked", 4000, 26, "married_joint", { ...W4, step2Checked: true }, 540.38],
  // 1c 3,351.16x26=87,130.16; 1g 12,900; 1i 74,230.16; row A=44,100 C=2,480 D=12%; 2g 6,095.62; 2h 234.4469; 3b 84.6154 -> 149.83
  ["V4 biweekly MFJ $3,351.16, Step 3 $2,200 (demo Alex's stub)", 3351.16, 26, "married_joint", { ...W4, step3Credits: 2200 }, 149.83],
  // 1c 2,115.38x26=54,999.88; 1g 8,600; 1i 46,399.88; row A=33,250 C=1,770 D=12%; 2g 3,347.99; 2h 128.7687; 3b 169.2308 -> 0.00
  ["V5 biweekly HOH $2,115.38, Step 3 $4,400 (credits exceed tentative)", 2115.38, 26, "head_of_household", { ...W4, step3Credits: 4400 }, 0.0],
  // 1c 2,115.38x26=54,999.88; 1g 0; 1i 54,999.88; row A=45,800 C=3,870 D=22%; 2g 5,893.97; 2h 226.6913 -> 226.69
  ["V6 biweekly HOH $2,115.38, Step 2 checked", 2115.38, 26, "head_of_household", { ...W4, step2Checked: true }, 226.69],
  // 1c 1,200x52=62,400; +4(a) 5,000; 1g 8,600; 1f 3,000; 1i 55,800; row A=19,900 C=1,240 D=12%; 2g 5,548; 2h 106.6923 -> 106.69
  ["V7 weekly single $1,200, Step 4(a) $5,000, Step 4(b) $3,000", 1200, 52, "single", { ...W4, step4aOtherIncome: 5000, step4bDeductions: 3000 }, 106.69],
  // 1c 6,250x24=150,000; 1g 12,900; 1i 137,100; row A=120,100 C=11,600 D=22%; 2g 15,340; 2h 639.1667; 4a 150 -> 789.17
  ["V8 semimonthly MFJ $6,250, Step 4(c) $150", 6250, 24, "married_joint", { ...W4, step4cExtraWithholding: 150 }, 789.17],
  // 1c 25,000x12=300,000; 1g 8,600; 1i 291,400; row A=263,725 C=58,448 D=35%; 2g 68,134.25; 2h 5677.8542 -> 5677.85
  ["V9 monthly single $25,000 (35% row)", 25000, 12, "single", W4, 5677.85],
  // 1c 2,692.31x26=70,000.06; 1g 8,600; 1i 61,400.06; row A=57,900 C=5,800 D=22%; 2g 6,570.01; 2h 252.6928 -> 252.69
  ["V10 biweekly MFS $2,692.31 (uses the Single or MFS schedule)", 2692.31, 26, "married_separate", W4, 252.69],
  // 1c 600x26=15,600; 1g 12,900; 1i 2,700; row A=0 C=0 D=0%; 2g 0; 2h 0.0000 -> 0.00
  ["V11 biweekly MFJ $600 (0% row)", 600, 26, "married_joint", W4, 0.0],
  // 1c 900x26=23,400; 1g 8,600; 1i 14,800; row A=7,500 C=0 D=10%; 2g 730; 2h 28.0769; 3b 76.9231; 4a 50 -> 50.00
  ["V12 biweekly single $900, Step 3 $2,000 > tentative, Step 4(c) $50", 900, 26, "single", { ...W4, step3Credits: 2000, step4cExtraWithholding: 50 }, 50.0],
  // 1c 35,000x26=910,000; 1g 0; 1i 910,000; row A=328,350 C=96,489.63 D=37%; 2g 311,700.13; 2h 11988.4665 -> 11988.47
  ["V13 biweekly single $35,000, Step 2 checked (37% row)", 35000, 26, "single", { ...W4, step2Checked: true }, 11988.47],
  // 1c 1,943.04x26=50,519.04; 1g 0; 1i 50,519.04; row A=28,500 C=1,240 D=12%; 2g 3,882.28; 2h 149.3186 -> 149.32
  ["V14 biweekly MFJ $1,943.04, Step 2 checked (demo Rosa's stub)", 1943.04, 26, "married_joint", { ...W4, step2Checked: true }, 149.32],
  // 1c 2,230.77x26=58,000.02; 1g 0; 1i 58,000.02; row A=28,500 C=1,240 D=12%; 2g 4,780; 2h 183.8462; 3b 169.2308 -> 14.62
  ["V15 biweekly MFJ $2,230.77, Step 2 checked, Step 3 $4,400 (demo Tom's stub)", 2230.77, 26, "married_joint", { ...W4, step2Checked: true, step3Credits: 4400 }, 14.62],
  // 1c 3,581.54x26=93,120.04; 1g 12,900; 1i 80,220.04; row A=44,100 C=2,480 D=12%; 2g 6,814.40; 2h 262.0925; 4a 150 -> 412.09
  ["V16 biweekly MFJ $3,581.54, Step 4(c) $150 (demo Nina's stub)", 3581.54, 26, "married_joint", { ...W4, step4cExtraWithholding: 150 }, 412.09],
  // 1c 1,307.69x26=33,999.94; 1g 12,900; 1i 21,099.94; row A=19,300 C=0 D=10%; 2g 179.99; 2h 6.9228 -> 6.92
  ["V17 biweekly MFJ $1,307.69 (demo Marcus's stub)", 1307.69, 26, "married_joint", W4, 6.92],
  // 1c 3,000x26=78,000; 1g 12,900; 1i 65,100; row A=44,100 C=2,480 D=12%; 2g 5,000; 2h 192.3077 -> 192.31
  ["V18 biweekly MFJ $3,000 (demo Jordan's stub)", 3000, 26, "married_joint", W4, 192.31],
  // 1c 20,000x52=1,040,000; 1g 12,900; 1i 1,027,100; row A=788,000 C=206,583.50 D=37%; 2g 295,050.50; 2h 5674.0481 -> 5674.05
  ["V19 weekly MFJ $20,000 (37% row)", 20000, 52, "married_joint", W4, 5674.05],
  // 1c 9,000x12=108,000; 1g 8,600; 1f 12,000; 1i 87,400; row A=83,000 C=7,740 D=22%; 2g 8,708; 2h 725.6667 -> 725.67
  ["V20 monthly HOH $9,000, Step 4(b) $12,000", 9000, 12, "head_of_household", { ...W4, step4bDeductions: 12000 }, 725.67],
];

describe("Pub. 15-T 2026 Worksheet 1A vectors (to the cent)", () => {
  for (const [name, wages, periods, status, w4, expected] of VECTORS) {
    it(name, () => {
      expect(expectedWithholding(wages, periods, status, w4, p)).toBe(expected);
    });
  }
});

// ---------------------------------------------------------------------------------------------
// 3. Every cell of the IRS Wage Bracket Method tables (Pub. 15-T 2026 section 2, pp. 13-27):
// weekly, biweekly, semimonthly, monthly x MFJ / HOH / Single-MFS x standard / Step 2 checkbox.
// The IRS computes each cell with the percentage method at the bracket midpoint, rounded to the
// whole dollar. The engine returns cents (round2), so its midpoint result must lie within half a
// dollar of the published amount (+ half a cent for its own rounding): e.g. weekly single, Step 2
// checked, $665-$675: exact 62.4961 -> engine 62.50 -> IRS $62.
// ---------------------------------------------------------------------------------------------
describe("Pub. 15-T 2026 Wage Bracket Method tables, every published cell", () => {
  const cols: Array<[number, FilingStatus, boolean]> = [
    [2, "married_joint", false], [3, "married_joint", true],
    [4, "head_of_household", false], [5, "head_of_household", true],
    [6, "single", false], [7, "single", true],
  ];
  const periods = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 } as const;
  for (const freq of Object.keys(periods) as Array<keyof typeof periods>) {
    const rows = pub15t.wageBracket[freq] as number[][];
    it(`${freq}: ${rows.length} rows x 6 columns`, () => {
      const misses: string[] = [];
      for (const row of rows) {
        const mid = (row[0] + row[1]) / 2;
        for (const [col, status, step2Checked] of cols) {
          const ours = expectedWithholding(mid, periods[freq], status, { ...W4, step2Checked }, p);
          if (Math.abs(ours - row[col]) > 0.505) misses.push(`${row[0]}-${row[1]} ${status} step2=${step2Checked}: IRS ${row[col]}, engine ${ours}`);
        }
      }
      expect(misses).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------------------------
// 4. Pub. 15 (2026) FICA: Social Security 6.2% up to $184,500, Medicare 1.45%, Additional Medicare
// withholding 0.9% on wages over $200,000 at one employer regardless of filing status.
// Source: https://www.irs.gov/pub/irs-pdf/p15.pdf ("Tax rates and the social security wage base limit").
// ---------------------------------------------------------------------------------------------
describe("Pub. 15 (2026) payroll-tax parameters", () => {
  it("rates and wage base", () => {
    expect(p.fica).toMatchObject({ socialSecurityRate: 0.062, socialSecurityWageBase: 184500, medicareRate: 0.0145, additionalMedicareRate: 0.009, additionalMedicareEmployerWithholdingThreshold: 200000 });
  });
  it("single, $260,000 Medicare wages at one job: liability = withheld = 0.9% x 60,000 = 540 (Form 8959)", () => {
    expect(additionalMedicareDue([260000], "single", p)).toEqual({ liability: 540, withheld: 540 });
  });
});

// ---------------------------------------------------------------------------------------------
// 5. Annual 2026 tax vs PolicyEngine-US and PSL Tax-Calculator (scripts/engine-crosscheck/reference_models.py).
// ANNUAL_REFERENCE is filled from that script's output; see docs/ENGINE-CROSSCHECK.md for versions.
// ---------------------------------------------------------------------------------------------
const load = (m: unknown): HouseholdData => structuredClone((m as { household: HouseholdData }).household);
const DEMOS: Array<{ name: string; data: () => HouseholdData; asOf: string }> = [
  { name: "couple", data: coupleNovember, asOf: DEMO_NOVEMBER_AS_OF },
  { name: "hourly", data: () => load(hourly), asOf: "2026-11-14" },
  { name: "salaried", data: () => load(salaried), asOf: "2026-11-14" },
];

// Reference values: PolicyEngine-US 2.124.5 and Tax-Calculator 6.9.1, run 2026-11-15 with identical inputs.
// total = income tax after CTC/ODC, minus refundable ACTC, minus EITC, plus Additional Medicare Tax (Form 8959).
// eitc = the Earned Income Tax Credit; both models agree on it to the cent (eitcTaxcalc where Tax-Calculator
// is listed separately). Other components are PolicyEngine's; Tax-Calculator's agree with them to the cent.
// For the demo households both models get the engine's projected full-year W-2 box 1 wages per person
// (YTD + remaining paychecks).
const ANNUAL_REFERENCE: Record<string, { total: { policyengine: number; taxcalc: number }; taxableIncome: number; regularTax: number; overtimeDeduction: number; ctcNonRefundable: number; ctcRefundable: number; additionalMedicare: number; eitc: number; eitcTaxcalc?: number; totalWithoutOvertimeDeduction?: number }> = {
  couple: { total: { policyengine: 16468.63, taxcalc: 16468.64 }, taxableIncome: 132930.16, regularTax: 18668.63, overtimeDeduction: 0, ctcNonRefundable: 2200, ctcRefundable: 0, additionalMedicare: 0, eitc: 0 },
  hourly: { total: { policyengine: 3593.21, taxcalc: 3593.21 }, taxableIncome: 70743.38, regularTax: 7993.21, overtimeDeduction: 0, ctcNonRefundable: 4400, ctcRefundable: 0, additionalMedicare: 0, eitc: 0 },
  salaried: { total: { policyengine: 10894.4, taxcalc: 10894.4 }, taxableIncome: 94919.98, regularTax: 10894.4, overtimeDeduction: 0, ctcNonRefundable: 0, ctcRefundable: 0, additionalMedicare: 0, eitc: 0 },
  single_60k: { total: { policyengine: 5020, taxcalc: 5020 }, taxableIncome: 43900, regularTax: 5020, overtimeDeduction: 0, ctcNonRefundable: 0, ctcRefundable: 0, additionalMedicare: 0, eitc: 0 },
  hoh_55k_2kids: { total: { policyengine: -1816.23, taxcalc: -1816.23 }, taxableIncome: 30850, regularTax: 3348, overtimeDeduction: 0, ctcNonRefundable: 3348, ctcRefundable: 1052, additionalMedicare: 0, eitc: 764.23 },
  mfj_150k_one_earner: { total: { policyengine: 8080, taxcalc: 8080 }, taxableIncome: 104800, regularTax: 12480, overtimeDeduction: 0, ctcNonRefundable: 4400, ctcRefundable: 0, additionalMedicare: 0, eitc: 0 },
  mfj_overtime: { total: { policyengine: 6976, taxcalc: 6976 }, taxableIncome: 80600, regularTax: 9176, overtimeDeduction: 5200, ctcNonRefundable: 2200, ctcRefundable: 0, additionalMedicare: 0, eitc: 0, totalWithoutOvertimeDeduction: 7600 },
  single_260k: { total: { policyengine: 47204, taxcalc: 47204 }, taxableIncome: 219400, regularTax: 46664, overtimeDeduction: 0, ctcNonRefundable: 0, ctcRefundable: 0, additionalMedicare: 540, eitc: 0 },
  mfs_70k: { total: { policyengine: 4370, taxcalc: 4370 }, taxableIncome: 53900, regularTax: 6570, overtimeDeduction: 0, ctcNonRefundable: 2200, ctcRefundable: 0, additionalMedicare: 0, eitc: 0 },
  single_overtime_phaseout: { total: { policyengine: 24974, taxcalc: 24974 }, taxableIncome: 134900, regularTax: 24974, overtimeDeduction: 9000, ctcNonRefundable: 0, ctcRefundable: 0, additionalMedicare: 0, eitc: 0, totalWithoutOvertimeDeduction: 27134 },
  mfj_470k_two_earners: { total: { policyengine: 77138, taxcalc: 77138 }, taxableIncome: 388800, regularTax: 78508, overtimeDeduction: 0, ctcNonRefundable: 3350, ctcRefundable: 0, additionalMedicare: 1980, eitc: 0 },
  // EITC cases. Hand check from Rev. Proc. 2025-32 sec. 4.06(1) and IRC 32(b)(1) in each comment.
  // ctcNonRefundable for low earners is Tax-Calculator's c07220 (the CTC actually used against tax, Form 1040
  // line 19): PolicyEngine's non_refundable_ctc is the nonrefundable portion before the tax limit; totals agree.
  // no children, single: min(7.65% x 15,000, 664) = 664; 664 - 7.65% x (15,000 - 10,860) = 347.29
  single_15k_eitc: { total: { policyengine: -347.29, taxcalc: -347.29 }, taxableIncome: 0, regularTax: 0, overtimeDeduction: 0, ctcNonRefundable: 0, ctcRefundable: 0, additionalMedicare: 0, eitc: 347.29 },
  // 1 child, phase-in: 34% x 10,000 = 3,400 (< 4,427; income below the 23,890 threshold)
  hoh_10k_1kid_eitc: { total: { policyengine: -4525, taxcalc: -4525 }, taxableIncome: 0, regularTax: 0, overtimeDeduction: 0, ctcNonRefundable: 0, ctcRefundable: 1125, additionalMedicare: 0, eitc: 3400 },
  // 1 child: 4,427 - 15.98% x (25,000 - 23,890) = 4,249.62
  hoh_25k_1kid_eitc: { total: { policyengine: -5949.62, taxcalc: -5949.62 }, taxableIncome: 850, regularTax: 85, overtimeDeduction: 0, ctcNonRefundable: 85, ctcRefundable: 1700, additionalMedicare: 0, eitc: 4249.62 },
  // 3 children, MFJ: 8,231 - 21.06% x (40,000 - 31,160) = 6,369.30
  mfj_40k_3kids_eitc: { total: { policyengine: -11469.3, taxcalc: -11469.3 }, taxableIncome: 7800, regularTax: 780, overtimeDeduction: 0, ctcNonRefundable: 780, ctcRefundable: 5100, additionalMedicare: 0, eitc: 6369.3 },
  // 2 children, MFJ: 7,316 - 21.06% x (65,000 - 31,160) = 189.30 (completed phaseout 65,899)
  mfj_65k_2kids_eitc: { total: { policyengine: -1149.3, taxcalc: -1149.3 }, taxableIncome: 32800, regularTax: 3440, overtimeDeduction: 0, ctcNonRefundable: 3440, ctcRefundable: 960, additionalMedicare: 0, eitc: 189.3 },
  // 2 children, HOH: 59,000 >= completed phaseout 58,629 -> 0
  hoh_59k_2kids_eitc_end: { total: { policyengine: -572, taxcalc: -572 }, taxableIncome: 34850, regularTax: 3828, overtimeDeduction: 0, ctcNonRefundable: 3828, ctcRefundable: 572, additionalMedicare: 0, eitc: 0 },
  // MFS: no EITC (IRC 32(d)(1)), as in PolicyEngine. Tax-Calculator (EITC_sep_filers_elig = true since 2021)
  // assumes every MFS filer with a child meets the IRC 32(d)(2)(B) separated-spouse rule and adds 4,427.
  // PayTrail doesn't know whether the spouses lived apart, so it follows the general rule.
  mfs_20k_1kid_eitc: { total: { policyengine: -1700, taxcalc: -6127 }, taxableIncome: 3900, regularTax: 390, overtimeDeduction: 0, ctcNonRefundable: 390, ctcRefundable: 1700, additionalMedicare: 0, eitc: 0, eitcTaxcalc: 4427 },
};

// PolicyEngine-US computes in float32, so its numbers can be a cent off: compare within $0.011.
const CENT = 0.011;
const near = (a: number, b: number) => Math.abs(a - b) <= CENT;

function annualCases(): Array<{ name: string; data: HouseholdData; asOf: string }> {
  return [
    ...DEMOS.map((d) => ({ name: d.name, data: d.data(), asOf: d.asOf })),
    ...SYNTHETIC.map((c) => ({ name: c.name, data: c.household, asOf: "2026-12-31" })),
  ];
}

describe("annual 2026 tax = PolicyEngine-US and Tax-Calculator (within a cent)", () => {
  for (const { name, data, asOf } of annualCases()) {
    const ref = ANNUAL_REFERENCE[name];
    it(`${name}: projected tax ${ref?.total.taxcalc} (EITC ${ref?.eitc})`, () => {
      expect(ref, `no ANNUAL_REFERENCE for ${name}`).toBeDefined();
      const proj = runCheckup(data, asOf).projection!;
      const i = proj.inputs;
      const ours = {
        total: proj.projectedTax,
        taxableIncome: i.taxableIncome,
        regularTax: i.regularTax,
        overtimeDeduction: i.overtimeDeduction,
        ctcNonRefundable: i.childCreditsNonRefundable,
        ctcRefundable: i.childCreditsRefundable,
        additionalMedicare: i.additionalMedicareLiability,
        eitc: i.earnedIncomeCredit ?? 0,
      };
      // Where Tax-Calculator's EITC differs by design (eitcTaxcalc), its total is compared net of that difference.
      const taxcalcTotal = ref.total.taxcalc + (ref.eitcTaxcalc ?? ref.eitc) - ref.eitc;
      const misses = Object.entries(ours).filter(([k, v]) =>
        k === "total" ? !near(v, ref.total.policyengine) || !near(v, taxcalcTotal) : !near(v, ref[k as keyof typeof ref] as number),
      );
      expect(misses).toEqual([]);
    });
  }

  it("overtime deduction on/off: same pay booked as regular earnings gives the references' no-deduction tax", () => {
    for (const c of SYNTHETIC.filter((x) => ANNUAL_REFERENCE[x.name].totalWithoutOvertimeDeduction !== undefined)) {
      const data = structuredClone(c.household);
      for (const d of data.documents) {
        const s = d.fields as Paystub;
        s.earnings = s.earnings.map((e) => (e.type === "overtime" ? { ...e, type: "regular" as const } : e));
      }
      expect(runCheckup(data, "2026-12-31").projection!.projectedTax).toBeCloseTo(ANNUAL_REFERENCE[c.name].totalWithoutOvertimeDeduction!, 2);
    }
  });
});

describe("demo couple: the Step 4(c) advice closes the gap (Worksheet 1A line 4a adds Step 4(c) dollar for dollar)", () => {
  it("4 paychecks x ($999 + $895) = $7,576 >= $7,573 owed; withholding rises by exactly the Step 4(c) amount", () => {
    const proj = runCheckup(coupleNovember(), DEMO_NOVEMBER_AS_OF).projection!;
    const added = proj.perEmployer.reduce((a, e) => a + e.recommendedStep4c * e.remainingPayPeriods, 0);
    expect(added).toBe(7576);
    expect(added - proj.balance).toBeGreaterThanOrEqual(0);
    expect(added - proj.balance).toBeLessThan(10);
    // Alex: 149.83 (V4) + 999 = 1,148.83
    expect(expectedWithholding(3351.16, 26, "married_joint", { ...W4, step3Credits: 2200, step4cExtraWithholding: 999 }, p)).toBe(1148.83);
  });
});


// ---------------------------------------------------------------------------------------------
// Dump for the reference-model script: XCHECK_DUMP=<file> npx vitest run tests/engine-crosscheck.test.ts
// ---------------------------------------------------------------------------------------------
function latestStub(data: HouseholdData, employerId: string): Paystub | null {
  const own = data.documents.filter((d) => d.docType === "paystub" && d.employerId === employerId).map((d) => d.fields as Paystub);
  return own.sort((a, b) => b.payDate.localeCompare(a.payDate))[0] ?? null;
}

function dumpDemo(name: string, data: HouseholdData, asOf: string) {
  const people: Record<string, { gross: number; k401: number; health: number; otPremium: number }> = {};
  for (const settings of data.employers) {
    // Projected full-year W-2 box 1 wages of each job (YTD + remaining paychecks), as the engine uses them.
    const job: JobInput = { settings, latestStub: latestStub(data, settings.id) };
    const box1 = projectYear([job], data.profile, p).inputs.agi;
    const prev = people[settings.member] ?? { gross: 0, k401: 0, health: 0, otPremium: 0 };
    prev.gross += box1;
    people[settings.member] = prev;
  }
  return { name, asOf, profile: data.profile, people, projection: runCheckup(data, asOf).projection };
}

function dumpSynthetic(c: SyntheticCase) {
  const people: Record<string, { gross: number; k401: number; health: number; otPremium: number }> = {};
  for (const j of c.jobs) {
    const prev = people[j.member] ?? { gross: 0, k401: 0, health: 0, otPremium: 0 };
    prev.gross += j.regular + (j.overtime ?? 0);
    prev.k401 += j.k401 ?? 0;
    prev.health += j.health ?? 0;
    prev.otPremium += (j.overtime ?? 0) / 3;
    people[j.member] = prev;
  }
  // Counterfactual without the overtime deduction: the same pay booked as regular earnings.
  const noOt = structuredClone(c.household);
  for (const d of noOt.documents) {
    const s = d.fields as Paystub;
    s.earnings = s.earnings.map((e) => (e.type === "overtime" ? { ...e, type: "regular" as const } : e));
  }
  return {
    name: c.name, asOf: "2026-12-31", profile: c.household.profile, people,
    projection: runCheckup(c.household, "2026-12-31").projection,
    projectionNoOvertime: runCheckup(noOt, "2026-12-31").projection,
  };
}

const DUMP = process.env.XCHECK_DUMP;
describe.runIf(Boolean(DUMP))("dump engine numbers for scripts/engine-crosscheck/reference_models.py", () => {
  it("writes the dump", () => {
    const out = [...DEMOS.map((d) => dumpDemo(d.name, d.data(), d.asOf)), ...SYNTHETIC.map(dumpSynthetic)];
    writeFileSync(DUMP!, JSON.stringify(out, null, 1));
  });
});
