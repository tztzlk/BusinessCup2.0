import type { Finding } from "./types";

// Human-readable copy for engine findings. The engine emits codes and numbers; the UI never shows a raw code.

const TITLES: Record<string, string> = {
  UNDERWITHHOLDING: "You may owe in April",
  OVERWITHHOLDING: "You're overpaying tax every paycheck",
  NET_PAY_MISMATCH: "Net pay doesn't add up",
  YTD_DECREASED: "Year-to-date pay went down",
  SOCIAL_SECURITY_MISMATCH: "Social Security tax looks wrong",
  MEDICARE_MISMATCH: "Medicare tax looks wrong",
  WITHHOLDING_DIFFERS_FROM_W4: "Withholding doesn't match your W-4",
  OVERTIME_UNDERPAID: "Overtime paid below 1.5x",
  POSSIBLE_UNPAID_OVERTIME: "Hours over 40 paid at regular rate",
  MATCH_LEFT_ON_TABLE: "Free 401(k) match left on the table",
  MATCH_UNDERPAID: "Employer 401(k) match is short",
};

export function findingTitle(f: Pick<Finding, "code" | "inputs">): string {
  if (TITLES[f.code]) return TITLES[f.code];
  const w2 = /^W2_BOX(\w+)_MISMATCH$/.exec(f.code);
  if (w2) {
    const box = typeof f.inputs.box === "string" ? f.inputs.box : w2[1];
    return `W-2 box ${box} doesn't match your pay stubs`;
  }
  return "Something to review";
}

type Kind = "usd" | "percent" | "rate" | "number" | "hours" | "date" | "text";

const INPUTS: Record<string, [string, Kind]> = {
  // projection
  agi: ["Adjusted gross income", "usd"],
  standardDeduction: ["Standard deduction", "usd"],
  overtimeDeduction: ["Overtime deduction", "usd"],
  taxableIncome: ["Taxable income", "usd"],
  regularTax: ["Tax before credits", "usd"],
  childCreditsNonRefundable: ["Child tax credit", "usd"],
  childCreditsRefundable: ["Refundable child credit", "usd"],
  additionalMedicareLiability: ["Additional Medicare tax", "usd"],
  projectedTax: ["Projected federal tax", "usd"],
  projectedWithholding: ["Projected withholding", "usd"],
  // pay stub checks
  gross: ["Gross pay", "usd"],
  taxes: ["Taxes", "usd"],
  deductions: ["Deductions", "usd"],
  expectedNet: ["Expected net pay", "usd"],
  printedNet: ["Net pay on stub", "usd"],
  previousYtdGross: ["Previous YTD gross", "usd"],
  currentYtdGross: ["Current YTD gross", "usd"],
  previousPayDate: ["Previous pay date", "date"],
  payDate: ["Pay date", "date"],
  ficaWages: ["Social Security / Medicare wages", "usd"],
  rate: ["Tax rate", "rate"],
  wageBase: ["Social Security wage cap", "usd"],
  expected: ["Expected", "usd"],
  printed: ["On stub", "usd"],
  paid: ["Paid", "usd"],
  federalWages: ["Federal taxable wages", "usd"],
  payPeriods: ["Pay periods per year", "number"],
  expectedPerPaycheck: ["Expected per paycheck", "usd"],
  printedPerPaycheck: ["On stub per paycheck", "usd"],
  paidPerPaycheck: ["Paid per paycheck", "usd"],
  overtimeHours: ["Overtime hours", "hours"],
  regularHours: ["Regular hours", "hours"],
  weeks: ["Weeks in pay period", "number"],
  regularRate: ["Regular hourly rate", "usd"],
  multiplier: ["Overtime multiplier", "number"],
  contributionPercent: ["Your 401(k) contribution", "percent"],
  matchPercent: ["Employer match", "percent"],
  upToPercentOfPay: ["Matched up to", "percent"],
  annualPay: ["Annual pay", "usd"],
  missedThisYear: ["Missed so far this year", "usd"],
  // W-2 reconciliation
  box: ["W-2 box", "text"],
  onW2: ["On W-2", "usd"],
  fromPayStubs: ["From pay stubs", "usd"],
};

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function formatValue(v: number | string, kind: Kind): string {
  if (typeof v === "string") {
    if (kind === "date") {
      const d = new Date(`${v}T00:00:00Z`);
      return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    }
    return v;
  }
  switch (kind) {
    case "usd":
      return usd(v);
    case "percent":
      return `${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
    case "rate":
      return `${(v * 100).toLocaleString("en-US", { maximumFractionDigits: 3 })}%`;
    case "hours":
      return `${v.toLocaleString("en-US", { maximumFractionDigits: 2 })} h`;
    default:
      return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
}

/** Label and formatted value for one entry of a finding's or projection's `inputs`. */
export function inputRow(key: string, value: number | string): { label: string; value: string } {
  const [label, kind] = INPUTS[key] ?? [humanize(key), typeof value === "number" ? "number" : "text"];
  return { label, value: formatValue(value, kind) };
}

function humanize(key: string): string {
  const s = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
