import type { Finding } from "../types";
import type { FederalParams } from "./params";
import { round2 } from "./money";
import { findingPeriod, type ImpactPeriod } from "./savings";

// "Show calculation" for a finding: the rule in words, the same rule with the finding's own numbers,
// expected vs. actual and the difference, and the official source from params. Every number here is
// one the engine already used (Finding.inputs) or simple arithmetic on them, done here, not in the UI.

export interface CalculationSource {
  label: string;
  url: string;
}

export interface Calculation {
  /** The rule in plain words; null for a finding code this version doesn't describe. */
  formula: string | null;
  /** The rule with the numbers filled in. */
  substituted: string | null;
  expectedLabel: string;
  actualLabel: string;
  expected: number | null;
  actual: number | null;
  /** actual − expected. */
  difference: number | null;
  /** What expected/actual/difference measure. */
  unit: ImpactPeriod | null;
  sources: CalculationSource[];
}

const SOURCE_LABEL: Record<string, string> = {
  pub15t: "IRS Publication 15-T (2026), Federal Income Tax Withholding Methods",
  revProc: "IRS Rev. Proc. 2025-32 (2026 inflation adjustments)",
  brackets: "IRS: 2026 tax brackets and standard deduction",
  ssWageBase: "Social Security Administration: 2026 wage base",
  additionalMedicare: "IRS Topic 560: Additional Medicare Tax",
  limit401k: "IRS: 2026 401(k) contribution limit",
  childTaxCredit: "IRS: Child Tax Credit",
  overtimeDeduction: "IRS: the deduction for qualified overtime pay",
  flsaWorkweek: "U.S. Department of Labor: overtime pay (FLSA)",
};

function sources(p: FederalParams, keys: string[]): CalculationSource[] {
  return keys.filter((k) => p.sources[k]).map((k) => ({ label: SOURCE_LABEL[k] ?? k, url: p.sources[k] }));
}

/** Dollars and cents, so a few cents of difference stay visible. */
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (rate: number) => `${+(rate * 100).toFixed(3)}%`;
const plainPct = (n: number) => `${+n.toFixed(2)}%`;
const hours = (n: number) => `${+n.toFixed(2)} h`;

export function explainCalculation(f: Finding, p: FederalParams): Calculation {
  const n = (key: string): number | null => (typeof f.inputs[key] === "number" ? (f.inputs[key] as number) : null);
  const base: Calculation = {
    formula: null,
    substituted: null,
    expectedLabel: "Expected",
    actualLabel: "On your pay stub",
    expected: null,
    actual: null,
    difference: null,
    unit: findingPeriod(f.code),
    sources: [],
  };
  const compare = (expected: number | null, actual: number | null) =>
    expected === null || actual === null ? { expected, actual, difference: null } : { expected, actual, difference: round2(actual - expected) };

  switch (f.code) {
    case "SOCIAL_SECURITY_MISMATCH": {
      const wages = n("ficaWages");
      const rate = n("rate");
      const expected = n("expected");
      const capped = wages !== null && rate !== null && expected !== null && round2(wages * rate) !== expected;
      return {
        ...base,
        formula: "Social Security tax = Social Security wages × the Social Security rate. Wages above the yearly wage cap are not taxed.",
        substituted:
          wages !== null && rate !== null && expected !== null
            ? `${usd(wages)} × ${pct(rate)} = ${usd(round2(wages * rate))}${capped ? `, limited by the ${usd(n("wageBase") ?? 0)} wage cap to ${usd(expected)}` : ""}`
            : null,
        ...compare(expected, n("printed")),
        sources: sources(p, ["ssWageBase"]),
      };
    }
    case "MEDICARE_MISMATCH": {
      const wages = n("ficaWages");
      const rate = n("rate");
      const expected = n("expected");
      const base145 = wages !== null && rate !== null ? round2(wages * rate) : null;
      return {
        ...base,
        formula:
          "Medicare tax = Medicare wages × the Medicare rate, plus Additional Medicare tax on wages over the employer's withholding threshold.",
        substituted:
          wages !== null && rate !== null && expected !== null && base145 !== null
            ? `${usd(wages)} × ${pct(rate)} = ${usd(base145)}${expected !== base145 ? `, plus Additional Medicare = ${usd(expected)}` : ""}`
            : null,
        ...compare(expected, n("printed")),
        sources: sources(p, ["additionalMedicare"]),
      };
    }
    case "WITHHOLDING_DIFFERS_FROM_W4": {
      const wages = n("federalWages");
      const periods = n("payPeriods");
      const expected = n("expectedPerPaycheck");
      return {
        ...base,
        formula:
          "IRS Pub. 15-T, Worksheet 1A: this paycheck's federal taxable wages × pay periods per year, adjusted for your W-4, run through the annual percentage table, then divided back by the pay periods.",
        substituted:
          wages !== null && periods !== null && expected !== null
            ? `${usd(wages)} × ${periods} pay periods = ${usd(round2(wages * periods))} a year → ${usd(expected)} per paycheck for the W-4 you entered`
            : null,
        ...compare(expected, n("printedPerPaycheck")),
        unit: "paycheck",
        sources: sources(p, ["pub15t"]),
      };
    }
    case "OVERTIME_UNDERPAID": {
      const h = n("overtimeHours");
      const rate = n("regularRate");
      const m = n("multiplier");
      const expected = n("expected");
      return {
        ...base,
        formula: `Overtime pay = overtime hours × your regular hourly rate × ${p.flsa.overtimeMultiplier}.`,
        substituted: h !== null && rate !== null && m !== null && expected !== null ? `${hours(h)} × ${usd(rate)} × ${m} = ${usd(expected)}` : null,
        ...compare(expected, n("paid")),
        actualLabel: "Paid on your stub",
        sources: sources(p, ["flsaWorkweek"]),
      };
    }
    case "POSSIBLE_UNPAID_OVERTIME": {
      const regular = n("regularHours");
      const weeks = n("weeks");
      const rate = n("regularRate");
      const premium = p.flsa.overtimeMultiplier - 1;
      return {
        ...base,
        formula:
          `Hours over 40 in a workweek are owed at ${p.flsa.overtimeMultiplier}x. Paid at the regular rate, the missing part is (hours − 40 × weeks) × regular rate × ${premium}.`,
        substituted:
          regular !== null && weeks !== null && rate !== null
            ? `(${hours(regular)} − 40 h × ${weeks}) × ${usd(rate)} × ${premium} = ${usd(f.amountUsd)}`
            : null,
        expectedLabel: "Overtime premium owed",
        actualLabel: "Overtime premium paid",
        ...compare(f.amountUsd, 0),
        sources: sources(p, ["flsaWorkweek"]),
      };
    }
    case "MATCH_LEFT_ON_TABLE": {
      const pay = n("annualPay");
      const upTo = n("upToPercentOfPay");
      const yours = n("contributionPercent");
      const match = n("matchPercent");
      const capped = n("deferralLimit") !== null;
      return {
        ...base,
        formula: capped
          ? "Missed match a year = annual pay × (the plan's match limit − your contribution) × the match rate, limited by the yearly 401(k) contribution limit."
          : "Missed match a year = annual pay × (the plan's match limit − your contribution) × the match rate.",
        substituted:
          pay !== null && upTo !== null && yours !== null && match !== null
            ? `${usd(pay)} × (${plainPct(upTo)} − ${plainPct(yours)}) × ${plainPct(match)} = ${usd(f.amountUsd)} a year`
            : null,
        expectedLabel: "Full match a year",
        actualLabel: "Match at your contribution",
        expected: null,
        actual: null,
        difference: -f.amountUsd,
        sources: capped ? sources(p, ["limit401k"]) : [],
      };
    }
    case "MATCH_UNDERPAID": {
      const expected = n("expectedPerPaycheck");
      return {
        ...base,
        formula: "Expected match = gross pay × the lower of your contribution and the plan's match limit × the match rate (your plan's rule).",
        substituted:
          expected !== null && n("paidPerPaycheck") !== null
            ? `Expected ${usd(expected)} vs. ${usd(n("paidPerPaycheck")!)} paid per paycheck, × pay periods = ${usd(f.amountUsd)} a year`
            : null,
        ...compare(expected, n("paidPerPaycheck")),
        actualLabel: "Match paid on your stub",
        unit: "paycheck",
      };
    }
    case "NET_PAY_MISMATCH": {
      const g = n("gross");
      const t = n("taxes");
      const d = n("deductions");
      const expected = n("expectedNet");
      return {
        ...base,
        formula: "Net pay = gross pay − taxes − deductions, all as printed on the stub.",
        substituted: g !== null && t !== null && d !== null && expected !== null ? `${usd(g)} − ${usd(t)} − ${usd(d)} = ${usd(expected)}` : null,
        ...compare(expected, n("printedNet")),
        actualLabel: "Net pay on your stub",
      };
    }
    case "YTD_DECREASED": {
      const before = n("previousYtdGross");
      const now = n("currentYtdGross");
      return {
        ...base,
        formula: "Year-to-date gross only adds up over the year: it should never be lower than on the previous pay stub.",
        substituted: before !== null && now !== null ? `${usd(before)} on the previous stub → ${usd(now)} on this one` : null,
        expectedLabel: "At least (previous stub)",
        actualLabel: "On this stub",
        ...compare(before, now),
      };
    }
    case "UNDERWITHHOLDING":
    case "OVERWITHHOLDING": {
      const agi = n("agi");
      const std = n("standardDeduction");
      const ot = n("overtimeDeduction") ?? 0;
      const taxable = n("taxableIncome");
      const regularTax = n("regularTax");
      const credits = round2((n("childCreditsNonRefundable") ?? 0) + (n("childCreditsRefundable") ?? 0));
      const addl = n("additionalMedicareLiability") ?? 0;
      const tax = n("projectedTax");
      const withheld = n("projectedWithholding");
      const ready = agi !== null && std !== null && taxable !== null && regularTax !== null && tax !== null && withheld !== null;
      return {
        ...base,
        formula:
          "Taxable income = AGI − standard deduction − overtime deduction. Projected tax = tax from the 2026 brackets − child tax credits + Additional Medicare tax. What you'll owe or get back = projected tax − projected withholding for the year.",
        substituted: ready
          ? `${usd(agi!)} − ${usd(std!)}${ot ? ` − ${usd(ot)}` : ""} = ${usd(taxable!)} taxable → ${usd(regularTax!)} − ${usd(credits)}${addl ? ` + ${usd(addl)}` : ""} ≈ ${usd(tax!)} projected tax; ${usd(tax!)} − ${usd(withheld!)} = ${usd(round2(tax! - withheld!))}`
          : null,
        expectedLabel: "Projected tax for the year",
        actualLabel: "Projected withholding",
        ...compare(tax, withheld),
        sources: sources(p, ["brackets", "revProc", "pub15t", "childTaxCredit", ...(ot ? ["overtimeDeduction"] : []), ...(addl ? ["additionalMedicare"] : [])]),
      };
    }
  }
  if (/^W2_BOX\w+_MISMATCH$/.test(f.code)) {
    const box = typeof f.inputs.box === "string" ? f.inputs.box : "";
    return {
      ...base,
      formula: `W-2 box ${box} should match the total on your last pay stub of the year.`,
      substituted: n("onW2") !== null && n("fromPayStubs") !== null ? `${usd(n("onW2")!)} on the W-2 vs. ${usd(n("fromPayStubs")!)} from your pay stubs` : null,
      expectedLabel: "From your pay stubs",
      actualLabel: "On your W-2",
      ...compare(n("fromPayStubs"), n("onW2")),
    };
  }
  return base;
}
