import { Badge, Card, Section } from "./ui";
import { money, shortDate } from "@/lib/format";
import { tax } from "@/lib/engine/paystub";
import { paycheckHistoryRows } from "@/lib/paycheckHistory";
import type { CheckupResult } from "@/lib/engine";
import type { HouseholdData } from "@/lib/types";

// Every saved pay stub, newest first (lib/paycheckHistory.ts). No stubs: renders nothing.

export function PaycheckHistory({ data, result }: { data: HouseholdData; result: CheckupResult }) {
  const rows = paycheckHistoryRows(data, result);
  if (rows.length === 0) return null;
  const cols = "sm:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem_7.5rem]";

  return (
    <Section title="Paycheck history" subtitle="Every pay stub you saved, newest first. The checkup runs on the latest stub from each job.">
      <Card className="p-0">
        <div className={`hidden gap-4 border-b border-slate-100 px-4 py-2 text-xs font-medium text-slate-500 sm:grid ${cols}`}>
          <span>Pay date · job</span>
          <span className="text-right">Gross</span>
          <span className="text-right">Federal tax</span>
          <span className="text-right">Net pay</span>
          <span className="text-right">Findings</span>
        </div>
        <ul className="divide-y divide-slate-100 text-sm">
          {rows.map((r) => (
            <li key={r.id} className={`grid grid-cols-3 gap-x-4 gap-y-1 px-4 py-3 sm:items-center ${cols}`}>
              <div className="col-span-2 sm:col-span-1">
                <p className="font-medium text-slate-900">{shortDate(r.stub.payDate)}</p>
                <p className="truncate text-xs text-slate-500">{r.employerName}</p>
              </div>
              <div className="text-right sm:order-last">
                {r.findings === null ? (
                  <span className="text-slate-400" title="Only the latest pay stub from each job is checked">
                    —
                  </span>
                ) : r.findings === 0 ? (
                  <Badge tone="success">No issues</Badge>
                ) : (
                  <Badge tone="warning">
                    {r.findings} {r.findings === 1 ? "finding" : "findings"}
                  </Badge>
                )}
              </div>
              <p className="sm:text-right">
                <span className="block text-xs text-slate-500 sm:hidden">Gross</span>
                <span className="font-mono">{money(r.stub.grossCurrent)}</span>
              </p>
              <p className="sm:text-right">
                <span className="block text-xs text-slate-500 sm:hidden">Federal tax</span>
                <span className="font-mono">{money(tax(r.stub, "federal_income", "current"))}</span>
              </p>
              <p className="text-right">
                <span className="block text-xs text-slate-500 sm:hidden">Net pay</span>
                <span className="font-mono">{money(r.stub.netCurrent)}</span>
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  );
}
