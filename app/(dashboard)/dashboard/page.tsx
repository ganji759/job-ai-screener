"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Brain, TrendingUp, Users, Briefcase, Cpu } from "lucide-react";
import { useGetDashboardAnalyticsQuery } from "../../../store/api/screeningsApi";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ActivityFeed } from "../../../components/dashboard/ActivityFeed";
import { SkillsHeatmap } from "../../../components/dashboard/SkillsHeatmap";
import { Card } from "../../../components/ui/Card";
import { humanizeDurationMs } from "../../../lib/utils";
import { useGetJobsQuery } from "../../../store/api/jobsApi";
import { useInView } from "../../../hooks/useInView";

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboardAnalyticsQuery();
  const { data: jobsData } = useGetJobsQuery({ page: 1, limit: 5, status: "active" });
  const { ref: chartRef, inView } = useInView<HTMLDivElement>();
  const analytics = (data ?? {}) as Record<string, unknown>;
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";

  const scoreDistribution = (analytics.scoreDistribution as Array<{ range: string; count: number }> | undefined) ?? [
    { range: "0-20", count: 0 },
    { range: "21-40", count: 0 },
    { range: "41-60", count: 0 },
    { range: "61-80", count: 0 },
    { range: "81-100", count: 0 },
  ];
  const avgScore = Math.round(
    scoreDistribution.reduce((acc, item) => acc + item.count * (Number(item.range.split("-")[1] ?? 0)), 0) /
      Math.max(1, scoreDistribution.reduce((acc, item) => acc + item.count, 0)),
  );
  const shortlistRate = Number(analytics.totalApplicants ?? 0) > 0 ? Math.round((Number(analytics.totalScreenings ?? 0) / Number(analytics.totalApplicants)) * 100) : 0;
  const stats = [
    { label: "Total Jobs", value: Number(analytics.totalJobs ?? 0), trend: "+8%", icon: Briefcase, href: "/jobs" },
    { label: "Active Jobs", value: Number(analytics.activeJobs ?? 0), trend: "+12%", icon: TrendingUp, href: "/jobs" },
    { label: "Applicants", value: Number(analytics.totalApplicants ?? 0), trend: "+24%", icon: Users, href: "/applicants" },
    { label: "Screenings", value: Number(analytics.totalScreenings ?? 0), trend: "+5%", icon: Cpu, href: "/screenings" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" subtitle="AI-powered recruiter analytics and screening intelligence." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-r from-brand-600 to-violet-600 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold">{greeting}, Recruiter 👋</p>
            <p className="mt-1 text-sm text-white/90">Here's what's happening with your recruiting today.</p>
          </div>
          <Brain className="h-12 w-12 shrink-0 text-white/90" />
        </div>
      </motion.div>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-brand-100 bg-white py-16 text-slate-500 shadow-brand-sm">
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
                  <motion.div whileHover={{ y: -2, scale: 1.02 }} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-brand-sm">
                    <div className="flex items-center justify-between">
                      <span className="rounded-xl bg-brand-50 p-2 text-brand-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-semibold text-emerald-600">{item.trend}</span>
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
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h3 className="font-semibold text-slate-900">Average Time To Screen</h3>
              <p className="mt-1 text-sm text-slate-600">End-to-end latency for completed runs.</p>
              <p className="mt-4 text-3xl font-bold text-brand-700">{humanizeDurationMs(Number(analytics.averageTimeToScreen ?? 0))}</p>
              <div className="mt-3 h-2 rounded-full bg-brand-100"><div className="h-2 w-1/2 rounded-full bg-brand-600" /></div>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-900">Avg Match Score</h3>
              <p className="mt-1 text-sm text-slate-600">Last 30 days</p>
              <p className="mt-4 text-3xl font-bold text-emerald-600">{avgScore} / 100</p>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-900">Shortlist Rate</h3>
              <p className="mt-1 text-sm text-slate-600">Candidates making the shortlist</p>
              <p className="mt-4 text-3xl font-bold text-violet-600">{shortlistRate}%</p>
            </Card>
          </div>
          <div ref={chartRef} className="grid gap-4 lg:grid-cols-2">
            {inView ? <SkillsHeatmap skills={Array.isArray(analytics.topSkillsInDemand) ? (analytics.topSkillsInDemand as string[]) : []} /> : <Card><div className="h-64 animate-shimmer rounded-xl" /></Card>}
            <Card>
              <h3 className="font-semibold text-slate-900">Candidate Score Distribution</h3>
              <p className="mb-2 text-sm text-slate-600">Across all screenings</p>
              <div className="h-64">
                {inView ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDistribution}>
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count">
                        {scoreDistribution.map((_, i) => (
                          <Cell key={i} fill={i <= 1 ? "#ef4444" : i <= 3 ? "#f59e0b" : "#22c55e"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full animate-shimmer rounded-xl" />
                )}
              </div>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ActivityFeed items={Array.isArray(analytics.recentActivity) ? (analytics.recentActivity as Array<{ status: string; createdAt: string }>) : []} />
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Active Jobs Quick View</h3>
                <Link className="text-xs font-semibold text-brand-700" href="/jobs">
                  View all jobs
                </Link>
              </div>
              <div className="space-y-2">
                {(jobsData?.jobs ?? []).slice(0, 5).map((job) => (
                  <div key={job._id} className="flex items-center justify-between rounded-xl border border-brand-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{job.title}</p>
                      <p className="text-xs text-slate-500">{job.applicantCount ?? 0} applicants</p>
                    </div>
                    <Link href={`/jobs/${job._id}/screenings`} className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                      Run Screening
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card>
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />
              <h3 className="font-semibold text-slate-900">Talent Pool Intelligence</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(analytics.topSkillsInDemand) ? (analytics.topSkillsInDemand as string[]) : []).slice(0, 8).map((skill) => (
                <span key={skill} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{skill}</span>
              ))}
              {(Array.isArray(analytics.skillGapsInPool) ? (analytics.skillGapsInPool as string[]) : []).slice(0, 8).map((skill) => (
                <span key={skill} className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">{skill}</span>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Recommendation: prioritize profiles with strong skills overlap and reduce gaps using targeted sourcing.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
