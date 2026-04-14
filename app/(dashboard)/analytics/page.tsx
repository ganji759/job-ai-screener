"use client";

import { useMemo, useState } from "react";
import { Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Cell } from "recharts";
import { useGetDashboardAnalyticsQuery } from "../../../store/api/screeningsApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { cn } from "../../../lib/utils";

const ranges = ["7d", "30d", "90d", "custom"] as const;

export default function AnalyticsPage() {
  const [range, setRange] = useState<(typeof ranges)[number]>("30d");
  const { data } = useGetDashboardAnalyticsQuery();
  const analytics = (data ?? {}) as Record<string, unknown>;

  const summary = useMemo(
    () => [
      { label: "Total Screenings", value: Number(analytics.totalScreenings ?? 0) },
      { label: "Average Score", value: `${Number(analytics.averageScore ?? 0)}/100` },
      { label: "Top Skill", value: Array.isArray(analytics.topSkillsInDemand) ? String(analytics.topSkillsInDemand[0] ?? "N/A") : "N/A" },
      { label: "Fastest Time", value: `${Number(analytics.fastestTimeToScreen ?? 0)}s` },
    ],
    [analytics],
  );

  const lineData = Array.from({ length: 8 }).map((_, i) => ({ date: `D${i + 1}`, screenings: Math.max(0, Number(analytics.totalScreenings ?? 0) - (7 - i) * 2) }));
  const distribution = (analytics.scoreDistribution as Array<{ range: string; count: number }> | undefined) ?? [
    { range: "0-20", count: 0 },
    { range: "21-40", count: 0 },
    { range: "41-60", count: 0 },
    { range: "61-80", count: 0 },
    { range: "81-100", count: 0 },
  ];
  const skills = (analytics.topSkillsInDemand as string[] | undefined)?.map((skill, i) => ({ skill, count: Math.max(10, 100 - i * 10) })) ?? [];
  const sources = [
    { name: "Umurava", value: Number(analytics.umuravaSource ?? 60) },
    { name: "CSV", value: Number(analytics.csvSource ?? 25) },
    { name: "PDF", value: Number(analytics.pdfSource ?? 15) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Analytics" subtitle="Performance intelligence for your recruiting pipeline." />
        <div className="flex gap-2">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/40",
                range === r ? "bg-brand-600 text-white shadow-brand-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
              )}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-brand-700">{s.value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">Screenings Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line dataKey="screenings" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">Score Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count">
                  {distribution.map((_, i) => (
                    <Cell key={i} fill={i < 2 ? "#ef4444" : i < 4 ? "#f59e0b" : "#22c55e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">Top Skills</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skills} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="skill" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">Source Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sources} dataKey="value" nameKey="name" outerRadius={90}>
                  <Cell fill="#2563eb" />
                  <Cell fill="#7c3aed" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
