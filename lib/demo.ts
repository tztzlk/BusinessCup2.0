import mock from "../mocks/couple.json";
import { federalParams } from "./engine/params";
import { deduction, federalWages, ficaWages, remainingPayPeriods, tax } from "./engine/paystub";
import type { HouseholdData, Paystub, StoredDocument, W2 } from "./types";

// Demo households. Everything here is fictional and labeled as sample data in the UI.

export const DEMO_NOVEMBER_AS_OF = "2026-11-14";
export const DEMO_JANUARY_AS_OF = "2027-01-28";

const r2 = (n: number) => Math.round(n * 100) / 100;

export function coupleNovember(): HouseholdData {
  return structuredClone((mock as unknown as { household: HouseholdData }).household);
}

/** Rolls a stub forward to the last paycheck of the year: YTD grows by the current amounts. */
function yearEndStub(s: Paystub): Paystub {
  const p = federalParams(Number(s.payDate.slice(0, 4)));
  const n = remainingPayPeriods(s.payDate, s.payFrequency, p);
  const grow = <T extends { current: number; ytd: number | null }>(x: T): T => ({ ...x, ytd: r2((x.ytd ?? 0) + x.current * n) });
  const last = new Date(`${s.payDate}T00:00:00Z`);
  last.setUTCDate(last.getUTCDate() + 14 * n);
  const payDate = last.toISOString().slice(0, 10);
  return {
    ...s,
    payDate,
    payPeriodEnd: payDate,
    earnings: s.earnings.map(grow),
    taxes: s.taxes.map(grow),
    deductions: s.deductions.map(grow),
    employerContributions: s.employerContributions.map(grow),
    grossYtd: r2((s.grossYtd ?? 0) + s.grossCurrent * n),
  };
}

/** A W-2 that agrees with the year-end stub, optionally with planted errors. */
function w2From(s: Paystub, override: Partial<W2> = {}): W2 {
  const p = federalParams(Number(s.payDate.slice(0, 4)));
  const fica = ficaWages(s, "ytd");
  const k401 = deduction(s, "401k_pretax", "ytd");
  return {
    taxYear: Number(s.payDate.slice(0, 4)),
    employerName: s.employerName,
    box1Wages: federalWages(s, "ytd"),
    box2FederalWithheld: tax(s, "federal_income", "ytd"),
    box3SsWages: Math.min(fica, p.fica.socialSecurityWageBase),
    box4SsWithheld: tax(s, "social_security", "ytd"),
    box5MedicareWages: fica,
    box6MedicareWithheld: tax(s, "medicare", "ytd"),
    box12: k401 > 0 ? [{ code: "D", amount: k401 }] : [],
    box13RetirementPlan: true,
    state: [],
    ...override,
  };
}

/**
 * January view of the same couple: year-end stubs, both W-2s received.
 * Planted for the demo: Jordan's W-2 reports $1,560 of 401(k) deferrals (box 12 code D)
 * that never appeared on a pay stub. The 1098 is marked received; the 1099-INT is still missing.
 */
export function coupleJanuary(): HouseholdData {
  const data = coupleNovember();
  const docs: StoredDocument[] = [];
  for (const d of data.documents) {
    const end = yearEndStub(d.fields as Paystub);
    docs.push({ ...d, id: `${d.id}_ye`, fields: end, createdAt: `${end.payDate}T12:00:00Z` });
    const w2 = d.employerId === "emp_jordan" ? w2From(end, { box12: [{ code: "D", amount: 1560 }] }) : w2From(end);
    docs.push({ id: `${d.id}_w2`, employerId: d.employerId, docType: "w2", taxYear: w2.taxYear, fields: w2, createdAt: "2027-01-27T12:00:00Z" });
  }
  data.documents = [...data.documents, ...docs];
  data.checklist = [{ id: "demo_1098", formType: "1098", source: "Mortgage lender", status: "received", dueDate: "2027-01-31" }];
  return data;
}
