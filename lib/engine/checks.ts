import type { EmploymentSettings, Finding, FilingStatus, Paystub } from "../types";
import type { FederalParams } from "./params";
import { differs, pos, round2, sum, usd } from "./money";
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

/** Every check a pay stub can get. Which ones run depends on the stub and the job settings. */
export type PaystubCheckId =
  | "net_pay"
  | "ytd"
  | "social_security"
  | "medicare"
  | "federal_withholding"
  | "overtime"
  | "match_contribution"
  | "match_paid";

/** Checks on a single pay stub against its own numbers, the law and the employer settings. */
export function checkPaystub(
  stub: Paystub,
  previous: Paystub | null,
  settings: EmploymentSettings,
  status: FilingStatus,
  p: FederalParams,
  /** 401(k) deferrals year to date at the same person's other jobs (the limit is per person). */
  otherJobsDeferralsYtd = 0,
): Finding[] {
  return runPaystubChecks(stub, previous, settings, status, p, otherJobsDeferralsYtd).findings;
}

/**
 * Same checks, plus the list of checks that actually ran on this stub (a check that was skipped,
 * e.g. overtime on a salaried job, is not in `ran`). The report's "What we checked" list comes from it.
 */
export function runPaystubChecks(
  stub: Paystub,
  previous: Paystub | null,
  settings: EmploymentSettings,
  status: FilingStatus,
  p: FederalParams,
  otherJobsDeferralsYtd = 0,
): { findings: Finding[]; ran: PaystubCheckId[] } {
  const findings: Finding[] = [];
  const ran: PaystubCheckId[] = ["net_pay"];
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
    ran.push("ytd");
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
  ran.push("social_security");
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
  ran.push("medicare");
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
    ran.push("federal_withholding");
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

  // 6. Overtime (FLSA non-exempt workers): hours over 40 in a workweek at 1.5x the regular rate.
  // A stub only has totals for the pay period, not hours per workweek. Overtime is owed per workweek and
  // can't be averaged, so `hours worked − 40 × workweeks in the period` is the least overtime owed; the
  // real amount can only be higher. Hours worked = regular + overtime hours (PTO and holiday hours are
  // paid but not worked, so they don't count toward 40).
  if (settings.payType === "hourly" && settings.overtimeEligible) {
    const regularRate = settings.hourlyRate ?? stub.earnings.find((e) => e.type === "regular" && e.rate)?.rate ?? null;
    const span = workweeksInPeriod(stub);
    const otLines = stub.earnings.filter((x) => x.type === "overtime" && (x.current > 0 || (x.hours ?? 0) > 0));
    // Ran only if there was something to check: an overtime line with hours, or a known period length.
    if (regularRate && (span || otLines.some((x) => x.hours))) ran.push("overtime");
    if (regularRate) {
      for (const e of otLines.filter((x) => x.hours)) {
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
      // An overtime amount without hours: we can't tell how many hours it covers, so we don't guess.
      const otHoursKnown = otLines.every((x) => x.hours !== null && x.hours > 0);
      if (span && otHoursKnown) {
        const hoursWorked = sum(stub.earnings.filter((e) => e.type === "regular" || e.type === "overtime").map((e) => e.hours ?? 0));
        const overtimeHoursPaid = sum(otLines.map((e) => e.hours ?? 0));
        const workweekHours = p.flsa.workweekHours;
        const unpaidHours = round2(pos(hoursWorked - workweekHours * span.weeks - overtimeHoursPaid));
        // Half an hour of slack for rounding on the stub.
        if (unpaidHours >= 0.5) {
          findings.push({
            code: "POSSIBLE_UNPAID_OVERTIME",
            severity: "warning",
            amountUsd: round2(unpaidHours * regularRate * (p.flsa.overtimeMultiplier - 1)),
            employerId,
            inputs: { hoursWorked, weeks: span.weeks, workweekHours, overtimeHoursPaid, regularRate },
            action: {
              kind: "ask_hr",
              details: `More than ${workweekHours} hours a week were paid at the regular rate. Hours over ${workweekHours} in a workweek require ${p.flsa.overtimeMultiplier}x pay. Ask payroll for your hours by workweek.`,
            },
          });
        }
      }
    }
  }

  // 7. 401(k) employer match: are you contributing enough to get all of it, and is it paid?
  const m = settings.match401k;
  if (m && m.matchPercent > 0 && stub.grossCurrent > 0) {
    ran.push("match_contribution");
    const employee = deduction(stub, "401k_pretax", "current") + deduction(stub, "401k_roth", "current");
    const contributionPct = round2((employee / stub.grossCurrent) * 100);
    const annualPay = settings.annualSalary ?? stub.grossCurrent * n;
    // Elective deferral limit (IRC 402(g)), per person across jobs; pre-tax and Roth share it.
    // Age 50+ catch-up contributions are not modeled: age isn't collected.
    const limit = p.retirement.electiveDeferralLimit;
    const deferredYtd = deduction(stub, "401k_pretax", "ytd") + deduction(stub, "401k_roth", "ytd") + otherJobsDeferralsYtd;
    const roomThisYear = pos(limit - deferredYtd);
    if (contributionPct + 0.05 < m.upToPercentOfPay && roomThisYear > 0) {
      const gap = (m.upToPercentOfPay - contributionPct) / 100;
      const matchRate = m.matchPercent / 100;
      // A full year at the current rate leaves this much room for more; the match only follows what fits.
      const roomPerYear = pos(limit - annualPay * (contributionPct / 100) - otherJobsDeferralsYtd);
      const missed = round2(Math.min(annualPay * gap, roomPerYear) * matchRate);
      const left = remainingPayPeriods(stub.payDate, stub.payFrequency, p);
      const extraThisYear = (annualPay * gap * left) / n;
      const capped = extraThisYear > roomThisYear || annualPay * gap > roomPerYear;
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
          missedThisYear: round2(Math.min(extraThisYear, roomThisYear) * matchRate),
          ...(capped ? { deferralLimit: limit, deferralRoomLeft: round2(roomThisYear) } : {}),
        },
        action: {
          kind: "contribution_change",
          details: capped
            ? `Raise your 401(k) contribution toward ${m.upToPercentOfPay}% to get more of the employer match, without going over the ${usd(limit)} yearly limit (${usd(roomThisYear)} of room left this year).`
            : `Raise your 401(k) contribution to at least ${m.upToPercentOfPay}% to get the full employer match.`,
        },
      });
    }
    const matchLine = stub.employerContributions.filter((c) => c.type === "401k_match");
    if (matchLine.length > 0) {
      ran.push("match_paid");
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

  return { findings, ran };
}

/**
 * How many workweeks a pay period can touch. Periods that are a whole number of weeks (weekly, biweekly)
 * line up with the employer's workweek. Other periods (semi-monthly, monthly) cut across workweeks, so
 * we count every workweek the period could touch: that keeps the overtime estimate a lower bound.
 * Uses the period dates on the stub; falls back to the pay frequency when they are missing or odd.
 */
export function workweeksInPeriod(stub: Pick<Paystub, "payPeriodStart" | "payPeriodEnd" | "payFrequency">): { weeks: number; aligned: boolean } | null {
  const start = Date.parse(`${stub.payPeriodStart}T00:00:00Z`);
  const end = Date.parse(`${stub.payPeriodEnd}T00:00:00Z`);
  const days = Math.round((end - start) / 86_400_000) + 1;
  if (Number.isFinite(days) && days >= 1 && days <= 31) {
    if (days % 7 === 0) return { weeks: days / 7, aligned: true };
    return { weeks: Math.ceil((days - 1) / 7) + 1, aligned: false };
  }
  if (stub.payFrequency === "weekly") return { weeks: 1, aligned: true };
  if (stub.payFrequency === "biweekly") return { weeks: 2, aligned: true };
  return null;
}
