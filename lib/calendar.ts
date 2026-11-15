import type { ChecklistItem, HouseholdData, Paystub } from "./types";

// "Add to calendar" reminders as an iCalendar (.ics) file, built in the browser.
// All-day events only, so there are no time zone surprises in Google or Apple Calendar.

export interface CalendarEvent {
  uid: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  rrule?: string;
}

const DAY = 86_400_000;

function isRealDate(iso: string): boolean {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === iso;
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

/** Next pay date on or after `asOf`, stepping forward from the last known pay date. */
export function nextPayDate(lastPayDate: string, freq: Paystub["payFrequency"], asOf: string): string {
  const step = (d: string) => {
    switch (freq) {
      case "weekly":
        return addDays(d, 7);
      case "semimonthly": {
        const day = Number(d.slice(8, 10));
        if (day < 15) return `${d.slice(0, 8)}15`;
        const nextMonth = addMonths(`${d.slice(0, 8)}01`, 1);
        return day < 28 ? addDays(nextMonth, -1) : `${nextMonth.slice(0, 8)}15`;
      }
      case "monthly":
        return addMonths(d, 1);
      default:
        return addDays(d, 14); // biweekly, and the usual case when unknown
    }
  };
  let d = lastPayDate;
  for (let i = 0; i < 1000 && d < asOf; i++) d = step(d);
  return d;
}

function payRule(freq: Paystub["payFrequency"], date: string): string | undefined {
  switch (freq) {
    case "weekly":
      return "FREQ=WEEKLY;INTERVAL=1;COUNT=26";
    case "biweekly":
      return "FREQ=WEEKLY;INTERVAL=2;COUNT=13";
    case "semimonthly":
      return "FREQ=MONTHLY;BYMONTHDAY=15,-1;COUNT=12";
    case "monthly":
      return `FREQ=MONTHLY;BYMONTHDAY=${Number(date.slice(8, 10))};COUNT=6`;
    default:
      return undefined;
  }
}

/** Payday reminders per job (from the latest stub) and due dates of documents not yet received. */
/** The next paycheck to check: the earliest next pay date across jobs, after each job's latest stub. */
export function nextCheck(data: HouseholdData, asOf: string): { date: string; employerName: string } | null {
  let best: { date: string; employerName: string } | null = null;
  for (const e of data.employers) {
    const latest = data.documents
      .filter((d) => d.docType === "paystub" && d.employerId === e.id)
      .map((d) => d.fields as Paystub)
      .sort((a, b) => b.payDate.localeCompare(a.payDate))[0];
    if (!latest?.payDate || !isRealDate(latest.payDate) || !isRealDate(asOf)) continue;
    const dayAfter = addDays(latest.payDate, 1);
    const date = nextPayDate(latest.payDate, latest.payFrequency, dayAfter > asOf ? dayAfter : asOf);
    if (!best || date < best.date) best = { date, employerName: e.employerName };
  }
  return best;
}

export function reminderEvents(data: HouseholdData, checklist: Array<Omit<ChecklistItem, "id">>, asOf: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const e of data.employers) {
    const latest = data.documents
      .filter((d) => d.docType === "paystub" && d.employerId === e.id)
      .map((d) => d.fields as Paystub)
      .sort((a, b) => b.payDate.localeCompare(a.payDate))[0];
    // Data saved before date validation was tightened may hold impossible dates; skip them
    // rather than crash the report.
    if (!latest?.payDate || !isRealDate(latest.payDate)) continue;
    const date = nextPayDate(latest.payDate, latest.payFrequency, asOf);
    events.push({
      uid: `payday-${e.id}`,
      date,
      title: `Payday at ${e.employerName}: check your pay stub`,
      description: "Upload the new pay stub to PayTrail to check withholding, overtime and your 401(k) match.",
      rrule: payRule(latest.payFrequency, date),
    });
  }
  for (const c of checklist) {
    if (!c.dueDate || !isRealDate(c.dueDate) || c.status === "received") continue;
    events.push({
      uid: `due-${c.formType}-${c.source}`.replace(/[^A-Za-z0-9-]/g, "-"),
      date: c.dueDate,
      title: `${c.formType} due from ${c.source}`,
      description: `Your ${c.formType} should arrive by this date. Once you have it, mark it received in PayTrail.`,
    });
  }
  return events;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds a content line to 75 octets as RFC 5545 requires. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function toICS(events: CalendarEvent[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PayTrail//Reminders//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    const start = e.date.replace(/-/g, "");
    const end = addDays(e.date, 1).replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@paytrail`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeText(e.title)}`,
      `DESCRIPTION:${escapeText(`${e.description} Estimates only. Not tax advice.`)}`,
      ...(e.rrule ? [`RRULE:${e.rrule}`] : []),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(e.title)}`,
      "TRIGGER:-PT15H", // 9:00 the day before
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
