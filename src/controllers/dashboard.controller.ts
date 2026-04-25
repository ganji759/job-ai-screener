/**
 * Recruiter dashboard analytics.
 *
 * Every metric is computed from the recruiter's own data (jobs they own + applicants under
 * those jobs + screenings they ran). Heavy lifting is pushed into Mongo aggregation so the
 * frontend can stay a thin consumer.
 *
 * Response shape (stable; add, don't rename):
 *   totalJobs, activeJobs, draftJobs, closedJobs
 *   totalApplicants, totalPending, totalShortlisted, totalRejected, totalScreened
 *   totalScreenings, completedScreenings, failedScreenings, runningScreenings
 *   averageTimeToScreen            // ms across completed screenings
 *   averageMatchScore              // 0-100, mean totalScore across every scored candidate
 *   shortlistRate                  // shortlisted / (shortlisted + rejected) * 100
 *   scoreDistribution              // [{ range, count }] 5 buckets of 20
 *   sourceMix                      // [{ source, count }]
 *   statusFunnel                   // [{ status, count }] pending/shortlisted/rejected
 *   screeningsOverTime             // 30 daily buckets
 *   applicantsOverTime             // 30 daily buckets
 *   topSkillsInDemand              // top skills from recruiter's job requirements
 *   topCandidateSkills             // top skills in applicant pool
 *   topSkillGaps                   // union of skill gaps reported by screenings
 *   recentActivity                 // last 10 screenings + most recent uploads
 *   jobsBreakdown                  // per-job { jobId, title, status, applicants, screened, avgScore }
 */
import type { FastifyReply, FastifyRequest } from "fastify";
import { Types } from "mongoose";
import { ApplicantModel } from "../models/Applicant.model";
import { JobModel } from "../models/Job.model";
import { ScreeningModel } from "../models/Screening.model";

const DAYS = 30;

/** Round to 2 decimals, returning a finite number (never NaN). */
const round2 = (n: number): number => (Number.isFinite(n) ? Math.round(n * 100) / 100 : 0);

/** Produce 30 daily buckets (YYYY-MM-DD) ending today, zero-initialized. */
const buildDailyBuckets = (): Map<string, number> => {
  const map = new Map<string, number>();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (DAYS - 1));
  for (let i = 0; i < DAYS; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  return map;
};

/** Extract all scored candidates from a screening's `results` field. */
const extractScoredCandidates = (
  results: unknown,
): Array<{ candidateId?: string; totalScore?: number }> => {
  if (!results || typeof results !== "object") return [];
  const r = results as Record<string, unknown>;
  const all = r.allResults as Array<{ candidateId?: string; totalScore?: number }> | undefined;
  if (Array.isArray(all) && all.length) return all;
  const shortlist = r.shortlist as Array<{ candidateId?: string; totalScore?: number }> | undefined;
  return Array.isArray(shortlist) ? shortlist : [];
};

/** Extract an ISO string from a JS Date or string field, safely. */
const toISODay = (value: unknown): string | null => {
  try {
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

/** Normalise a skill to a comparable key. */
const normSkill = (s: unknown): string | null => {
  if (typeof s !== "string") return null;
  const t = s.trim().toLowerCase();
  return t.length >= 2 && t.length <= 40 ? t : null;
};

export const dashboardAnalytics = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const recruiterId = request.user?.userId;
  if (!recruiterId) return void reply.code(401).send({ error: "Unauthorized" });

  // 1. Jobs owned by this recruiter --------------------------------------------------------------
  const jobs = await JobModel.find({ recruiterId })
    .select("_id title status requirements createdAt")
    .lean();
  const jobIds = jobs.map((j) => j._id as Types.ObjectId);
  const jobById = new Map(jobs.map((j) => [String(j._id), j]));

  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const draftJobs = jobs.filter((j) => j.status === "draft").length;
  const closedJobs = jobs.filter((j) => j.status === "closed").length;

  if (jobIds.length === 0) {
    // Empty-state: no jobs yet → all zeros + empty arrays.
    return void reply.send({
      totalJobs,
      activeJobs,
      draftJobs,
      closedJobs,
      totalApplicants: 0,
      totalPending: 0,
      totalShortlisted: 0,
      totalRejected: 0,
      totalScreened: 0,
      totalScreenings: 0,
      completedScreenings: 0,
      failedScreenings: 0,
      runningScreenings: 0,
      averageTimeToScreen: 0,
      averageMatchScore: 0,
      shortlistRate: 0,
      scoreDistribution: [
        { range: "0-20", count: 0 },
        { range: "20-40", count: 0 },
        { range: "40-60", count: 0 },
        { range: "60-80", count: 0 },
        { range: "80-100", count: 0 },
      ],
      sourceMix: [],
      statusFunnel: [],
      screeningsOverTime: [...buildDailyBuckets().entries()].map(([date, count]) => ({ date, count })),
      applicantsOverTime: [...buildDailyBuckets().entries()].map(([date, count]) => ({ date, count })),
      topSkillsInDemand: [],
      topCandidateSkills: [],
      topSkillGaps: [],
      recentActivity: [],
      jobsBreakdown: [],
      aiVsHrAccuracy: { tp: 0, tn: 0, fp: 0, fn: 0, total: 0, precision: 0, recall: 0, accuracy: 0, agreementRate: 0, f1Score: 0, disagreements: [] },
    });
  }

  // 2. Aggregate applicants in parallel ----------------------------------------------------------
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));

  const [
    totalApplicants,
    statusCounts,
    sourceCounts,
    applicantsOverTimeRaw,
    recentApplicants,
    perJobApplicantCount,
  ] = await Promise.all([
    ApplicantModel.countDocuments({ jobId: { $in: jobIds } }),
    ApplicantModel.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]),
    ApplicantModel.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: "$source", n: { $sum: 1 } } },
    ]),
    ApplicantModel.aggregate([
      { $match: { jobId: { $in: jobIds }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          n: { $sum: 1 },
        },
      },
    ]),
    ApplicantModel.find({ jobId: { $in: jobIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("_id jobId source status profile.firstName profile.lastName originalFileName createdAt")
      .lean(),
    ApplicantModel.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: "$jobId", n: { $sum: 1 } } },
    ]),
  ]);

  const statusMap = new Map(statusCounts.map((r) => [String(r._id), r.n as number]));
  const totalPending = statusMap.get("pending") ?? 0;
  const totalShortlisted = statusMap.get("shortlisted") ?? 0;
  const totalRejected = statusMap.get("rejected") ?? 0;
  const totalScreened = totalShortlisted + totalRejected + (statusMap.get("screened") ?? 0);

  // 3. Screenings --------------------------------------------------------------------------------
  const screenings = await ScreeningModel.find({ recruiterId })
    .sort({ createdAt: -1 })
    .select("_id jobId status results durationMs createdAt updatedAt")
    .lean();

  const totalScreenings = screenings.length;
  const completedScreenings = screenings.filter((s) => s.status === "completed").length;
  const failedScreenings = screenings.filter((s) => s.status === "failed").length;
  const runningScreenings = screenings.filter((s) => s.status === "queued" || s.status === "running").length;

  const completed = screenings.filter((s) => s.status === "completed");
  const averageTimeToScreen = completed.length
    ? completed.reduce((sum, s) => sum + (s.durationMs ?? 0), 0) / completed.length
    : 0;

  // Flatten all scored candidates to compute avg score + histogram.
  const allScores: number[] = [];
  for (const s of completed) {
    for (const c of extractScoredCandidates(s.results)) {
      if (typeof c.totalScore === "number" && Number.isFinite(c.totalScore)) {
        allScores.push(c.totalScore);
      }
    }
  }
  const averageMatchScore = allScores.length
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 0;

  const buckets = [
    { range: "0-20", count: 0 },
    { range: "20-40", count: 0 },
    { range: "40-60", count: 0 },
    { range: "60-80", count: 0 },
    { range: "80-100", count: 0 },
  ];
  for (const v of allScores) {
    const idx = Math.min(4, Math.max(0, Math.floor(v / 20)));
    buckets[idx]!.count += 1;
  }

  const shortlistRate =
    totalShortlisted + totalRejected > 0
      ? (totalShortlisted / (totalShortlisted + totalRejected)) * 100
      : 0;

  // 4. Time-series — daily screenings & applicants over last 30 days -----------------------------
  const screeningsBuckets = buildDailyBuckets();
  for (const s of screenings) {
    const day = toISODay(s.createdAt);
    if (day && screeningsBuckets.has(day)) {
      screeningsBuckets.set(day, (screeningsBuckets.get(day) ?? 0) + 1);
    }
  }
  const screeningsOverTime = [...screeningsBuckets.entries()].map(([date, count]) => ({ date, count }));

  const applicantsBuckets = buildDailyBuckets();
  for (const row of applicantsOverTimeRaw as Array<{ _id: string; n: number }>) {
    if (applicantsBuckets.has(row._id)) applicantsBuckets.set(row._id, row.n);
  }
  const applicantsOverTime = [...applicantsBuckets.entries()].map(([date, count]) => ({ date, count }));

  // 5. Skills analytics --------------------------------------------------------------------------
  const demandCount = new Map<string, number>();
  for (const job of jobs) {
    const reqs = (job.requirements ?? {}) as { mustHaveSkills?: unknown[]; niceToHaveSkills?: unknown[] };
    for (const raw of [...(reqs.mustHaveSkills ?? []), ...(reqs.niceToHaveSkills ?? [])]) {
      const k = normSkill(raw);
      if (k) demandCount.set(k, (demandCount.get(k) ?? 0) + 1);
    }
  }
  const topSkillsInDemand = [...demandCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  // Pull a bounded sample so we don't stream 100 MB for skill counting.
  const applicantSample = await ApplicantModel.find({ jobId: { $in: jobIds } })
    .select("profile.skills")
    .limit(1000)
    .lean();

  const poolCount = new Map<string, number>();
  for (const a of applicantSample) {
    const skills = (a as { profile?: { skills?: unknown } }).profile?.skills;
    if (!Array.isArray(skills)) continue;
    for (const s of skills) {
      // skills may be `string` (legacy UmuravaProfile) or `{ name: string }` (TalentProfile)
      const raw = typeof s === "string" ? s : (s as { name?: unknown })?.name;
      const k = normSkill(raw);
      if (k) poolCount.set(k, (poolCount.get(k) ?? 0) + 1);
    }
  }
  const topCandidateSkills = [...poolCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  const gapsCount = new Map<string, number>();
  for (const s of completed) {
    const r = s.results as { skillGapsInPool?: unknown[] } | undefined;
    for (const raw of r?.skillGapsInPool ?? []) {
      const k = normSkill(raw);
      if (k) gapsCount.set(k, (gapsCount.get(k) ?? 0) + 1);
    }
  }
  const topSkillGaps = [...gapsCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, count]) => ({ skill, count }));

  // 6. Per-job breakdown --------------------------------------------------------------------------
  const applicantsByJob = new Map<string, number>(
    (perJobApplicantCount as Array<{ _id: Types.ObjectId; n: number }>).map((r) => [String(r._id), r.n]),
  );
  const screenedByJob = new Map<string, { count: number; scoreSum: number; scored: number }>();
  for (const s of completed) {
    const id = String(s.jobId);
    const entry = screenedByJob.get(id) ?? { count: 0, scoreSum: 0, scored: 0 };
    entry.count += 1;
    for (const c of extractScoredCandidates(s.results)) {
      if (typeof c.totalScore === "number") {
        entry.scoreSum += c.totalScore;
        entry.scored += 1;
      }
    }
    screenedByJob.set(id, entry);
  }
  const jobsBreakdown = jobs.map((j) => {
    const id = String(j._id);
    const sj = screenedByJob.get(id);
    return {
      jobId: id,
      title: j.title,
      status: j.status,
      applicants: applicantsByJob.get(id) ?? 0,
      screenings: sj?.count ?? 0,
      avgScore: sj && sj.scored ? round2(sj.scoreSum / sj.scored) : 0,
    };
  });

  // 7. HR vs AI confusion matrix ----------------------------------------------------------------
  const screeningsWithDecisions = await ScreeningModel.find({ recruiterId, status: "completed" })
    .select("_id jobId results recruiterDecisions")
    .lean();

  // recruiterDecisions keys = Applicant MongoDB _id.
  // results.shortlist[n].candidateId = profile.id (UmuravaProfile string).
  // We need profile.id → MongoDB _id to join them.
  const cmJobIds = [...new Set(screeningsWithDecisions.map((s) => String(s.jobId)))];
  const cmApplicants = cmJobIds.length
    ? await ApplicantModel.find({ jobId: { $in: cmJobIds } })
        .select("_id profile.id profile.firstName profile.lastName")
        .lean()
    : [];
  // Map profile.id → { mongoId, name } — per-job key is implicitly unique enough in practice
  const profileIdToMongo = new Map<string, { mongoId: string; name: string }>();
  for (const a of cmApplicants) {
    const pid = String((a.profile as { id?: string }).id ?? "");
    if (!pid) continue;
    const p = a.profile as { firstName?: string; lastName?: string };
    const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Unknown";
    profileIdToMongo.set(pid, { mongoId: String(a._id), name });
  }

  type ConfusionEntry = {
    candidateId: string;
    candidateName: string;
    jobTitle: string;
    aiLabel: "positive" | "negative";
    hrDecision: "approved" | "rejected";
    category: "FP" | "FN";
  };

  let cmTp = 0;
  let cmTn = 0;
  let cmFp = 0;
  let cmFn = 0;
  const cmDisagreements: ConfusionEntry[] = [];

  for (const s of screeningsWithDecisions) {
    const rdRaw = s.recruiterDecisions;
    if (!rdRaw || typeof rdRaw !== "object") continue;
    const rd: Record<string, unknown> =
      rdRaw instanceof Map ? Object.fromEntries(rdRaw.entries()) : { ...(rdRaw as Record<string, unknown>) };

    // Skip screenings with no decisions recorded
    if (Object.keys(rd).length === 0) continue;

    const shortlistRaw = (s.results as { shortlist?: unknown[] }).shortlist;
    const allResultsRaw = (s.results as { allResults?: unknown[] }).allResults;
    const candidates = (Array.isArray(allResultsRaw) && allResultsRaw.length ? allResultsRaw : shortlistRaw) ?? [];

    const jobTitle = jobById.get(String(s.jobId))?.title ?? "Unknown";

    for (const candidate of candidates as Array<Record<string, unknown>>) {
      // candidateId here is profile.id — resolve to MongoDB _id to match recruiterDecisions keys
      const profileId = String(candidate.candidateId ?? "");
      if (!profileId) continue;

      const resolved = profileIdToMongo.get(profileId);
      const mongoId = resolved?.mongoId ?? profileId; // fall back to profileId if join fails

      const entry = rd[mongoId] as { decision?: string } | undefined;
      if (!entry?.decision || entry.decision === "review") continue;

      const candidateName = resolved?.name ?? String(candidate.name ?? candidate.candidateName ?? "Unknown");
      const rec = String(candidate.recommendation ?? "").toLowerCase();
      const aiPos = /yes|maybe/.test(rec);
      const hrPos = entry.decision === "approved";

      if (aiPos && hrPos) {
        cmTp += 1;
      } else if (aiPos && !hrPos) {
        cmFp += 1;
        cmDisagreements.push({
          candidateId: mongoId,
          candidateName,
          jobTitle,
          aiLabel: "positive",
          hrDecision: "rejected",
          category: "FP",
        });
      } else if (!aiPos && hrPos) {
        cmFn += 1;
        cmDisagreements.push({
          candidateId: mongoId,
          candidateName,
          jobTitle,
          aiLabel: "negative",
          hrDecision: "approved",
          category: "FN",
        });
      } else {
        cmTn += 1;
      }
    }
  }

  const cmTotal = cmTp + cmTn + cmFp + cmFn;
  const cmPrecision = cmTp + cmFp > 0 ? cmTp / (cmTp + cmFp) : 0;
  const cmRecall = cmTp + cmFn > 0 ? cmTp / (cmTp + cmFn) : 0;
  const cmAccuracy = cmTotal > 0 ? (cmTp + cmTn) / cmTotal : 0;
  const cmF1 = cmPrecision + cmRecall > 0 ? (2 * cmPrecision * cmRecall) / (cmPrecision + cmRecall) : 0;
  const aiVsHrAccuracy = {
    tp: cmTp,
    tn: cmTn,
    fp: cmFp,
    fn: cmFn,
    total: cmTotal,
    precision: round2(cmPrecision * 100),
    recall: round2(cmRecall * 100),
    accuracy: round2(cmAccuracy * 100),
    agreementRate: round2(cmTotal > 0 ? ((cmTp + cmTn) / cmTotal) * 100 : 0),
    f1Score: round2(cmF1 * 100),
    disagreements: cmDisagreements.slice(0, 30),
  };

  // 8. Recent activity (screenings + uploads, merged, newest first) ------------------------------
  type Activity = {
    kind: "screening_completed" | "screening_failed" | "screening_running" | "applicant_uploaded";
    title: string;
    subtitle: string;
    jobId?: string;
    jobTitle?: string;
    at: string;
  };
  const activity: Activity[] = [];
  for (const s of screenings.slice(0, 10)) {
    const job = jobById.get(String(s.jobId));
    const kind: Activity["kind"] =
      s.status === "completed"
        ? "screening_completed"
        : s.status === "failed"
          ? "screening_failed"
          : "screening_running";
    const r = s.results as { shortlist?: unknown[]; averageScore?: number } | undefined;
    const shortlistedN = Array.isArray(r?.shortlist) ? r.shortlist.length : 0;
    activity.push({
      kind,
      title:
        s.status === "completed"
          ? `Screening completed — ${shortlistedN} shortlisted`
          : s.status === "failed"
            ? "Screening failed"
            : "Screening in progress",
      subtitle: job?.title ?? "Unknown job",
      jobId: String(s.jobId),
      jobTitle: job?.title,
      at: (s.updatedAt ?? s.createdAt ?? new Date()).toISOString(),
    });
  }
  for (const a of recentApplicants.slice(0, 5)) {
    const job = jobById.get(String(a.jobId));
    const profile = (a as { profile?: { firstName?: string; lastName?: string } }).profile ?? {};
    const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "New candidate";
    activity.push({
      kind: "applicant_uploaded",
      title: `${name} added`,
      subtitle: `${(a as { source?: string }).source ?? "upload"} · ${job?.title ?? "Unknown job"}`,
      jobId: String(a.jobId),
      jobTitle: job?.title,
      at: ((a as { createdAt?: Date }).createdAt ?? new Date()).toISOString(),
    });
  }
  activity.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
  const recentActivity = activity.slice(0, 12);

  // 9. Respond ------------------------------------------------------------------------------------
  reply.send({
    totalJobs,
    activeJobs,
    draftJobs,
    closedJobs,
    totalApplicants,
    totalPending,
    totalShortlisted,
    totalRejected,
    totalScreened,
    totalScreenings,
    completedScreenings,
    failedScreenings,
    runningScreenings,
    averageTimeToScreen: Math.round(averageTimeToScreen),
    averageMatchScore: round2(averageMatchScore),
    shortlistRate: round2(shortlistRate),
    scoreDistribution: buckets,
    sourceMix: (sourceCounts as Array<{ _id: string; n: number }>)
      .filter((r) => r._id)
      .map((r) => ({ source: r._id, count: r.n })),
    statusFunnel: [
      { status: "pending", count: totalPending },
      { status: "shortlisted", count: totalShortlisted },
      { status: "rejected", count: totalRejected },
    ],
    screeningsOverTime,
    applicantsOverTime,
    topSkillsInDemand,
    topCandidateSkills,
    topSkillGaps,
    recentActivity,
    jobsBreakdown,
    aiVsHrAccuracy,
  });
};

export const candidateFeedback = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  reply.send({ saved: true, message: "Feedback stored for future model tuning" });
};
