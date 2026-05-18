"use client";

import { useMemo } from "react";
import { Brain, Briefcase, Filter, Plus, Target, Users } from "lucide-react";
import Link from "next/link";
import { useGetDashboardAnalyticsQuery } from "../../../store/api/screeningsApi";
import { useGetApplicantsQuery } from "../../../store/api/applicantsApi";
import { useGetInterviewsQuery } from "../../../store/api/interviewsApi";
import { useAuth } from "../../../hooks/useAuth";
import { type ActivityKind } from "../../../components/dashboard/ActivityFeed";
import { HeronGreetingBar } from "../../../components/dashboard/HeronGreetingBar";
import { HeronStatCard } from "../../../components/dashboard/HeronStatCard";
import { HeronFunnelCard } from "../../../components/dashboard/HeronFunnelCard";
import { HeronTopCandidates } from "../../../components/dashboard/HeronTopCandidates";
import { HeronAgentActivity } from "../../../components/dashboard/HeronAgentActivity";
import { HeronSourceQuality } from "../../../components/dashboard/HeronSourceQuality";
import { HeronUpcomingInterviews } from "../../../components/dashboard/HeronUpcomingInterviews";

type DayRow = { date: string; count: number };
type SourceRow = { source: string; count: number };
type StatusRow = { status: string; count: number };
type ActivityRow = { kind: ActivityKind; title: string; subtitle: string; at: string };

const SOURCE_LABELS: Record<string, string> = {
  umurava_platform: "Umurava Platform",
  pdf_upload: "PDF Upload",
  csv_upload: "CSV / Excel",
  linkedin: "LinkedIn",
  referral: "Referral",
  direct: "Direct",
  greenhouse: "Greenhouse",
};

const SOURCE_COLORS: Record<string, string> = {
  umurava_platform: "#6366f1",
  pdf_upload: "#22d3ee",
  csv_upload: "#fbbf24",
  linkedin: "#818cf8",
  referral: "#34d399",
  direct: "#d946ef",
  greenhouse: "#f97316",
};

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

const buildSparkline = (rows: DayRow[]): number[] => {
  if (!rows || rows.length === 0) return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const tail = rows.slice(-10);
  if (tail.length === 1) return [tail[0].count];
  return tail.map((r) => r.count);
};

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboardAnalyticsQuery();
  const { data: applicantsData } = useGetApplicantsQuery({ page: 1, limit: 5, status: "shortlisted" });
  const { data: interviewsData } = useGetInterviewsQuery({ page: 1, limit: 5 });
  const { user } = useAuth();
  const analytics = (data ?? {}) as Record<string, unknown>;

  const firstName = (user?.name?.split(" ")[0] ?? "Recruiter").trim();

  const totalJobs = Number(analytics.totalJobs ?? 0);
  const activeJobs = Number(analytics.activeJobs ?? 0);
  const totalApplicants = Number(analytics.totalApplicants ?? 0);
  const totalScreenings = Number(analytics.totalScreenings ?? 0);
  const completedScreenings = Number(analytics.completedScreenings ?? 0);
  const runningScreenings = Number(analytics.runningScreenings ?? 0);
  const totalShortlisted = Number(analytics.totalShortlisted ?? 0);
  const totalRejected = Number(analytics.totalRejected ?? 0);
  const totalPending = Number(analytics.totalPending ?? 0);
  const shortlistRate = Number(analytics.shortlistRate ?? 0);

  const applicantsOverTime = (analytics.applicantsOverTime as DayRow[] | undefined) ?? [];
  const screeningsOverTime = (analytics.screeningsOverTime as DayRow[] | undefined) ?? [];

  const sourceMix = (analytics.sourceMix as SourceRow[] | undefined) ?? [];
  const statusFunnel = (analytics.statusFunnel as StatusRow[] | undefined) ?? [];
  const recentActivity = (analytics.recentActivity as ActivityRow[] | undefined) ?? [];

  const funnelStages = useMemo(() => {
    const ordered: Array<{ label: string; key: string; color: string }> = [
      { label: "Applied", key: "applied", color: "#6366f1" },
      { label: "Screened", key: "screened", color: "#818cf8" },
      { label: "Shortlisted", key: "shortlisted", color: "#d946ef" },
      { label: "Rejected", key: "rejected", color: "#fb7185" },
      { label: "Pending", key: "pending", color: "#fbbf24" },
    ];
    const map = new Map(statusFunnel.map((r) => [r.status, r.count]));
    const stages = ordered
      .map((stage) => ({
        label: stage.label,
        color: stage.color,
        value: stage.key === "applied" ? totalApplicants : Number(map.get(stage.key) ?? 0),
      }))
      .filter((s) => s.label === "Applied" || s.value > 0);
    if (stages.length < 2) {
      return [
        { label: "Applied", value: totalApplicants, color: "#6366f1" },
        { label: "Screened", value: completedScreenings, color: "#818cf8" },
        { label: "Shortlisted", value: totalShortlisted, color: "#d946ef" },
      ];
    }
    return stages;
  }, [statusFunnel, totalApplicants, completedScreenings, totalShortlisted]);

  const conversion = totalApplicants > 0 ? (totalShortlisted / totalApplicants) * 100 : undefined;
  const dropOff = totalApplicants > 0 ? (totalRejected / totalApplicants) * 100 : undefined;

  const sources = useMemo(() => {
    if (sourceMix.length === 0) return [];
    return sourceMix
      .map((s) => ({
        name: SOURCE_LABELS[s.source] ?? s.source,
        share: s.count,
        color: SOURCE_COLORS[s.source] ?? "#94a3b8",
      }))
      .sort((a, b) => b.share - a.share);
  }, [sourceMix]);

  const agentItems = recentActivity.map((a) => ({
    kind: a.kind,
    title: a.title,
    subtitle: a.subtitle,
    timeAgo: getRelativeTime(a.at),
  }));

  const pulseLines = useMemo(() => {
    const lines: string[] = [];
    if (runningScreenings > 0) lines.push(`${runningScreenings} screenings running right now`);
    if (totalPending > 0) lines.push(`${totalPending} applicants awaiting review`);
    if (totalShortlisted > 0) lines.push(`${totalShortlisted} candidates shortlisted to date`);
    if (activeJobs > 0) lines.push(`${activeJobs} job${activeJobs === 1 ? "" : "s"} actively hiring`);
    if (completedScreenings > 0) lines.push(`${completedScreenings} screenings completed`);
    return lines;
  }, [runningScreenings, totalPending, totalShortlisted, activeJobs, completedScreenings]);

  const topCandidates = applicantsData?.applicants ?? [];
  const interviews = interviewsData?.interviews ?? [];

  return (
    <div className="fade-up">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="eyebrow mb-[10px]">Workspace · Overview</div>
          <h1 className="display m-0" style={{ fontSize: 38 }}>
            Dashboard.
          </h1>
          <p
            className="mt-2 max-w-[720px]"
            style={{ color: "var(--ink-3)", fontSize: 14.5, margin: "8px 0 0" }}
          >
            AI-powered recruiter analytics and screening intelligence — refreshed in real time.
          </p>
        </div>
        <div className="flex items-center gap-[10px]">
          <button type="button" className="btn btn-ghost">
            <Filter className="h-3 w-3" /> This week
          </button>
          <Link href="/jobs?openNew=1" className="btn btn-primary">
            <Plus className="h-3 w-3" /> New job
          </Link>
        </div>
      </div>

      <HeronGreetingBar
        firstName={firstName}
        pulseLines={pulseLines}
        overnightScreenings={completedScreenings}
        shortlistedToday={totalShortlisted}
        interviewsScheduledRecent={interviews.length}
      />

      <div className="mb-7 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <HeronStatCard
          label="Total Jobs · open"
          value={totalJobs}
          sub={`${activeJobs} active`}
          icon={<Briefcase className="h-[18px] w-[18px]" strokeWidth={1.7} />}
          accent="indigo"
          spark={buildSparkline(applicantsOverTime)}
          href="/jobs"
        />
        <HeronStatCard
          label="Applicants · all time"
          value={totalApplicants}
          sub={`${totalPending} awaiting review`}
          icon={<Users className="h-[18px] w-[18px]" strokeWidth={1.7} />}
          accent="fuchsia"
          spark={buildSparkline(applicantsOverTime)}
          href="/applicants"
        />
        <HeronStatCard
          label="Screenings · completed"
          value={completedScreenings}
          sub={`${runningScreenings} running · ${totalScreenings} total`}
          icon={<Brain className="h-[18px] w-[18px]" strokeWidth={1.7} />}
          accent="cyan"
          spark={buildSparkline(screeningsOverTime)}
          href="/screenings"
        />
        <HeronStatCard
          label="Shortlist · rate"
          value={`${Math.round(shortlistRate)}%`}
          sub={`${totalShortlisted} shortlisted · ${totalRejected} rejected`}
          icon={<Target className="h-[18px] w-[18px]" strokeWidth={1.7} />}
          accent="mint"
          href="/applicants?status=shortlisted"
        />
      </div>

      <div className="dash-row mb-[18px] grid gap-[18px]" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <HeronFunnelCard
          stages={funnelStages}
          conversionRate={conversion}
          dropOffRate={dropOff}
        />
        <HeronTopCandidates items={topCandidates} />
      </div>

      <div className="dash-row mb-[18px] grid gap-[18px]" style={{ gridTemplateColumns: "1.1fr 1fr" }}>
        <HeronAgentActivity items={agentItems} />
        <HeronSourceQuality sources={sources} />
      </div>

      <HeronUpcomingInterviews items={interviews} />

      {isLoading ? (
        <div className="panel panel-lg mt-[18px] flex items-center justify-center gap-3 py-10" style={{ color: "var(--ink-3)" }}>
          <div
            className="h-8 w-8 animate-spin rounded-full"
            style={{ borderColor: "rgba(99,102,241,0.25)", borderTopColor: "#818cf8", borderWidth: 2, borderStyle: "solid" }}
            aria-hidden
          />
          <p className="text-sm font-medium">Refreshing dashboard metrics…</p>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 1100px) {
          .dash-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
