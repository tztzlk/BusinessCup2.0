"use client";

import { useMemo, useState } from "react";
import { ArrowRightIcon, CircleCheckIcon, AlertTriangleIcon, FileSearchIcon, SearchIcon, UploadIcon } from "lucide-react";
import { useHousehold } from "@/components/app/HouseholdProvider";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Input,
  PageHeader,
  PageSkeleton,
  Select,
  StatusBadge,
  Table,
  type Column,
} from "@/components/ui";
import { runCheckup } from "@/lib/engine";
import type { CheckStatus } from "@/lib/engine/checkSummary";
import { checkupAsOfStub } from "@/lib/engine/history";
import { householdOverview } from "@/lib/engine/overview";
import { money, shortDate } from "@/lib/format";
import { paycheckHistoryRows, windowStart, type PaycheckHistoryRow } from "@/lib/paycheckHistory";

type Row = PaycheckHistoryRow & { status: CheckStatus | null; issues: number };
type StatusFilter = "all" | CheckStatus | "unchecked";

const PERIODS: Array<[string, string]> = [
  ["all", "All time"],
  ["3", "Last 3 months"],
  ["6", "Last 6 months"],
  ["12", "Last 12 months"],
];

export function HistoryView() {
  const { state, data, refresh } = useHousehold();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [employer, setEmployer] = useState("all");
  const [period, setPeriod] = useState("all");

  const result = useMemo(() => (data ? runCheckup(data) : null), [data]);
  const overview = useMemo(() => (data && result ? householdOverview(data, result) : null), [data, result]);
  // Each stub's checks as of its own pay date (lib/engine/history.ts), so every row has a status.
  const rows: Row[] = useMemo(() => {
    if (!data || !result) return [];
    return paycheckHistoryRows(data, result).map((r) => {
      const own = checkupAsOfStub(data, r.id);
      return { ...r, status: own?.status ?? null, issues: own?.findings ?? 0 };
    });
  }, [data, result]);

  const employers = useMemo(() => [...new Set(rows.map((r) => r.employerName))], [rows]);
  const latest = rows[0]?.stub.payDate;
  const filtered = rows.filter((r) => {
    if (status === "unchecked" ? r.status !== null : status !== "all" && r.status !== status) return false;
    if (employer !== "all" && r.employerName !== employer) return false;
    if (period !== "all" && latest && r.stub.payDate < windowStart(latest, Number(period))) return false;
    const q = query.trim().toLowerCase();
    if (q && !`${r.employerName} ${shortDate(r.stub.payDate)} ${r.stub.payDate}`.toLowerCase().includes(q)) return false;
    return true;
  });

  if (state.status === "loading") return <PageSkeleton label="Loading your paycheck history…" />;
  if (state.status === "error")
    return (
      <Alert tone="danger" title="Couldn't load your data" action={<Button variant="secondary" onClick={() => refresh().catch(() => undefined)}>Retry</Button>}>
        {state.error}
      </Alert>
    );

  const columns: Column<Row>[] = [
    { id: "date", header: "Date", cell: (r) => shortDate(r.stub.payDate), sortValue: (r) => r.stub.payDate },
    { id: "employer", header: "Employer", cell: (r) => <span className="text-fg-secondary">{r.employerName}</span>, sortValue: (r) => r.employerName },
    { id: "gross", header: "Gross pay", align: "right", cell: (r) => money(r.stub.grossCurrent), sortValue: (r) => r.stub.grossCurrent },
    { id: "net", header: "Net pay", align: "right", cell: (r) => money(r.stub.netCurrent), sortValue: (r) => r.stub.netCurrent },
    { id: "withholding", header: "Federal withholding", align: "right", cell: (r) => money(r.federalWithheld), sortValue: (r) => r.federalWithheld },
    {
      id: "status",
      header: "Status",
      cell: (r) => (r.status ? <StatusBadge status={r.status} /> : <Badge>Not checked</Badge>),
      sortValue: (r) => (r.status === "fix_now" ? 3 : r.status === "worth_checking" ? 2 : r.status === "ok" ? 1 : 0),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Paycheck history"
        subtitle="Every pay stub you saved. Open one to see its checkup as it looked on that payday."
        actions={
          <ButtonLink href="/upload" icon={<UploadIcon aria-hidden="true" className="h-4 w-4" />}>
            Add a pay stub
          </ButtonLink>
        }
      />

      {rows.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={<FileSearchIcon />}
            title="No pay stubs yet"
            description="Your history fills in as you check pay stubs. Upload one, or try a fictional sample."
            actions={
              <ButtonLink href="/upload" icon={<UploadIcon aria-hidden="true" className="h-4 w-4" />}>
                Upload a pay stub
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
            <div className="relative">
              <label htmlFor="history-search" className="sr-only">
                Search by employer or date
              </label>
              <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <Input id="history-search" type="search" placeholder="Search employer or date" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            </div>
            <div>
              <label htmlFor="history-status" className="sr-only">
                Status
              </label>
              <Select id="history-status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
                <option value="all">All statuses</option>
                <option value="ok">Healthy</option>
                <option value="worth_checking">Review</option>
                <option value="fix_now">Fix now</option>
                <option value="unchecked">Not checked</option>
              </Select>
            </div>
            <div>
              <label htmlFor="history-employer" className="sr-only">
                Employer
              </label>
              <Select id="history-employer" value={employer} onChange={(e) => setEmployer(e.target.value)}>
                <option value="all">All employers</option>
                {employers.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="history-period" className="sr-only">
                Period
              </label>
              <Select id="history-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
                {PERIODS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <p className="mt-3 text-[13px] text-fg-muted" aria-live="polite">
            Showing {filtered.length} of {rows.length} pay stubs
          </p>
          <Card padding="none" className="mt-2">
            <Table
              caption="Paycheck history"
              columns={columns}
              rows={filtered}
              rowKey={(r) => r.id}
              rowHref={(r) => `/report?stub=${encodeURIComponent(r.id)}`}
              rowLabel={(r) => `Open the checkup of the ${shortDate(r.stub.payDate)} pay stub from ${r.employerName}`}
              initialSort={{ column: "date", direction: "desc" }}
              empty={<p className="px-4 py-8 text-center text-sm text-fg-muted">No pay stubs match these filters.</p>}
            />
          </Card>

          {overview?.outlook && (
            <div className="mt-6 flex flex-col gap-3 rounded-card border border-brand-200 bg-primary-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                {overview.outlook === "owe" ? (
                  <AlertTriangleIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                ) : (
                  <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                )}
                <div>
                  <p className="font-semibold text-fg-primary">
                    {overview.outlook === "owe"
                      ? `You may owe about ${money(overview.balance, true)} in April`
                      : overview.outlook === "refund"
                        ? `On track for a refund of about ${money(-(overview.balance ?? 0), true)}`
                        : "Your withholding is on track"}
                  </p>
                  <p className="text-sm text-fg-secondary">Projected from your latest pay stubs for {overview.taxYear}.</p>
                </div>
              </div>
              <ButtonLink href="/report" variant="secondary" icon={<ArrowRightIcon aria-hidden="true" className="h-4 w-4" />} className="flex-row-reverse">
                View details
              </ButtonLink>
            </div>
          )}
        </>
      )}
    </div>
  );
}
