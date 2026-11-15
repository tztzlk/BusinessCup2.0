import type { Finding, Severity } from "../types";
import type { FederalParams } from "./params";
import type { PaystubCheckId } from "./checks";
import { usd } from "./money";

// "What we checked": the checks that ran on each checked pay stub, with a status derived from the
// engine's findings. A check is "ok" only when it ran and raised nothing; skipped checks are not listed.

export type CheckStatus = "fix_now" | "worth_checking" | "ok";

export interface CheckLine {
  id: PaystubCheckId;
  label: string;
  /** How it was checked, with the rates and limits taken from params. */
  detail: string;
  status: CheckStatus;
}

export interface StubChecks {
  employerId: string;
  employerName: string;
  payDate: string;
  checks: CheckLine[];
}

/** Which finding codes each check can raise. */
export const CHECK_FINDING_CODES: Record<PaystubCheckId, readonly string[]> = {
  net_pay: ["NET_PAY_MISMATCH"],
  ytd: ["YTD_DECREASED"],
  social_security: ["SOCIAL_SECURITY_MISMATCH"],
  medicare: ["MEDICARE_MISMATCH"],
  federal_withholding: ["WITHHOLDING_DIFFERS_FROM_W4"],
  overtime: ["OVERTIME_UNDERPAID", "POSSIBLE_UNPAID_OVERTIME"],
  match_contribution: ["MATCH_LEFT_ON_TABLE"],
  match_paid: ["MATCH_UNDERPAID"],
};

const ORDER: PaystubCheckId[] = [
  "net_pay",
  "ytd",
  "social_security",
  "medicare",
  "federal_withholding",
  "overtime",
  "match_contribution",
  "match_paid",
];

/** Three levels for the whole report: critical is "fix now"; warning and info are "worth checking". */
export function statusForSeverity(severity: Severity): Exclude<CheckStatus, "ok"> {
  return severity === "critical" ? "fix_now" : "worth_checking";
}

const pct = (rate: number) => `${+(rate * 100).toFixed(2)}%`;

function copy(id: PaystubCheckId, p: FederalParams): { label: string; detail: string } {
  switch (id) {
    case "net_pay":
      return { label: "Pay arithmetic", detail: "Gross pay minus taxes and deductions, compared with the net pay printed on the stub." };
    case "ytd":
      return { label: "Year-to-date totals", detail: "Year-to-date gross compared with your previous pay stub: it should never go down." };
    case "social_security":
      return {
        label: "Social Security tax",
        detail: `Should be ${pct(p.fica.socialSecurityRate)} of Social Security wages, up to the ${usd(p.fica.socialSecurityWageBase)} wage cap.`,
      };
    case "medicare":
      return {
        label: "Medicare tax, incl. Additional Medicare",
        detail: `Should be ${pct(p.fica.medicareRate)} of Medicare wages, plus ${pct(p.fica.additionalMedicareRate)} on wages over ${usd(
          p.fica.additionalMedicareEmployerWithholdingThreshold,
        )} at this job.`,
      };
    case "federal_withholding":
      return {
        label: "Federal withholding vs. your W-4",
        detail: "Federal income tax withheld compared with IRS Pub. 15-T for the W-4 settings you entered.",
      };
    case "overtime":
      return {
        label: `Overtime at ${p.flsa.overtimeMultiplier}x`,
        detail: `Overtime should be paid at ${p.flsa.overtimeMultiplier}x your regular rate, and hours over ${p.flsa.workweekHours} in a workweek not at the regular rate. A stub shows totals for the pay period, so we check the least overtime owed.`,
      };
    case "match_contribution":
      return { label: "Getting the full 401(k) match", detail: "Whether your 401(k) contribution is high enough to get all of the employer match." };
    case "match_paid":
      return { label: "401(k) match paid", detail: "The employer match on the stub, compared with your plan's match rule." };
  }
}

/** Status of each check that ran on one employer's latest stub, from the findings for that employer. */
export function summarizeStubChecks(
  ran: readonly PaystubCheckId[],
  findings: readonly Finding[],
  employerId: string,
  p: FederalParams,
): CheckLine[] {
  const ranSet = new Set(ran);
  return ORDER.filter((id) => ranSet.has(id)).map((id) => {
    const own = findings.filter((f) => f.employerId === employerId && CHECK_FINDING_CODES[id].includes(f.code));
    const status: CheckStatus =
      own.length === 0 ? "ok" : own.some((f) => statusForSeverity(f.severity) === "fix_now") ? "fix_now" : "worth_checking";
    return { id, ...copy(id, p), status };
  });
}
