import { describe, expect, it } from "vitest";
import { runPaystubChecks, workweeksInPeriod } from "../lib/engine/checks";
import { federalParams } from "../lib/engine/params";
import type { EmploymentSettings, Paystub } from "../lib/types";

// FLSA overtime is owed per workweek (hours over 40 at 1.5x), never averaged across weeks.
// A stub only has period totals, so the engine checks the least overtime owed.
const p = federalParams(2026);
const RATE = 20;

const job: EmploymentSettings = {
  id: "emp_test",
  member: "self",
  employerName: "Test Co (SAMPLE)",
  payType: "hourly",
  hourlyRate: RATE,
  overtimeEligible: true,
  w4: { step2Checked: false, step3Credits: 0, step4aOtherIncome: 0, step4bDeductions: 0, step4cExtraWithholding: 0 },
};

type Line = Paystub["earnings"][number];
const reg = (hours: number): Line => ({ type: "regular", hours, rate: RATE, current: hours * RATE, ytd: null });
const ot = (hours: number | null, current = (hours ?? 0) * RATE * 1.5): Line => ({ type: "overtime", hours, rate: RATE * 1.5, current, ytd: null });
const pto = (hours: number): Line => ({ type: "pto", hours, rate: RATE, current: hours * RATE, ytd: null });

function stub(earnings: Line[], start = "2026-10-19", end = "2026-11-01", payFrequency: Paystub["payFrequency"] = "biweekly"): Paystub {
  const gross = earnings.reduce((a, e) => a + e.current, 0);
  return {
    employerName: job.employerName,
    payPeriodStart: start,
    payPeriodEnd: end,
    payDate: end,
    payFrequency,
    earnings,
    taxes: [],
    deductions: [],
    employerContributions: [],
    grossCurrent: gross,
    netCurrent: gross,
    grossYtd: null,
  };
}

const overtime = (s: Paystub) => {
  const r = runPaystubChecks(s, null, job, "single", p);
  return { ran: r.ran.includes("overtime"), findings: r.findings.filter((f) => f.code.includes("OVERTIME")).map((f) => [f.code, f.amountUsd]) };
};

describe("workweeks in a pay period", () => {
  it("weekly and biweekly periods line up with workweeks", () => {
    expect(workweeksInPeriod({ payPeriodStart: "2026-11-02", payPeriodEnd: "2026-11-08", payFrequency: "weekly" })).toEqual({ weeks: 1, aligned: true });
    expect(workweeksInPeriod({ payPeriodStart: "2026-10-19", payPeriodEnd: "2026-11-01", payFrequency: "biweekly" })).toEqual({ weeks: 2, aligned: true });
  });

  it("semi-monthly and monthly periods count every workweek they can touch", () => {
    expect(workweeksInPeriod({ payPeriodStart: "2026-11-01", payPeriodEnd: "2026-11-15", payFrequency: "semimonthly" })).toEqual({ weeks: 3, aligned: false });
    expect(workweeksInPeriod({ payPeriodStart: "2026-11-16", payPeriodEnd: "2026-11-30", payFrequency: "semimonthly" })).toEqual({ weeks: 3, aligned: false });
    expect(workweeksInPeriod({ payPeriodStart: "2026-10-16", payPeriodEnd: "2026-10-31", payFrequency: "semimonthly" })).toEqual({ weeks: 4, aligned: false });
    expect(workweeksInPeriod({ payPeriodStart: "2026-10-01", payPeriodEnd: "2026-10-31", payFrequency: "monthly" })).toEqual({ weeks: 6, aligned: false });
  });

  it("falls back to the pay frequency when the dates are missing or odd", () => {
    expect(workweeksInPeriod({ payPeriodStart: "", payPeriodEnd: "", payFrequency: "biweekly" })).toEqual({ weeks: 2, aligned: true });
    expect(workweeksInPeriod({ payPeriodStart: "2026-11-30", payPeriodEnd: "2026-11-01", payFrequency: "weekly" })).toEqual({ weeks: 1, aligned: true });
    expect(workweeksInPeriod({ payPeriodStart: "", payPeriodEnd: "", payFrequency: "monthly" })).toBeNull();
  });
});

describe("unpaid overtime per workweek", () => {
  it("weekly: 45 hours at the regular rate owe 5 hours of half-time premium", () => {
    expect(overtime(stub([reg(45)], "2026-11-02", "2026-11-08", "weekly")).findings).toEqual([["POSSIBLE_UNPAID_OVERTIME", 5 * RATE * 0.5]]);
  });

  it("biweekly: 92 regular hours owe at least 12 hours of premium (Rosa's case)", () => {
    expect(overtime(stub([reg(92)])).findings).toEqual([["POSSIBLE_UNPAID_OVERTIME", 12 * RATE * 0.5]]);
  });

  it("still checks when the stub has an overtime line that is too short (was skipped before)", () => {
    // 95 regular + 2 overtime = 97 worked; at least 17 overtime hours, 2 paid as overtime: 15 short.
    expect(overtime(stub([reg(95), ot(2)])).findings).toEqual([["POSSIBLE_UNPAID_OVERTIME", 15 * RATE * 0.5]]);
  });

  it("no finding when overtime hours already cover the hours over 40 a week", () => {
    expect(overtime(stub([reg(80), ot(6)])).findings).toEqual([]);
    expect(overtime(stub([reg(76), ot(4)])).findings).toEqual([]);
  });

  it("PTO and holiday hours are paid but not worked, so they don't count toward 40", () => {
    expect(overtime(stub([reg(80), pto(8)])).findings).toEqual([]);
  });

  it("semi-monthly is now checked, using the most workweeks the period can touch", () => {
    // Nov 1–15 touches up to 3 workweeks: 3 × 40 = 120. 130 hours worked: at least 10 owed.
    const s = stub([reg(130)], "2026-11-01", "2026-11-15", "semimonthly");
    expect(overtime(s)).toEqual({ ran: true, findings: [["POSSIBLE_UNPAID_OVERTIME", 10 * RATE * 0.5]] });
    // A normal full-time semi-monthly stub (86.67 h) is fine.
    expect(overtime(stub([reg(86.67)], "2026-11-01", "2026-11-15", "semimonthly")).findings).toEqual([]);
  });

  it("an overtime amount without hours is not second-guessed", () => {
    expect(overtime(stub([reg(95), ot(null, 300)])).findings).toEqual([]);
  });

  it("rounding slack: under half an hour over is not flagged", () => {
    expect(overtime(stub([reg(80.25)])).findings).toEqual([]);
  });

  it("overtime paid below 1.5x is still caught, alongside unpaid hours", () => {
    // 90 + 5 = 95 worked, at least 15 overtime hours: 5 paid at straight time, 10 not paid as overtime at all.
    expect(overtime(stub([reg(90), ot(5, 5 * RATE)])).findings).toEqual([
      ["OVERTIME_UNDERPAID", 5 * RATE * 0.5],
      ["POSSIBLE_UNPAID_OVERTIME", 10 * RATE * 0.5],
    ]);
  });

  it("salaried or exempt jobs are not checked", () => {
    const r = runPaystubChecks(stub([reg(92)]), null, { ...job, overtimeEligible: false }, "single", p);
    expect(r.ran).not.toContain("overtime");
  });
});
