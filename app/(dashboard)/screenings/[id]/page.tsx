"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Bot, Check, Crown, Download, Loader2, RefreshCw, TriangleAlert, UserRound } from "lucide-react";
import {
  useExportScreeningMutation,
  useGetScreeningResultsQuery,
  useGetScreeningStatusQuery,
  useRunScreeningMutation,
  useSaveRecruiterDecisionsMutation,
} from "../../../../store/api/screeningsApi";
import { getRtkQueryErrorMessage } from "../../../../lib/rtkError";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Modal } from "../../../../components/ui/Modal";
import { useGetJobQuery } from "../../../../store/api/jobsApi";
import { useGetApplicantsQuery } from "../../../../store/api/applicantsApi";
import toast from "react-hot-toast";
import Link from "next/link";
import type { Applicant } from "../../../../types";
import { AcceptanceOutreachPanel } from "../../../../components/screenings/AcceptanceOutreachPanel";
import { AiChatModal } from "../../../../components/screenings/AiChatModal";

type Decision = "approved" | "rejected" | "review";

/** Persisted per candidate after HR confirms with a note in the modal. */
type SavedRecruiterDecision = {
  decision: Decision;
  /** Human-written rationale. Required for Approve / Reject; optional for Review. */
  hrNote: string;
  decidedAt: string;
  /** Snapshot of the model label at save time (e.g. "Strong Yes"). */
  aiLabel: string;
  congratsEmailSentAt?: string;
  rejectionEmailSentAt?: string;
};

const HR_NOTE_MIN = 8;

const normalizeStoredDecisions = (raw: unknown): Record<string, SavedRecruiterDecision> => {
  if (raw == null || typeof raw !== "object") return {};
  const out: Record<string, SavedRecruiterDecision> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === "approved" || v === "rejected" || v === "review") {
      out[k] = {
        decision: v,
        hrNote: "",
        decidedAt: new Date(0).toISOString(),
        aiLabel: "—",
      };
    } else if (v && typeof v === "object" && "decision" in v) {
      const o = v as Partial<SavedRecruiterDecision>;
      if (o.decision === "approved" || o.decision === "rejected" || o.decision === "review") {
        out[k] = {
          decision: o.decision,
          hrNote: typeof o.hrNote === "string" ? o.hrNote : "",
          decidedAt: typeof o.decidedAt === "string" ? o.decidedAt : new Date().toISOString(),
          aiLabel: typeof o.aiLabel === "string" ? o.aiLabel : "—",
          congratsEmailSentAt: typeof o.congratsEmailSentAt === "string" ? o.congratsEmailSentAt : undefined,
          rejectionEmailSentAt: typeof o.rejectionEmailSentAt === "string" ? o.rejectionEmailSentAt : undefined,
        };
      }
    }
  }
  return out;
};

type ConfirmModal = {
  candidateId: string;
  fullName: string;
  decision: Decision;
  aiLabel: string;
} | null;

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
  const [saveRecruiterDecisions, { isLoading: savingDecision }] = useSaveRecruiterDecisionsMutation();
  const [shortlistSize, setShortlistSize] = useState<10 | 20>(10);
  const [decisions, setDecisions] = useState<Record<string, SavedRecruiterDecision>>({});
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>(null);
  const [hrNoteDraft, setHrNoteDraft] = useState("");
  const [aiChatTarget, setAiChatTarget] = useState<{
    candidateId: string; candidateName: string; aiRecommendation: string; totalScore: number;
  } | null>(null);

  /** Server decisions win when any exist; else hydrate from local storage (pre-server saves). */
  useEffect(() => {
    if (!isComplete || !screeningId) return;
    const fromServer = resultsData?.meta?.recruiterDecisions;
    const hasServer = fromServer && typeof fromServer === "object" && Object.keys(fromServer as object).length > 0;
    if (hasServer) {
      setDecisions(normalizeStoredDecisions(fromServer));
      return;
    }
    const raw = localStorage.getItem(`screening-decisions:${screeningId}`);
    if (raw) {
      try {
        setDecisions(normalizeStoredDecisions(JSON.parse(raw)));
      } catch {
        setDecisions({});
      }
    } else {
      setDecisions({});
    }
  }, [isComplete, screeningId, resultsData?.meta?.recruiterDecisions]);

  useEffect(() => {
    if (!screeningId) return;
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
  const approvedForOutreach = useMemo(() => {
    return candidates
      .filter(({ candidate }) => decisions[candidate.candidateId]?.decision === "approved")
      .map(({ candidate, applicant, embedded }) => {
        const id = candidate.candidateId;
        const saved = decisions[id];
        const first = embedded.firstName ?? applicant?.profile.firstName ?? "Unknown";
        const last = embedded.lastName ?? applicant?.profile.lastName ?? "";
        return {
          id,
          name: `${first} ${last}`.trim(),
          email: candidate.email || String(applicant?.profile.email ?? ""),
          congratsEmailSentAt: saved?.congratsEmailSentAt,
        };
      });
  }, [candidates, decisions]);
  const totalAnalyzed = resultsData?.meta?.totalCandidatesScreened ?? resultsData?.ranked?.length ?? 0;
  const pooledAvg = resultsData?.meta?.averageScore;
  const averageScore =
    pooledAvg != null && !Number.isNaN(Number(pooledAvg))
      ? Math.round(Number(pooledAvg))
      : candidates.length > 0
        ? Math.round(candidates.reduce((sum, c) => sum + c.candidate.totalScore, 0) / candidates.length)
        : 0;
  const approvedCount = Object.values(decisions).filter((v) => v.decision === "approved").length;
  const decisionCount = Object.values(decisions).length;
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

  const openDecisionModal = (candidateId: string, fullName: string, decision: Decision, aiLabel: string) => {
    setConfirmModal({ candidateId, fullName, decision, aiLabel });
    const prev = decisions[candidateId];
    setHrNoteDraft(prev?.hrNote?.trim() ? prev.hrNote : "");
  };

  const submitHrDecision = async () => {
    if (!confirmModal) return;
    const { decision, candidateId, aiLabel } = confirmModal;
    const note = hrNoteDraft.trim();
    if (decision !== "review" && note.length < HR_NOTE_MIN) {
      toast.error(
        `Add an HR note (at least ${HR_NOTE_MIN} characters) explaining your ${
          decision === "approved" ? "accept" : "reject"
        } decision.`,
      );
      return;
    }
    if (decision === "review" && note.length > 0 && note.length < HR_NOTE_MIN) {
      toast.error(`If you add a note, use at least ${HR_NOTE_MIN} characters.`);
      return;
    }
    const record: SavedRecruiterDecision = {
      decision,
      hrNote: note,
      decidedAt: new Date().toISOString(),
      aiLabel,
    };
    const previous = decisions[candidateId];
    setDecisions((prev) => ({ ...prev, [candidateId]: record }));
    setConfirmModal(null);
    try {
      const res = await saveRecruiterDecisions({
        id: screeningId,
        body: {
          [candidateId]: {
            decision: record.decision,
            hrNote: record.hrNote,
            decidedAt: record.decidedAt,
            aiLabel: record.aiLabel,
          },
        },
      }).unwrap();
      const fromApi = (res as { recruiterDecisions?: unknown })?.recruiterDecisions;
      if (fromApi && typeof fromApi === "object") {
        setDecisions(normalizeStoredDecisions(fromApi));
      }
      toast.success("HR decision saved.");
    } catch (err) {
      setDecisions((prev) => {
        const next = { ...prev };
        if (previous) next[candidateId] = previous;
        else delete next[candidateId];
        return next;
      });
      toast.error(getRtkQueryErrorMessage(err, "Could not save HR decision."));
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
            <span className="ml-auto text-xs font-medium text-slate-500">
              {decisionCount} HR decision{decisionCount === 1 ? "" : "s"} recorded
              {approvedCount > 0 ? ` · ${approvedCount} approved` : ""}
            </span>
          </div>

          {approvedForOutreach.length > 0 ? (
            <AcceptanceOutreachPanel screeningId={screeningId} jobTitle={job?.title} approved={approvedForOutreach} />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {candidates.map(({ candidate, applicant, embedded }) => {
              const id = candidate.candidateId;
              const rankStyle = getRankStyle(candidate.rank);
              const saved = decisions[id];
              const decision = saved?.decision;
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

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-violet-200/80 bg-violet-50/60 p-3 dark:border-violet-800/50 dark:bg-violet-950/30">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">AI decision</p>
                      <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {candidate.recommendation || "—"}
                      </p>
                      {candidate.hiringRisk ? (
                        <p className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${hiringRiskBadgeClass(candidate.hiringRisk)}`}>
                          Hiring risk: {candidate.hiringRisk}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/50">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Your HR decision</p>
                      {saved ? (
                        <div className="mt-1.5 space-y-1.5 text-sm text-slate-800 dark:text-slate-200">
                          <p>
                            <span className="font-semibold capitalize text-brand-800 dark:text-brand-200">{saved.decision}</span>
                            {saved.decidedAt ? (
                              <span className="ml-1.5 text-xs font-normal text-slate-500">
                                · {new Date(saved.decidedAt).toLocaleString()}
                              </span>
                            ) : null}
                          </p>
                          {saved.hrNote ? (
                            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                              {saved.hrNote}
                            </p>
                          ) : saved.decision === "review" ? (
                            <p className="text-xs italic text-slate-500">No note (review queue only)</p>
                          ) : null}
                          {saved.decision === "approved" && saved.congratsEmailSentAt ? (
                            <p className="text-xs text-emerald-700 dark:text-emerald-400">
                              Congratulations email sent {new Date(saved.congratsEmailSentAt).toLocaleString()}.
                            </p>
                          ) : null}
                          {saved.decision === "rejected" ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {saved.rejectionEmailSentAt
                                ? `Standard rejection email sent ${new Date(saved.rejectionEmailSentAt).toLocaleString()}.`
                                : "If an email address is on file, a standard rejection email is sent automatically when you save this decision."}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-1.5 text-sm text-slate-500">Select an action below and confirm with your note.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
                    <Button
                      variant={decision === "approved" ? "primary" : "secondary"}
                      size="sm"
                      type="button"
                      onClick={() => openDecisionModal(id, fullName, "approved", String(candidate.recommendation ?? "—"))}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Accept
                    </Button>
                    <Button
                      variant={decision === "rejected" ? "danger" : "secondary"}
                      size="sm"
                      type="button"
                      onClick={() => openDecisionModal(id, fullName, "rejected", String(candidate.recommendation ?? "—"))}
                    >
                      <TriangleAlert className="mr-1 h-3.5 w-3.5" /> Reject
                    </Button>
                    <button
                      type="button"
                      onClick={() => setAiChatTarget({
                        candidateId: id,
                        candidateName: fullName,
                        aiRecommendation: String(candidate.recommendation ?? "—"),
                        totalScore: candidate.totalScore,
                      })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 hover:border-violet-400"
                    >
                      <Bot className="h-3.5 w-3.5" /> Talk to AI
                    </button>
                    <span className="self-center text-[11px] text-slate-500">Status: {decision ?? "pending HR decision"}</span>
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

      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} size="md">
        {confirmModal ? (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {confirmModal.decision === "approved" && "Confirm — Accept candidate"}
              {confirmModal.decision === "rejected" && "Confirm — Reject candidate"}
              {confirmModal.decision === "review" && "Confirm — Mark for review"}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{confirmModal.fullName}</p>
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-2.5 text-sm dark:border-violet-800 dark:bg-violet-950/40">
              <span className="text-xs font-semibold uppercase text-violet-800 dark:text-violet-200">AI decision (reference)</span>
              <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">{confirmModal.aiLabel}</p>
            </div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="hr-note">
              Your HR note
              {confirmModal.decision === "review" ? (
                <span className="ml-1 font-normal text-slate-500">(optional; add context if you want)</span>
              ) : (
                <span className="ml-1 font-normal text-red-600">(required, min. {HR_NOTE_MIN} characters)</span>
              )}
            </label>
            <textarea
              id="hr-note"
              rows={4}
              value={hrNoteDraft}
              onChange={(e) => setHrNoteDraft(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              placeholder={
                confirmModal.decision === "approved"
                  ? "e.g. Why you agree with the shortlist / conditions for the offer…"
                  : confirmModal.decision === "rejected"
                    ? "e.g. Deal-breakers, missing skills, or culture mismatch…"
                    : "e.g. What the panel should re-check, or when to revisit this profile…"
              }
            />
            <p className="text-xs text-slate-500">
              The AI label above is fixed for this screening run. Your note and decision are stored with the screening and included when you export the shortlist as CSV.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" type="button" onClick={() => setConfirmModal(null)} disabled={savingDecision}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void submitHrDecision()} disabled={savingDecision}>
                {savingDecision ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingDecision ? "Saving…" : "Save HR decision"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {aiChatTarget && (
        <AiChatModal
          screeningId={screeningId}
          candidateId={aiChatTarget.candidateId}
          candidateName={aiChatTarget.candidateName}
          aiRecommendation={aiChatTarget.aiRecommendation}
          totalScore={aiChatTarget.totalScore}
          jobTitle={job?.title ?? "this role"}
          onClose={() => setAiChatTarget(null)}
        />
      )}
    </div>
  );
}
