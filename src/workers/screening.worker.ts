import { ApplicantModel } from "../models/Applicant.model";
import { JobModel } from "../models/Job.model";
import { ScreeningModel } from "../models/Screening.model";
import { redisSet } from "../config/redis";
import { generatePoolInsights, scoreAllCandidates } from "../services/gemini.service";
import { notifyUser } from "../services/notification.service";
import { screeningQueue } from "../services/queue.service";

if (!screeningQueue) {
  throw new Error("Screening worker cannot start because Redis queue is disabled.");
}

screeningQueue.process(async (job) => {
  const started = Date.now();
  const { screeningId, jobId, shortlistSize } = job.data;
  try {
    await ScreeningModel.findByIdAndUpdate(screeningId, { status: "running" });
    const dbJob = await JobModel.findById(jobId).lean();
    if (!dbJob) throw new Error("Job not found");

    const applicants = await ApplicantModel.find({ jobId, status: "pending" }).lean();
    const candidates = applicants.map((a) => a.profile);
    const normalizedRequirements = {
      ...dbJob.requirements,
      location: dbJob.requirements.location ?? undefined,
      salaryRange:
        dbJob.requirements.salaryRange &&
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
    const results = await scoreAllCandidates(normalizedRequirements, candidates);
    const shortlist = results.slice(0, shortlistSize);
    const insights = await generatePoolInsights(normalizedRequirements, results);

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

    await ScreeningModel.findByIdAndUpdate(screeningId, { status: "completed", results: payload, durationMs: payload.durationMs });
    const ids = shortlist.map((s) => s.candidateId);
    await ApplicantModel.updateMany({ jobId, "profile.id": { $in: ids } }, { status: "shortlisted", screeningId });
    await ApplicantModel.updateMany({ jobId, "profile.id": { $nin: ids } }, { status: "rejected", screeningId });
    await redisSet(`screening:${screeningId}`, JSON.stringify(payload), 3600);
    await notifyUser({
      userId: job.data.recruiterId,
      title: "Screening completed",
      message: `Screening ${screeningId} completed. ${shortlist.length} candidates shortlisted.`,
      type: "success",
      sendEmail: true,
    });
  } catch (error) {
    await ScreeningModel.findByIdAndUpdate(screeningId, { status: "failed", errorMessage: String(error) });
    await notifyUser({
      userId: job.data.recruiterId,
      title: "Screening failed",
      message: `Screening ${screeningId} failed: ${String(error)}`,
      type: "error",
      sendEmail: true,
    });
    throw error;
  }
});
