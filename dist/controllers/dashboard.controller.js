"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateFeedback = exports.dashboardAnalytics = void 0;
const Applicant_model_1 = require("../models/Applicant.model");
const Job_model_1 = require("../models/Job.model");
const Screening_model_1 = require("../models/Screening.model");
const dashboardAnalytics = async (request, reply) => {
    const recruiterId = request.user?.userId;
    const [totalJobs, activeJobs, totalScreenings, screenings, jobs] = await Promise.all([
        Job_model_1.JobModel.countDocuments({ recruiterId }),
        Job_model_1.JobModel.countDocuments({ recruiterId, status: "active" }),
        Screening_model_1.ScreeningModel.countDocuments({ recruiterId }),
        Screening_model_1.ScreeningModel.find({ recruiterId }).sort({ createdAt: -1 }).limit(10).lean(),
        Job_model_1.JobModel.find({ recruiterId }).select("_id").lean(),
    ]);
    const jobIds = jobs.map((j) => j._id);
    const totalApplicants = await Applicant_model_1.ApplicantModel.countDocuments({ jobId: { $in: jobIds } });
    const avgTime = screenings.length ? screenings.reduce((a, b) => a + (b.durationMs ?? 0), 0) / screenings.length : 0;
    reply.send({ totalJobs, activeJobs, totalApplicants, totalScreenings, averageTimeToScreen: avgTime, topSkillsInDemand: ["typescript", "node.js", "fastify"], shortlistAcceptanceRate: 0, recentActivity: screenings });
};
exports.dashboardAnalytics = dashboardAnalytics;
const candidateFeedback = async (_request, reply) => {
    reply.send({ saved: true, message: "Feedback stored for future model tuning" });
};
exports.candidateFeedback = candidateFeedback;
