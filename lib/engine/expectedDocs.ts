import type { ChecklistItem, ChecklistStatus, HouseholdData, Paystub, W2 } from "../types";

// Information-return due dates to recipients. A date that falls on a weekend moves to the
// next business day; we show the statutory date and mark "overdue" a week after it.
const DUE = {
  w2: "01-31",
  "1099-INT": "01-31",
  "1098": "01-31",
  "1099-SA": "01-31",
  "1099-B/DIV": "02-15",
  "5498-SA": "05-31",
} as const;

export interface ExpectedDoc extends Omit<ChecklistItem, "id"> {
  key: string;
}

/** The tax documents a household should expect for `taxYear`, with their current status. */
export function expectedDocs(data: HouseholdData, taxYear: number, asOf: string, mismatchedEmployerIds: Set<string>): ExpectedDoc[] {
  const next = taxYear + 1;
  const docs: ExpectedDoc[] = [];
  const statusFor = (received: boolean, mismatch: boolean, due: string): ChecklistStatus => {
    if (mismatch) return "mismatch";
    if (received) return "received";
    const grace = new Date(`${due}T00:00:00Z`);
    grace.setUTCDate(grace.getUTCDate() + 7);
    return asOf > grace.toISOString().slice(0, 10) ? "overdue" : "expected";
  };
  const manual = (formType: string) => data.checklist.find((c) => c.formType === formType)?.status === "received";

  for (const e of data.employers) {
    const due = `${next}-${DUE.w2}`;
    const received = data.documents.some((d) => d.docType === "w2" && d.taxYear === taxYear && (d.employerId === e.id || (d.fields as W2).employerName === e.employerName));
    docs.push({ key: `w2:${e.id}`, formType: "W-2", source: e.employerName, dueDate: due, status: statusFor(received, mismatchedEmployerIds.has(e.id), due) });
  }

  const hsaFromStubs = data.documents.some(
    (d) => d.docType === "paystub" && d.taxYear === taxYear && (d.fields as Paystub).deductions.some((x) => x.type === "hsa" && (x.ytd ?? x.current) > 0),
  );
  const add = (key: string, formType: string, source: string, dueKey: keyof typeof DUE) => {
    const due = `${next}-${DUE[dueKey]}`;
    docs.push({ key, formType, source, dueDate: due, status: statusFor(manual(formType), false, due) });
  };
  if (data.profile.flags.mortgage) add("1098", "1098", "Mortgage lender", "1098");
  if (data.profile.flags.bankInterest) add("1099-INT", "1099-INT", "Bank", "1099-INT");
  if (data.profile.flags.brokerage) add("1099-B/DIV", "1099-B/DIV", "Brokerage", "1099-B/DIV");
  if (data.profile.flags.hsa || hsaFromStubs) {
    add("1099-SA", "1099-SA", "HSA custodian", "1099-SA");
    add("5498-SA", "5498-SA", "HSA custodian", "5498-SA");
  }
  return docs;
}
