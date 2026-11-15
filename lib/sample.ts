import type { EmploymentSettings, HouseholdProfile } from "./types";

// "Try with a sample pay stub": public/samples/sample-paystub.pdf (fictional, labeled SAMPLE) is read by the
// real /api/extract. These settings match the household the stub was made for, so the engine finds only the
// planted error: 10 overtime hours paid at the regular $20 rate instead of 1.5x. Locked in tests/sample.test.ts.

export const SAMPLE_PAYSTUB_URL = "/samples/sample-paystub.pdf";

export const SAMPLE_PROFILE: HouseholdProfile = {
  filingStatus: "single",
  state: "TX",
  dependentsUnder17: 0,
  otherDependents: 0,
  flags: { mortgage: false, bankInterest: false, brokerage: false, hsa: false },
};

export const SAMPLE_EMPLOYER: Omit<EmploymentSettings, "id"> = {
  member: "self",
  employerName: "Acme Logistics LLC (SAMPLE)",
  payType: "hourly",
  hourlyRate: 20,
  overtimeEligible: true,
  match401k: { matchPercent: 50, upToPercentOfPay: 3 },
  w4: { step2Checked: false, step3Credits: 0, step4aOtherIncome: 0, step4bDeductions: 0, step4cExtraWithholding: 0 },
};

// "Try a real pay stub": a real weekly stub from a summer job in New Jersey (public/samples/real-paystub-nj.pdf).
// The worker's name, address, SSN and bank account are blacked out. Withholding is $0 for federal income tax,
// Social Security and Medicare, so the checks flag those lines; it can be correct for some nonresident visa holders.
export const REAL_PAYSTUB_URL = "/samples/real-paystub-nj.pdf";

export const REAL_EMPLOYER: Omit<EmploymentSettings, "id"> = {
  member: "self",
  employerName: "The Island Grille, LLC (SAMPLE)",
  payType: "hourly",
  hourlyRate: 15.95,
  overtimeEligible: true,
  w4: { step2Checked: false, step3Credits: 0, step4aOtherIncome: 0, step4bDeductions: 0, step4cExtraWithholding: 0 },
};

/** The sample jobs. Their pay stubs don't count toward the free plan, so judges can try the samples and their own stub. */
export function isSampleEmployer(settings: Pick<EmploymentSettings, "employerName">): boolean {
  return settings.employerName === SAMPLE_EMPLOYER.employerName || settings.employerName === REAL_EMPLOYER.employerName;
}
