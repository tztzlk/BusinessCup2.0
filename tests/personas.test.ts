import { describe, expect, it } from "vitest";
import { runCheckup } from "../lib/engine";
import type { HouseholdData } from "../lib/types";
import hourly from "../mocks/hourly.json";
import salaried from "../mocks/salaried.json";

// Demo personas 2 and 3: each household must show exactly one planted finding.
const AS_OF = "2026-11-14";
const load = (m: unknown): HouseholdData => structuredClone((m as { household: HouseholdData }).household);

describe("demo personas", () => {
  it("hourly (Rosa & Tom): 12 hours over 40/week paid at the regular rate, April about even", () => {
    const r = runCheckup(load(hourly), AS_OF);
    expect(r.findings.map((f) => [f.code, f.employerId, f.amountUsd])).toEqual([["POSSIBLE_UNPAID_OVERTIME", "emp_rosa", 132]]);
    expect(Math.abs(r.projection!.balance)).toBeLessThan(100);
  });

  it("salaried (Nina & Marcus): 3% deferral under a 100%-up-to-5% match, April about even", () => {
    const r = runCheckup(load(salaried), AS_OF);
    expect(r.findings.map((f) => [f.code, f.employerId, f.amountUsd])).toEqual([["MATCH_LEFT_ON_TABLE", "emp_nina", 1920]]);
    expect(Math.abs(r.projection!.balance)).toBeLessThan(100);
  });
});
