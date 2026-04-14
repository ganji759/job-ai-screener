"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Applicant_model_1 = require("../models/Applicant.model");
const Job_model_1 = require("../models/Job.model");
const Screening_model_1 = require("../models/Screening.model");
const redis_1 = require("../config/redis");
const gemini_service_1 = require("../services/gemini.service");
const notification_service_1 = require("../services/notification.service");
const queue_service_1 = require("../services/queue.service");
if (!queue_service_1.screeningQueue) {
    throw new Error("Screening worker cannot start because Redis queue is disabled.");
}
queue_service_1.screeningQueue.process(async (job) => {
    const started = Date.now();
    const { screeningId, jobId, shortlistSize } = job.data;
    try {
        await Screening_model_1.ScreeningModel.findByIdAndUpdate(screeningId, { status: "running" });
        const dbJob = await Job_model_1.JobModel.findById(jobId).lean();
        if (!dbJob)
            throw new Error("Job not found");
        const applicants = await Applicant_model_1.ApplicantModel.find({ jobId, status: "pending" }).lean();
        const candidates = applicants.map((a) => a.profile);
        const normalizedRequirements = {
            ...dbJob.requirements,
            location: dbJob.requirements.location ?? undefined,
            salaryRange: dbJob.requirements.salaryRange &&
                dbJob.requirements.salaryRange.min != null &&
                dbJob.requirements.salaryRange.max != null &&
                dbJob.requirements.salaryRange.currency != null
                ? {
                    min: dbJob.requirements.salaryRange.min,
                    max: dbJob.requirements.salaryRange.max,
                    currency: dbJob.requirements.salaryRange.currency,
                }
                : undefined,
        };
        const results = await (0, gemini_service_1.scoreAllCandidates)(normalizedRequirements, candidates);
        const shortlist = results.slice(0, shortlistSize);
        const insights = await (0, gemini_service_1.generatePoolInsights)(normalizedRequirements, results);
        const payload = {
            screeningId,
            jobId,
            status: "completed",
            shortlistSize,
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
        const ids = shortlist.map((s) => s.candidateId);
        await Applicant_model_1.ApplicantModel.updateMany({ jobId, "profile.id": { $in: ids } }, { status: "shortlisted", screeningId });
        await Applicant_model_1.ApplicantModel.updateMany({ jobId, "profile.id": { $nin: ids } }, { status: "rejected", screeningId });
        await (0, redis_1.redisSet)(`screening:${screeningId}`, JSON.stringify(payload), 3600);
        await (0, notification_service_1.notifyUser)({
            userId: job.data.recruiterId,
            title: "Screening completed",
            message: `Screening ${screeningId} completed. ${shortlist.length} candidates shortlisted.`,
            type: "success",
            sendEmail: true,
        });
    }
    catch (error) {
        await Screening_model_1.ScreeningModel.findByIdAndUpdate(screeningId, { status: "failed", errorMessage: String(error) });
        await (0, notification_service_1.notifyUser)({
            userId: job.data.recruiterId,
            title: "Screening failed",
            message: `Screening ${screeningId} failed: ${String(error)}`,
            type: "error",
            sendEmail: true,
        });
        throw error;
    }
});
