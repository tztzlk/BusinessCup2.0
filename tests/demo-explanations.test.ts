import { describe, expect, it } from "vitest";
import { runCheckup } from "../lib/engine";
import { householdOverview } from "../lib/engine/overview";
import { aprilYearMatches, buildExplainRequest, directionMatches, groundedBodies, numbersAreGrounded, type ExplainResponse } from "../lib/explain";
import { coupleJanuary, coupleNovember, DEMO_JANUARY_AS_OF, DEMO_NOVEMBER_AS_OF } from "../lib/demo";
import hourly from "../mocks/hourly.json";
import salaried from "../mocks/salaried.json";
import prebuilt from "../lib/demoExplanations.json";
import type { HouseholdData } from "../lib/types";

// The demos use pre-generated Claude texts (lib/demoExplanations.json), looked up by the exact request
// that ReportBody builds. If the engine or a mock changes a demo's findings, this fails: regenerate the file.
const views: Array<[keyof typeof prebuilt.views, HouseholdData, string]> = [
  ["couple_november", coupleNovember(), DEMO_NOVEMBER_AS_OF],
  ["couple_january", coupleJanuary(), DEMO_JANUARY_AS_OF],
  ["hourly", structuredClone((hourly as unknown as { household: HouseholdData }).household), DEMO_NOVEMBER_AS_OF],
  ["salaried", structuredClone((salaried as unknown as { household: HouseholdData }).household), DEMO_NOVEMBER_AS_OF],
];

describe("pre-generated demo explanations", () => {
  for (const [name, data, asOf] of views) {
    it(`${name}: matches the request the report builds and passes the number checks`, () => {
      const result = runCheckup(data, asOf);
      const overview = householdOverview(data, result, asOf);
      // Same as ReportBody: an on-track household sends a zero balance.
      const proj = overview.outlook === "on_track" && result.projection ? { ...result.projection, balance: 0 } : result.projection;
      const req = buildExplainRequest(result.findings, proj);
      const entry = prebuilt.views[name];
      expect(JSON.stringify(entry.request)).toBe(JSON.stringify(req));

      const res = entry.response as ExplainResponse;
      expect(groundedBodies(req, res).size).toBe(req.findings.length);
      const all = req.findings.flatMap((f) => [f.amountUsd, ...Object.values(f.inputs)]);
      if (req.projection) all.push(req.projection.balance);
      const summary = res.summary ?? "";
      expect(numbersAreGrounded(summary, all) && directionMatches(summary, req.projection?.balance) && aprilYearMatches(summary, req.projection?.taxYear)).toBe(true);
    });
  }
});
