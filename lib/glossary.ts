// Plain-English definitions for US tax terms, shown by components/Term.tsx.
// Kept factual and short. No tax amounts here: rates and limits live in lib/engine/params.

export interface GlossaryEntry {
  term: string;
  definition: string;
  /** Phrases that count as this term in running text (TermText), most specific first. */
  matches: string[];
}

export const GLOSSARY = {
  w2: {
    term: "W-2",
    definition: "The form your employer sends by January 31 with what you earned last year and the taxes withheld. You need it to file your return.",
    matches: ["W-2"],
  },
  w4: {
    term: "W-4",
    definition: "The form you give your employer to tell payroll how much federal income tax to withhold from each paycheck. You can hand in a new one anytime.",
    matches: ["W-4"],
  },
  w4Step2: {
    term: "W-4 Step 2",
    definition:
      "The box for households with more than one job, including a working spouse. Checked, it makes payroll withhold at higher rates, because this paycheck isn't your only income.",
    matches: ["Step 2"],
  },
  w4Step3: {
    term: "W-4 Step 3",
    definition: "Where you claim credits such as the Child Tax Credit, so payroll withholds less from each paycheck instead of paying it back as a refund.",
    matches: ["Step 3"],
  },
  w4Step4c: {
    term: "W-4 Step 4(c)",
    definition: "An extra dollar amount withheld from every paycheck. The simplest way to close a gap so you don't owe in April.",
    matches: ["Step 4(c)"],
  },
  withholding: {
    term: "Withholding",
    definition: "Income tax your employer takes out of each paycheck and sends to the IRS for you. When you file, it counts against the tax you actually owe.",
    matches: ["Withholding", "withholding", "withheld"],
  },
  fica: {
    term: "FICA",
    definition: "Social Security and Medicare taxes, taken from every paycheck at fixed rates. They are separate from income tax and your W-4 doesn't change them.",
    matches: ["FICA"],
  },
  socialSecurity: {
    term: "Social Security tax",
    definition: "A payroll tax at a fixed rate on your wages, up to a yearly wage cap. It funds retirement and disability benefits.",
    matches: ["Social Security"],
  },
  medicare: {
    term: "Medicare tax",
    definition: "A payroll tax at a fixed rate on all of your wages, with no cap. It funds health insurance for people 65 and older.",
    matches: ["Medicare"],
  },
  additionalMedicare: {
    term: "Additional Medicare tax",
    definition:
      "An extra Medicare tax on wages above a threshold that depends on filing status. Each employer starts withholding it at a fixed amount of pay, which may not match what your household owes.",
    matches: ["Additional Medicare"],
  },
  match401k: {
    term: "401(k) employer match",
    definition:
      "Money your employer adds to your 401(k) when you contribute, up to a limit set by your plan. Contributing less than that limit leaves part of it unclaimed.",
    matches: ["401(k) match"],
  },
  ytd: {
    term: "YTD (year to date)",
    definition: "Totals from January 1 through this paycheck. Pay stubs print them next to the amounts for the current paycheck.",
    matches: ["Year-to-date", "year-to-date", "YTD"],
  },
  preTax: {
    term: "Pre-tax deduction",
    definition: "Money taken from your pay before income tax is figured, such as a traditional 401(k) or health insurance. It lowers your taxable wages.",
    matches: ["Pre-tax", "pre-tax"],
  },
  standardDeduction: {
    term: "Standard deduction",
    definition: "A fixed amount of income, set by filing status, that federal income tax doesn't apply to. Most households take it instead of itemizing.",
    matches: ["standard deduction", "Standard deduction"],
  },
  childTaxCredit: {
    term: "Child Tax Credit",
    definition: "A credit that lowers your federal tax for each qualifying child under 17. Part of it can be paid to you even if you owe no tax.",
    matches: ["Child Tax Credit"],
  },
} satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;

export interface TextPart {
  text: string;
  term?: GlossaryKey;
}

/**
 * Splits text so the first occurrence of each listed term can be wrapped in a tooltip.
 * Terms are tried in the given order; overlapping matches are skipped.
 */
export function splitTerms(text: string, keys: readonly GlossaryKey[]): TextPart[] {
  const hits: Array<{ start: number; end: number; key: GlossaryKey }> = [];
  for (const key of keys) {
    for (const phrase of GLOSSARY[key].matches) {
      const start = text.indexOf(phrase);
      if (start < 0) continue;
      const end = start + phrase.length;
      if (!hits.some((h) => start < h.end && end > h.start)) hits.push({ start, end, key });
      break;
    }
  }
  hits.sort((a, b) => a.start - b.start);
  const parts: TextPart[] = [];
  let at = 0;
  for (const h of hits) {
    if (h.start > at) parts.push({ text: text.slice(at, h.start) });
    parts.push({ text: text.slice(h.start, h.end), term: h.key });
    at = h.end;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return parts;
}
