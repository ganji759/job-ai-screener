"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportScreeningExplanations = exports.screeningExplanations = exports.compareCandidates = exports.deleteScreening = exports.exportScreening = exports.screeningHistoryByJob = exports.screeningStatus = exports.getScreening = exports.runScreening = void 0;
const zod_1 = require("zod");
const redis_1 = require("../config/redis");
const Job_model_1 = require("../models/Job.model");
const Screening_model_1 = require("../models/Screening.model");
const Applicant_model_1 = require("../models/Applicant.model");
const queue_service_1 = require("../services/queue.service");
const export_service_1 = require("../services/export.service");
const gemini_service_1 = require("../services/gemini.service");
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
const runScreening = async (request, reply) => {
    const body = zod_1.z.object({ jobId: zod_1.z.string(), shortlistSize: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(20)]) }).parse(request.body);
    const job = await Job_model_1.JobModel.findOne({ _id: body.jobId, recruiterId: request.user?.userId }).lean();
    if (!job)
        return void reply.code(404).send({ error: "Job not found" });
    const count = await Applicant_model_1.ApplicantModel.countDocuments({ jobId: body.jobId, status: "pending" });
    if (count < body.shortlistSize)
        return void reply.code(400).send({ error: "Not enough applicants" });
    const active = await Screening_model_1.ScreeningModel.findOne({ jobId: body.jobId, status: { $in: ["queued", "running"] } }).lean();
    if (active)
        return void reply.code(400).send({ error: "Active screening already exists" });
    const screening = await Screening_model_1.ScreeningModel.create({ jobId: body.jobId, recruiterId: request.user?.userId, status: "queued", shortlistSize: body.shortlistSize });
    const qJob = await (0, queue_service_1.addScreeningJob)({ screeningId: String(screening._id), jobId: body.jobId, shortlistSize: body.shortlistSize, recruiterId: request.user?.userId ?? "" });
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
exports.runScreening = runScreening;
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
