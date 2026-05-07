import type { FastifyReply, FastifyRequest } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import { ApplicantModel } from "../models/Applicant.model";
import { JobModel } from "../models/Job.model";
import { ScreeningModel } from "../models/Screening.model";
import { InterviewModel } from "../models/Interview.model";
import { notifyUser } from "../services/notification.service";

const JobSchema = z.object({ title: z.string(), company: z.string().optional(), description: z.string(), requirements: z.record(z.string(), z.unknown()) }).strip();
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const assertOrgId = (request: FastifyRequest, reply: FastifyReply): string | null => {
  const orgId = request.user?.orgId;
  if (!orgId || !Types.ObjectId.isValid(orgId)) {
    void reply.code(401).send({ error: "No organization context" });
    return null;
  }
  return orgId;
};

const assertJobObjectId = (id: string, reply: FastifyReply): Types.ObjectId | null => {
  if (!Types.ObjectId.isValid(id)) {
    void reply.code(400).send({ error: "Invalid job id" });
    return null;
  }
  return new Types.ObjectId(id);
};

export const listJobs = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const orgId = assertOrgId(request, reply);
  if (!orgId) return;

  const queryParams = request.query as Record<string, unknown>;
  const status = typeof queryParams.status === "string" ? queryParams.status : undefined;
  const search = typeof queryParams.search === "string" ? queryParams.search.trim() : "";
  const pageRaw = typeof queryParams.page === "string" ? queryParams.page : undefined;
  const limitRaw = typeof queryParams.limit === "string" ? queryParams.limit : undefined;

  const query: Record<string, unknown> = { organizationId: new Types.ObjectId(orgId) };
  if (status) query.status = status;
  if (search) query.title = { $regex: escapeRegex(search), $options: "i" };

  const p = Math.max(1, Math.floor(Number(pageRaw)) || 1);
  const l = Math.min(100, Math.max(1, Math.floor(Number(limitRaw)) || 20));
  const [jobs, total] = await Promise.all([
    JobModel.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    JobModel.countDocuments(query),
  ]);

  const jobIds = jobs.map((j) => j._id).filter(Boolean);
  const countByJobId = new Map<string, number>();
  if (jobIds.length > 0) {
    const rows = await ApplicantModel.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: "$jobId", n: { $sum: 1 } } },
    ]);
    for (const row of rows) countByJobId.set(String(row._id), row.n);
  }

  reply.send({
    jobs: jobs.map((job) => ({ ...job, applicantCount: countByJobId.get(String(job._id)) ?? 0 })),
    total,
    page: p,
    totalPages: Math.ceil(total / l),
  });
};

export const createJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const orgId = assertOrgId(request, reply);
  if (!orgId) return;
  const body = JobSchema.parse(request.body);
  const job = await JobModel.create({
    ...body,
    recruiterId:    request.user!.userId,
    organizationId: orgId,
    status: "active",
  });
  if (request.user?.userId) {
    await notifyUser({
      userId: request.user.userId,
      title: "New job created",
      message: `Job "${job.title}" has been created successfully.`,
      type: "success",
      sendEmail: true,
    });
  }
  reply.code(201).send(job);
};

export const getJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const orgId = assertOrgId(request, reply);
  if (!orgId) return;
  const { id } = request.params as { id: string };
  const jobOid = assertJobObjectId(id, reply);
  if (!jobOid) return;
  const job = await JobModel.findOne({ _id: jobOid, organizationId: orgId }).lean();
  if (!job) return void reply.code(404).send({ error: "Job not found" });
  const applicantCount = await ApplicantModel.countDocuments({ jobId: id });
  reply.send({ ...job, applicantCount });
};

export const updateJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const orgId = assertOrgId(request, reply);
  if (!orgId) return;
  const { id } = request.params as { id: string };
  const jobOid = assertJobObjectId(id, reply);
  if (!jobOid) return;
  const patch = z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      requirements: z.record(z.string(), z.unknown()).optional(),
      status: z.enum(["draft", "active", "closed"]).optional(),
    })
    .strip()
    .parse(request.body);
  const updated = await JobModel.findOneAndUpdate({ _id: jobOid, organizationId: orgId }, patch, { new: true }).lean();
  if (!updated) return void reply.code(404).send({ error: "Job not found" });
  reply.send(updated);
};

export const deleteJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const orgId = assertOrgId(request, reply);
  if (!orgId) return;
  const { id } = request.params as { id: string };
  const jobOid = assertJobObjectId(id, reply);
  if (!jobOid) return;

  const job = await JobModel.findOne({ _id: jobOid, organizationId: orgId }).lean();
  if (!job) return void reply.code(404).send({ error: "Job not found" });

  const activeScreening = await ScreeningModel.findOne({ jobId: jobOid, status: "running" }).lean();
  if (activeScreening) return void reply.code(409).send({ error: "Cannot delete a job while a screening is actively running." });

  const [interviews, applicants, screenings] = await Promise.all([
    InterviewModel.deleteMany({ jobId: jobOid }),
    ApplicantModel.deleteMany({ jobId: jobOid }),
    ScreeningModel.deleteMany({ jobId: jobOid }),
  ]);
  await JobModel.deleteOne({ _id: jobOid });

  reply.send({ success: true, deleted: { interviews: interviews.deletedCount, applicants: applicants.deletedCount, screenings: screenings.deletedCount } });
};

export const jobStats = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const [applicantCount, screenings, applicants] = await Promise.all([
    ApplicantModel.countDocuments({ jobId: id }),
    ScreeningModel.find({ jobId: id }).sort({ createdAt: -1 }).lean(),
    ApplicantModel.find({ jobId: id }).lean(),
  ]);
  const statusBreakdown = applicants.reduce<Record<string, number>>((acc, cur) => ({ ...acc, [cur.status]: (acc[cur.status] ?? 0) + 1 }), {});
  reply.send({ applicantCount, statusBreakdown, averageScore: screenings[0]?.results?.averageScore ?? 0, topSkillsInPool: screenings[0]?.results?.topSkillsFound ?? [], skillGapsVsRequirements: screenings[0]?.results?.skillGapsInPool ?? [], screeningHistory: screenings });
};

export const benchmarkJob = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  reply.send({ poolStrengthScore: 78, hardestSkillsToFind: ["ml ops", "rust", "prompt engineering"], recommendedSalaryRange: "$45k-$65k", timeToFillEstimate: "3-5 weeks" });
};
