"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Crown, Download, Loader2, RefreshCw, Sparkles, TriangleAlert, UserRound } from "lucide-react";
import {
  useExportScreeningMutation,
  useGetScreeningResultsQuery,
  useGetScreeningStatusQuery,
  useRunScreeningMutation,
} from "../../../../store/api/screeningsApi";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { useGetJobQuery } from "../../../../store/api/jobsApi";
import { useGetApplicantsQuery } from "../../../../store/api/applicantsApi";
import toast from "react-hot-toast";
import Link from "next/link";
import type { Applicant } from "../../../../types";

type Decision = "approved" | "rejected" | "review";

const getScoreTone = (score: number) => (score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600");
const getScoreBarColor = (score: number) => (score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500");

const ScoreBar = ({ value }: { value: number }) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${getScoreBarColor(clamped)}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className={`text-xs font-semibold ${getScoreTone(clamped)}`}>{Math.round(clamped)}</span>
    </div>
  );
};

const PillarBar = ({ label, value, max }: { label: string; value: number; max: number }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[11px] font-medium text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums text-slate-800">
          {value.toFixed(1)}
          <span className="text-slate-400">/{max}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const PercentBar = ({ label, value }: { label: string; value: number }) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[11px] font-medium text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums text-slate-800">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${getScoreBarColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const hiringRiskBadgeClass = (risk: string) => {
  const t = risk.toLowerCase();
  if (t === "low") return "bg-emerald-100 text-emerald-900 border border-emerald-200";
  if (t === "high") return "bg-red-100 text-red-900 border border-red-200";
  return "bg-amber-100 text-amber-950 border border-amber-200";
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return { border: "border-l-yellow-500", bg: "bg-yellow-50/70", badge: "from-yellow-300 to-yellow-500", icon: <Crown className="h-4 w-4 text-yellow-700" /> };
  if (rank === 2) return { border: "border-l-slate-400", bg: "bg-slate-50", badge: "from-slate-200 to-slate-400", icon: <Crown className="h-4 w-4 text-slate-700" /> };
  if (rank === 3) return { border: "border-l-amber-700", bg: "bg-amber-50/70", badge: "from-amber-400 to-amber-700", icon: <Crown className="h-4 w-4 text-amber-900" /> };
  return { border: "border-l-brand-400", bg: "bg-white", badge: "from-brand-400 to-brand-700", icon: null };
};

export default function ScreeningDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const screeningId = String(params.id ?? "");

  // Status polling — works for any run state
  const { data: statusData, refetch: refetchStatus } = useGetScreeningStatusQuery(screeningId, {
    skip: !screeningId,
  });
  const normalizedStatus = statusData?.status ?? "queued";
  const isLive = normalizedStatus === "queued" || normalizedStatus === "running";
  const isFailed = normalizedStatus === "failed";
  const isComplete = normalizedStatus === "completed";

  useEffect(() => {
    if (!isLive) return;
    const t = window.setInterval(() => void refetchStatus(), 2000);
    return () => window.clearInterval(t);
  }, [isLive, refetchStatus]);

  // Results — only fetch once complete
  const { data: resultsData, isLoading: resultsLoading } = useGetScreeningResultsQuery(screeningId, {
    skip: !screeningId || !isComplete,
  });

  const jobId = resultsData?.meta?.jobId ?? resultsData?.ranked?.[0]?.applicant?.job_id;
  const { data: job } = useGetJobQuery(String(jobId ?? ""), { skip: !jobId });
  const { data: applicantsData } = useGetApplicantsQuery(
    { jobId: String(jobId ?? ""), limit: 500 },
    { skip: !jobId },
  );

  const [exportScreening] = useExportScreeningMutation();
  const [runScreening] = useRunScreeningMutation();
  const [shortlistSize, setShortlistSize] = useState<10 | 20>(10);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  useEffect(() => {
    const raw = localStorage.getItem(`screening-decisions:${screeningId}`);
    if (raw) setDecisions(JSON.parse(raw) as Record<string, Decision>);
  }, [screeningId]);

  useEffect(() => {
    localStorage.setItem(`screening-decisions:${screeningId}`, JSON.stringify(decisions));
  }, [decisions, screeningId]);

  const profileById = useMemo(() => {
    const map = new Map<string, Applicant>();
    (applicantsData?.applicants ?? []).forEach((applicant) => {
      map.set(applicant._id, applicant);
    });
    return map;
  }, [applicantsData?.applicants]);

  const candidates = useMemo(() => {
    const ranked = resultsData?.ranked ?? [];
    return ranked
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .slice(0, shortlistSize)
      .map((r) => {
        const applicantId = String(r.applicant?._id ?? "");
        const nameParts = (r.applicant?.parsed_profile?.name ?? "Unknown Candidate").split(" ");
        const firstName = nameParts[0] ?? "Unknown";
        const lastName = nameParts.slice(1).join(" ") || "";
        const skills = r.applicant?.parsed_profile?.skills ?? [];
        const email = r.applicant?.parsed_profile?.email ?? profileById.get(applicantId)?.profile.email ?? "";
        const embedded = { firstName, lastName, title: "", skills };
        const candidate = {
          rank: r.rank,
          screeningKind: r.screening_kind,
          candidateId: applicantId,
          applicantId,
          totalScore: r.composite_score,
          strengths: r.strengths,
          gaps: r.gaps,
          recommendation: r.recommendation,
          scoreBreakdownPoints: r.score_breakdown_points,
          relevanceSummary: r.reasoning_detail?.relevanceSummary,
          hiringRisk: r.reasoning_detail?.hiringRisk,
          aiRecommendationFull: r.reasoning_detail?.recommendation ?? r.recommendation,
          email,
          breakdown: {
            skillsMatch: r.dimension_scores.skills,
            experienceMatch: r.dimension_scores.experience,
            educationMatch: r.dimension_scores.education,
            culturalFit: r.dimension_scores.cultural_fit,
            additionalAssets: r.dimension_scores.additional_assets ?? 0,
          },
        };
        return { candidate, applicant: profileById.get(applicantId), embedded };
      });
  }, [resultsData?.ranked, shortlistSize, profileById]);

  const shortlistedCount = candidates.length;
  const totalAnalyzed = resultsData?.meta?.totalCandidatesScreened ?? resultsData?.ranked?.length ?? 0;
  const pooledAvg = resultsData?.meta?.averageScore;
  const averageScore =
    pooledAvg != null && !Number.isNaN(Number(pooledAvg))
      ? Math.round(Number(pooledAvg))
      : candidates.length > 0
        ? Math.round(candidates.reduce((sum, c) => sum + c.candidate.totalScore, 0) / candidates.length)
        : 0;
  const approvedCount = Object.values(decisions).filter((v) => v === "approved").length;
  const hasShortlist = candidates.length > 0;

  const exportCsv = async () => {
    try {
      const blob = await exportScreening({ id: screeningId, format: "csv" }).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shortlist-${screeningId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Shortlist exported.");
    } catch {
      toast.error("Could not export CSV.");
    }
  };

  const rerun = async () => {
    if (!jobId) return;
    try {
      const res = await runScreening({ jobId: String(jobId), shortlistSize }).unwrap();
      toast.success("New screening started.");
      router.push(`/screenings/${res.screeningId}`);
    } catch (error) {
      toast.error((error as { data?: { error?: string } })?.data?.error ?? "Could not re-run screening.");
    }
  };

  if (!screeningId) return null;

  if (!statusData && !isLive) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading screening…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          <Link href="/dashboard" className="hover:underline">Home</Link>{" "}
          /{" "}
          <Link href="/screenings" className="hover:underline">Screenings</Link>
          {job ? ` / ${job.title}` : ""}
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader
            title={job?.title ?? "Screening Result"}
            subtitle={`${totalAnalyzed} candidates analyzed${
              resultsData?.meta?.screenedAt ? ` · ${new Date(resultsData.meta.screenedAt).toLocaleString()}` : ""
            }`}
          />
          <div className="flex flex-wrap gap-2">
            <Link href="/screenings">
              <Button variant="secondary" type="button">Back to Screenings</Button>
            </Link>
            <Button variant="secondary" type="button" onClick={() => void exportCsv()} disabled={!hasShortlist || isFailed}>
              <Download className="h-4 w-4" />
              Export Shortlist
            </Button>
            <Button variant="secondary" type="button" onClick={() => void rerun()} disabled={!jobId}>
              <RefreshCw className="h-4 w-4" />
              Re-run Screening
            </Button>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700">
              {normalizedStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {isLive ? (
        <Card className="border border-brand-100 bg-brand-50/40">
          <div className="flex items-center gap-3 py-4 text-brand-900">
            <Loader2 className="h-6 w-6 animate-spin" />
            <div>
              <p className="font-semibold">Screening in progress</p>
              <p className="text-sm text-brand-800/90">
                Progress: {statusData?.progress ?? 0}% — results will appear automatically when scoring finishes.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {(isFailed || (isComplete && !hasShortlist && !resultsLoading)) ? (
        <Card className="border border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <TriangleAlert className="h-6 w-6 text-red-600" />
            <p className="text-sm font-semibold text-red-700">
              {isFailed ? (statusData?.error ?? "Screening failed — no results returned.") : "No shortlist available yet."}
              {" "}Try re-running the screening.
            </p>
          </div>
        </Card>
      ) : null}

      {isComplete && hasShortlist ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <p className="text-sm text-slate-500">Total Candidates Analyzed</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{totalAnalyzed}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Shortlisted</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{shortlistedCount}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Average Match Score</p>
              <p className={`mt-2 text-2xl font-bold ${getScoreTone(averageScore)}`}>{averageScore}/100</p>
            </Card>
          </div>

          <div className="flex items-center gap-2">
            {[10, 20].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setShortlistSize(size as 10 | 20)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  shortlistSize === size ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Top {size}
              </button>
            ))}
            <span className="ml-auto text-xs font-medium text-slate-500">{approvedCount} recruiter decisions saved</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {candidates.map(({ candidate, applicant, embedded }) => {
              const id = candidate.candidateId;
              const rankStyle = getRankStyle(candidate.rank);
              const decision = decisions[id];
              const first = embedded.firstName ?? applicant?.profile.firstName ?? "Unknown";
              const last = embedded.lastName ?? applicant?.profile.lastName ?? "";
              const fullName = `${first} ${last}`.trim();
              const email = candidate.email || applicant?.profile.email || "—";
              const pts = candidate.scoreBreakdownPoints;

              return (
                <Card key={id} className={`border-l-4 ${rankStyle.border} ${rankStyle.bg} p-5 shadow-sm`}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${rankStyle.badge} text-sm font-bold text-white`}>
                          #{candidate.rank}
                        </div>
                        <div className="absolute -right-1 -top-1">{rankStyle.icon}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <UserRound className="h-5 w-5 text-brand-600" />
                          <h3 className="text-lg font-semibold text-slate-900">{fullName}</h3>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{email}</p>
                      </div>
                    </div>
                    <div className="min-w-[140px]">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Overall score</p>
                      <ScoreBar value={candidate.totalScore} />
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score breakdown</p>
                    {pts ? (
                      <>
                        <PillarBar label="Skills match (max 35)" value={pts.skillsMatch} max={35} />
                        <PillarBar label="Experience (max 25)" value={pts.experience} max={25} />
                        <PillarBar label="Education (max 15)" value={pts.education} max={15} />
                        <PillarBar label="Role relevance (max 15)" value={pts.roleRelevance} max={15} />
                        <PillarBar label="Additional assets (max 10)" value={pts.additionalAssets} max={10} />
                      </>
                    ) : (
                      <>
                        <PercentBar label="Skills match" value={candidate.breakdown.skillsMatch} />
                        <PercentBar label="Experience" value={candidate.breakdown.experienceMatch} />
                        <PercentBar label="Education" value={candidate.breakdown.educationMatch} />
                        <PercentBar label="Culture / relevance" value={candidate.breakdown.culturalFit} />
                      </>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(candidate.strengths ?? []).slice(0, 8).map((s) => (
                      <span key={s} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-100">
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(candidate.gaps ?? []).slice(0, 6).map((g) => (
                      <span key={g} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-900 ring-1 ring-red-100">
                        {g}
                      </span>
                    ))}
                  </div>

                  {candidate.relevanceSummary ? (
                    <p className="mt-4 text-sm leading-relaxed text-slate-700">{candidate.relevanceSummary}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900 ring-1 ring-brand-100">
                      {candidate.recommendation}
                    </span>
                    {candidate.hiringRisk ? (
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${hiringRiskBadgeClass(candidate.hiringRisk)}`}>
                        Hiring risk: {candidate.hiringRisk}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <Button
                      variant={decision === "approved" ? "primary" : "secondary"}
                      size="sm"
                      type="button"
                      onClick={() => setDecisions((prev) => ({ ...prev, [id]: "approved" }))}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Accept
                    </Button>
                    <Button
                      variant={decision === "rejected" ? "danger" : "secondary"}
                      size="sm"
                      type="button"
                      onClick={() => setDecisions((prev) => ({ ...prev, [id]: "rejected" }))}
                    >
                      <TriangleAlert className="mr-1 h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button
                      variant={decision === "review" ? "primary" : "secondary"}
                      size="sm"
                      type="button"
                      onClick={() => setDecisions((prev) => ({ ...prev, [id]: "review" }))}
                    >
                      <Sparkles className="mr-1 h-3.5 w-3.5" /> Review
                    </Button>
                    <span className="self-center text-[11px] text-slate-500">Decision: {decision ?? "pending"}</span>
                  </div>

                  <details className="mt-4 text-sm text-slate-600">
                    <summary className="cursor-pointer font-medium text-slate-700">Full AI rationale</summary>
                    <p className="mt-2 italic text-slate-600">{candidate.aiRecommendationFull}</p>
                  </details>

                  <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    AI screening supports your decision-making; final hiring choices remain with the recruiter.
                  </p>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
