"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportScreeningExplanations = exports.screeningExplanations = exports.compareCandidates = exports.deleteScreening = exports.exportScreening = exports.screeningHistoryByJob = exports.screeningStatus = exports.getScreening = exports.getScreeningResults = exports.listScreenings = exports.syncExternalScreening = exports.syncPlatformScreening = exports.runScreening = exports.runScreeningForJob = void 0;
const zod_1 = require("zod");
const redis_1 = require("../config/redis");
const Job_model_1 = require("../models/Job.model");
const Screening_model_1 = require("../models/Screening.model");
const Applicant_model_1 = require("../models/Applicant.model");
const queue_service_1 = require("../services/queue.service");
const export_service_1 = require("../services/export.service");
const gemini_service_1 = require("../services/gemini.service");
const screening_service_1 = require("../services/screening.service");
const notification_service_1 = require("../services/notification.service");
const toLowerSkills = (skills) => Array.isArray(skills) ? skills.map((s) => String(s).trim().toLowerCase()).filter(Boolean) : [];
const computeTransparencyScore = (candidate) => {
    const strengthsScore = Math.min((candidate.strengths?.length ?? 0) * 15, 45);
    const gapsScore = (candidate.gaps?.length ?? 0) >= 1 ? 15 : 0;
    const recommendationScore = (candidate.recommendation?.trim().length ?? 0) >= 30 ? 20 : 10;
    const mustHaveCoverage = (candidate.mustHaveSkillsMet?.length ?? 0) + (candidate.mustHaveSkillsMissing?.length ?? 0) > 0 ? 10 : 0;
    const confidenceScore = Math.min(Math.max(candidate.aiConfidenceScore ?? 0, 0), 100) * 0.1;
    return Math.round(Math.min(strengthsScore + gapsScore + recommendationScore + mustHaveCoverage + confidenceScore, 100));
};
const buildWhyNotShortlisted = (profile, requiredSkills, minYearsExperience) => {
    const skills = toLowerSkills(profile.skills);
    const missingSkills = requiredSkills.filter((skill) => !skills.includes(skill.toLowerCase()));
    const totalYears = Number(profile.totalYearsExperience ?? 0);
    const reasons = [];
    if (missingSkills.length > 0) {
        reasons.push(`Missing required skills: ${missingSkills.slice(0, 3).join(", ")}.`);
    }
    if (totalYears < minYearsExperience) {
        reasons.push(`Experience gap: ${totalYears} years vs required ${minYearsExperience} years.`);
    }
    if (reasons.length === 0) {
        reasons.push("Lower overall alignment compared to shortlisted candidates.");
    }
    return reasons.slice(0, 2);
};
const buildScreeningExplanationsData = async (screeningId, recruiterId) => {
    const screening = await Screening_model_1.ScreeningModel.findOne({ _id: screeningId, recruiterId }).lean();
    if (!screening) {
        throw new Error("Screening not found for this recruiter.");
    }
    if (!screening.results) {
        throw new Error("Screening results are not ready yet.");
    }
    const job = await Job_model_1.JobModel.findById(screening.jobId).lean();
    if (!job) {
        throw new Error("Associated job not found.");
    }
    const applicants = await Applicant_model_1.ApplicantModel.find({ screeningId }).lean();
    const applicantByCandidateId = new Map();
    applicants.forEach((applicant) => {
        const profile = applicant.profile;
        applicantByCandidateId.set(String(profile.id ?? ""), profile);
    });
    const shortlisted = screening.results.shortlist.map((candidate) => {
        const profile = applicantByCandidateId.get(String(candidate.candidateId)) ?? {};
        const firstName = String(profile.firstName ?? "Unknown");
        const lastName = String(profile.lastName ?? "Candidate");
        return {
            candidateId: candidate.candidateId,
            candidateName: `${firstName} ${lastName}`.trim(),
            rank: candidate.rank,
            totalScore: candidate.totalScore,
            transparencyScore: computeTransparencyScore(candidate),
            strengths: candidate.strengths,
            gaps: candidate.gaps,
            recommendation: candidate.recommendation,
            mustHaveSkillsMet: candidate.mustHaveSkillsMet,
            mustHaveSkillsMissing: candidate.mustHaveSkillsMissing,
            estimatedOnboardingTime: candidate.estimatedOnboardingTime,
            aiConfidenceScore: candidate.aiConfidenceScore,
        };
    });
    const shortlistedIds = new Set(shortlisted.map((item) => String(item.candidateId)));
    const rejected = applicants
        .filter((applicant) => applicant.status === "rejected")
        .map((applicant) => applicant.profile)
        .filter((profile) => !shortlistedIds.has(String(profile.id ?? "")))
        .map((profile) => ({
        candidateId: String(profile.id ?? ""),
        candidateName: `${String(profile.firstName ?? "Unknown")} ${String(profile.lastName ?? "Candidate")}`.trim(),
        whyNotShortlisted: buildWhyNotShortlisted(profile, Array.isArray(job.requirements?.mustHaveSkills) ? job.requirements.mustHaveSkills : [], Number(job.requirements?.minYearsExperience ?? 0)),
    }));
    return {
        screeningId,
        jobId: String(screening.jobId),
        jobTitle: job.title,
        shortlistExplanations: shortlisted,
        rejectedCandidateInsights: rejected,
        generatedAt: new Date().toISOString(),
    };
};
const executeRunScreening = async (request, reply, jobId, shortlistSize) => {
    const job = await Job_model_1.JobModel.findOne({ _id: jobId, recruiterId: request.user?.userId }).lean();
    if (!job)
        return void reply.code(404).send({ error: "Job not found" });
    const count = await Applicant_model_1.ApplicantModel.countDocuments({ jobId, status: "pending" });
    if (count < shortlistSize)
        return void reply.code(400).send({ error: "Not enough applicants" });
    const active = await Screening_model_1.ScreeningModel.findOne({ jobId, status: { $in: ["queued", "running"] } }).lean();
    if (active)
        return void reply.code(400).send({ error: "Active screening already exists" });
    const screening = await Screening_model_1.ScreeningModel.create({ jobId, recruiterId: request.user?.userId, status: "queued", shortlistSize });
    const qJob = await (0, queue_service_1.addScreeningJob)({ screeningId: String(screening._id), jobId, shortlistSize, recruiterId: request.user?.userId ?? "" });
    await Screening_model_1.ScreeningModel.findByIdAndUpdate(screening._id, { queueJobId: String(qJob.id) });
    if (request.user?.userId) {
        await (0, notification_service_1.notifyUser)({
            userId: request.user.userId,
            title: "Screening queued",
            message: `Screening ${String(screening._id)} started in background.`,
            type: "info",
            sendEmail: true,
        });
    }
    reply.send({ screeningId: screening._id, status: "queued", message: "Screening started" });
};
/** POST /api/v1/jobs/:jobId/screenings — body optional `{ shortlistSize?: 10 | 20 }`, defaults to 10. */
const runScreeningForJob = async (request, reply) => {
    const { jobId } = request.params;
    const parsed = zod_1.z.object({ shortlistSize: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(20)]).optional() }).safeParse(request.body ?? {});
    const shortlistSize = (parsed.success ? parsed.data.shortlistSize ?? 10 : 10);
    return executeRunScreening(request, reply, jobId, shortlistSize);
};
exports.runScreeningForJob = runScreeningForJob;
const runScreening = async (request, reply) => {
    const body = zod_1.z.object({ jobId: zod_1.z.string(), shortlistSize: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(20)]) }).parse(request.body);
    return executeRunScreening(request, reply, body.jobId, body.shortlistSize);
};
exports.runScreening = runScreening;
const mapRecommendationBadge = (text) => {
    const t = text.toLowerCase();
    if ((t.includes("strong") && t.includes("yes")) || t.includes("strong yes"))
        return "Strong Yes";
    if (t.includes("maybe") || t.includes("consider"))
        return "Maybe";
    if (t.includes("not recommended") || (t.includes("no") && !t.includes("know")))
        return "No";
    if (t.includes("yes") || t.includes("recommended") || t.includes("hire"))
        return "Yes";
    return text.trim().slice(0, 120) || "Maybe";
};
/**
 * Synchronous screening (no Redis queue): scores pending applicants matching `applicantExtraFilter`,
 * persists a completed Screening document, updates applicant statuses, caches payload.
 */
const persistSyncScreening = async (request, reply, opts) => {
    const recruiterId = request.user?.userId;
    if (!recruiterId)
        return void reply.code(401).send({ error: "Unauthorized" });
    const job = await Job_model_1.JobModel.findOne({ _id: opts.jobId, recruiterId }).lean();
    if (!job)
        return void reply.code(404).send({ error: "Job not found" });
    const applicants = await Applicant_model_1.ApplicantModel.find({ jobId: opts.jobId, ...opts.applicantExtraFilter }).lean();
    if (!applicants.length) {
        return void reply.code(400).send({ error: "No pending applicants for this screening scenario" });
    }
    const normalizedRequirements = (0, screening_service_1.leanJobToJobRequirements)(job);
    const candidates = applicants.map((a) => a.profile);
    const started = Date.now();
    const results = await (0, gemini_service_1.scoreAllCandidates)(normalizedRequirements, candidates);
    const shortlist = results.slice(0, opts.shortlistSize);
    const insights = await (0, gemini_service_1.generatePoolInsights)(normalizedRequirements, results);
    const screeningDoc = await Screening_model_1.ScreeningModel.create({
        jobId: opts.jobId,
        recruiterId,
        status: "running",
        shortlistSize: opts.shortlistSize,
        pipeline: "external_upload_sync",
    });
    const screeningId = String(screeningDoc._id);
    const payload = {
        screeningKind: "external_upload_sync",
        screeningId,
        jobId: opts.jobId,
        status: "completed",
        shortlistSize: opts.shortlistSize,
        allResults: results,
        shortlist,
        totalAnalyzed: results.length,
        averageScore: insights.averageScore,
        scoreDistribution: insights.scoreDistribution,
        topSkillsFound: insights.topSkillsFound,
        skillGapsInPool: insights.skillGapsInPool,
        durationMs: Date.now() - started,
        createdAt: new Date(),
    };
    await Screening_model_1.ScreeningModel.findByIdAndUpdate(screeningId, { status: "completed", results: payload, durationMs: payload.durationMs });
    const poolIds = applicants.map((a) => a._id);
    const shortlistIds = new Set(shortlist.map((s) => s.candidateId));
    await Applicant_model_1.ApplicantModel.updateMany({ _id: { $in: poolIds }, "profile.id": { $in: [...shortlistIds] } }, { status: "shortlisted", screeningId });
    await Applicant_model_1.ApplicantModel.updateMany({ _id: { $in: poolIds }, "profile.id": { $nin: [...shortlistIds] } }, { status: "rejected", screeningId });
    await (0, redis_1.redisSet)(`screening:${screeningId}`, JSON.stringify(payload), 3600);
    if (request.user?.userId) {
        await (0, notification_service_1.notifyUser)({
            userId: request.user.userId,
            title: "Screening completed",
            message: `Screening ${screeningId} completed. ${shortlist.length} candidates shortlisted.`,
            type: "success",
            sendEmail: true,
        });
    }
    reply.send({ screeningId, status: "completed", message: "Screening completed" });
};
const isPlatformShortlistEntry = (x) => typeof x === "object" &&
    x !== null &&
    "scoreBreakdown" in x &&
    "reasoning" in x &&
    typeof x.scoreBreakdown === "object" &&
    typeof x.reasoning === "object";
/** Persists Scenario 1 — Umurava platform AI screening (35/25/15/15/10 rubric, Gemini). */
const persistUmuravaPlatformScreening = async (request, reply, opts) => {
    const recruiterId = request.user?.userId;
    if (!recruiterId)
        return void reply.code(401).send({ error: "Unauthorized" });
    const started = Date.now();
    let data;
    try {
        data = await (0, screening_service_1.screenFromUmuravaPlatformJob)({
            jobId: opts.jobId,
            recruiterId,
            shortlistSize: opts.shortlistSize,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Umurava platform screening failed";
        request.log.error({ err }, "screenFromUmuravaPlatformJob failed");
        return void reply.code(500).send({
            error: "Screening failed",
            message,
        });
    }
    const { allResults, shortlist, insights, applicantsInPool } = data;
    const screeningDoc = await Screening_model_1.ScreeningModel.create({
        jobId: opts.jobId,
        recruiterId,
        status: "running",
        shortlistSize: opts.shortlistSize,
        pipeline: "umurava_platform_ai",
        totalEvaluated: allResults.length,
        averageScore: insights.averageScore,
    });
    const screeningId = String(screeningDoc._id);
    const payload = {
        screeningKind: "umurava_platform_ai",
        screeningId,
        jobId: opts.jobId,
        status: "completed",
        shortlistSize: opts.shortlistSize,
        topN: opts.shortlistSize,
        allResults,
        shortlist,
        totalAnalyzed: allResults.length,
        totalEvaluated: allResults.length,
        averageScore: insights.averageScore,
        scoreDistribution: insights.scoreDistribution,
        topSkillsFound: insights.topSkillsFound,
        skillGapsInPool: insights.skillGapsInPool,
        durationMs: Date.now() - started,
        createdAt: new Date(),
    };
    await Screening_model_1.ScreeningModel.findByIdAndUpdate(screeningId, {
        status: "completed",
        results: payload,
        durationMs: payload.durationMs,
        totalEvaluated: allResults.length,
        averageScore: insights.averageScore,
    });
    const poolIds = applicantsInPool.map((a) => a._id);
    const shortlistIds = new Set(shortlist.map((s) => s.candidateId));
    await Applicant_model_1.ApplicantModel.updateMany({ _id: { $in: poolIds }, "profile.id": { $in: [...shortlistIds] } }, { status: "shortlisted", screeningId });
    await Applicant_model_1.ApplicantModel.updateMany({ _id: { $in: poolIds }, "profile.id": { $nin: [...shortlistIds] } }, { status: "rejected", screeningId });
    await (0, redis_1.redisSet)(`screening:${screeningId}`, JSON.stringify(payload), 3600);
    if (request.user?.userId) {
        await (0, notification_service_1.notifyUser)({
            userId: request.user.userId,
            title: "Screening completed",
            message: `Screening ${screeningId} completed. ${shortlist.length} candidates shortlisted.`,
            type: "success",
            sendEmail: true,
        });
    }
    reply.send({ screeningId, status: "completed", message: "Screening completed" });
};
const PlatformScreeningBodySchema = zod_1.z
    .object({
    jobId: zod_1.z.string().min(1, "jobId must be a non-empty string"),
    recruiterId: zod_1.z.string().optional(),
    shortlistSize: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(20)]).optional(),
    topN: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(20)]).optional(),
})
    .strip();
/** POST /api/v1/screenings/platform — Umurava DB profiles only (`umurava_platform`, pending). Body matches frontend: `{ jobId, topN | shortlistSize, recruiterId? }`. */
const syncPlatformScreening = async (request, reply) => {
    request.log.info({ body: request.body }, "POST /screenings/platform body");
    const parsed = PlatformScreeningBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
        const flat = parsed.error.flatten();
        return void reply.code(400).send({
            error: "Invalid request body",
            message: "Expected jobId (string) and shortlist size as shortlistSize or topN (10 | 20). recruiterId is optional (ignored; auth token is used).",
            fieldErrors: flat.fieldErrors,
            formErrors: flat.formErrors,
            issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
    }
    const shortlistSize = (parsed.data.shortlistSize ?? parsed.data.topN ?? 10);
    try {
        await persistUmuravaPlatformScreening(request, reply, { jobId: parsed.data.jobId, shortlistSize });
    }
    catch (err) {
        request.log.error({ err }, "syncPlatformScreening");
        const message = err instanceof Error ? err.message : "Screening failed";
        if (!reply.sent) {
            reply.code(500).send({ error: "Screening failed", message });
        }
    }
};
exports.syncPlatformScreening = syncPlatformScreening;
/** POST /api/v1/screenings/external — uploads only (`csv_upload` / `pdf_upload`), pending. */
const syncExternalScreening = async (request, reply) => {
    request.log.info({ body: request.body }, "POST /screenings/external body");
    const parsed = PlatformScreeningBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
        const flat = parsed.error.flatten();
        return void reply.code(400).send({
            error: "Invalid request body",
            message: "Expected jobId (string) and shortlist size as shortlistSize or topN (10 | 20).",
            fieldErrors: flat.fieldErrors,
            formErrors: flat.formErrors,
            issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
    }
    const shortlistSize = (parsed.data.shortlistSize ?? parsed.data.topN ?? 10);
    try {
        await persistSyncScreening(request, reply, {
            jobId: parsed.data.jobId,
            shortlistSize,
            applicantExtraFilter: { source: { $in: ["csv_upload", "pdf_upload"] }, status: "pending" },
        });
    }
    catch (err) {
        request.log.error({ err }, "syncExternalScreening");
        reply.code(400).send({ error: err instanceof Error ? err.message : "Screening failed" });
    }
};
exports.syncExternalScreening = syncExternalScreening;
/** GET /api/v1/screenings — list screenings for the authenticated recruiter (newest first). */
const listScreenings = async (request, reply) => {
    const recruiterId = request.user?.userId;
    if (!recruiterId)
        return void reply.code(401).send({ error: "Unauthorized" });
    const list = await Screening_model_1.ScreeningModel.find({ recruiterId }).sort({ createdAt: -1 }).lean();
    const jobIds = [...new Set(list.map((s) => String(s.jobId)))];
    const jobs = await Job_model_1.JobModel.find({ _id: { $in: jobIds } }).lean();
    const jobById = new Map(jobs.map((j) => [String(j._id), j]));
    const payload = list.map((s) => {
        const job = jobById.get(String(s.jobId));
        const results = s.results;
        const displayStatus = s.status === "queued" || s.status === "running" ? "running" : s.status === "failed" ? "failed" : "completed";
        return {
            _id: String(s._id),
            jobId: String(s.jobId),
            jobTitle: job?.title ?? "Unknown job",
            jobDomain: String(job?.requirements?.domain ?? ""),
            status: s.status,
            displayStatus,
            totalAnalyzed: results?.totalEvaluated ?? results?.totalAnalyzed ?? s.totalEvaluated ?? 0,
            shortlistedCount: Array.isArray(results?.shortlist) ? results.shortlist.length : 0,
            averageScore: results?.averageScore ?? 0,
            createdAt: s.createdAt?.toISOString?.() ?? new Date().toISOString(),
            updatedAt: s.updatedAt?.toISOString?.() ?? new Date().toISOString(),
            durationMs: s.durationMs,
            results: results
                ? {
                    shortlist: results.shortlist,
                    averageScore: results.averageScore ?? 0,
                    topSkillsFound: results.topSkillsFound ?? [],
                    skillGapsInPool: results.skillGapsInPool ?? [],
                }
                : undefined,
        };
    });
    reply.send(payload);
};
exports.listScreenings = listScreenings;
/** GET /api/v1/screenings/:id/results — ranked shortlist shaped for the Next.js dashboard (`ranked`, legacy applicant envelope). */
const getScreeningResults = async (request, reply) => {
    const { id } = request.params;
    const recruiterId = request.user?.userId;
    if (!recruiterId)
        return void reply.code(401).send({ error: "Unauthorized" });
    const screening = await Screening_model_1.ScreeningModel.findOne({ _id: id, recruiterId }).lean();
    if (!screening)
        return void reply.code(404).send({ error: "Screening not found" });
    if (screening.status !== "completed") {
        return void reply.code(400).send({ error: "Screening not complete" });
    }
    const stored = screening.results;
    const shortlist = stored?.shortlist;
    if (!Array.isArray(shortlist) || shortlist.length === 0) {
        return void reply.code(404).send({ error: "No results" });
    }
    const jobIdStr = String(screening.jobId);
    const applicants = await Applicant_model_1.ApplicantModel.find({ jobId: screening.jobId }).lean();
    const byCandidateId = new Map();
    applicants.forEach((a) => {
        const pid = String(a.profile.id ?? a._id);
        byCandidateId.set(pid, a);
    });
    const mapLegacyRow = (cr) => {
        const app = byCandidateId.get(String(cr.candidateId));
        const profile = (app?.profile ?? {});
        const firstName = String(profile.firstName ?? "Unknown");
        const lastName = String(profile.lastName ?? "");
        const email = String(profile.email ?? "");
        const skillsRaw = profile.skills;
        const skills = Array.isArray(skillsRaw) ? skillsRaw.map((s) => String(s)) : [];
        const edu = profile.education;
        let educationSummary = "";
        if (typeof edu === "string")
            educationSummary = edu;
        else if (Array.isArray(edu) && edu[0] && typeof edu[0] === "object") {
            const e0 = edu[0];
            educationSummary = [e0.degree, e0.institution].filter(Boolean).join(" · ");
        }
        const srcRaw = String(app?.source ?? "umurava_platform");
        const legacySource = srcRaw === "csv_upload" ? "upload_csv" : srcRaw === "pdf_upload" ? "resume_pdf" : "umurava_platform";
        return {
            rank: cr.rank,
            screening_kind: "legacy",
            applicant: {
                _id: String(app?._id ?? cr.candidateId),
                job_id: jobIdStr,
                source: legacySource,
                parsed_profile: {
                    name: `${firstName} ${lastName}`.trim() || "Unknown Candidate",
                    email,
                    skills,
                    experience_years: Number(profile.totalYearsExperience ?? 0),
                    education: educationSummary,
                    summary: String(profile.summary ?? ""),
                },
            },
            composite_score: cr.totalScore,
            score_breakdown_points: undefined,
            dimension_scores: {
                skills: cr.breakdown.skillsMatch,
                experience: cr.breakdown.experienceMatch,
                education: cr.breakdown.educationMatch,
                cultural_fit: cr.breakdown.culturalFit,
                additional_assets: 0,
            },
            strengths: cr.strengths,
            gaps: cr.gaps,
            recommendation: mapRecommendationBadge(cr.recommendation),
            reasoning_detail: undefined,
        };
    };
    const ranked = shortlist.map((entry) => {
        if (isPlatformShortlistEntry(entry)) {
            const cr = entry;
            const app = byCandidateId.get(String(cr.candidateId));
            const profile = (app?.profile ?? {});
            const firstName = String(profile.firstName ?? "Unknown");
            const lastName = String(profile.lastName ?? "");
            const email = String(profile.email ?? "");
            const skillsRaw = profile.skills;
            const skills = Array.isArray(skillsRaw) ? skillsRaw.map((s) => String(s)) : [];
            const edu = profile.education;
            let educationSummary = "";
            if (typeof edu === "string")
                educationSummary = edu;
            else if (Array.isArray(edu) && edu[0] && typeof edu[0] === "object") {
                const e0 = edu[0];
                educationSummary = [e0.degree, e0.institution].filter(Boolean).join(" · ");
            }
            const b = cr.scoreBreakdown;
            return {
                rank: cr.rank,
                screening_kind: "umurava_platform_ai",
                applicant: {
                    _id: String(app?._id ?? cr.candidateId),
                    job_id: jobIdStr,
                    source: "umurava_platform",
                    parsed_profile: {
                        name: `${firstName} ${lastName}`.trim() || "Unknown Candidate",
                        email,
                        skills,
                        experience_years: Number(profile.totalYearsExperience ?? 0),
                        education: educationSummary,
                        summary: String(profile.summary ?? ""),
                    },
                },
                composite_score: cr.totalScore,
                score_breakdown_points: b,
                dimension_scores: {
                    skills: (b.skillsMatch / 35) * 100,
                    experience: (b.experience / 25) * 100,
                    education: (b.education / 15) * 100,
                    cultural_fit: (b.roleRelevance / 15) * 100,
                    additional_assets: (b.additionalAssets / 10) * 100,
                },
                strengths: cr.reasoning.strengths,
                gaps: cr.reasoning.gaps,
                recommendation: mapRecommendationBadge(cr.reasoning.recommendation),
                reasoning_detail: {
                    relevanceSummary: cr.reasoning.relevanceSummary,
                    recommendation: cr.reasoning.recommendation,
                    hiringRisk: cr.reasoning.hiringRisk,
                },
            };
        }
        return mapLegacyRow(entry);
    });
    reply.send({
        ranked,
        meta: {
            jobId: jobIdStr,
            screenedAt: screening.updatedAt?.toISOString?.() ?? screening.createdAt?.toISOString?.() ?? new Date().toISOString(),
            totalCandidatesScreened: stored?.totalEvaluated ?? stored?.totalAnalyzed ?? ranked.length,
            screeningKind: String(stored.screeningKind ?? ""),
            averageScore: screening.averageScore ?? stored.averageScore,
        },
    });
};
exports.getScreeningResults = getScreeningResults;
const getScreening = async (request, reply) => {
    const { id } = request.params;
    const cache = await (0, redis_1.redisGet)(`screening:${id}`);
    if (cache)
        return void reply.send(JSON.parse(cache));
    const screening = await Screening_model_1.ScreeningModel.findById(id).lean();
    if (!screening)
        return void reply.code(404).send({ error: "Screening not found" });
    reply.send(screening);
};
exports.getScreening = getScreening;
const screeningStatus = async (request, reply) => {
    const { id } = request.params;
    const screening = await Screening_model_1.ScreeningModel.findById(id).lean();
    if (!screening)
        return void reply.code(404).send({ error: "Screening not found" });
    const queue = screening.queueJobId ? await (0, queue_service_1.getJobStatus)(screening.queueJobId) : { state: screening.status };
    reply.send({ screeningId: id, status: screening.status, progress: queue.progress, estimatedTimeRemaining: null });
};
exports.screeningStatus = screeningStatus;
const screeningHistoryByJob = async (request, reply) => {
    const { jobId } = request.params;
    const list = await Screening_model_1.ScreeningModel.find({ jobId }).sort({ createdAt: -1 }).lean();
    reply.send(list);
};
exports.screeningHistoryByJob = screeningHistoryByJob;
const exportScreening = async (request, reply) => {
    const { id } = request.params;
    const screening = await Screening_model_1.ScreeningModel.findById(id).lean();
    if (!screening?.results)
        return void reply.code(404).send({ error: "Completed screening not found" });
    const job = await Job_model_1.JobModel.findById(screening.jobId).lean();
    if (!job)
        return void reply.code(404).send({ error: "Job not found" });
    const buffer = await (0, export_service_1.generateShortlistPDF)(screening.results, { title: job.title });
    reply.header("Content-Type", "application/pdf").header("Content-Disposition", `attachment; filename=shortlist-${id}.pdf`).send(buffer);
};
exports.exportScreening = exportScreening;
const deleteScreening = async (request, reply) => {
    const { id } = request.params;
    const screening = await Screening_model_1.ScreeningModel.findById(id).lean();
    if (!screening)
        return void reply.code(404).send({ error: "Not found" });
    if (!["completed", "failed"].includes(screening.status))
        return void reply.code(400).send({ error: "Cannot delete in-progress screening" });
    await Promise.all([Screening_model_1.ScreeningModel.findByIdAndDelete(id), (0, redis_1.redisDel)(`screening:${id}`)]);
    reply.send({ deleted: true });
};
exports.deleteScreening = deleteScreening;
const compareCandidates = async (request, reply) => {
    const body = zod_1.z.object({ candidateIds: zod_1.z.array(zod_1.z.string()).min(2).max(5) }).parse(request.body);
    const { id } = request.params;
    const screening = await Screening_model_1.ScreeningModel.findById(id).lean();
    if (!screening?.results)
        return void reply.code(404).send({ error: "Screening not found" });
    const candidates = screening.results.shortlist.filter((c) => body.candidateIds.includes(c.candidateId));
    const comparison = await (0, gemini_service_1.compareCandidatesWithGemini)(candidates);
    reply.send(comparison);
};
exports.compareCandidates = compareCandidates;
const screeningExplanations = async (request, reply) => {
    const { id } = request.params;
    try {
        const data = await buildScreeningExplanationsData(id, request.user?.userId);
        reply.send({
            success: true,
            message: "Screening explanations generated successfully.",
            data,
        });
    }
    catch (error) {
        const message = String(error.message ?? "");
        if (message.includes("not found")) {
            return void reply.code(404).send({ success: false, error: message });
        }
        if (message.includes("not ready")) {
            return void reply.code(400).send({ success: false, error: message });
        }
        return void reply.code(500).send({ success: false, error: "Unable to generate screening explanations." });
    }
};
exports.screeningExplanations = screeningExplanations;
const exportScreeningExplanations = async (request, reply) => {
    const { id } = request.params;
    try {
        const data = await buildScreeningExplanationsData(id, request.user?.userId);
        const buffer = await (0, export_service_1.generateExplanationsPDF)({
            screeningId: data.screeningId,
            jobId: data.jobId,
            jobTitle: data.jobTitle,
            shortlistExplanations: data.shortlistExplanations,
            rejectedCandidateInsights: data.rejectedCandidateInsights,
            generatedAt: data.generatedAt,
        });
        reply
            .header("Content-Type", "application/pdf")
            .header("Content-Disposition", `attachment; filename=screening-explanations-${id}.pdf`)
            .send(buffer);
    }
    catch (error) {
        const message = String(error.message ?? "");
        if (message.includes("not found")) {
            return void reply.code(404).send({ success: false, error: message });
        }
        if (message.includes("not ready")) {
            return void reply.code(400).send({ success: false, error: message });
        }
        return void reply.code(500).send({ success: false, error: "Unable to export screening explanations." });
    }
};
exports.exportScreeningExplanations = exportScreeningExplanations;
