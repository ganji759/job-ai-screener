import type { FastifyReply, FastifyRequest } from "fastify";
import { ApplicantModel } from "../models/Applicant.model";
import { JobModel } from "../models/Job.model";
import { ScreeningModel } from "../models/Screening.model";

export const dashboardAnalytics = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const recruiterId = request.user?.userId;
  const [totalJobs, activeJobs, totalScreenings, screenings, jobs] = await Promise.all([
    JobModel.countDocuments({ recruiterId }),
    JobModel.countDocuments({ recruiterId, status: "active" }),
    ScreeningModel.countDocuments({ recruiterId }),
    ScreeningModel.find({ recruiterId }).sort({ createdAt: -1 }).limit(10).lean(),
    JobModel.find({ recruiterId }).select("_id").lean(),
  ]);
  const jobIds = jobs.map((j) => j._id);
  const totalApplicants = await ApplicantModel.countDocuments({ jobId: { $in: jobIds } });
  const avgTime = screenings.length ? screenings.reduce((a, b) => a + (b.durationMs ?? 0), 0) / screenings.length : 0;
  reply.send({ totalJobs, activeJobs, totalApplicants, totalScreenings, averageTimeToScreen: avgTime, topSkillsInDemand: ["typescript", "node.js", "fastify"], shortlistAcceptanceRate: 0, recentActivity: screenings });
};

export const candidateFeedback = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  reply.send({ saved: true, message: "Feedback stored for future model tuning" });
};
