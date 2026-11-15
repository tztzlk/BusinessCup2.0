import { describe, expect, it } from "vitest";
import { runCheckup } from "../lib/engine";
import { explainCalculation } from "../lib/engine/calculation";
import { federalParams } from "../lib/engine/params";
import { coupleJanuary, coupleNovember, DEMO_JANUARY_AS_OF, DEMO_NOVEMBER_AS_OF } from "../lib/demo";
import type { Finding, HouseholdData } from "../lib/types";
import hourly from "../mocks/hourly.json";
import salaried from "../mocks/salaried.json";

const p = federalParams(2026);
const load = (m: unknown): HouseholdData => structuredClone((m as { household: HouseholdData }).household);
const f = (code: string, inputs: Finding["inputs"], amountUsd = 10): Finding => ({
  code,
  severity: "warning",
  amountUsd,
  employerId: "e1",
  inputs,
  action: { kind: "ask_hr", details: "" },
});

describe("show calculation", () => {
  it("explains Social Security with the numbers and the difference", () => {
    const c = explainCalculation(f("SOCIAL_SECURITY_MISMATCH", { ficaWages: 2000, rate: 0.062, wageBase: 184500, expected: 124, printed: 134 }), p);
    expect(c.formula).toContain("Social Security wages");
    expect(c.substituted).toBe("$2,000.00 × 6.2% = $124.00");
    expect([c.expected, c.actual, c.difference]).toEqual([124, 134, 10]);
    expect(c.unit).toBe("paycheck");
    expect(c.sources.map((s) => s.url)).toEqual([p.sources.ssWageBase]);
  });

  it("explains overtime with the multiplier from params", () => {
    const c = explainCalculation(
      f("OVERTIME_UNDERPAID", { overtimeHours: 10, regularRate: 20, multiplier: p.flsa.overtimeMultiplier, expected: 300, paid: 200 }, 100),
      p,
    );
    expect(c.substituted).toBe(`10 h × $20.00 × ${p.flsa.overtimeMultiplier} = $300.00`);
    expect(c.difference).toBe(-100);
    expect(c.sources[0].url).toBe(p.sources.flsaWorkweek);
  });

  it("explains net pay arithmetic without an IRS source", () => {
    const c = explainCalculation(f("NET_PAY_MISMATCH", { gross: 2000, taxes: 300, deductions: 100, expectedNet: 1600, printedNet: 1580 }), p);
    expect(c.substituted).toBe("$2,000.00 − $300.00 − $100.00 = $1,600.00");
    expect(c.difference).toBe(-20);
    expect(c.sources).toEqual([]);
  });

  it("explains the April balance with taxable income, tax and withholding", () => {
    const data = coupleNovember();
    const under = runCheckup(data, DEMO_NOVEMBER_AS_OF).findings.find((x) => x.code === "UNDERWITHHOLDING")!;
    const c = explainCalculation(under, p);
    expect(c.expected).toBe(under.inputs.projectedTax);
    expect(c.actual).toBe(under.inputs.projectedWithholding);
    // actual − expected is minus the amount owed.
    expect(c.difference).toBeCloseTo(-under.amountUsd, 2);
    expect(c.substituted).toContain("taxable");
    expect(c.sources.map((s) => s.url)).toContain(p.sources.pub15t);
    expect(c.unit).toBe("april");
  });

  it("has a formula for every finding the demo households produce", () => {
    const findings = [
      ...runCheckup(coupleNovember(), DEMO_NOVEMBER_AS_OF).findings,
      ...runCheckup(coupleJanuary(), DEMO_JANUARY_AS_OF).findings,
      ...runCheckup(load(hourly), DEMO_NOVEMBER_AS_OF).findings,
      ...runCheckup(load(salaried), DEMO_NOVEMBER_AS_OF).findings,
    ];
    expect(findings.length).toBeGreaterThan(3);
    for (const x of findings) {
      const c = explainCalculation(x, p);
      expect(c.formula, x.code).not.toBeNull();
      expect(c.substituted, x.code).not.toBeNull();
      for (const s of c.sources) expect(Object.values(p.sources)).toContain(s.url);
    }
  });

  it("leaves unknown codes without a formula, so the UI shows the raw inputs", () => {
    const c = explainCalculation(f("SOMETHING_NEW", { foo: 1 }), p);
    expect(c.formula).toBeNull();
    expect(c.difference).toBeNull();
  });
});
