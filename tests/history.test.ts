import { describe, expect, it } from "vitest";
import { runCheckup } from "../lib/engine";
import { checkupAsOfStub, householdAsOfStub } from "../lib/engine/history";
import { quickEstimate } from "../lib/engine/quickEstimate";
import { coupleJanuary, DEMO_JANUARY_AS_OF } from "../lib/demo";
import type { Paystub } from "../lib/types";

describe("checkup as of a pay stub", () => {
  it("keeps stubs up to that pay date and drops W-2s", () => {
    const data = coupleJanuary();
    const older = data.documents.find((d) => d.docType === "paystub" && !d.id.endsWith("_ye"))!;
    const scoped = householdAsOfStub(data, older.id)!;
    expect(scoped.documents.every((d) => d.docType === "paystub")).toBe(true);
    expect(scoped.documents.every((d) => (d.fields as Paystub).payDate <= (older.fields as Paystub).payDate)).toBe(true);
    expect(scoped.documents.some((d) => d.id === older.id)).toBe(true);
    expect(householdAsOfStub(data, "missing")).toBeNull();
  });

  it("gives the latest stub the same status as the full checkup", () => {
    const data = coupleJanuary();
    const full = runCheckup(data, DEMO_JANUARY_AS_OF);
    for (const s of full.checks) {
      const latest = data.documents.find((d) => d.employerId === s.employerId && d.docType === "paystub" && (d.fields as Paystub).payDate === s.payDate)!;
      const own = checkupAsOfStub(data, latest.id, DEMO_JANUARY_AS_OF)!;
      const worst = s.checks.some((c) => c.status === "fix_now") ? "fix_now" : s.checks.some((c) => c.status === "worth_checking") ? "worth_checking" : "ok";
      expect(own.status).toBe(worst);
    }
  });

  it("checks an older stub too", () => {
    const data = coupleJanuary();
    const older = data.documents.find((d) => d.docType === "paystub" && !d.id.endsWith("_ye"))!;
    const own = checkupAsOfStub(data, older.id)!;
    expect(own.status).not.toBeNull();
    expect(own.result.checks.some((c) => c.payDate === (older.fields as Paystub).payDate)).toBe(true);
  });
});

describe("quick estimate extras", () => {
  const base = { filingStatus: "single" as const, salary: 60000, spouseSalary: 0, childrenUnder17: 0, step2Checked: false, childrenOnW4: false };

  it("adds other income to AGI and to the tax, not to withholding", () => {
    const a = quickEstimate(base)!;
    const b = quickEstimate({ ...base, otherIncome: 5000 })!;
    expect(b.inputs.agi - a.inputs.agi).toBe(5000);
    expect(b.annualTax).toBeGreaterThan(a.annualTax);
    expect(b.annualWithholding).toBe(a.annualWithholding);
    expect(b.balance).toBeGreaterThan(a.balance);
  });

  it("counts extra withholding on every paycheck", () => {
    const a = quickEstimate(base)!;
    const b = quickEstimate({ ...base, extraWithholdingPerPaycheck: 50 })!;
    expect(b.annualWithholding - a.annualWithholding).toBeCloseTo(50 * a.payPeriods, 2);
    expect(b.annualTax).toBe(a.annualTax);
  });
});
