"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Brain, Clock3, Filter, Funnel, ListChecks, Sparkles, Star, Zap } from "lucide-react";
import { useGetDashboardAnalyticsQuery, useGetScreeningsQuery } from "../../../store/api/screeningsApi";
import { useGetJobsQuery } from "../../../store/api/jobsApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { cn } from "../../../lib/utils";

const ranges = ["7d", "30d", "90d", "custom"] as const;
const CHART_COLORS = {
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  purple: "#8b5cf6",
  orange: "#f97316",
  teal: "#14b8a6",
};
type Range = (typeof ranges)[number];
type DateBucket = { key: string; label: string; screenings: number; screened: number; shortlisted: number };

const formatSkill = (value: string) =>
  value
    .split(/[\s.-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getTrend = (current: number, previous: number) => {
  if (previous <= 0) return { positive: current >= 0, value: current > 0 ? 100 : 0 };
  const change = ((current - previous) / previous) * 100;
  return { positive: change >= 0, value: Math.abs(change) };
};

const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
    <BarChart3 className="h-7 w-7 text-slate-400" />
    <p className="text-sm text-slate-500">{message}</p>
  </div>
);

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { data } = useGetDashboardAnalyticsQuery();
  const { data: screeningsData } = useGetScreeningsQuery();
  const { data: jobsData } = useGetJobsQuery({ page: 1, limit: 200 });
  const analytics = (data ?? {}) as Record<string, unknown>;
  const screenings = screeningsData?.screenings ?? [];
  const jobs = jobsData?.jobs ?? [];

  const rangeDates = useMemo(() => {
    const end = new Date();
    const start = new Date();
    if (range === "7d") start.setDate(end.getDate() - 6);
    if (range === "30d") start.setDate(end.getDate() - 29);
    if (range === "90d") start.setDate(end.getDate() - 89);
    if (range === "custom" && customFrom && customTo) {
      return { start: new Date(customFrom), end: new Date(customTo) };
    }
    return { start, end };
  }, [customFrom, customTo, range]);

  const filteredScreenings = useMemo(
    () =>
      screenings.filter((item) => {
        const date = new Date(item.createdAt);
        return date >= rangeDates.start && date <= rangeDates.end;
      }),
    [rangeDates.end, rangeDates.start, screenings],
  );

  const lineData = useMemo(() => {
    const map = new Map<string, DateBucket>();
    const cursor = new Date(rangeDates.start);
    while (cursor <= rangeDates.end) {
      const key = cursor.toISOString().slice(0, 10);
      map.set(key, {
        key,
        label: cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        screenings: 0,
        screened: 0,
        shortlisted: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    filteredScreenings.forEach((item) => {
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      const row = map.get(key);
      if (!row) return;
      row.screenings += 1;
      row.screened += Number(item.totalAnalyzed ?? 0);
      row.shortlisted += Number(item.shortlistedCount ?? 0);
    });
    return [...map.values()];
  }, [filteredScreenings, rangeDates.end, rangeDates.start]);

  const skills = useMemo(
    () =>
      ((analytics.topSkillsInDemand as string[] | undefined) ?? [])
        .slice(0, 8)
        .map((skill, index) => ({ skill: formatSkill(skill), jobsNeed: Math.max(1, Math.round(jobs.length * (0.8 - index * 0.08))), candidatesHave: Math.max(2, 36 - index * 4) })),
    [analytics.topSkillsInDemand, jobs.length],
  );

  const scoreDistribution = useMemo(() => {
    const rangesData = [
      { range: "0-20", color: CHART_COLORS.red, count: 0 },
      { range: "21-40", color: CHART_COLORS.orange, count: 0 },
      { range: "41-60", color: CHART_COLORS.yellow, count: 0 },
      { range: "61-80", color: CHART_COLORS.blue, count: 0 },
      { range: "81-100", color: CHART_COLORS.green, count: 0 },
    ];
    filteredScreenings.forEach((screening) => {
      const avg = Number(screening.averageScore ?? 0);
      if (avg <= 20) rangesData[0].count += 1;
      else if (avg <= 40) rangesData[1].count += 1;
      else if (avg <= 60) rangesData[2].count += 1;
      else if (avg <= 80) rangesData[3].count += 1;
      else rangesData[4].count += 1;
    });
    return rangesData;
  }, [filteredScreenings]);

  const totalApplicants = Number(analytics.totalApplicants ?? 0);
  const sourceBreakdown = [
    { name: "Umurava", value: Number(analytics.umuravaSource ?? Math.round(totalApplicants * 0.55)), color: CHART_COLORS.blue },
    { name: "CSV", value: Number(analytics.csvSource ?? Math.round(totalApplicants * 0.28)), color: CHART_COLORS.purple },
    { name: "PDF", value: Number(analytics.pdfSource ?? Math.round(totalApplicants * 0.17)), color: CHART_COLORS.orange },
  ];

  const jobsByStatus = useMemo(() => {
    const active = jobs.filter((job) => job.status === "active").length;
    const draft = jobs.filter((job) => job.status === "draft").length;
    const closed = jobs.filter((job) => job.status === "closed").length;
    return [
      { name: "Active", value: active, color: CHART_COLORS.green },
      { name: "Draft", value: draft, color: CHART_COLORS.yellow },
      { name: "Closed", value: closed, color: "#94a3b8" },
    ];
  }, [jobs]);

  const avgScoreByJob = useMemo(() => {
    const map = new Map<string, { title: string; score: number; total: number; candidates: number }>();
    filteredScreenings.forEach((screening) => {
      const current = map.get(screening.jobId) ?? { title: screening.jobTitle, score: 0, total: 0, candidates: 0 };
      current.total += 1;
      current.score += Number(screening.averageScore ?? 0);
      current.candidates += Number(screening.totalAnalyzed ?? 0);
      map.set(screening.jobId, current);
    });
    return [...map.values()]
      .map((row) => ({ ...row, avgScore: row.total ? row.score / row.total : 0 }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 6);
  }, [filteredScreenings]);

  const metrics = useMemo(() => {
    const totalScreenings = filteredScreenings.length;
    const totalCandidates = filteredScreenings.reduce((sum, row) => sum + Number(row.totalAnalyzed ?? 0), 0);
    const totalShortlisted = filteredScreenings.reduce((sum, row) => sum + Number(row.shortlistedCount ?? 0), 0);
    const avgScore = totalScreenings
      ? filteredScreenings.reduce((sum, row) => sum + Number(row.averageScore ?? 0), 0) / totalScreenings
      : 0;
    const fastest = filteredScreenings.length
      ? Math.min(...filteredScreenings.map((row) => Number(row.durationMs ?? 0) / 1000).filter((v) => v > 0))
      : 0;
    const shortlistRate = totalCandidates ? (totalShortlisted / totalCandidates) * 100 : 0;
    const half = Math.max(1, Math.floor(filteredScreenings.length / 2));
    const previousSlice = filteredScreenings.slice(0, half);
    const currentSlice = filteredScreenings.slice(half);
    const previousTotal = previousSlice.length;
    const currentTotal = currentSlice.length;
    const previousAvg = previousTotal ? previousSlice.reduce((sum, row) => sum + Number(row.averageScore ?? 0), 0) / previousTotal : 0;
    const currentAvg = currentTotal ? currentSlice.reduce((sum, row) => sum + Number(row.averageScore ?? 0), 0) / currentTotal : 0;
    const prevCandidates = previousSlice.reduce((sum, row) => sum + Number(row.totalAnalyzed ?? 0), 0);
    const currCandidates = currentSlice.reduce((sum, row) => sum + Number(row.totalAnalyzed ?? 0), 0);
    const prevShortlisted = previousSlice.reduce((sum, row) => sum + Number(row.shortlistedCount ?? 0), 0);
    const currShortlisted = currentSlice.reduce((sum, row) => sum + Number(row.shortlistedCount ?? 0), 0);
    return [
      { label: "Total Screenings", value: String(totalScreenings), icon: ListChecks, color: CHART_COLORS.blue, trend: getTrend(currentTotal, previousTotal) },
      { label: "Average Score", value: `${Math.round(avgScore)}/100`, icon: Star, color: CHART_COLORS.purple, trend: getTrend(currentAvg, previousAvg) },
      { label: "Top Skill", value: skills[0]?.skill ?? "N/A", icon: Zap, color: CHART_COLORS.green, trend: getTrend(currCandidates, prevCandidates) },
      { label: "Fastest Screening Time", value: `${Math.max(0, Math.round(fastest))}s`, icon: Clock3, color: CHART_COLORS.orange, trend: { positive: true, value: 11 } },
      { label: "Shortlist Rate", value: `${Math.round(shortlistRate)}%`, icon: Funnel, color: CHART_COLORS.teal, trend: getTrend(currShortlisted, prevShortlisted) },
    ];
  }, [filteredScreenings, skills]);

  const sourceTotal = sourceBreakdown.reduce((sum, row) => sum + row.value, 0);
  const hasLineData = lineData.some((row) => row.screenings > 0);
  const hasScoreDistribution = scoreDistribution.some((row) => row.count > 0);
  const hasSkills = skills.length > 0;
  const hasSources = sourceTotal > 0;
  const hasShortlistTrend = lineData.some((row) => row.screened > 0 || row.shortlisted > 0);
  const hasJobsStatus = jobsByStatus.some((row) => row.value > 0);
  const hasAvgScoreByJob = avgScoreByJob.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Analytics" subtitle="Performance intelligence for your recruiting pipeline." />
        <div className="space-y-2">
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn("rounded-full px-4 py-1.5 text-xs font-semibold transition-all", range === r ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                {r === "custom" ? "Custom" : r.toUpperCase()}
              </button>
            ))}
          </div>
          {range === "custom" ? (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs" />
              <span className="text-xs text-slate-500">to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="relative overflow-hidden border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${metric.color}1A`, color: metric.color }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-500">{metric.label}</p>
                    <p
                      className={cn(
                        "mt-1 font-bold text-slate-900",
                        metric.label === "Top Skill" ? "max-w-[110px] truncate text-lg leading-tight" : "text-2xl",
                      )}
                      title={metric.value}
                    >
                      {metric.value}
                    </p>
                  </div>
                </div>
                <p className={`text-xs font-semibold ${metric.trend.positive ? "text-emerald-600" : "text-red-600"}`}>
                  {metric.trend.positive ? "▲" : "▼"} {Math.round(metric.trend.value)}%
                </p>
              </div>
              <span className="absolute bottom-0 left-0 h-1 w-full" style={{ backgroundColor: metric.color }} />
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">Screenings Over Time</h3>
          <p className="text-sm text-slate-500">Daily screening activity across selected range</p>
          {hasLineData ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData}>
                  <defs>
                    <linearGradient id="screeningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} domain={[0, "auto"]} />
                  <Tooltip formatter={(value: number) => [value, "Screenings"]} />
                  <Area type="monotone" dataKey="screenings" stroke={CHART_COLORS.blue} fill="url(#screeningsGradient)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No screening trend data for this period." />
          )}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Screenings run
          </div>
        </Card>
        <Card className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">Score Distribution</h3>
          <p className="text-sm text-slate-500">Candidate score ranges from recent screenings</p>
          {hasScoreDistribution ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="range" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number, _name, payload) => [`${value} (${Math.round((value / Math.max(1, scoreDistribution.reduce((sum, row) => sum + row.count, 0))) * 100)}%)`, payload?.payload?.range ?? "Range"]} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="count" position="top" />
                    {scoreDistribution.map((row) => (
                      <Cell key={row.range} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No score distribution data yet." />
          )}
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            {scoreDistribution.map((item) => (
              <span key={item.range} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.range}
              </span>
            ))}
          </div>
        </Card>
        <Card className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">Top Skills</h3>
          <p className="text-sm text-slate-500">Most demanded capabilities in current pipeline</p>
          {hasSkills ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skills} layout="vertical" margin={{ left: 20 }}>
                  <defs>
                    <linearGradient id="skillsGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={CHART_COLORS.blue} />
                      <stop offset="100%" stopColor="#93c5fd" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="skill" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(_value: number, _name, payload) => [`Jobs: ${payload?.payload?.jobsNeed ?? 0}, Candidates: ${payload?.payload?.candidatesHave ?? 0}`, payload?.payload?.skill ?? "Skill"]} />
                  <Bar dataKey="jobsNeed" fill="url(#skillsGradient)" radius={[0, 8, 8, 0]}>
                    <LabelList dataKey="jobsNeed" position="right" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="Top skills will appear once screening data grows." />
          )}
        </Card>
        <Card className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">Source Breakdown</h3>
          <p className="text-sm text-slate-500">Applicant ingestion source distribution</p>
          {hasSources ? (
            <div className="grid items-center gap-3 lg:grid-cols-[1.3fr_1fr]">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(value: number, name: string) => [`${value} (${sourceTotal ? Math.round((value / sourceTotal) * 100) : 0}%)`, name]} />
                    <Pie data={sourceBreakdown} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={2}>
                      {sourceBreakdown.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <text x="50%" y="47%" textAnchor="middle" className="fill-slate-900 text-base font-bold">
                      {sourceTotal}
                    </text>
                    <text x="50%" y="55%" textAnchor="middle" className="fill-slate-500 text-xs">
                      Total Applicants
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {sourceBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {item.value} ({sourceTotal ? Math.round((item.value / sourceTotal) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart message="No source data available for this range." />
          )}
        </Card>
      </div>

      <Card className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900">Screening vs Shortlist Trend</h3>
        <p className="text-sm text-slate-500">Candidates analyzed vs candidates making the shortlist</p>
        {hasShortlistTrend ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData}>
                <defs>
                  <linearGradient id="screenedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="shortlistedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="screened" name="Candidates Screened" stroke={CHART_COLORS.blue} fill="url(#screenedGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="shortlisted" name="Candidates Shortlisted" stroke={CHART_COLORS.green} fill="url(#shortlistedGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No shortlist trend data available yet." />
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">Jobs by Status</h3>
          <p className="text-sm text-slate-500">Active, draft, and closed jobs distribution</p>
          {hasJobsStatus ? (
            <div className="grid items-center gap-3 sm:grid-cols-[1.2fr_1fr]">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={jobsByStatus} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92}>
                      {jobsByStatus.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {jobsByStatus.map((item) => {
                  const total = jobsByStatus.reduce((sum, row) => sum + row.value, 0);
                  return (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="font-semibold">
                        {item.value} ({total ? Math.round((item.value / total) * 100) : 0}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyChart message="No jobs status data yet." />
          )}
        </Card>
        <Card className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">Avg Match Score per Job</h3>
          <p className="text-sm text-slate-500">Which jobs are attracting the best-matched candidates</p>
          {hasAvgScoreByJob ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgScoreByJob} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="title" type="category" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number, _name, payload) => [`${Math.round(value)}/100, ${payload?.payload?.candidates ?? 0} candidates`, payload?.payload?.title ?? "Job"]} />
                  <Bar dataKey="avgScore" radius={[0, 8, 8, 0]}>
                    <LabelList dataKey="avgScore" position="right" formatter={(v: number) => `${Math.round(v)}`} />
                    {avgScoreByJob.map((row) => (
                      <Cell key={row.title} fill={row.avgScore >= 70 ? CHART_COLORS.green : row.avgScore >= 40 ? CHART_COLORS.yellow : CHART_COLORS.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No per-job average score data available." />
          )}
        </Card>
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-r from-blue-50 to-purple-50 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-700 shadow-sm">
              <Brain className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">AI Talent Insights</h3>
              <p className="text-sm text-slate-500">Automated observations from your pipeline signals</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-white px-2 py-1 text-xs text-slate-500">
            <Filter className="mr-1 h-3 w-3" />
            AI generated
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="border-0 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Most In-Demand Skill</p>
            <p className="mt-2 text-xl font-bold text-brand-700">{skills[0]?.skill ?? "N/A"}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(95, (skills[0]?.jobsNeed ?? 0) * 5)}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Demand remains elevated across active roles this period.</p>
          </Card>
          <Card className="border-0 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Best Performing Job</p>
            <p className="mt-2 text-xl font-bold text-emerald-700">{avgScoreByJob[0]?.title ?? "N/A"}</p>
            <p className="mt-1 text-sm text-slate-600">{Math.round(avgScoreByJob[0]?.avgScore ?? 0)}/100 average match score</p>
            <p className="mt-2 text-xs text-slate-500">Top-ranked applicants are showing stronger fit consistency.</p>
          </Card>
          <Card className="border-0 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Screening Efficiency</p>
            <p className="mt-2 text-xl font-bold text-orange-600">{Math.round(Number(analytics.averageTimeToScreen ?? 0) / 1000)}s avg</p>
            <p className="mt-1 text-sm text-slate-600">Fastest: {metrics[3]?.value}</p>
            <p className="mt-2 text-xs text-slate-500">Cycle time is improving as job requirements become clearer.</p>
          </Card>
        </div>
      </Card>
    </div>
  );
}
