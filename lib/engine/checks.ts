import type { EmploymentSettings, Finding, FilingStatus, Paystub } from "../types";
import type { FederalParams } from "./params";
import { differs, pos, round2, sum } from "./money";
import {
  deduction,
  federalWages,
  ficaWages,
  gross,
  periodsPerYear,
  remainingPayPeriods,
  tax,
} from "./paystub";
import { expectedWithholding } from "./withholding";

/** Checks on a single pay stub against its own numbers, the law and the employer settings. */
export function checkPaystub(
  stub: Paystub,
  previous: Paystub | null,
  settings: EmploymentSettings,
  status: FilingStatus,
  p: FederalParams,
): Finding[] {
  const findings: Finding[] = [];
  const employerId = settings.id;
  const n = periodsPerYear(stub.payFrequency, p);

  // 1. Net pay arithmetic.
  const taxes = sum(stub.taxes.map((t) => t.current));
  const deductions = sum(stub.deductions.map((d) => d.current));
  const expectedNet = round2(stub.grossCurrent - taxes - deductions);
  if (differs(expectedNet, stub.netCurrent)) {
    findings.push({
      code: "NET_PAY_MISMATCH",
      severity: "warning",
      amountUsd: round2(Math.abs(expectedNet - stub.netCurrent)),
      employerId,
      inputs: { gross: stub.grossCurrent, taxes: round2(taxes), deductions: round2(deductions), expectedNet, printedNet: stub.netCurrent },
      action: { kind: "ask_hr", details: "Gross minus taxes and deductions does not equal the printed net pay. Ask payroll to explain the difference." },
    });
  }

  // 2. Year-to-date totals must not go down within a year.
  if (previous && previous.payDate.slice(0, 4) === stub.payDate.slice(0, 4)) {
    const now = gross(stub, "ytd");
    const before = gross(previous, "ytd");
    if (now + 1 < before) {
      findings.push({
        code: "YTD_DECREASED",
        severity: "warning",
        amountUsd: round2(before - now),
        employerId,
        inputs: { previousYtdGross: before, currentYtdGross: now, previousPayDate: previous.payDate, payDate: stub.payDate },
        action: { kind: "ask_hr", details: "Year-to-date gross went down between two pay stubs. Ask payroll whether a correction was made." },
      });
    }
  }

  // 3. Social Security: 6.2% of FICA wages up to the annual wage base.
  const fica = ficaWages(stub, "current");
  const ficaYtdBefore = pos(ficaWages(stub, "ytd") - fica);
  const ssBase = pos(Math.min(fica, p.fica.socialSecurityWageBase - ficaYtdBefore));
  const expectedSs = round2(ssBase * p.fica.socialSecurityRate);
  const printedSs = tax(stub, "social_security", "current");
  if (differs(expectedSs, printedSs)) {
    findings.push({
      code: "SOCIAL_SECURITY_MISMATCH",
      severity: "warning",
      amountUsd: round2(Math.abs(expectedSs - printedSs)),
      employerId,
      inputs: { ficaWages: fica, rate: p.fica.socialSecurityRate, wageBase: p.fica.socialSecurityWageBase, expected: expectedSs, printed: printedSs },
      action: { kind: "ask_hr", details: "Social Security tax on this stub is not 6.2% of your FICA wages. Ask payroll to check it." },
    });
  }

  // 4. Medicare: 1.45%, plus 0.9% on wages over the employer withholding threshold.
  const overThreshold = pos(ficaYtdBefore + fica - p.fica.additionalMedicareEmployerWithholdingThreshold) - pos(ficaYtdBefore - p.fica.additionalMedicareEmployerWithholdingThreshold);
  const expectedMedicare = round2(fica * p.fica.medicareRate + overThreshold * p.fica.additionalMedicareRate);
  const printedMedicare = tax(stub, "medicare", "current");
  if (differs(expectedMedicare, printedMedicare)) {
    findings.push({
      code: "MEDICARE_MISMATCH",
      severity: "warning",
      amountUsd: round2(Math.abs(expectedMedicare - printedMedicare)),
      employerId,
      inputs: { ficaWages: fica, rate: p.fica.medicareRate, expected: expectedMedicare, printed: printedMedicare },
      action: { kind: "ask_hr", details: "Medicare tax on this stub is not 1.45% of your FICA wages. Ask payroll to check it." },
    });
  }

  // 5. Federal income tax withholding vs Pub. 15-T for the W-4 the user says is on file.
  // Skipped when the stub has a bonus: supplemental wages may be withheld at a flat rate.
  const hasBonus = stub.earnings.some((e) => e.type === "bonus" && e.current > 0);
  if (!hasBonus) {
    const fedWages = federalWages(stub, "current");
    const expectedFed = expectedWithholding(fedWages, n, status, settings.w4, p);
    const printedFed = tax(stub, "federal_income", "current");
    if (differs(expectedFed, printedFed, Math.max(5, expectedFed * 0.05))) {
      findings.push({
        code: "WITHHOLDING_DIFFERS_FROM_W4",
        severity: "info",
        amountUsd: round2(Math.abs(expectedFed - printedFed) * n),
        employerId,
        inputs: { federalWages: fedWages, payPeriods: n, expectedPerPaycheck: expectedFed, printedPerPaycheck: printedFed },
        action: {
          kind: "ask_hr",
          details: "Federal withholding does not match the W-4 settings you entered. Either the W-4 on file is different, or payroll made an error. Check your W-4 in the payroll portal.",
        },
      });
    }
  }

  // 6. Overtime paid at less than 1.5x the regular rate (FLSA non-exempt workers).
  if (settings.payType === "hourly" && settings.overtimeEligible) {
    const regularRate = settings.hourlyRate ?? stub.earnings.find((e) => e.type === "regular" && e.rate)?.rate ?? null;
    if (regularRate) {
      for (const e of stub.earnings.filter((x) => x.type === "overtime" && x.hours)) {
        const expected = round2((e.hours ?? 0) * regularRate * p.flsa.overtimeMultiplier);
        if (e.current + 1 < expected) {
          findings.push({
            code: "OVERTIME_UNDERPAID",
            severity: "critical",
            amountUsd: round2(expected - e.current),
            employerId,
            inputs: { overtimeHours: e.hours ?? 0, regularRate, multiplier: p.flsa.overtimeMultiplier, expected, paid: e.current },
            action: { kind: "ask_hr", details: "Overtime on this stub is paid below 1.5x your regular rate. Ask payroll to correct it; keep this stub as evidence." },
          });
        }
      }
      const regularHours = sum(stub.earnings.filter((e) => e.type === "regular").map((e) => e.hours ?? 0));
      const hasOvertimeLine = stub.earnings.some((e) => e.type === "overtime" && e.current > 0);
      const weeks = stub.payFrequency === "weekly" ? 1 : stub.payFrequency === "biweekly" ? 2 : null;
      if (weeks && !hasOvertimeLine && regularHours > 40 * weeks) {
        findings.push({
          code: "POSSIBLE_UNPAID_OVERTIME",
          severity: "warning",
          amountUsd: round2((regularHours - 40 * weeks) * regularRate * (p.flsa.overtimeMultiplier - 1)),
          employerId,
          inputs: { regularHours, weeks, regularRate },
          action: { kind: "ask_hr", details: "More than 40 hours a week were paid at the regular rate. Hours over 40 in a workweek usually require 1.5x pay." },
        });
      }
    }
  }

  // 7. 401(k) employer match: are you contributing enough to get all of it, and is it paid?
  const m = settings.match401k;
  if (m && m.matchPercent > 0 && stub.grossCurrent > 0) {
    const employee = deduction(stub, "401k_pretax", "current") + deduction(stub, "401k_roth", "current");
    const contributionPct = round2((employee / stub.grossCurrent) * 100);
    const annualPay = settings.annualSalary ?? stub.grossCurrent * n;
    if (contributionPct + 0.05 < m.upToPercentOfPay) {
      const missed = round2(annualPay * ((m.upToPercentOfPay - contributionPct) / 100) * (m.matchPercent / 100));
      const left = remainingPayPeriods(stub.payDate, stub.payFrequency, p);
      findings.push({
        code: "MATCH_LEFT_ON_TABLE",
        severity: "warning",
        amountUsd: missed,
        employerId,
        inputs: {
          contributionPercent: contributionPct,
          matchPercent: m.matchPercent,
          upToPercentOfPay: m.upToPercentOfPay,
          annualPay: round2(annualPay),
          missedThisYear: round2((missed * left) / n),
        },
        action: { kind: "contribution_change", details: `Raise your 401(k) contribution to at least ${m.upToPercentOfPay}% to get the full employer match.` },
      });
    }
    const matchLine = stub.employerContributions.filter((c) => c.type === "401k_match");
    if (matchLine.length > 0) {
      const expectedMatch = round2(stub.grossCurrent * (Math.min(contributionPct, m.upToPercentOfPay) / 100) * (m.matchPercent / 100));
      const paid = sum(matchLine.map((c) => c.current));
      if (paid + 1 < expectedMatch) {
        findings.push({
          code: "MATCH_UNDERPAID",
          severity: "warning",
          amountUsd: round2((expectedMatch - paid) * n),
          employerId,
          inputs: { expectedPerPaycheck: expectedMatch, paidPerPaycheck: paid, contributionPercent: contributionPct },
          action: { kind: "ask_hr", details: "The employer match on this stub is lower than your plan's match rule. Ask HR to confirm the formula." },
        });
      }
    }
  }

  return findings;
}
