"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, ChevronDown, Crown, Download, Loader2, RefreshCw, Sparkles, TriangleAlert, UserRound } from "lucide-react";
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

type Decision = "approved" | "rejected";

const getScoreTone = (score: number) => (score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600");
const getScoreBarColor = (score: number) => (score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500");

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

  // Derive jobId from the first ranked applicant
  const jobId = resultsData?.ranked?.[0]?.applicant?.job_id;
  const { data: job } = useGetJobQuery(String(jobId ?? ""), { skip: !jobId });
  const { data: applicantsData } = useGetApplicantsQuery(
    { jobId: String(jobId ?? ""), limit: 500 },
    { skip: !jobId },
  );

  const [exportScreening] = useExportScreeningMutation();
  const [runScreening] = useRunScreeningMutation();
  const [shortlistSize, setShortlistSize] = useState<10 | 20>(10);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
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
        const embedded = { firstName, lastName, title: "", skills };
        const candidate = {
          rank: r.rank,
          candidateId: applicantId,
          applicantId,
          totalScore: r.composite_score,
          strengths: r.strengths,
          gaps: r.gaps,
          recommendation: r.recommendation,
          breakdown: {
            skillsMatch: r.dimension_scores.skills,
            experienceMatch: r.dimension_scores.experience,
            educationMatch: r.dimension_scores.education,
            culturalFit: r.dimension_scores.cultural_fit,
          },
        };
        return { candidate, applicant: profileById.get(applicantId), embedded };
      });
  }, [resultsData?.ranked, shortlistSize, profileById]);

  const shortlistedCount = candidates.length;
  const totalAnalyzed = resultsData?.ranked?.length ?? 0;
  const averageScore =
    candidates.length > 0
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
            subtitle={`${totalAnalyzed} candidates analyzed`}
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
            <span className="ml-auto text-xs font-medium text-slate-500">{approvedCount} approved by recruiter</span>
          </div>

          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Skills</th>
                  <th className="px-4 py-3">Match Score</th>
                  <th className="px-4 py-3">Strengths</th>
                  <th className="px-4 py-3">Gaps</th>
                  <th className="px-4 py-3">Recommendation</th>
                  <th className="px-4 py-3 w-10" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {candidates.map(({ candidate, applicant, embedded }) => {
                  const id = candidate.candidateId;
                  const expanded = expandedIds.includes(id);
                  const rankStyle = getRankStyle(candidate.rank);
                  const decision = decisions[id];
                  const first = embedded.firstName ?? applicant?.profile.firstName ?? "Unknown";
                  const last = embedded.lastName ?? applicant?.profile.lastName ?? "";
                  const fullName = `${first} ${last}`.trim();
                  const skillsArr = embedded.skills ?? applicant?.profile.skills ?? [];
                  const skillsText = skillsArr.slice(0, 6).join(", ") || "—";
                  const strengthsPreview = (candidate.strengths?.length ? candidate.strengths : ["Strong alignment"]).slice(0, 2).join("; ");
                  const gapsPreview = (candidate.gaps?.length ? candidate.gaps : ["No major gaps flagged"]).slice(0, 2).join("; ");
                  const recPreview = candidate.recommendation.length > 120 ? `${candidate.recommendation.slice(0, 120)}…` : candidate.recommendation || "—";

                  return (
                    <Fragment key={id}>
                      <tr
                        className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 ${rankStyle.bg}`}
                        onClick={() => setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
                      >
                        <td className={`border-l-4 px-4 py-3 align-middle ${rankStyle.border}`}>
                          <div className="flex items-center gap-2">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${rankStyle.badge} text-xs font-bold text-white`}>
                              #{candidate.rank}
                            </div>
                            {rankStyle.icon}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                              <UserRound className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-slate-900">{fullName}</span>
                          </div>
                        </td>
                        <td className="max-w-[220px] px-4 py-3 align-middle text-xs text-slate-600">{skillsText}</td>
                        <td className="px-4 py-3 align-middle">
                          <ScoreBar value={candidate.totalScore} />
                        </td>
                        <td className="max-w-[200px] px-4 py-3 align-middle text-xs text-emerald-800">{strengthsPreview}</td>
                        <td className="max-w-[200px] px-4 py-3 align-middle text-xs text-amber-800">{gapsPreview}</td>
                        <td className="max-w-[240px] px-4 py-3 align-middle text-xs italic text-brand-800">{recPreview}</td>
                        <td className="px-4 py-3 align-middle text-slate-400">
                          <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className={`${rankStyle.bg} border-b border-slate-100`}>
                          <td colSpan={8} className="px-4 pb-5 pt-0">
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="mb-4 flex flex-wrap gap-2">
                                <Button
                                  variant={decision === "approved" ? "primary" : "secondary"}
                                  size="sm"
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setDecisions((prev) => ({ ...prev, [id]: "approved" })); }}
                                >
                                  ✓ Approve
                                </Button>
                                <Button
                                  variant={decision === "rejected" ? "danger" : "secondary"}
                                  size="sm"
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setDecisions((prev) => ({ ...prev, [id]: "rejected" })); }}
                                >
                                  ✗ Reject
                                </Button>
                                <span className="self-center text-[11px] text-slate-500">Decision: {decision ?? "pending"}</span>
                              </div>
                              <div className="grid gap-4 lg:grid-cols-3">
                                <div>
                                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                                    <Check className="h-4 w-4" /> Strengths
                                  </p>
                                  <ul className="space-y-1 text-sm text-emerald-700">
                                    {(candidate.strengths.length ? candidate.strengths : ["Strong profile alignment"]).slice(0, 6).map((item) => (
                                      <li key={item}>• {item}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700">
                                    <TriangleAlert className="h-4 w-4" /> Gaps / Risks
                                  </p>
                                  <ul className="space-y-1 text-sm text-amber-700">
                                    {(candidate.gaps.length ? candidate.gaps : ["No major risk signals identified"]).slice(0, 5).map((item) => (
                                      <li key={item}>• {item}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-700">
                                    <Sparkles className="h-4 w-4" /> Recommendation
                                  </p>
                                  <p className="text-sm italic text-brand-700">{candidate.recommendation || "Good candidate for recruiter review."}</p>
                                  <p className="mt-3 text-xs font-semibold text-slate-600">Score breakdown</p>
                                  <ul className="mt-1 space-y-1 text-xs text-slate-600">
                                    <li>Skills: {Math.round(candidate.breakdown.skillsMatch)}</li>
                                    <li>Experience: {Math.round(candidate.breakdown.experienceMatch)}</li>
                                    <li>Education: {Math.round(candidate.breakdown.educationMatch)}</li>
                                    <li>Cultural fit: {Math.round(candidate.breakdown.culturalFit)}</li>
                                  </ul>
                                </div>
                              </div>
                              <p className="mt-4 border-t pt-3 text-xs text-slate-500">
                                AI screening is a decision-support tool. Final hiring decisions remain with the recruiter.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}
    </div>
  );
}
