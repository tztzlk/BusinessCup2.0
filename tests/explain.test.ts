import { describe, expect, it } from "vitest";
import { buildExplainRequest, groundedBodies, numbersAreGrounded, quotedDollars } from "../lib/explain";
import type { Finding } from "../lib/types";

const match = (employerId: string, amountUsd: number): Finding => ({
  code: "MATCH_LEFT_ON_TABLE",
  severity: "warning",
  amountUsd,
  employerId,
  inputs: { contributionPercent: 0, matchPercent: 100, upToPercentOfPay: 4, annualPay: 78000, missedThisYear: 2600 },
  action: { kind: "contribution_change", details: "Raise your 401(k) contribution to at least 4% to get the full employer match." },
});

const w2: Finding = {
  code: "W2_BOX12D_MISMATCH",
  severity: "warning",
  amountUsd: 1560,
  employerId: "emp_b",
  inputs: { box: "12 D", onW2: 1560, fromPayStubs: 0 },
  action: { kind: "ask_w2c", details: "W-2 box 12 D differs from your year-end pay stub by $1,560.00." },
};

describe("explain request", () => {
  it("sends ids, codes and numbers only: no employer, no text inputs, no engine prose", () => {
    const req = buildExplainRequest([match("emp_a", 475), w2], null);
    expect(req.findings.map((f) => f.id)).toEqual(["f0", "f1"]);
    expect(req.findings[1].inputs).toEqual({ onW2: 1560, fromPayStubs: 0 });
    const wire = JSON.stringify(req);
    expect(wire).not.toContain("emp_");
    expect(wire).not.toContain("Raise your");
    expect(wire).not.toContain("12 D");
  });
});

describe("number grounding", () => {
  it("parses quoted dollar amounts", () => {
    expect(quotedDollars("Owe $7,573 or $1,560.00, not 4%")).toEqual([7573, 1560]);
  });

  it("accepts amounts that match engine numbers and rejects invented ones", () => {
    expect(numbersAreGrounded("You may owe about $7,573 in April.", [7572.6])).toBe(true);
    expect(numbersAreGrounded("Add $999 per paycheck.", [7572.6])).toBe(false);
    expect(numbersAreGrounded("No dollar amounts here.", [])).toBe(true);
  });

  it("maps answers by id so two findings with the same code stay apart", () => {
    const req = buildExplainRequest([match("emp_a", 475), match("emp_b", 3120)], null);
    const bodies = groundedBodies(req, {
      summary: "",
      items: [
        { id: "f1", code: "MATCH_LEFT_ON_TABLE", title: "", body: "You're missing $3,120 of free match." },
        { id: "f0", code: "MATCH_LEFT_ON_TABLE", title: "", body: "You're missing $9,999 of free match." },
      ],
    });
    expect(bodies.get(1)).toBe("You're missing $3,120 of free match.");
    expect(bodies.has(0)).toBe(false); // invented amount → engine text stays
  });
});
