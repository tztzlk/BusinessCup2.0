"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CircleCheckIcon,
  FileSearchIcon,
  LineChartIcon,
  PiggyBankIcon,
  UploadIcon,
} from "lucide-react";
import { useHousehold } from "@/components/app/HouseholdProvider";
import { PaycheckChart } from "@/components/charts/PaycheckChart";
import { Alert, Button, ButtonLink, Card, CardHeader, EmptyState, PageSkeleton, Select, StatCard } from "@/components/ui";
import { runCheckup } from "@/lib/engine";
import { type Change, householdOverview } from "@/lib/engine/overview";
import { money } from "@/lib/format";
import { paycheckChart, paycheckHistoryRows, type PaycheckMetric } from "@/lib/paycheckHistory";

const PERIODS = [3, 6, 12] as const;
const METRICS: Array<[PaycheckMetric, string]> = [
  ["netCurrent", "Net pay"],
  ["grossCurrent", "Gross pay"],
  ["federalWithheld", "Federal withholding"],
];

function greeting(hour: number): string {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardView() {
  const { state, refresh } = useHousehold();
  const data = state.status === "ready" ? state.data : null;
  // The visitor's own clock, read after mount so the server render doesn't disagree with it.
  const [today, setToday] = useState<{ iso: string; hour: number } | null>(null);
  useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    setToday({ iso: local, hour: now.getHours() });
  }, []);

  const result = useMemo(() => (data ? runCheckup(data) : null), [data]);
  const overview = useMemo(() => (data && result ? householdOverview(data, result) : null), [data, result]);
  const rows = useMemo(() => (data && result ? paycheckHistoryRows(data, result) : []), [data, result]);

  if (state.status === "loading" || !today) return <PageSkeleton label="Loading your dashboard…" />;
  if (state.status === "error")
    return (
      <Alert
        tone="danger"
        title="Couldn't load your data"
        action={
          <Button variant="secondary" onClick={() => refresh().catch(() => undefined)}>
            Retry
          </Button>
        }
      >
        {state.error}
      </Alert>
    );

  const hasDocs = !!data && data.documents.length > 0;

  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-fg-primary sm:text-[32px]">{greeting(today.hour)}!</h1>
      <p className="mt-1 text-sm text-fg-secondary">{hasDocs ? "Here's your latest paycheck checkup." : "Let's check your first pay stub."}</p>

      {!hasDocs || !overview || !result ? (
        <Card className="mt-6">
          <EmptyState
            icon={<FileSearchIcon />}
            title="No pay stubs checked yet"
            description="Upload a pay stub or W-2, or try a fictional sample. You confirm every field before anything is saved."
            actions={
              <ButtonLink href="/upload" icon={<UploadIcon aria-hidden="true" className="h-4 w-4" />}>
                Upload a pay stub
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <StatusCard attention={overview.attention} />
            <SavingsCard perYear={overview.savings.perYear} onPaychecks={overview.savings.onCheckedPaychecks} />
          </div>

          <Card className="mt-4">
            <CardHeader
              icon={<LineChartIcon className="h-5 w-5" />}
              title="Your financial overview"
              subtitle={`Federal tax year ${overview.taxYear}, projected from your latest pay stubs.`}
            />
            {overview.balance === null ? (
              <Alert tone="info" className="mt-4">
                Add a pay stub for every job in your household to see the full-year projection.
              </Alert>
            ) : (
              <>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <Metric label="Annual income (AGI)" value={money(overview.annualIncome, true)} change={overview.change?.annualIncome ?? null} />
                  <Metric label="Total federal withholding" value={money(overview.totalWithholding, true)} change={overview.change?.totalWithholding ?? null} />
                  <BalanceMetric balance={overview.balance} change={overview.change?.balance ?? null} />
                </div>
                {result.projection?.estimated && (
                  <p className="mt-3 text-[13px] text-fg-muted">Some of these numbers are estimates. Your report explains which.</p>
                )}
              </>
            )}
            <ChartBlock rows={rows} asOf={today.iso} />
          </Card>
        </>
      )}
    </div>
  );
}

function StatusCard({ attention }: { attention: number }) {
  const ok = attention === 0;
  return (
    <div className={`flex flex-col gap-4 rounded-card border p-5 shadow-soft-sm sm:flex-row sm:items-center sm:p-6 ${ok ? "border-success-border bg-success-soft" : "border-warning-border bg-warning-soft"}`}>
      <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface ${ok ? "text-success" : "text-warning"}`}>
        {ok ? <CircleCheckIcon className="h-7 w-7" /> : <AlertTriangleIcon className="h-7 w-7" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-semibold text-fg-primary sm:text-2xl">
          {ok ? "Everything looks good" : `${attention} ${attention === 1 ? "item needs" : "items need"} attention`}
        </p>
        <p className="mt-0.5 text-sm text-fg-secondary">
          {ok ? "No issues found on your latest pay stubs." : "We found things on your pay stubs worth a look."}
        </p>
      </div>
      <ButtonLink href="/report" variant={ok ? "secondary" : "primary"} icon={<ArrowRightIcon aria-hidden="true" className="h-4 w-4" />} className="flex-row-reverse">
        {ok ? "Open report" : "View details"}
      </ButtonLink>
    </div>
  );
}

function SavingsCard({ perYear, onPaychecks }: { perYear: number; onPaychecks: number }) {
  const none = perYear === 0 && onPaychecks === 0;
  return (
    <StatCard
      tone={none ? "neutral" : "success"}
      label="Potential savings"
      icon={<PiggyBankIcon className="text-success" />}
      value={
        none ? (
          "$0"
        ) : perYear > 0 ? (
          <>
            {money(perYear, true)}
            <span className="text-base font-medium text-fg-secondary"> / year</span>
          </>
        ) : (
          money(onPaychecks, true)
        )
      }
      hint={
        none
          ? "Nothing to recover on the pay stubs we checked."
          : perYear > 0 && onPaychecks > 0
            ? `Plus ${money(onPaychecks, true)} owed on the pay stubs we checked.`
            : perYear > 0
              ? "401(k) match you could be getting."
              : "Owed to you on the pay stubs we checked."
      }
    />
  );
}

function ChangeLine({ change }: { change: Change | null }) {
  if (!change) return null;
  if (change.percent === 0) return <p className="mt-1 text-[13px] text-fg-muted">No change vs. previous pay stub</p>;
  const up = change.percent > 0;
  const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <p className="mt-1 flex items-center gap-1 text-[13px] text-fg-secondary">
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="tabular-nums">
        {up ? "+" : ""}
        {change.percent.toLocaleString("en-US", { maximumFractionDigits: 1 })}%
      </span>
      <span className="text-fg-muted">vs. previous pay stub</span>
    </p>
  );
}

function Metric({ label, value, change }: { label: string; value: string; change: Change | null }) {
  return (
    <div className="rounded-control border border-border p-4">
      <p className="text-[13px] font-medium text-fg-secondary">{label}</p>
      <p className="mt-1 text-[28px] font-bold leading-tight tabular-nums text-fg-primary">{value}</p>
      <ChangeLine change={change} />
    </div>
  );
}

function BalanceMetric({ balance, change }: { balance: number; change: Change | null }) {
  const owe = balance > 0;
  const refund = balance < 0;
  return (
    <div className={`rounded-control border p-4 ${owe ? "border-warning-border bg-warning-soft" : refund ? "border-success-border bg-success-soft" : "border-border"}`}>
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-fg-secondary">
        {owe ? <AlertTriangleIcon aria-hidden="true" className="h-4 w-4 text-warning" /> : <CircleCheckIcon aria-hidden="true" className="h-4 w-4 text-success" />}
        {owe ? "Estimated amount owed in April" : refund ? "Estimated refund" : "Estimated balance in April"}
      </p>
      <p className={`mt-1 text-[28px] font-bold leading-tight tabular-nums ${owe ? "text-warning" : refund ? "text-success" : "text-fg-primary"}`}>
        {money(Math.abs(balance), true)}
      </p>
      <ChangeLine change={change} />
    </div>
  );
}

function ChartBlock({ rows, asOf }: { rows: ReturnType<typeof paycheckHistoryRows>; asOf: string }) {
  const [months, setMonths] = useState<(typeof PERIODS)[number]>(6);
  const [metric, setMetric] = useState<PaycheckMetric>("netCurrent");
  const chart = useMemo(() => paycheckChart(rows, metric, months, asOf), [rows, metric, months, asOf]);
  const metricLabel = METRICS.find(([m]) => m === metric)![1];

  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-fg-primary">Paycheck history</h3>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="chart-metric">
            Amount
          </label>
          <Select id="chart-metric" value={metric} onChange={(e) => setMetric(e.target.value as PaycheckMetric)} className="h-9 w-auto">
            {METRICS.map(([m, l]) => (
              <option key={m} value={m}>
                {l}
              </option>
            ))}
          </Select>
          <label className="sr-only" htmlFor="chart-period">
            Period
          </label>
          <Select id="chart-period" value={months} onChange={(e) => setMonths(Number(e.target.value) as (typeof PERIODS)[number])} className="h-9 w-auto">
            {PERIODS.map((m) => (
              <option key={m} value={m}>
                Last {m} months
              </option>
            ))}
          </Select>
        </div>
      </div>
      {chart.points.length < 2 ? (
        <div className="mt-4 flex h-40 flex-col items-center justify-center rounded-control border border-dashed border-border-strong bg-slate-50 px-4 text-center">
          <p className="text-sm font-medium text-fg-primary">Not enough paychecks to draw a trend</p>
          <p className="mt-1 text-[13px] text-fg-muted">
            {chart.points.length === 0 ? "No pay stubs in this period." : "One pay date in this period."} Add more pay stubs to see how your paychecks change.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <PaycheckChart chart={chart} metricLabel={metricLabel} />
        </div>
      )}
    </div>
  );
}
