"use client";

import { useMemo } from "react";
import { Button, Card } from "./ui";
import { reminderEvents, toICS } from "@/lib/calendar";
import { shortDate } from "@/lib/format";
import type { ChecklistItem, HouseholdData } from "@/lib/types";

// "Add to calendar": payday check-ins and tax document due dates as a .ics file.
// Built in the browser; nothing is sent to a server.
export function RemindersCard({
  data,
  checklist,
  asOf,
}: {
  data: HouseholdData;
  checklist: Array<Omit<ChecklistItem, "id">>;
  asOf: string;
}) {
  const events = useMemo(() => reminderEvents(data, checklist, asOf), [data, checklist, asOf]);
  if (events.length === 0) return null;

  const download = () => {
    const blob = new Blob([toICS(events)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paytrail-reminders.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">Never miss a check</h3>
          <p className="text-sm text-slate-500">Reminders for Google, Apple or Outlook Calendar, the day before.</p>
        </div>
        <Button type="button" variant="secondary" onClick={download}>
          Add to calendar
        </Button>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-slate-700">
        {events.map((e) => (
          <li key={e.uid} className="flex justify-between gap-3">
            <span className="min-w-0">{e.title}</span>
            <span className="shrink-0 text-slate-500">
              {shortDate(e.date)}
              {e.rrule ? " · repeats" : ""}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
