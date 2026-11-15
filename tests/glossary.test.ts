import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { renderToStaticMarkup } from "react-dom/server";
import { GLOSSARY, splitTerms } from "../lib/glossary";
import { PaystubEditor } from "../components/DocumentEditor";
import { Term } from "../components/Term";
import type { Paystub } from "../lib/types";

// Components import "@/..."; map it the same way as tests/extract-route.test.ts.
vi.mock("@/lib/glossary", async () => await import("../lib/glossary"));
vi.mock("@/lib/formSchemas", async () => await import("../lib/formSchemas"));

describe("glossary", () => {
  it("has a short definition for every term", () => {
    for (const [key, e] of Object.entries(GLOSSARY)) {
      expect(e.definition.length, key).toBeGreaterThan(20);
      expect(e.definition.length, key).toBeLessThan(220);
      expect(e.matches.length, key).toBeGreaterThan(0);
    }
  });

  it("has no dollar amounts or rates: those belong in engine params", () => {
    for (const e of Object.values(GLOSSARY)) expect(e.definition).not.toMatch(/\$\d|\d%/);
  });

  it("wraps only the first occurrence of each term, without overlaps", () => {
    expect(splitTerms("Medicare tax, incl. Additional Medicare", ["additionalMedicare", "medicare"])).toEqual([
      { text: "Medicare", term: "medicare" },
      { text: " tax, incl. " },
      { text: "Additional Medicare", term: "additionalMedicare" },
    ]);
    expect(splitTerms("Withholding doesn't match your W-4", ["w4", "withholding"])).toEqual([
      { text: "Withholding", term: "withholding" },
      { text: " doesn't match your " },
      { text: "W-4", term: "w4" },
    ]);
    expect(splitTerms("You may owe in April", ["w4"])).toEqual([{ text: "You may owe in April" }]);
  });

  it("renders a Term as a button described by its definition", () => {
    const html = renderToStaticMarkup(createElement(Term, { k: "w4" }));
    expect(html).toContain("<button");
    expect(html).toContain("aria-describedby");
    expect(html).toContain("W-4");
  });
});

describe("confirm step: uncertain fields", () => {
  const stub: Paystub = {
    employerName: "Acme",
    payPeriodStart: "2026-10-01",
    payPeriodEnd: "2026-10-14",
    payDate: "2026-10-17",
    payFrequency: "biweekly",
    earnings: [{ type: "regular", current: 2000, ytd: null, hours: 80, rate: 25 }],
    taxes: [{ type: "federal_income", current: 150, ytd: null }],
    deductions: [],
    employerContributions: [],
    grossCurrent: 2000,
    netCurrent: 1850,
    grossYtd: null,
  };
  function Editor({ confidence }: { confidence: Record<string, "medium" | "low"> }) {
    const form = useForm<FieldValues>({ defaultValues: { employerId: "", fields: stub } });
    return createElement(PaystubEditor, { form, confidence });
  }
  const render = (confidence: Record<string, "medium" | "low">) => renderToStaticMarkup(createElement(Editor, { confidence }));

  it("marks only the fields the model flagged with Please verify", () => {
    expect(render({})).not.toContain("Please verify");
    const html = render({ netCurrent: "medium", "taxes[0].current": "low" });
    expect(html.match(/Please verify/g)).toHaveLength(2);
    expect(html.match(/Compare with your document/g)).toHaveLength(2);
    expect(html).toContain("Likely misread.");
    expect(html).toContain('aria-invalid="true"');
  });
});
