import { describe, expect, it } from "vitest";
import { runCheckup } from "../lib/engine";
import { federalParams } from "../lib/engine/params";
import { runPaystubChecks } from "../lib/engine/checks";
import { statusForSeverity, summarizeStubChecks } from "../lib/engine/checkSummary";
import { coupleNovember, DEMO_NOVEMBER_AS_OF } from "../lib/demo";
import type { Finding, HouseholdData } from "../lib/types";
import hourly from "../mocks/hourly.json";
import salaried from "../mocks/salaried.json";

const p = federalParams(2026);
const load = (m: unknown): HouseholdData => structuredClone((m as { household: HouseholdData }).household);
const statuses = (data: HouseholdData) =>
  Object.fromEntries(runCheckup(data, DEMO_NOVEMBER_AS_OF).checks.map((s) => [s.employerId, Object.fromEntries(s.checks.map((c) => [c.id, c.status]))]));

const finding = (code: string, severity: Finding["severity"], employerId = "e1"): Finding => ({
  code,
  severity,
  amountUsd: 100,
  employerId,
  inputs: {},
  action: { kind: "info", details: "" },
});

describe("check summary", () => {
  it("maps severities to three levels", () => {
    expect(statusForSeverity("critical")).toBe("fix_now");
    expect(statusForSeverity("warning")).toBe("worth_checking");
    expect(statusForSeverity("info")).toBe("worth_checking");
  });

  it("lists only checks that ran, green when they raised nothing", () => {
    const lines = summarizeStubChecks(["medicare", "net_pay", "overtime"], [finding("OVERTIME_UNDERPAID", "critical")], "e1", p);
    expect(lines.map((l) => [l.id, l.status])).toEqual([
      ["net_pay", "ok"],
      ["medicare", "ok"],
      ["overtime", "fix_now"],
    ]);
  });

  it("ignores findings for other employers and other checks", () => {
    const lines = summarizeStubChecks(
      ["match_contribution", "federal_withholding"],
      [finding("MATCH_LEFT_ON_TABLE", "warning", "e2"), finding("UNDERWITHHOLDING", "critical"), finding("WITHHOLDING_DIFFERS_FROM_W4", "info")],
      "e1",
      p,
    );
    expect(lines.map((l) => [l.id, l.status])).toEqual([
      ["federal_withholding", "worth_checking"],
      ["match_contribution", "ok"],
    ]);
  });

  it("takes rates for the copy from params, not from code", () => {
    const [ss] = summarizeStubChecks(["social_security"], [], "e1", p);
    expect(ss.detail).toContain(`${p.fica.socialSecurityRate * 100}%`);
  });

  it("skips overtime on salaried jobs, YTD without a previous stub and the match without a rule", () => {
    const data = load(salaried);
    const marcus = data.employers.find((e) => e.id === "emp_marcus")!;
    const stub = data.documents.find((d) => d.employerId === "emp_marcus")!.fields as Parameters<typeof runPaystubChecks>[0];
    const { ran } = runPaystubChecks(stub, null, marcus, data.profile.filingStatus, p);
    expect(ran).toEqual(["net_pay", "social_security", "medicare", "federal_withholding"]);
  });
});

describe("demo households: what we checked", () => {
  it("couple (Alex & Jordan): both under-contribute to the 401(k) match; the stubs are otherwise correct", () => {
    expect(statuses(coupleNovember())).toEqual({
      emp_alex: {
        net_pay: "ok",
        social_security: "ok",
        medicare: "ok",
        federal_withholding: "ok",
        match_contribution: "worth_checking",
        match_paid: "ok",
      },
      emp_jordan: { net_pay: "ok", social_security: "ok", medicare: "ok", federal_withholding: "ok", match_contribution: "worth_checking" },
    });
  });

  it("hourly (Rosa & Tom): overtime is worth checking, everything else looks right", () => {
    expect(statuses(load(hourly))).toEqual({
      emp_rosa: {
        net_pay: "ok",
        social_security: "ok",
        medicare: "ok",
        federal_withholding: "ok",
        overtime: "worth_checking",
        match_contribution: "ok",
        match_paid: "ok",
      },
      emp_tom: { net_pay: "ok", social_security: "ok", medicare: "ok", federal_withholding: "ok" },
    });
  });

  it("salaried (Nina & Marcus): the 401(k) match is worth checking, everything else looks right", () => {
    expect(statuses(load(salaried))).toEqual({
      emp_nina: { net_pay: "ok", social_security: "ok", medicare: "ok", federal_withholding: "ok", match_contribution: "worth_checking", match_paid: "ok" },
      emp_marcus: { net_pay: "ok", social_security: "ok", medicare: "ok", federal_withholding: "ok" },
    });
  });
});
