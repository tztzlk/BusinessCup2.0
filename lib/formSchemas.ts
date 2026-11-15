import { z } from "zod";
import { EmploymentSettingsSchema, HouseholdProfileSchema } from "./validation";

// Form schemas for React Hook Form. They reuse the API's request schemas from lib/validation.ts and
// add only what a form needs on top (a "has match" switch, pay required for the chosen pay type).

/** Plain-English messages for zod issues, shown under the field. Pass as zodResolver(schema, { error: formError }). */
export const formError: z.core.$ZodErrorMap = (iss) => {
  switch (iss.code) {
    case "invalid_type":
      return iss.expected === "number" ? "Enter a number." : "This field is required.";
    case "too_small":
      if (iss.origin === "string") return "This field is required.";
      if (iss.origin === "array") return undefined;
      return `Must be ${iss.inclusive === false ? "more than" : "at least"} ${String(iss.minimum)}.`;
    case "too_big":
      if (iss.origin === "string") return `Keep it under ${String(iss.maximum)} characters.`;
      if (iss.origin === "array") return "Too many lines.";
      return `Must be ${iss.inclusive === false ? "less than" : "at most"} ${Number(iss.maximum).toLocaleString("en-US")}.`;
    case "invalid_format":
      return iss.format === "date" ? "Use a real date (YYYY-MM-DD)." : "Check the format.";
    case "invalid_value":
      return "Pick one of the options.";
    case "not_multiple_of":
      return "Use a whole number.";
    default:
      return undefined;
  }
};

/** "" → undefined, otherwise a number (NaN fails validation with "Enter a number."). For optional amounts. */
export const optionalNumber = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v));
/** "" → NaN so a required number shows "Enter a number." */
export const requiredNumber = (v: unknown) => (v === "" || v === null || v === undefined ? Number.NaN : Number(v));

export const ProfileFormSchema = HouseholdProfileSchema;
export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

export const EmployerFormSchema = EmploymentSettingsSchema.extend({
  hasMatch: z.boolean(),
  match401k: z.object({ matchPercent: z.number().min(0).max(200), upToPercentOfPay: z.number().min(0).max(100) }),
}).superRefine((v, ctx) => {
  if (v.payType === "salary" && !(typeof v.annualSalary === "number" && v.annualSalary > 0))
    ctx.addIssue({ code: "custom", path: ["annualSalary"], message: "Enter the annual salary before taxes." });
  if (v.payType === "hourly" && !(typeof v.hourlyRate === "number" && v.hourlyRate > 0))
    ctx.addIssue({ code: "custom", path: ["hourlyRate"], message: "Enter the hourly rate before taxes." });
});
export type EmployerFormValues = z.infer<typeof EmployerFormSchema>;

const DEFAULT_MATCH = { matchPercent: 50, upToPercentOfPay: 6 };

/** Form values for a job's settings (a job without a match rule opens with the switch off). */
export function employerFormValues(s: z.infer<typeof EmploymentSettingsSchema>): EmployerFormValues {
  return { ...s, hasMatch: s.match401k !== undefined, match401k: s.match401k ?? DEFAULT_MATCH };
}

/** Back to the API's shape: only the pay field for the chosen pay type, no match rule if switched off. */
export function employerSettingsFrom(v: EmployerFormValues): z.infer<typeof EmploymentSettingsSchema> {
  const { hasMatch, match401k, ...rest } = v;
  return {
    ...rest,
    employerName: rest.employerName.trim(),
    annualSalary: v.payType === "salary" ? v.annualSalary : undefined,
    hourlyRate: v.payType === "hourly" ? v.hourlyRate : undefined,
    match401k: hasMatch ? match401k : undefined,
  };
}

/** /calculator: the inputs lib/engine/quickEstimate.ts takes. Amounts in dollars. */
export const CalculatorSchema = z.object({
  filingStatus: z.enum(["married_joint", "single", "head_of_household"]),
  salary: z.number().finite().min(0).max(10_000_000),
  spouseSalary: z.number().finite().min(0).max(10_000_000),
  childrenUnder17: z.number().int().min(0).max(20),
  otherIncome: z.number().finite().min(0).max(10_000_000),
  extraWithholdingPerPaycheck: z.number().finite().min(0).max(100_000),
  step2Checked: z.boolean(),
  childrenOnW4: z.boolean(),
}).refine((v) => v.salary > 0 || (v.filingStatus === "married_joint" && v.spouseSalary > 0), {
  path: ["salary"],
  message: "Enter an annual salary above $0.",
});
export type CalculatorValues = z.infer<typeof CalculatorSchema>;
