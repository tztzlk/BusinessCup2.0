"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/format";
import type { PaycheckChart as ChartData } from "@/lib/paycheckHistory";

// Categorical hues in fixed order (one per job, max 4 jobs per household). Checked with the dataviz
// validator against white: lightness band, chroma, CVD and normal-vision separation, 3:1 contrast.
export const SERIES_COLORS = ["#5146f5", "#d9752b", "#2a9d8f", "#9c3f86"];

const shortDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Paycheck amounts over time, one line per job. Values are the saved stub amounts. */
export function PaycheckChart({ chart, metricLabel }: { chart: ChartData; metricLabel: string }) {
  // Recharts measures the container in the browser; render after mount to avoid a 0x0 first pass.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const multi = chart.series.length > 1;

  return (
    <div className="h-64 w-full sm:h-72" role="img" aria-label={`${metricLabel} per paycheck, ${chart.points.length} pay dates. The full list is on the History tab of your report.`}>
      {mounted && (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.points} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid stroke="#e4e4ee" strokeDasharray="0" vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fill: "#636882", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#cfd0de" }} minTickGap={16} />
            <YAxis
              tickFormatter={(v: number) => money(v, true)}
              tick={{ fill: "#636882", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              cursor={{ stroke: "#9a9db3", strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload && payload.length > 0 ? (
                  <div className="rounded-control border border-border bg-surface px-3 py-2 text-[13px] shadow-soft-md">
                    <p className="font-medium text-fg-primary">{shortDay(String(label))}</p>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)} className="mt-0.5 flex items-center gap-2 text-fg-secondary">
                        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: String(p.color) }} />
                        {multi ? `${p.name}: ` : ""}
                        <span className="font-medium tabular-nums text-fg-primary">{money(Number(p.value))}</span>
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            {multi && (
              <Legend
                verticalAlign="top"
                align="left"
                height={32}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 13 }}
                formatter={(value: string) => <span style={{ color: "#4c5068" }}>{value}</span>}
              />
            )}
            {chart.series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff" }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
