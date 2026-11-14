import { z } from "zod";

// Runtime validation for request bodies. Shapes mirror lib/types.ts.

// 50 states and DC.
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD",
  "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export const HouseholdProfileSchema = z.object({
  filingStatus: z.enum(["single", "married_joint", "married_separate", "head_of_household"]),
  state: z.enum(US_STATES),
  dependentsUnder17: z.number().int().min(0).max(20),
  otherDependents: z.number().int().min(0).max(20),
  flags: z.object({
    mortgage: z.boolean(),
    bankInterest: z.boolean(),
    brokerage: z.boolean(),
    hsa: z.boolean(),
  }),
});

const money = z.number().finite().min(-1_000_000).max(10_000_000);
// Settings the user types: pay and W-4 amounts are never negative.
const nonNegative = z.number().finite().min(0).max(10_000_000);

export const EmploymentSettingsSchema = z.object({
  member: z.enum(["self", "spouse"]),
  employerName: z.string().trim().min(1).max(200),
  payType: z.enum(["salary", "hourly"]),
  annualSalary: nonNegative.optional(),
  hourlyRate: nonNegative.optional(),
  overtimeEligible: z.boolean(),
  match401k: z
    .object({ matchPercent: z.number().min(0).max(200), upToPercentOfPay: z.number().min(0).max(100) })
    .optional(),
  w4: z.object({
    step2Checked: z.boolean(),
    step3Credits: nonNegative,
    step4aOtherIncome: nonNegative,
    step4bDeductions: nonNegative,
    step4cExtraWithholding: nonNegative,
  }),
});

const amount = { current: money, ytd: money.nullable() };
/** A real calendar date (YYYY-MM-DD); rejects 2026-02-30 and 0000-00-00. */
export const isoDate = z.iso.date();
const date = isoDate;
const taxYear = z.number().int().min(2020).max(2100);
// Bounds keep a single document small; real stubs have a handful of lines per section.
const MAX_LINES = 50;

export const PaystubSchema = z.object({
  employerName: z.string().max(200),
  payPeriodStart: date,
  payPeriodEnd: date,
  payDate: date,
  payFrequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly", "unknown"]),
  earnings: z.array(
    z.object({
      ...amount,
      type: z.enum(["regular", "overtime", "bonus", "pto", "holiday", "other"]),
      hours: z.number().min(0).max(400).nullable(),
      rate: money.nullable(),
    }),
  ).max(MAX_LINES),
  taxes: z.array(
    z.object({ ...amount, type: z.enum(["federal_income", "social_security", "medicare", "state_income", "local", "other"]) }),
  ).max(MAX_LINES),
  deductions: z.array(
    z.object({
      ...amount,
      type: z.enum(["401k_pretax", "401k_roth", "health", "dental", "vision", "hsa", "fsa", "other"]),
      preTax: z.boolean(),
    }),
  ).max(MAX_LINES),
  employerContributions: z.array(z.object({ ...amount, type: z.enum(["401k_match", "hsa", "other"]) })).max(MAX_LINES),
  grossCurrent: money,
  netCurrent: money,
  grossYtd: money.nullable(),
});

export const W2Schema = z.object({
  taxYear,
  employerName: z.string().max(200),
  box1Wages: money,
  box2FederalWithheld: money,
  box3SsWages: money,
  box4SsWithheld: money,
  box5MedicareWages: money,
  box6MedicareWithheld: money,
  box12: z.array(z.object({ code: z.string().max(3), amount: money })).max(MAX_LINES),
  box13RetirementPlan: z.boolean(),
  state: z.array(z.object({ state: z.string().max(2), box16Wages: money, box17Withheld: money })).max(MAX_LINES),
});

export const AddDocumentSchema = z.discriminatedUnion("docType", [
  z.object({ docType: z.literal("paystub"), employerId: z.string().uuid().nullable(), taxYear, fields: PaystubSchema }),
  z.object({ docType: z.literal("w2"), employerId: z.string().uuid().nullable(), taxYear, fields: W2Schema }),
]);
