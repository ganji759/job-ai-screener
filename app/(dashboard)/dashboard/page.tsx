"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Brain, Briefcase, CalendarDays, Cpu, PlusCircle, TrendingUp, UploadCloud, Users } from "lucide-react";
import { useGetDashboardAnalyticsQuery } from "../../../store/api/screeningsApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ActivityFeed } from "../../../components/dashboard/ActivityFeed";
import { Card } from "../../../components/ui/Card";
import { humanizeDurationMs } from "../../../lib/utils";
import { useGetJobsQuery } from "../../../store/api/jobsApi";
import { useAuth } from "../../../hooks/useAuth";

const metricBoxClass = "rounded-xl border border-brand-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]";

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
      if (current >= safe) {
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

  const scoreDistribution = (analytics.scoreDistribution as Array<{ range: string; count: number }> | undefined) ?? [
    { range: "0-20", count: 0 },
    { range: "20-40", count: 0 },
    { range: "40-60", count: 0 },
    { range: "60-80", count: 0 },
    { range: "80-100", count: 0 },
  ];
  const hasScoreDistribution = scoreDistribution.some((item) => item.count > 0);
  const totalDistributionCount = scoreDistribution.reduce((acc, item) => acc + item.count, 0);
  const avgScore = Math.round(
    scoreDistribution.reduce((acc, item) => acc + item.count * (Number(item.range.split("-")[1] ?? 0)), 0) /
      Math.max(1, totalDistributionCount),
  );
  const shortlistRate = Number(analytics.totalApplicants ?? 0) > 0 ? Math.round((Number(analytics.totalScreenings ?? 0) / Number(analytics.totalApplicants)) * 100) : 0;
  const avgTimeMs = Number(analytics.averageTimeToScreen ?? 0);

  const lineChartData = useMemo(() => {
    const countsByDay = new Map<string, number>();
    const start = new Date();
    start.setDate(start.getDate() - 29);
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      countsByDay.set(d.toISOString().slice(0, 10), 0);
    }

    const recentActivity = Array.isArray(analytics.recentActivity)
      ? (analytics.recentActivity as Array<{ createdAt?: string }>)
      : [];
    recentActivity.forEach((item) => {
      const key = new Date(item.createdAt ?? "").toISOString().slice(0, 10);
      if (countsByDay.has(key)) {
        countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
      }
    });

    return [...countsByDay.entries()].map(([date, count]) => ({
      date,
      label: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      screenings: count,
    }));
  }, [analytics.recentActivity]);
  const hasLineData = lineChartData.some((row) => row.screenings > 0);

  const activityItems = useMemo(() => {
    const jobById = new Map((jobsData?.jobs ?? []).map((job) => [job._id, job.title]));
    const recent = Array.isArray(analytics.recentActivity)
      ? (analytics.recentActivity as Array<{ status?: string; createdAt?: string; jobId?: string }>)
      : [];
    return recent.slice(0, 8).map((item) => {
      const rawStatus = String(item.status ?? "").toLowerCase();
      const kind = rawStatus.includes("upload")
        ? ("upload" as const)
        : rawStatus.includes("job")
          ? ("job_change" as const)
          : ("completed_screening" as const);
      const action = kind === "upload"
        ? "Uploaded applicants for"
        : kind === "job_change"
          ? "Updated job status for"
          : item.status === "completed"
            ? "Completed screening for"
            : "Updated screening for";
      return {
        kind,
        action,
        jobName: jobById.get(String(item.jobId ?? "")) ?? "a job",
        timeAgo: getRelativeTime(String(item.createdAt ?? new Date().toISOString())),
      };
    });
  }, [analytics.recentActivity, jobsData?.jobs]);

  const demandSkills = (Array.isArray(analytics.topSkillsInDemand) ? (analytics.topSkillsInDemand as string[]) : []).slice(0, 3);

  const animatedAvgScore = useCountUp(avgScore);
  const animatedShortlistRate = useCountUp(shortlistRate);
  const animatedAvgTime = useCountUp(Math.round(avgTimeMs / 60000));
  const stats = [
    { label: "Total Jobs", value: Number(analytics.totalJobs ?? 0), trend: "+8%", positive: true, icon: Briefcase, href: "/jobs" },
    { label: "Active Jobs", value: Number(analytics.activeJobs ?? 0), trend: "+12%", positive: true, icon: TrendingUp, href: "/jobs" },
    { label: "Applicants", value: Number(analytics.totalApplicants ?? 0), trend: "-2%", positive: false, icon: Users, href: "/applicants" },
    { label: "Screenings", value: Number(analytics.totalScreenings ?? 0), trend: "+5%", positive: true, icon: Cpu, href: "/screenings" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" subtitle="AI-powered recruiter analytics and screening intelligence." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600 p-6 text-white shadow-[0_12px_30px_rgba(79,70,229,0.25)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold">{greeting}, {recruiterFirstName} 👋</p>
            <p className="mt-1 text-sm text-white/90">Here's what's happening with your recruiting today.</p>
          </div>
          <div className="text-right">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs text-white/95">
              <CalendarDays className="h-3.5 w-3.5" />
              {today}
            </div>
            <Brain className="ml-auto h-10 w-10 shrink-0 text-white/90" />
          </div>
        </div>
      </motion.div>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-brand-100 bg-white py-16 text-slate-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" aria-hidden />
          <p className="text-sm font-medium">Loading dashboard metrics…</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-brand-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition duration-200 hover:shadow-[0_10px_20px_rgba(15,23,42,0.12)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-xl bg-brand-50 p-2 text-brand-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>{item.trend}</span>
                    </div>
                    <p className="mt-3 text-xs uppercase text-slate-500">{item.label}</p>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 * idx }} className="mt-1 text-3xl font-bold text-brand-900">
                      {item.value}
                    </motion.p>
                  </motion.div>
                </Link>
              );
            })}
          </div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid gap-4 lg:grid-cols-3">
            <Card className={metricBoxClass}>
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Average Time To Screen</h3>
              <p className="mt-1 text-sm text-slate-600">End-to-end latency for completed runs.</p>
              <p className="mt-4 text-3xl font-bold text-brand-700">{animatedAvgTime}m</p>
              <p className="text-xs text-slate-500">{humanizeDurationMs(avgTimeMs)}</p>
              <div className="mt-3 h-2 rounded-full bg-brand-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min(100, Math.round((animatedAvgTime / 120) * 100))}%` }} /></div>
            </Card>
            <Card className={metricBoxClass}>
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Avg Match Score</h3>
              <p className="mt-1 text-sm text-slate-600">Last 30 days</p>
              <p className="mt-4 text-3xl font-bold text-emerald-600">{animatedAvgScore} / 100</p>
              <div className="mt-3 h-2 rounded-full bg-emerald-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, animatedAvgScore)}%` }} /></div>
            </Card>
            <Card className={metricBoxClass}>
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Shortlist Rate</h3>
              <p className="mt-1 text-sm text-slate-600">Candidates making the shortlist</p>
              <p className="mt-4 text-3xl font-bold text-violet-600">{animatedShortlistRate}%</p>
              <div className="mt-3 h-2 rounded-full bg-violet-100"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.min(100, animatedShortlistRate)}%` }} /></div>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid gap-4 lg:grid-cols-3">
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
                <motion.div key={action.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + idx * 0.07 }}>
                  <Card className={`border-l-4 ${action.accent}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-[#1a1a2e]">{action.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{action.description}</p>
                      </div>
                      <span className="rounded-lg bg-brand-50 p-2 text-brand-600"><Icon className="h-5 w-5" /></span>
                    </div>
                    <Link href={action.href} className={`mt-4 inline-flex rounded-lg px-3 py-2 text-sm font-semibold text-white ${action.ctaClass}`}>
                      {action.cta}
                    </Link>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Screenings Over Time</h3>
              <p className="mb-2 text-sm text-slate-600">Screening activity over the last 30 days.</p>
              <div className="h-64">
                {hasLineData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} tickMargin={8} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="screenings" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3, fill: "#4f46e5" }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-brand-200 bg-brand-50/40 text-center">
                    <p className="text-2xl">📈</p>
                    <p className="mt-2 font-medium text-slate-700">No screening trends yet</p>
                    <p className="mt-1 text-xs text-slate-500">Run your first screening to start seeing time-based insights.</p>
                  </div>
                )}
              </div>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Candidate Score Distribution</h3>
              <p className="mb-2 text-sm text-slate-600">Across all screenings</p>
              <div className="h-64">
                {hasScoreDistribution ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="range" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count">
                        {scoreDistribution.map((_, i) => (
                          <Cell key={i} fill={i <= 1 ? "#ef4444" : i <= 3 ? "#f59e0b" : "#22c55e"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-brand-200 bg-brand-50/40 text-center">
                    <p className="text-2xl">🧪</p>
                    <p className="mt-2 font-medium text-slate-700">No scored candidates yet</p>
                    <p className="mt-1 text-xs text-slate-500">Candidate score distribution appears once screening data is available.</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="grid gap-4 lg:grid-cols-2">
            <ActivityFeed items={activityItems} />
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#1a1a2e]">Active Jobs Quick View</h3>
                <Link className="text-xs font-semibold text-brand-700" href="/jobs">
                  View all jobs
                </Link>
              </div>
              <div className="space-y-3">
                {(jobsData?.jobs ?? []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 px-4 py-8 text-center">
                    <p className="text-sm text-slate-600">No active jobs yet.</p>
                    <Link href="/jobs/new" className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                      Post Your First Job
                    </Link>
                  </div>
                ) : (
                  (jobsData?.jobs ?? []).slice(0, 5).map((job) => (
                    <div key={job._id} className="rounded-xl border border-brand-100 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{job.title}</p>
                        <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">{job.status}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{job.applicantCount ?? 0} applicants</span>
                        <Link href={`/jobs/${job._id}/screenings`} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">
                          Screen Now
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <Card>
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />
              <h3 className="text-lg font-semibold text-[#1a1a2e]">Talent Pool Intelligence</h3>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Recommendation: prioritize profiles with strong skills overlap and reduce gaps using targeted sourcing.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {demandSkills.map((skill) => (
                <span key={skill} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{skill}</span>
              ))}
            </div>
            <Link href="/analytics" className="mt-4 inline-flex rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white">
              View Full Analytics
            </Link>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
