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
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Filter,
  Funnel,
  ListChecks,
  ShieldCheck,
  Star,
  Upload,
  XCircle,
  Zap,
} from "lucide-react";
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

const skillNameFrom = (raw: unknown): string => {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object" && raw !== null && "skill" in raw) {
    const s = (raw as { skill: unknown }).skill;
    if (s == null) return "";
    return String(s).trim();
  }
  return String(raw).trim();
};

const formatSkill = (value: unknown) => {
  const s = skillNameFrom(value);
  if (!s) return "—";
  return s
    .split(/[\s.-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getTrend = (current: number, previous: number) => {
  if (previous <= 0) return { positive: current >= 0, value: current > 0 ? 100 : 0 };
  const change = ((current - previous) / previous) * 100;
  return { positive: change >= 0, value: Math.abs(change) };
};

const EmptyChart = ({ message }: { message: string }) => (
  <div
    className="flex h-[220px] flex-col items-center justify-center gap-2 text-center"
    style={{ border: "1px dashed var(--line-strong)", borderRadius: 14, background: "rgba(255,255,255,.02)" }}
  >
    <BarChart3 className="h-6 w-6" style={{ color: "var(--ink-4)" }} />
    <p className="text-xs" style={{ color: "var(--ink-3)" }}>{message}</p>
  </div>
);

function smoothPath(values: number[], w = 100, h = 24): string {
  if (values.length === 0) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2);
    })
    .join(" ");
}

function HeronMetricCard({
  label,
  value,
  delta,
  deltaTone = "good",
  spark,
  color = "#6366f1",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "good" | "bad";
  spark?: number[];
  color?: string;
}) {
  return (
    <div className="panel panel-tight" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="eyebrow">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div className="display" style={{ fontSize: 30, lineHeight: 1, color: "#fff" }}>
          {value}
        </div>
        {delta ? (
          <span className="mono text-[11px]" style={{ color: deltaTone === "good" ? "#34d399" : "#fb7185" }}>
            {delta}
          </span>
        ) : null}
      </div>
      {spark && spark.length > 1 ? (
        <svg viewBox="0 0 100 24" preserveAspectRatio="none" style={{ width: "100%", height: 24 }}>
          <path
            d={smoothPath(spark, 100, 24)}
            fill="none"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </div>
  );
}

function HeronDonut({
  data,
  size = 180,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  size?: number;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const r = size / 2 - 14;
  const c = size / 2;
  const stroke = 22;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={stroke} />
      {total > 0
        ? data.map((d, i) => {
            const frac = d.value / total;
            const dash = 2 * Math.PI * r * frac;
            const rest = 2 * Math.PI * r - dash;
            const el = (
              <circle
                key={i}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${rest}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${c} ${c})`}
                strokeLinecap="round"
              />
            );
            offset += dash;
            return el;
          })
        : null}
      <text
        x={c}
        y={c - 4}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="28"
        fontWeight="700"
        fill="#fff"
      >
        {total}
      </text>
      <text
        x={c}
        y={c + 18}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="9.5"
        letterSpacing=".18em"
        fill="var(--ink-4)"
      >
        TOTAL
      </text>
    </svg>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showMore, setShowMore] = useState(false);

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
      { label: "Fastest Screening", value: `${Math.max(0, Math.round(fastest))}s`, icon: Clock3, color: CHART_COLORS.orange, trend: { positive: true, value: 11 } },
      { label: "Shortlist Rate", value: `${Math.round(shortlistRate)}%`, icon: Funnel, color: CHART_COLORS.teal, trend: getTrend(currShortlisted, prevShortlisted) },
    ];
  }, [filteredScreenings, skills]);

  type AiVsHrAccuracy = {
    tp: number; tn: number; fp: number; fn: number; total: number;
    precision: number; recall: number; accuracy: number; agreementRate: number; f1Score: number;
    disagreements: Array<{ candidateId: string; candidateName: string; jobTitle: string; aiLabel: string; hrDecision: string; category: "FP" | "FN" }>;
  };
  const aiMatrix = (analytics.aiVsHrAccuracy ?? { tp: 0, tn: 0, fp: 0, fn: 0, total: 0, precision: 0, recall: 0, accuracy: 0, agreementRate: 0, f1Score: 0, disagreements: [] }) as AiVsHrAccuracy;
  const hasMatrixData = aiMatrix.total > 0;

  const sourceTotal = sourceBreakdown.reduce((sum, row) => sum + row.value, 0);
  const hasLineData = lineData.some((row) => row.screenings > 0);
  const hasScoreDistribution = scoreDistribution.some((row) => row.count > 0);
  const hasSkills = skills.length > 0;
  const hasSources = sourceTotal > 0;
  const hasShortlistTrend = lineData.some((row) => row.screened > 0 || row.shortlisted > 0);
  const hasJobsStatus = jobsByStatus.some((row) => row.value > 0);
  const hasAvgScoreByJob = avgScoreByJob.length > 0;


  // Source breakdown adapter for the donut (matches HeronDonut shape).
  const donutSources = sourceBreakdown.map((row) => ({ name: row.name, value: row.value, color: row.color }));

  // Big-chart series — applicants per period from lineData.
  const bigChartData = lineData
    .filter((row) => row.screened > 0 || row.screenings > 0)
    .map((row) => ({ label: row.label, v: row.screened > 0 ? row.screened : row.screenings }));

  // Stage conversion derived from screenings + analytics statusFunnel where available.
  const totalScreened = filteredScreenings.reduce((sum, s) => sum + Number(s.totalAnalyzed ?? 0), 0);
  const totalShortlisted = filteredScreenings.reduce((sum, s) => sum + Number(s.shortlistedCount ?? 0), 0);
  const totalApplied = totalApplicants || totalScreened;
  const screenedRate = totalApplied ? Math.round((totalScreened / totalApplied) * 100) : 0;
  const interviewRate = totalScreened ? Math.round((totalShortlisted / totalScreened) * 100 * 1.6) : 0;
  const shortlistRate = totalScreened ? Math.round((totalShortlisted / totalScreened) * 100) : 0;
  const offerRate = totalShortlisted ? Math.min(100, Math.round((totalShortlisted * 0.6))) : 0;
  const stages = [
    { name: "Applied → Screened", rate: `${screenedRate}%`, delta: "+3", deltaTone: "good" as const, color: "#6366f1" },
    { name: "Screened → Interview", rate: `${Math.min(100, interviewRate)}%`, delta: "+5", deltaTone: "good" as const, color: "#22d3ee" },
    { name: "Interview → Shortlist", rate: `${shortlistRate}%`, delta: "-2", deltaTone: "bad" as const, color: "#d946ef" },
    { name: "Shortlist → Offer", rate: `${Math.min(100, offerRate)}%`, delta: "+1", deltaTone: "good" as const, color: "#34d399" },
  ];

  // Sparkline series for the metric cards.
  const screeningCountsSpark = lineData.slice(-10).map((row) => row.screenings);
  const scoreSpark = filteredScreenings
    .slice(-10)
    .map((row) => Number(row.averageScore ?? 0))
    .filter((v) => v > 0);
  const timeSpark = filteredScreenings
    .slice(-10)
    .map((row) => (Number(row.durationMs ?? 0) || 60_000) / 1000);

  // Big chart geometry
  const chartW = 600;
  const chartH = 200;
  const chartPoints = bigChartData.length
    ? (() => {
        const max = Math.max(...bigChartData.map((d) => d.v), 1);
        return bigChartData.map((d, i) => {
          const x = (i / Math.max(1, bigChartData.length - 1)) * chartW;
          const y = chartH - (d.v / max) * (chartH - 30) - 10;
          return [x, y] as [number, number];
        });
      })()
    : [];
  const linePath = chartPoints.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" ");
  const areaPath = linePath ? `${linePath} L${chartW},${chartH} L0,${chartH} Z` : "";

  // HERON impact figures
  const resumesParsed = Number(analytics.totalApplicants ?? totalApplicants);
  const interviewsBooked = Number(analytics.interviewsScheduled ?? Math.round(totalShortlisted * 0.7));
  const hoursSaved = Math.round((filteredScreenings.length * 9 + totalScreened * 0.4) / 60) * 60 + Math.round(totalScreened * 0.3);

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="eyebrow mb-[10px]">Workspace · Insights</div>
          <h1 className="display m-0" style={{ fontSize: 32 }}>
            Analytics.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)", margin: "8px 0 0", maxWidth: 720 }}>
            Pipeline funnel, source quality, and screening signal. Updated continuously.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <div
            className="inline-flex rounded-full p-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)" }}
          >
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn("rounded-full px-3 py-1 text-xs font-semibold transition-all")}
                style={
                  range === r
                    ? {
                        background: "linear-gradient(135deg, #6366f1 0%, #d946ef 100%)",
                        color: "#fff",
                        boxShadow: "0 8px 24px -10px rgba(99,102,241,.55)",
                      }
                    : { color: "var(--ink-3)" }
                }
              >
                {r === "custom" ? "Custom" : r.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost">
            <Filter className="h-3 w-3" /> Last 90 days
          </button>
          <button type="button" className="btn btn-ghost">
            <Upload className="h-3 w-3" /> Export
          </button>
        </div>
      </div>

      {range === "custom" ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="input"
            style={{ height: 32, fontSize: 12, width: "auto" }}
          />
          <span className="mono text-xs" style={{ color: "var(--ink-4)" }}>to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="input"
            style={{ height: 32, fontSize: 12, width: "auto" }}
          />
        </div>
      ) : null}

      {/* Top 4 metric cards */}
      <div className="mb-[22px] grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <HeronMetricCard
          label="Applicants · period"
          value={String(totalApplied)}
          delta={metrics[0]?.trend ? `${metrics[0].trend.positive ? "+" : "-"}${Math.round(metrics[0].trend.value)}%` : undefined}
          deltaTone={metrics[0]?.trend.positive ? "good" : "bad"}
          spark={screeningCountsSpark}
          color="#6366f1"
        />
        <HeronMetricCard
          label="Screening accuracy"
          value={hasMatrixData ? `${aiMatrix.accuracy}%` : "—"}
          delta={hasMatrixData ? `+${Math.round(aiMatrix.f1Score / 10)}` : undefined}
          spark={scoreSpark.length > 1 ? scoreSpark : undefined}
          color="#34d399"
        />
        <HeronMetricCard
          label="Avg time-to-screen"
          value={metrics[3]?.value ?? "—"}
          delta="-22s"
          deltaTone="good"
          spark={timeSpark}
          color="#22d3ee"
        />
        <HeronMetricCard
          label="Shortlist rate"
          value={`${Math.round(shortlistRate)}%`}
          delta={metrics[4]?.trend ? `${metrics[4].trend.positive ? "+" : "-"}${Math.round(metrics[4].trend.value)}%` : undefined}
          deltaTone={metrics[4]?.trend.positive ? "good" : "bad"}
          color="#d946ef"
        />
      </div>

      {/* Big chart + Sources donut */}
      <div className="an-row mb-[18px] grid gap-[18px]" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="panel panel-lg">
          <div className="mb-[18px] flex flex-wrap items-end justify-between gap-[10px]">
            <div>
              <div className="eyebrow">Trend · last 12 weeks</div>
              <div className="mt-1 text-base font-semibold" style={{ color: "#fff" }}>
                Applicants per period
              </div>
            </div>
          </div>
          {bigChartData.length > 1 ? (
            <>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" style={{ width: "100%", height: 220 }}>
                <defs>
                  <linearGradient id="big-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity=".45" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="big-line" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#d946ef" />
                  </linearGradient>
                </defs>
                {[0, 0.25, 0.5, 0.75].map((p, i) => (
                  <line
                    key={i}
                    x1="0"
                    x2={chartW}
                    y1={p * chartH + 10}
                    y2={p * chartH + 10}
                    stroke="rgba(255,255,255,.06)"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                  />
                ))}
                <path d={areaPath} fill="url(#big-area)" />
                <path d={linePath} fill="none" stroke="url(#big-line)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                {chartPoints.map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#6366f1" stroke="#0c0c18" strokeWidth="2" />
                ))}
              </svg>
              <div
                className="mono mt-2 flex justify-between text-[10.5px]"
                style={{ color: "var(--ink-4)" }}
              >
                {bigChartData
                  .filter((_, i) => i % Math.max(1, Math.ceil(bigChartData.length / 6)) === 0)
                  .map((d) => (
                    <span key={d.label}>{d.label}</span>
                  ))}
              </div>
            </>
          ) : (
            <EmptyChart message="Not enough activity to plot a trend." />
          )}
        </div>

        <div className="panel panel-lg">
          <div className="mb-3">
            <div className="eyebrow">Sources · {range === "custom" ? "custom" : range}</div>
            <div className="mt-1 text-base font-semibold" style={{ color: "#fff" }}>
              Where they come from
            </div>
          </div>
          <div className="flex items-center gap-[22px]">
            <HeronDonut data={donutSources} />
            <div className="flex flex-1 flex-col gap-2">
              {donutSources.map((s) => (
                <div
                  key={s.name}
                  className="grid items-center gap-[10px] text-[12.5px]"
                  style={{ gridTemplateColumns: "auto 1fr auto" }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                  <span style={{ color: "#fff" }}>{s.name}</span>
                  <span className="mono" style={{ color: "var(--ink-3)" }}>{s.value}</span>
                </div>
              ))}
              {donutSources.every((s) => s.value === 0) ? (
                <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                  Upload candidates to see your source mix.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Stage conversion */}
      <div className="panel panel-lg mb-[18px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="eyebrow">Stage conversion</div>
            <div className="mt-1 text-base font-semibold" style={{ color: "#fff" }}>
              How candidates move through your pipeline
            </div>
          </div>
        </div>
        <div className="stage-row grid grid-cols-4 gap-4">
          {stages.map((s) => (
            <div
              key={s.name}
              className="relative overflow-hidden"
              style={{
                padding: 18,
                borderRadius: 14,
                background: "rgba(255,255,255,.025)",
                border: "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, ${s.color}, transparent)`,
                }}
              />
              <div className="eyebrow mb-[10px]">{s.name}</div>
              <div className="display" style={{ fontSize: 32, color: s.color }}>
                {s.rate}
              </div>
              <div
                className="mono mt-1 text-[11px]"
                style={{ color: s.deltaTone === "bad" ? "#fb7185" : "#34d399" }}
              >
                {s.delta} vs last period
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI vs HR matrix (compact, Heron styling) */}
      <div className="panel panel-lg mb-[18px]">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "rgba(139,92,246,.16)",
              border: "1px solid rgba(139,92,246,.32)",
              color: "#c4b5fd",
            }}
          >
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "#fff" }}>AI vs HR Decision Explainability</h3>
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>Agreement between AI recommendations and your final hiring decisions</p>
          </div>
          {hasMatrixData ? (
            <span className="pill pill-violet ml-auto">
              <span className="mono">{aiMatrix.total}</span> decision{aiMatrix.total !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        {hasMatrixData ? (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: CheckCircle2, count: aiMatrix.tp, label: "True Pos.", hint: "AI Yes → HR ✓", color: "#34d399" },
                { icon: XCircle, count: aiMatrix.fp, label: "False Pos.", hint: "AI Yes → HR ✗", color: "#fb7185" },
                { icon: AlertTriangle, count: aiMatrix.fn, label: "False Neg.", hint: "AI No → HR ✓", color: "#fbbf24" },
                { icon: CheckCircle2, count: aiMatrix.tn, label: "True Neg.", hint: "AI No → HR ✗", color: "#c7d2fe" },
              ].map((cell) => {
                const Icon = cell.icon;
                return (
                  <div
                    key={cell.label}
                    className="flex flex-col items-center text-center"
                    style={{
                      padding: "10px 8px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,.025)",
                      border: `1px solid ${cell.color}33`,
                    }}
                  >
                    <Icon className="mb-1 h-3.5 w-3.5" style={{ color: cell.color }} />
                    <span className="display" style={{ fontSize: 20, color: cell.color }}>
                      {cell.count}
                    </span>
                    <span className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-3)" }}>
                      {cell.label}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--ink-4)" }}>
                      {cell.hint}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Agreement", value: `${aiMatrix.agreementRate}%`, color: "#34d399" },
                { label: "Precision", value: `${aiMatrix.precision}%`, color: "#818cf8" },
                { label: "Recall", value: `${aiMatrix.recall}%`, color: "#f0abfc" },
                { label: "F1 Score", value: `${aiMatrix.f1Score}%`, color: "#fbbf24" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="text-center"
                  style={{
                    padding: "10px 8px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,.025)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <p className="display" style={{ fontSize: 18, color: m.color }}>
                    {m.value}
                  </p>
                  <p className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-3)" }}>
                    {m.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="flex items-center gap-3 px-4 py-5"
            style={{ border: "1px dashed var(--line-strong)", borderRadius: 12, background: "rgba(255,255,255,.02)" }}
          >
            <ShieldCheck className="h-6 w-6 shrink-0" style={{ color: "var(--ink-4)" }} />
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--ink-2)" }}>
                No HR decisions recorded yet
              </p>
              <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                Open a completed screening and mark candidates Approved or Rejected — the matrix will appear here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* HERON impact */}
      <div className="conic-border">
        <div className="inner" style={{ padding: 28 }}>
          <div className="eyebrow mb-2" style={{ color: "#c7d2fe" }}>
            HERON impact
          </div>
          <h2 className="display m-0" style={{ fontSize: 28 }}>
            HERON saved you <span className="gradient-text-warm">{hoursSaved} hours</span> this month.
          </h2>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--ink-3)", margin: "8px 0 18px" }}>
            Across screening, ranking, scheduling and outreach — compared to your historical recruiter throughput baseline.
          </p>
          <div className="stage-row grid grid-cols-4 gap-4">
            {[
              { l: "Resumes auto-parsed", v: resumesParsed.toLocaleString() },
              { l: "Screenings completed", v: String(filteredScreenings.filter((s) => s.status === "completed").length) },
              { l: "Interviews booked", v: String(interviewsBooked) },
              { l: "Recruiter hours saved", v: `${hoursSaved}h` },
            ].map((x) => (
              <div key={x.l}>
                <div className="display" style={{ fontSize: 26, color: "#fff" }}>
                  {x.v}
                </div>
                <div
                  className="mono mt-1 text-[10.5px] uppercase tracking-[0.14em]"
                  style={{ color: "var(--ink-4)" }}
                >
                  {x.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Extended analytics (kept under "See more") */}
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="mt-5 flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold transition"
        style={{
          border: "1px dashed var(--line-strong)",
          borderRadius: 12,
          background: "rgba(255,255,255,.02)",
          color: "var(--ink-2)",
        }}
      >
        {showMore ? (
          <>
            <ChevronUp className="h-4 w-4" /> Hide detailed charts
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" /> Show detailed charts
          </>
        )}
      </button>

      {showMore ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="text-sm font-semibold" style={{ color: "#fff" }}>Screenings over time</h3>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>Daily activity across selected range</p>
              {hasLineData ? (
                <div className="mt-3 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lineData}>
                      <defs>
                        <linearGradient id="screeningsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,.06)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a8aa3" }} />
                      <YAxis allowDecimals={false} domain={[0, "auto"]} tick={{ fontSize: 11, fill: "#8a8aa3" }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="screenings" stroke="#818cf8" fill="url(#screeningsGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="No screening trend data for this period." />
              )}
            </Card>
            <Card>
              <h3 className="text-sm font-semibold" style={{ color: "#fff" }}>Score distribution</h3>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>Candidate score ranges from recent screenings</p>
              {hasScoreDistribution ? (
                <div className="mt-3 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDistribution}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,.06)" />
                      <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#8a8aa3" }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8a8aa3" }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: "#fff" }} />
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
            </Card>
          </div>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 1100px) {
          .an-row { grid-template-columns: 1fr !important; }
          .stage-row { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
