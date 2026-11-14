import { describe, expect, it } from "vitest";
import { runCheckup } from "../lib/engine";
import { coupleJanuary, coupleNovember, DEMO_JANUARY_AS_OF, DEMO_NOVEMBER_AS_OF } from "../lib/demo";

// The demo story must stay true when the engine or mock data change.
describe("demo couple", () => {
  it("November: under-withheld, Step 4(c) fix, missed 401(k) match, stubs otherwise correct", () => {
    const r = runCheckup(coupleNovember(), DEMO_NOVEMBER_AS_OF);
    const codes = r.findings.map((f) => f.code);
    console.log("november", r.projection, codes, r.findings.map((f) => [f.code, f.amountUsd]));
    // The pitch quotes these numbers: about $7,573 owed in April, Step 4(c) $999 + $895 per paycheck.
    expect(Math.round(r.projection!.balance)).toBe(7573);
    expect(r.projection!.perEmployer.map((e) => e.recommendedStep4c).sort((x, y) => y - x)).toEqual([999, 895]);
    expect(codes[0]).toBe("UNDERWITHHOLDING");
    expect(codes.filter((c) => c === "MATCH_LEFT_ON_TABLE")).toHaveLength(2);
    expect(codes).not.toContain("NET_PAY_MISMATCH");
    expect(codes).not.toContain("SOCIAL_SECURITY_MISMATCH");
    expect(codes).not.toContain("MEDICARE_MISMATCH");
    expect(codes).not.toContain("WITHHOLDING_DIFFERS_FROM_W4");
    expect(r.projection!.perEmployer.every((e) => e.recommendedStep4c > 0)).toBe(true);
  });

  it("January: W-2 box 12 D mismatch for Jordan, 1099-INT still missing", () => {
    const r = runCheckup(coupleJanuary(), DEMO_JANUARY_AS_OF);
    const w2 = r.findings.filter((f) => f.code.startsWith("W2_"));
    console.log("january", r.projection?.balance, r.checklist, w2.map((f) => [f.code, f.employerId, f.amountUsd]));
    expect(w2.map((f) => [f.code, f.employerId])).toEqual([["W2_BOX12D_MISMATCH", "emp_jordan"]]);
    const byForm = Object.fromEntries(r.checklist.map((c) => [`${c.formType}:${c.source}`, c.status]));
    expect(byForm["W-2:Northwind Logistics (SAMPLE)"]).toBe("received");
    expect(byForm["W-2:Bluebonnet Health (SAMPLE)"]).toBe("mismatch");
    expect(byForm["1098:Mortgage lender"]).toBe("received");
    expect(byForm["1099-INT:Bank"]).toBe("expected");
  });
});
