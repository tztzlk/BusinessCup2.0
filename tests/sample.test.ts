import { describe, expect, it } from "vitest";
import { runCheckup } from "../lib/engine";
import { SAMPLE_EMPLOYER, SAMPLE_PROFILE } from "../lib/sample";
import type { HouseholdData, Paystub } from "../lib/types";

// Fields of public/samples/sample-paystub.pdf as read on production by /api/extract (14.11).
const stub: Paystub = {
  employerName: "Acme Logistics LLC (SAMPLE)",
  payPeriodStart: "2026-10-19",
  payPeriodEnd: "2026-11-01",
  payDate: "2026-11-06",
  payFrequency: "biweekly",
  earnings: [
    { type: "regular", hours: 80, rate: 20, current: 1600, ytd: 35200 },
    { type: "overtime", hours: 10, rate: 20, current: 200, ytd: 3000 },
  ],
  taxes: [
    { type: "federal_income", current: 125.31, ytd: 2756.82 },
    { type: "social_security", current: 111.6, ytd: 2368.4 },
    { type: "medicare", current: 26.1, ytd: 553.9 },
  ],
  deductions: [{ type: "401k_pretax", preTax: true, current: 54, ytd: 1146 }],
  employerContributions: [{ type: "401k_match", current: 27, ytd: 573 }],
  grossCurrent: 1800,
  netCurrent: 1482.99,
  grossYtd: 38200,
};

describe("sample pay stub story", () => {
  it("finds only the planted error: overtime paid at the regular rate", () => {
    const data: HouseholdData = {
      profile: SAMPLE_PROFILE,
      employers: [{ id: "e1", ...SAMPLE_EMPLOYER }],
      documents: [{ id: "d1", employerId: "e1", docType: "paystub", taxYear: 2026, fields: stub, createdAt: "2026-11-07T00:00:00Z" }],
      checklist: [],
    };
    const result = runCheckup(data, "2026-11-14");
    expect(result.findings.map((f) => f.code)).toEqual(["OVERTIME_UNDERPAID"]);
    expect(result.findings[0].amountUsd).toBe(100); // 10 h × ($30 − $20)
  });
});
