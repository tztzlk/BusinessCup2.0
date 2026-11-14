import { describe, expect, it } from "vitest";
import { runCheckup } from "../lib/engine";
import { aprilOutlook, householdOverview } from "../lib/engine/overview";
import { findingPeriod, potentialSavings } from "../lib/engine/savings";
import { coupleJanuary, coupleNovember, DEMO_JANUARY_AS_OF, DEMO_NOVEMBER_AS_OF } from "../lib/demo";
import { lastConfirmedAt } from "../lib/householdMeta";
import { paycheckChart, paycheckHistoryRows, windowStart } from "../lib/paycheckHistory";
import type { Finding, HouseholdData } from "../lib/types";
import hourly from "../mocks/hourly.json";
import salaried from "../mocks/salaried.json";

const load = (m: unknown): HouseholdData => structuredClone((m as { household: HouseholdData }).household);

const f = (code: string, amountUsd: number, inputs: Finding["inputs"] = {}, employerId: string | null = "e1"): Finding => ({
  code,
  severity: "warning",
  amountUsd,
  employerId,
  inputs,
  action: { kind: "info", details: "" },
});

describe("finding units", () => {
  it("knows what each amount measures", () => {
    expect(findingPeriod("MATCH_LEFT_ON_TABLE")).toBe("year");
    expect(findingPeriod("WITHHOLDING_DIFFERS_FROM_W4")).toBe("year");
    expect(findingPeriod("OVERTIME_UNDERPAID")).toBe("paycheck");
    expect(findingPeriod("POSSIBLE_UNPAID_OVERTIME")).toBe("paycheck");
    expect(findingPeriod("UNDERWITHHOLDING")).toBe("april");
    expect(findingPeriod("W2_BOX12D_MISMATCH")).toBe("w2");
    expect(findingPeriod("SOMETHING_NEW")).toBeNull();
  });
});

describe("potential savings", () => {
  it("counts money the household gets back, each finding once, and nothing else", () => {
    const match = f("MATCH_LEFT_ON_TABLE", 1920);
    const findings = [
      match,
      match, // the same finding twice is still one finding
      f("MATCH_UNDERPAID", 100.5),
      f("OVERTIME_UNDERPAID", 60),
      f("SOCIAL_SECURITY_MISMATCH", 10, { expected: 124, printed: 134 }), // overcharged: counted
      f("MEDICARE_MISMATCH", 5, { expected: 29, printed: 24 }), // undercharged: not money back
      f("NET_PAY_MISMATCH", 20, { expectedNet: 1500, printedNet: 1480 }), // paid short: counted
      f("NET_PAY_MISMATCH", 7, { expectedNet: 1500, printedNet: 1507 }), // paid extra: not counted
      f("UNDERWITHHOLDING", 3000, {}, null),
      f("OVERWITHHOLDING", 900, {}, null),
      f("WITHHOLDING_DIFFERS_FROM_W4", 400),
      f("YTD_DECREASED", 50),
      f("W2_BOX12D_MISMATCH", 1560),
    ];
    const s = potentialSavings(findings);
    expect(s.perYear).toBe(2020.5);
    expect(s.onCheckedPaychecks).toBe(90);
    expect(s.items.map((i) => i.finding.code)).toEqual([
      "MATCH_LEFT_ON_TABLE",
      "MATCH_UNDERPAID",
      "OVERTIME_UNDERPAID",
      "SOCIAL_SECURITY_MISMATCH",
      "NET_PAY_MISMATCH",
    ]);
  });

  it("matches the demo households' findings", () => {
    const rosa = runCheckup(load(hourly), DEMO_NOVEMBER_AS_OF);
    const overtime = rosa.findings.filter((x) => x.code === "POSSIBLE_UNPAID_OVERTIME");
    expect(overtime.length).toBeGreaterThan(0);
    expect(potentialSavings(rosa.findings).onCheckedPaychecks).toBe(overtime.reduce((a, x) => a + x.amountUsd, 0));

    const nina = runCheckup(load(salaried), DEMO_NOVEMBER_AS_OF);
    const match = nina.findings.filter((x) => x.code === "MATCH_LEFT_ON_TABLE");
    expect(match.length).toBeGreaterThan(0);
    const s = potentialSavings(nina.findings);
    expect(s.perYear).toBe(match.reduce((a, x) => a + x.amountUsd, 0));
    expect(s.items.every((i) => i.finding.code.startsWith("MATCH_"))).toBe(true);
  });
});

describe("household overview", () => {
  it("takes income, withholding and balance from the projection", () => {
    const data = coupleNovember();
    const result = runCheckup(data, DEMO_NOVEMBER_AS_OF);
    const o = householdOverview(data, result, DEMO_NOVEMBER_AS_OF);
    expect(result.projection).not.toBeNull();
    expect(o.annualIncome).toBe(result.projection!.inputs.agi);
    expect(o.totalWithholding).toBe(result.projection!.projectedWithholding);
    expect(o.balance).toBe(result.projection!.balance);
    expect(o.outlook).toBe(aprilOutlook(result.findings));
    expect(o.outlook).toBe("owe");
    expect(o.attention).toBe(result.findings.length);
  });

  it("shows no change with one pay stub per job: there is nothing comparable", () => {
    const data = coupleNovember();
    expect(householdOverview(data, runCheckup(data, DEMO_NOVEMBER_AS_OF), DEMO_NOVEMBER_AS_OF).change).toBeNull();
  });

  it("compares with the checkup before the newest stub when that job has an earlier one", () => {
    const data = coupleJanuary();
    const result = runCheckup(data, DEMO_JANUARY_AS_OF);
    const o = householdOverview(data, result, DEMO_JANUARY_AS_OF);
    expect(o.change).not.toBeNull();
    const w = o.change!.totalWithholding!;
    expect(w.previous).toBeGreaterThan(0);
    const expected = Math.round(((result.projection!.projectedWithholding - w.previous) / w.previous) * 1000) / 10;
    expect(w.percent).toBe(expected);
  });

  it("has no projection numbers without pay stubs", () => {
    const data = coupleNovember();
    data.documents = [];
    const o = householdOverview(data, runCheckup(data, DEMO_NOVEMBER_AS_OF));
    expect(o.annualIncome).toBeNull();
    expect(o.balance).toBeNull();
    expect(o.outlook).toBeNull();
    expect(o.savings.perYear).toBe(0);
  });
});

describe("paycheck chart", () => {
  it("keeps paychecks inside the window, oldest first, one line per job", () => {
    const data = coupleJanuary();
    const rows = paycheckHistoryRows(data, runCheckup(data, DEMO_JANUARY_AS_OF));
    expect(rows.every((r) => typeof r.federalWithheld === "number")).toBe(true);
    const all = paycheckChart(rows, "netCurrent", 12, "2026-12-31");
    expect(all.series.length).toBe(data.employers.length);
    expect(all.points.map((p) => p.date)).toEqual([...all.points.map((p) => p.date)].sort());
    const values = all.points.flatMap((p) => all.series.map((s) => p[s.key]).filter((v) => v !== undefined));
    expect(values.length).toBe(rows.filter((r) => r.stub.payDate <= "2026-12-31" && r.stub.payDate >= windowStart("2026-12-31", 12)).length);
    const none = paycheckChart(rows, "netCurrent", 3, "2026-06-30");
    expect(none.points.length).toBe(0);
  });

  it("window start goes back whole months", () => {
    expect(windowStart("2026-11-15", 3)).toBe("2026-08-15");
    expect(windowStart("2026-11-15", 12)).toBe("2025-11-15");
  });
});

describe("last checked", () => {
  it("is the newest confirmed document", () => {
    expect(lastConfirmedAt({ documents: [] })).toBeNull();
    const data = coupleJanuary();
    const newest = data.documents.map((d) => d.createdAt).sort().at(-1);
    expect(lastConfirmedAt(data)).toBe(newest);
  });
});
