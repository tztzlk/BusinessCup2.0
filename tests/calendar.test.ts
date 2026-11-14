import { describe, expect, it } from "vitest";
import { nextPayDate, reminderEvents, toICS } from "../lib/calendar";
import { coupleJanuary, coupleNovember, DEMO_JANUARY_AS_OF, DEMO_NOVEMBER_AS_OF } from "../lib/demo";
import { runCheckup } from "../lib/engine";

describe("nextPayDate", () => {
  it("steps forward by the pay frequency", () => {
    expect(nextPayDate("2026-10-31", "biweekly", "2026-11-14")).toBe("2026-11-14");
    expect(nextPayDate("2026-10-31", "biweekly", "2026-11-15")).toBe("2026-11-28");
    expect(nextPayDate("2026-11-06", "weekly", "2026-11-14")).toBe("2026-11-20");
    expect(nextPayDate("2026-01-31", "monthly", "2026-02-01")).toBe("2026-02-28");
  });

  it("handles semimonthly pay on the 15th and the last day", () => {
    expect(nextPayDate("2026-10-31", "semimonthly", "2026-11-01")).toBe("2026-11-15");
    expect(nextPayDate("2026-11-15", "semimonthly", "2026-11-16")).toBe("2026-11-30");
    expect(nextPayDate("2026-12-31", "semimonthly", "2027-01-02")).toBe("2027-01-15");
  });
});

describe("reminder calendar", () => {
  it("November demo: a payday per job and due dates for documents not yet received", () => {
    const data = coupleNovember();
    const result = runCheckup(data, DEMO_NOVEMBER_AS_OF);
    const events = reminderEvents(data, result.checklist, DEMO_NOVEMBER_AS_OF);
    expect(events.filter((e) => e.uid.startsWith("payday-"))).toHaveLength(2);
    expect(events.find((e) => e.uid.startsWith("payday-"))?.date).toBe("2026-11-14");
    expect(events.some((e) => e.title.startsWith("W-2 due"))).toBe(true);
  });

  it("January demo: received documents are left out", () => {
    const data = coupleJanuary();
    const result = runCheckup(data, DEMO_JANUARY_AS_OF);
    const titles = reminderEvents(data, result.checklist, DEMO_JANUARY_AS_OF).map((e) => e.title);
    expect(titles.some((t) => t.startsWith("1098"))).toBe(false);
    expect(titles.some((t) => t.startsWith("1099-INT"))).toBe(true);
  });

  it("writes a valid iCalendar file", () => {
    const ics = toICS(
      [{ uid: "x", date: "2027-01-31", title: "W-2 due from Acme, Inc.; payroll", description: "A long text ".repeat(20), rrule: "FREQ=WEEKLY;INTERVAL=2;COUNT=13" }],
      new Date("2026-11-14T12:00:00Z"),
    );
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270131\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20270201\r\n");
    expect(ics).toContain("SUMMARY:W-2 due from Acme\\, Inc.\\; payroll");
    expect(ics).toContain("DTSTAMP:20261114T120000Z");
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
