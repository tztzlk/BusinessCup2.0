import { federalParams } from "../lib/engine/params";
import { expectedWithholding } from "../lib/engine/withholding";
import type { EmploymentSettings, FilingStatus, HouseholdData, Member, Paystub } from "../lib/types";

// Synthetic full-year households for the engine cross-check (docs/ENGINE-CROSSCHECK.md).
// Each job has one pay stub dated 2026-12-31 whose YTD equals the whole year, so the projection has
// 0 paychecks left and projectYear() returns the full-year tax with no extrapolation. The same wage
// inputs are fed to PolicyEngine-US by scripts/engine-crosscheck/policyengine_check.py.

const p = federalParams(2026);
const PERIODS = 26;
const r2 = (n: number) => Math.round(n * 100) / 100;

export interface SyntheticJob {
  member: Member;
  regular: number; // annual regular pay
  overtime?: number; // annual overtime pay at 1.5x (premium = overtime / 3)
  k401?: number; // annual traditional (pre-tax) 401(k) deferral
  health?: number; // annual Section 125 health premium
}

export interface SyntheticCase {
  name: string;
  label: string;
  status: FilingStatus;
  childrenUnder17: number;
  jobs: SyntheticJob[];
  household: HouseholdData;
}

const W4_DEFAULT: EmploymentSettings["w4"] = { step2Checked: false, step3Credits: 0, step4aOtherIncome: 0, step4bDeductions: 0, step4cExtraWithholding: 0 };

function fullYearStub(name: string, j: SyntheticJob, status: FilingStatus): Paystub {
  const amt = (annual: number) => ({ current: r2(annual / PERIODS), ytd: annual });
  const grossYear = j.regular + (j.overtime ?? 0);
  const fedYear = grossYear - (j.k401 ?? 0) - (j.health ?? 0);
  const ficaYear = grossYear - (j.health ?? 0);
  const fitYear = r2(expectedWithholding(fedYear / PERIODS, PERIODS, status, W4_DEFAULT, p) * PERIODS);
  const ssYear = r2(p.fica.socialSecurityRate * Math.min(ficaYear, p.fica.socialSecurityWageBase));
  const medYear = r2(p.fica.medicareRate * ficaYear + p.fica.additionalMedicareRate * Math.max(0, ficaYear - p.fica.additionalMedicareEmployerWithholdingThreshold));
  const deductions: Paystub["deductions"] = [];
  if (j.k401) deductions.push({ type: "401k_pretax", preTax: true, ...amt(j.k401) });
  if (j.health) deductions.push({ type: "health", preTax: true, ...amt(j.health) });
  const earnings: Paystub["earnings"] = [{ type: "regular", hours: null, rate: null, ...amt(j.regular) }];
  if (j.overtime) earnings.push({ type: "overtime", hours: null, rate: null, ...amt(j.overtime) });
  const grossCurrent = r2(earnings.reduce((a, e) => a + e.current, 0));
  return {
    employerName: name,
    payPeriodStart: "2026-12-18",
    payPeriodEnd: "2026-12-31",
    payDate: "2026-12-31",
    payFrequency: "biweekly",
    earnings,
    taxes: [
      { type: "federal_income", ...amt(fitYear) },
      { type: "social_security", ...amt(ssYear) },
      { type: "medicare", ...amt(medYear) },
    ],
    deductions,
    employerContributions: [],
    grossCurrent,
    netCurrent: 0,
    grossYtd: grossYear,
  };
}

function build(name: string, label: string, status: FilingStatus, childrenUnder17: number, jobs: SyntheticJob[]): SyntheticCase {
  const employers: EmploymentSettings[] = jobs.map((j, i) => ({
    id: `emp_${name}_${i}`,
    member: j.member,
    employerName: `${label} job ${i + 1} (SYNTHETIC)`,
    payType: j.overtime ? "hourly" : "salary",
    overtimeEligible: Boolean(j.overtime),
    w4: W4_DEFAULT,
  }));
  return {
    name,
    label,
    status,
    childrenUnder17,
    jobs,
    household: {
      profile: { filingStatus: status, state: "TX", dependentsUnder17: childrenUnder17, otherDependents: 0, flags: { mortgage: false, bankInterest: false, brokerage: false, hsa: false } },
      employers,
      documents: jobs.map((j, i) => ({
        id: `doc_${name}_${i}`,
        employerId: employers[i].id,
        docType: "paystub" as const,
        taxYear: 2026,
        fields: fullYearStub(employers[i].employerName, j, status),
        createdAt: "2026-12-31T12:00:00Z",
      })),
      checklist: [],
    },
  };
}

export const SYNTHETIC: SyntheticCase[] = [
  build("single_60k", "Single, $60k", "single", 0, [{ member: "self", regular: 60000 }]),
  build("hoh_55k_2kids", "Head of household, 2 children, $55k", "head_of_household", 2, [{ member: "self", regular: 55000 }]),
  build("mfj_150k_one_earner", "MFJ one earner $150k, 2 children, 401(k) + health", "married_joint", 2, [
    { member: "self", regular: 150000, k401: 10000, health: 3000 },
  ]),
  build("mfj_overtime", "MFJ two earners, $15.6k overtime, 1 child", "married_joint", 1, [
    { member: "self", regular: 62400, overtime: 15600 },
    { member: "spouse", regular: 40000 },
  ]),
  build("single_260k", "Single $260k at one employer (Additional Medicare)", "single", 0, [{ member: "self", regular: 260000, k401: 24500 }]),
  build("mfs_70k", "Married filing separately $70k, 1 child", "married_separate", 1, [{ member: "self", regular: 70000 }]),
  build("single_overtime_phaseout", "Single $130k + $30k overtime (deduction phase-out)", "single", 0, [
    { member: "self", regular: 130000, overtime: 30000 },
  ]),
  build("mfj_470k_two_earners", "MFJ $250k + $220k, 2 children (CTC phase-out, Additional Medicare)", "married_joint", 2, [
    { member: "self", regular: 250000, k401: 24500 },
    { member: "spouse", regular: 220000, k401: 24500 },
  ]),
];
