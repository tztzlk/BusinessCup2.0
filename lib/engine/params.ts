import federal2026 from "./params/2026/federal.json";
import type { FilingStatus } from "../types";

// Tax parameters, versioned by year. No tax number may live in engine code:
// add a new params/<year>/federal.json instead.

type Bracket = [number | null, number];
type WithholdingRow = [number, number, number];
type WithholdingStatus = "married_joint" | "single" | "head_of_household";

export interface FederalParams {
  taxYear: number;
  sources: Record<string, string>;
  standardDeduction: Record<FilingStatus, number>;
  brackets: Record<FilingStatus, Bracket[]>;
  withholding: {
    step2NotCheckedAdjustment: { married_joint: number; other: number };
    payPeriods: Record<"weekly" | "biweekly" | "semimonthly" | "monthly", number>;
    standard: Record<WithholdingStatus, WithholdingRow[]>;
    step2Checked: Record<WithholdingStatus, WithholdingRow[]>;
  };
  fica: {
    socialSecurityRate: number;
    socialSecurityWageBase: number;
    medicareRate: number;
    additionalMedicareRate: number;
    additionalMedicareEmployerWithholdingThreshold: number;
    additionalMedicareThreshold: Record<FilingStatus, number>;
  };
  retirement: { electiveDeferralLimit: number };
  childTaxCredit: {
    perChild: number;
    refundablePerChild: number;
    refundableEarnedIncomeFloor: number;
    refundableRate: number;
    otherDependentCredit: number;
    phaseOutThreshold: { married_joint: number; other: number };
    phaseOutPer1000: number;
  };
  earnedIncomeCredit: {
    /** Index = number of qualifying children; the last row is "three or more". */
    byQualifyingChildren: Array<{
      children: number;
      creditRate: number;
      phaseOutRate: number;
      earnedIncomeAmount: number;
      maxCredit: number;
      phaseOutStart: { married_joint: number; other: number };
      completedPhaseOut: { married_joint: number; other: number };
    }>;
    investmentIncomeLimit: number;
  };
  overtimeDeduction: {
    cap: { married_joint: number; other: number };
    phaseOutThreshold: { married_joint: number; other: number };
    phaseOutPer1000: number;
  };
  flsa: { overtimeMultiplier: number; workweekHours: number };
  estimates: { standardHoursPerYear: number };
}

const BY_YEAR: Record<number, FederalParams> = {
  2026: federal2026 as unknown as FederalParams,
};

export const SUPPORTED_YEARS = Object.keys(BY_YEAR).map(Number);

export function federalParams(year: number): FederalParams {
  const p = BY_YEAR[year];
  if (!p) throw new Error(`No tax parameters for ${year}. Supported: ${SUPPORTED_YEARS.join(", ")}`);
  return p;
}

export function withholdingStatus(status: FilingStatus): WithholdingStatus {
  if (status === "married_joint") return "married_joint";
  if (status === "head_of_household") return "head_of_household";
  return "single"; // single and married filing separately share the schedule
}
