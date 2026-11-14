// Shared contract between frontend (Aldik) and backend/engine (Max).
// Change only with agreement of both.

export type Confidence = "high" | "medium" | "low";
export type FilingStatus = "single" | "married_joint" | "married_separate" | "head_of_household";
export type Member = "self" | "spouse";
export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly" | "unknown";

export interface HouseholdProfile {
  filingStatus: FilingStatus;
  state: string; // two-letter code, e.g. "TX"
  dependentsUnder17: number;
  otherDependents: number;
  flags: {
    mortgage: boolean;
    bankInterest: boolean;
    brokerage: boolean;
    hsa: boolean;
  };
}

export interface MatchRule {
  matchPercent: number; // employer matches this % of employee contribution, e.g. 50
  upToPercentOfPay: number; // ...up to this % of pay, e.g. 6
}

export interface EmploymentSettings {
  id: string;
  member: Member;
  employerName: string;
  payType: "salary" | "hourly";
  annualSalary?: number;
  hourlyRate?: number;
  overtimeEligible: boolean;
  match401k?: MatchRule;
  w4: {
    step2Checked: boolean;
    step3Credits: number;
    step4aOtherIncome: number;
    step4bDeductions: number;
    step4cExtraWithholding: number; // per pay period
  };
}

export interface Amount {
  current: number;
  ytd: number | null;
}

export interface Paystub {
  employerName: string;
  payPeriodStart: string; // YYYY-MM-DD
  payPeriodEnd: string;
  payDate: string;
  payFrequency: PayFrequency;
  earnings: Array<Amount & {
    type: "regular" | "overtime" | "bonus" | "pto" | "holiday" | "other";
    hours: number | null;
    rate: number | null;
  }>;
  taxes: Array<Amount & {
    type: "federal_income" | "social_security" | "medicare" | "state_income" | "local" | "other";
  }>;
  deductions: Array<Amount & {
    type: "401k_pretax" | "401k_roth" | "health" | "dental" | "vision" | "hsa" | "fsa" | "other";
    preTax: boolean;
  }>;
  employerContributions: Array<Amount & { type: "401k_match" | "hsa" | "other" }>;
  grossCurrent: number;
  netCurrent: number;
  grossYtd: number | null;
}

export interface W2 {
  taxYear: number;
  employerName: string;
  box1Wages: number;
  box2FederalWithheld: number;
  box3SsWages: number;
  box4SsWithheld: number;
  box5MedicareWages: number;
  box6MedicareWithheld: number;
  box12: Array<{ code: string; amount: number }>;
  box13RetirementPlan: boolean;
  state: Array<{ state: string; box16Wages: number; box17Withheld: number }>;
}

export type ExtractResult =
  | { documentType: "paystub"; fields: Paystub; confidence: Record<string, Confidence>; warnings: string[] }
  | { documentType: "w2"; fields: W2; confidence: Record<string, Confidence>; warnings: string[] }
  | { documentType: "other"; warnings: string[] };

export interface StoredDocument {
  id: string;
  employerId: string | null;
  docType: "paystub" | "w2";
  taxYear: number;
  fields: Paystub | W2;
  createdAt: string;
}

export type ChecklistStatus = "expected" | "received" | "mismatch" | "overdue";

export interface ChecklistItem {
  id: string;
  formType: string; // "W-2", "1099-INT", "1098", "5498-SA", ...
  source: string; // who sends it
  status: ChecklistStatus;
  dueDate: string | null;
}

export interface Plan {
  tier: "free" | "annual";
  until: string | null; // ISO date the Annual plan ends
}

export interface HouseholdData {
  profile: HouseholdProfile;
  employers: EmploymentSettings[];
  documents: StoredDocument[];
  checklist: ChecklistItem[];
  plan?: Plan; // absent in demo data; demo shows everything
}

export type Severity = "info" | "warning" | "critical";

export interface Finding {
  code: string; // e.g. "UNDERWITHHOLDING", "OVERTIME_UNDERPAID", "MATCH_LEFT_ON_TABLE", "W2_BOX12D_MISMATCH"
  severity: Severity;
  amountUsd: number; // impact per year, positive = money at stake
  employerId: string | null;
  inputs: Record<string, number | string>; // numbers the engine used, shown in "show calculation"
  action: { kind: "w4_change" | "contribution_change" | "ask_hr" | "ask_w2c" | "info"; details: string };
}

export interface Projection {
  taxYear: number;
  projectedTax: number;
  projectedWithholding: number;
  balance: number; // > 0 = owe in April, < 0 = refund
  perEmployer: Array<{ employerId: string; remainingPayPeriods: number; recommendedStep4c: number }>;
}
