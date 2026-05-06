"use client";

import Link from "next/link";
import { type ComponentType, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Brain,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Cpu,
  FileText,
  PlusCircle,
  Target,
  TrendingUp,
  UploadCloud,
  Users,
  XCircle,
} from "lucide-react";
import { useGetDashboardAnalyticsQuery } from "../../../store/api/screeningsApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ActivityFeed, type ActivityKind } from "../../../components/dashboard/ActivityFeed";
import { Card } from "../../../components/ui/Card";
import { humanizeDurationMs } from "../../../lib/utils";
import { useGetJobsQuery } from "../../../store/api/jobsApi";
import { useAuth } from "../../../hooks/useAuth";

const metricBoxClass = "stat-card p-6";

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const useCountUp = (value: number): number => {
  const safe = Number.isFinite(value) ? value : 0;
  const steps = 24;
  const frame = 800 / steps;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let current = 0;
    const delta = safe / steps;
    const id = window.setInterval(() => {
      current += delta;
      if ((delta >= 0 && current >= safe) || (delta < 0 && current <= safe)) {
        setDisplay(safe);
        window.clearInterval(id);
      } else {
        setDisplay(current);
      }
    }, frame);
    return () => window.clearInterval(id);
  }, [safe, frame]);

  return Math.round(display);
};

type Bucket = { range: string; count: number };
type SourceRow = { source: string; count: number };
type StatusRow = { status: string; count: number };
type DayRow = { date: string; count: number };
type SkillRow = { skill: string; count: number };
type JobRow = { jobId: string; title: string; status: string; applicants: number; screenings: number; avgScore: number };
type ActivityRow = { kind: ActivityKind; title: string; subtitle: string; at: string };

const SOURCE_COLORS: Record<string, string> = {
  umurava_platform: "#4f46e5",
  pdf_upload: "#0ea5e9",
  csv_upload: "#f59e0b",
};
const SOURCE_LABELS: Record<string, string> = {
  umurava_platform: "Umurava Platform",
  pdf_upload: "PDF Upload",
  csv_upload: "CSV / Excel",
};

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboardAnalyticsQuery();
  const { data: jobsData } = useGetJobsQuery({ page: 1, limit: 5, status: "active" });
  const { user } = useAuth();
  const analytics = (data ?? {}) as Record<string, unknown>;
  const recruiterFirstName = (user?.name?.split(" ")[0] ?? "Recruiter").trim();
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const totalJobs = Number(analytics.totalJobs ?? 0);
  const activeJobs = Number(analytics.activeJobs ?? 0);
  const totalApplicants = Number(analytics.totalApplicants ?? 0);
  const totalScreenings = Number(analytics.totalScreenings ?? 0);
  const completedScreenings = Number(analytics.completedScreenings ?? 0);
  const totalShortlisted = Number(analytics.totalShortlisted ?? 0);
  const totalRejected = Number(analytics.totalRejected ?? 0);
  const totalPending = Number(analytics.totalPending ?? 0);
  const avgScore = Number(analytics.averageMatchScore ?? 0);
  const shortlistRate = Number(analytics.shortlistRate ?? 0);
  const avgTimeMs = Number(analytics.averageTimeToScreen ?? 0);

  const scoreDistribution = (analytics.scoreDistribution as Bucket[] | undefined) ?? [];
  const hasScoreDistribution = scoreDistribution.some((item) => item.count > 0);

  const sourceMix = (analytics.sourceMix as SourceRow[] | undefined) ?? [];
  const hasSourceMix = sourceMix.some((s) => s.count > 0);

  const statusFunnel = (analytics.statusFunnel as StatusRow[] | undefined) ?? [];
  const funnelTotal = statusFunnel.reduce((acc, r) => acc + r.count, 0);

  const screeningsOverTime = (analytics.screeningsOverTime as DayRow[] | undefined) ?? [];
  const applicantsOverTime = (analytics.applicantsOverTime as DayRow[] | undefined) ?? [];
  const trendData = useMemo(
    () =>
      screeningsOverTime.map((row, idx) => ({
        date: row.date,
        label: new Date(row.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        screenings: row.count,
        applicants: applicantsOverTime[idx]?.count ?? 0,
      })),
    [screeningsOverTime, applicantsOverTime],
  );
  const hasTrendData = trendData.some((d) => d.screenings > 0 || d.applicants > 0);

  const topSkillsInDemand = (analytics.topSkillsInDemand as SkillRow[] | undefined) ?? [];
  const topCandidateSkills = (analytics.topCandidateSkills as SkillRow[] | undefined) ?? [];
  const topSkillGaps = (analytics.topSkillGaps as SkillRow[] | undefined) ?? [];

  const jobsBreakdown = (analytics.jobsBreakdown as JobRow[] | undefined) ?? [];

  const recentActivity = (analytics.recentActivity as ActivityRow[] | undefined) ?? [];
  const activityItems = recentActivity.map((a) => ({
    kind: a.kind,
    title: a.title,
    subtitle: a.subtitle,
    timeAgo: getRelativeTime(a.at),
  }));

  const animatedAvgScore = useCountUp(Math.round(avgScore));
  const animatedShortlistRate = useCountUp(Math.round(shortlistRate));
  const animatedAvgTimeSec = useCountUp(Math.round(avgTimeMs / 1000));
  const animatedApplicants = useCountUp(totalApplicants);
  const animatedScreenings = useCountUp(totalScreenings);
  const animatedShortlisted = useCountUp(totalShortlisted);

  const stats = [
    { label: "Total Jobs", value: totalJobs, hint: `${activeJobs} active`, icon: Briefcase, href: "/jobs", color: "text-brand-600 bg-brand-50", accent: "border-l-indigo-500" },
    { label: "Applicants", value: animatedApplicants, hint: `${totalPending} pending`, icon: Users, href: "/applicants", color: "text-sky-600 bg-sky-50", accent: "border-l-sky-500" },
    { label: "Screenings", value: animatedScreenings, hint: `${completedScreenings} completed`, icon: Cpu, href: "/screenings", color: "text-violet-600 bg-violet-50", accent: "border-l-violet-500" },
    { label: "Shortlisted", value: animatedShortlisted, hint: `${totalRejected} rejected`, icon: Target, href: "/applicants?status=shortlisted", color: "text-emerald-600 bg-emerald-50", accent: "border-l-emerald-500" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" subtitle="AI-powered recruiter analytics and screening intelligence." />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-indigo-md"
        style={{
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #3730a3 60%, #4338ca 100%)",
        }}
      >
        {/* Decorative radial blobs */}
        <span className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <span className="pointer-events-none absolute -bottom-8 left-10 h-36 w-36 rounded-full bg-violet-300/20 blur-2xl" aria-hidden />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold tracking-tight">
              {greeting}, {recruiterFirstName}
            </p>
            <p className="mt-1.5 text-sm text-white/80">Here&apos;s what&apos;s happening with your recruiting today.</p>
          </div>
          <div className="hidden text-right sm:block">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
              <CalendarDays className="h-3.5 w-3.5" />
              {today}
            </div>
            <div className="flex justify-end">
              <span title="AI Assistant" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm cursor-default">
                <Brain className="h-6 w-6 text-white/90" />
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="stat-card flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" aria-hidden />
          <p className="text-sm font-medium">Loading dashboard metrics…</p>
        </div>
      ) : (
        <>
          {/* Top stat cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    whileHover={{ y: -3, scale: 1.01 }}
                    className={`stat-card cursor-pointer border-l-4 p-6 transition duration-200 hover:shadow-card-hover ${item.accent}`}
                  >
                    <span className={`inline-flex rounded-xl p-2.5 ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{item.value}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{item.label}</p>
                      <span className="rounded-full bg-slate-100/80 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">{item.hint}</span>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* KPI row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid gap-4 lg:grid-cols-3"
          >
            <Card className={metricBoxClass}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Avg Time To Screen</h3>
                  <p className="mt-1 text-xs text-slate-600">End-to-end latency across completed runs.</p>
                </div>
                <span className="rounded-lg bg-brand-50 p-2 text-brand-600">
                  <Activity className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-brand-700">
                {avgTimeMs > 0 ? humanizeDurationMs(avgTimeMs) : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {completedScreenings === 0
                  ? "No completed screenings yet."
                  : `Based on ${completedScreenings} screening${completedScreenings === 1 ? "" : "s"}.`}
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-brand-100">
                <div
                  className="h-1.5 rounded-full bg-brand-600"
                  style={{ width: `${Math.min(100, (animatedAvgTimeSec / 120) * 100)}%` }}
                />
              </div>
            </Card>

            <Card className={metricBoxClass}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Avg Match Score</h3>
                  <p className="mt-1 text-xs text-slate-600">Mean across every scored candidate.</p>
                </div>
                <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-emerald-600">{animatedAvgScore} / 100</p>
              <p className="mt-1 text-xs text-slate-500">
                {totalShortlisted + totalRejected === 0
                  ? "No candidates scored yet."
                  : `${totalShortlisted + totalRejected} candidate${totalShortlisted + totalRejected === 1 ? "" : "s"} scored.`}
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-emerald-100">
                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, animatedAvgScore)}%` }} />
              </div>
            </Card>

            <Card className={metricBoxClass}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Shortlist Rate</h3>
                  <p className="mt-1 text-xs text-slate-600">Shortlisted ÷ (shortlisted + rejected).</p>
                </div>
                <span className="rounded-lg bg-violet-50 p-2 text-violet-600">
                  <Target className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-violet-600">{animatedShortlistRate}%</p>
              <p className="mt-1 text-xs text-slate-500">
                {totalShortlisted + totalRejected === 0
                  ? "Run a screening to compute this."
                  : `${totalShortlisted} shortlisted · ${totalRejected} rejected.`}
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-violet-100">
                <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${Math.min(100, animatedShortlistRate)}%` }} />
              </div>
            </Card>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-4 lg:grid-cols-3"
          >
            {[
              {
                title: "Post New Job",
                description: "Create a role and start collecting applicants immediately.",
                href: "/jobs?openNew=1",
                cta: "Create Job",
                icon: PlusCircle,
                accent: "border-l-brand-600",
                ctaClass: "bg-brand-600 hover:bg-brand-700",
              },
              {
                title: "Upload Applicants",
                description: "Import candidates from Umurava profiles, CSV or PDF files.",
                href: "/applicants?openUpload=1",
                cta: "Upload Now",
                icon: UploadCloud,
                accent: "border-l-sky-500",
                ctaClass: "bg-sky-600 hover:bg-sky-700",
              },
              {
                title: "Run AI Screening",
                description: "Launch your next AI screening flow for active job openings.",
                href: "/screenings?openFlow=1",
                cta: "Start Screening",
                icon: Cpu,
                accent: "border-l-violet-500",
                ctaClass: "bg-violet-600 hover:bg-violet-700",
              },
            ].map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + idx * 0.07 }}
                >
                  <Card className={`border-l-4 ${action.accent}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-[#1a1a2e]">{action.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{action.description}</p>
                      </div>
                      <span className="rounded-lg bg-brand-50 p-2 text-brand-600">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    <Link href={action.href} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white ${action.ctaClass}`}>
                      <Icon className="h-4 w-4" />
                      {action.cta}
                    </Link>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Trend + Score distribution */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="grid gap-4 lg:grid-cols-2"
          >
            <Card>
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Activity Over Time</h3>
              <p className="mb-2 text-sm text-slate-600">Daily applicants uploaded and screenings run (last 30 days).</p>
              <div className="h-64">
                {hasTrendData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="g-app" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="g-scr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} tickMargin={6} />
                      <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="applicants" name="Applicants" stroke="#0ea5e9" fill="url(#g-app)" strokeWidth={2} />
                      <Area type="monotone" dataKey="screenings" name="Screenings" stroke="#4f46e5" fill="url(#g-scr)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-brand-200 bg-brand-50/40 text-center">
                    <p className="text-2xl">📈</p>
                    <p className="mt-2 font-medium text-slate-700">No activity in the last 30 days</p>
                    <p className="mt-1 text-xs text-slate-500">Upload applicants or run a screening to start seeing trends.</p>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Candidate Score Distribution</h3>
              <p className="mb-2 text-sm text-slate-600">Across all completed screenings.</p>
              <div className="h-64">
                {hasScoreDistribution ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {scoreDistribution.map((_, i) => (
                          <Cell key={i} fill={["#ddd6fe", "#a78bfa", "#7c3aed", "#4338ca", "#312e81"][Math.min(i, 4)]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-brand-200 bg-brand-50/40 text-center">
                    <p className="text-2xl">🧪</p>
                    <p className="mt-2 font-medium text-slate-700">No scored candidates yet</p>
                    <p className="mt-1 text-xs text-slate-500">Score distribution appears once screenings complete.</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Source mix + Funnel */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="grid gap-4 lg:grid-cols-2"
          >
            <Card>
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Candidate Source Mix</h3>
              <p className="mb-2 text-sm text-slate-600">Where your pipeline is sourced from.</p>
              <div className="h-64">
                {hasSourceMix ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(value, _name, item) => {
                          const src = String((item as { payload?: { source?: string } })?.payload?.source ?? "");
                          return [String(value ?? 0), SOURCE_LABELS[src] ?? src];
                        }}
                      />
                      <Pie
                        data={sourceMix}
                        dataKey="count"
                        nameKey="source"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        label={(entry) => {
                          const src = String((entry as { source?: string }).source ?? "");
                          return SOURCE_LABELS[src] ?? src;
                        }}
                      >
                        {sourceMix.map((entry, i) => (
                          <Cell key={i} fill={SOURCE_COLORS[entry.source] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-brand-200 bg-brand-50/40 text-center">
                    <p className="text-2xl">🪣</p>
                    <p className="mt-2 font-medium text-slate-700">No applicants yet</p>
                    <p className="mt-1 text-xs text-slate-500">Upload candidates to see source breakdown.</p>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Applicant Funnel</h3>
              <p className="mb-2 text-sm text-slate-600">Status distribution across your pool.</p>
              <div className="flex h-64 flex-col justify-center space-y-3">
                {funnelTotal === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-brand-200 bg-brand-50/40 text-center">
                    <p className="text-2xl">🧭</p>
                    <p className="mt-2 font-medium text-slate-700">Funnel is empty</p>
                    <p className="mt-1 text-xs text-slate-500">Applicant statuses appear after screenings run.</p>
                  </div>
                ) : (
                  statusFunnel.map((row) => {
                    const pct = funnelTotal ? Math.round((row.count / funnelTotal) * 100) : 0;
                    const colors: Record<string, string> = {
                      pending: "bg-slate-400",
                      shortlisted: "bg-emerald-500",
                      rejected: "bg-red-400",
                    };
                    const labels: Record<string, string> = {
                      pending: "Pending",
                      shortlisted: "Shortlisted",
                      rejected: "Rejected",
                    };
                    return (
                      <div key={row.status}>
                        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                          <span>{labels[row.status] ?? row.status}</span>
                          <span>
                            {row.count} · {pct}%
                          </span>
                        </div>
                        <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-3 rounded-full ${colors[row.status] ?? "bg-slate-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </motion.div>

          {/* Skills demand / pool / gaps */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="grid gap-4 lg:grid-cols-3"
          >
            <SkillList
              title="Top Skills In Demand"
              subtitle="Aggregated from your job requirements."
              items={topSkillsInDemand}
              emptyText="Add job requirements to see demand."
              barClass="bg-brand-500"
              trackClass="bg-brand-100"
            />
            <SkillList
              title="Top Skills In Pool"
              subtitle="Most common skills in your applicant pool."
              items={topCandidateSkills}
              emptyText="Upload applicants to populate."
              barClass="bg-emerald-500"
              trackClass="bg-emerald-100"
            />
            <SkillList
              title="Top Skill Gaps"
              subtitle="Missing skills surfaced by screenings."
              items={topSkillGaps}
              emptyText="Run a screening to surface gaps."
              barClass="bg-red-400"
              trackClass="bg-red-100"
            />
          </motion.div>

          {/* Activity + Jobs breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid gap-4 lg:grid-cols-2"
          >
            <ActivityFeed items={activityItems} />
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#1a1a2e]">Jobs Breakdown</h3>
                <Link className="text-xs font-semibold text-brand-700" href="/jobs">
                  View all jobs
                </Link>
              </div>
              {jobsBreakdown.length === 0 ? (
                <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 px-4 py-8 text-center">
                  <p className="text-sm text-slate-600">No active jobs yet.</p>
                  <Link href="/jobs?openNew=1" className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                    Post Your First Job
                  </Link>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Job</th>
                        <th className="group cursor-default px-3 py-2 text-right">
                          Applicants <span className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-40">↕</span>
                        </th>
                        <th className="group cursor-default px-3 py-2 text-right">
                          Screenings <span className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-40">↕</span>
                        </th>
                        <th className="group cursor-default px-3 py-2 text-right">
                          Avg Score <span className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-40">↕</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobsBreakdown.slice(0, 6).map((j, idx) => (
                        <tr key={j.jobId} className={`border-t border-slate-100 transition-colors duration-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${idx % 2 === 1 ? "bg-slate-50/40 dark:bg-slate-800/10" : ""}`}>
                          <td className="px-3 py-2.5">
                            <Link href={`/jobs/${j.jobId}/screenings`} className="font-medium text-brand-800 hover:underline">
                              {j.title}
                            </Link>
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                              {j.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{j.applicants ?? "—"}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{j.screenings ?? "—"}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">
                            {j.screenings > 0 ? j.avgScore.toFixed(1) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Screening status summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44 }}
          >
            <Card>
              <div className="mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand-600" />
                <h3 className="text-lg font-semibold text-[#1a1a2e]">Screening Health</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <HealthStat icon={CheckCircle2} label="Completed" value={completedScreenings} color="text-emerald-600 bg-emerald-50" />
                <HealthStat icon={Activity} label="Running" value={Number(analytics.runningScreenings ?? 0)} color="text-amber-600 bg-amber-50" />
                <HealthStat icon={XCircle} label="Failed" value={Number(analytics.failedScreenings ?? 0)} color="text-red-600 bg-red-50" />
                <HealthStat icon={FileText} label="Jobs with data" value={jobsBreakdown.filter((j) => j.applicants > 0).length} color="text-brand-600 bg-brand-50" />
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}

function SkillList({
  title,
  subtitle,
  items,
  emptyText,
  barClass,
  trackClass,
}: {
  title: string;
  subtitle: string;
  items: SkillRow[];
  emptyText: string;
  barClass: string;
  trackClass: string;
}) {
  const max = items.reduce((acc, it) => Math.max(acc, it.count), 0);
  return (
    <Card>
      <h3 className="text-lg font-semibold text-[#1a1a2e]">{title}</h3>
      <p className="mb-3 text-sm text-slate-600">{subtitle}</p>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 px-3 py-6 text-center text-xs text-slate-500">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 6).map((it) => {
            const pct = max > 0 ? Math.round((it.count / max) * 100) : 0;
            return (
              <li key={it.skill}>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span className="truncate">{it.skill}</span>
                  <span className="tabular-nums text-slate-500">{it.count}</span>
                </div>
                <div className={`mt-1 h-2 rounded-full ${trackClass}`}>
                  <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function HealthStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className={`rounded-lg p-1.5 ${color}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
