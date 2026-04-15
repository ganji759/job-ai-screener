import type { FastifyReply, FastifyRequest } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import { ApplicantModel } from "../models/Applicant.model";
import { JobModel } from "../models/Job.model";
import { ScreeningModel } from "../models/Screening.model";
import { notifyUser } from "../services/notification.service";

const JobSchema = z.object({ title: z.string(), description: z.string(), requirements: z.record(z.string(), z.unknown()) }).strip();

export const listJobs = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = request.user?.userId;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return void reply.code(401).send({ error: "Unauthorized" });
  }

  const { status, search = "", page = "1", limit = "20" } = request.query as Record<string, string>;
  const query: Record<string, unknown> = { recruiterId: new Types.ObjectId(userId) };
  if (status) query.status = status;
  if (search) query.title = { $regex: search, $options: "i" };
  const p = Math.max(1, Math.floor(Number(page)) || 1);
  const l = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 20));
  const [jobs, total] = await Promise.all([
    JobModel.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    JobModel.countDocuments(query),
  ]);
  reply.send({ jobs, total, page: p, totalPages: Math.ceil(total / l) });
};

export const createJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = JobSchema.parse(request.body);
  const job = await JobModel.create({ ...body, recruiterId: request.user?.userId });
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
  const { id } = request.params as { id: string };
  const job = await JobModel.findOne({ _id: id, recruiterId: request.user?.userId }).lean();
  if (!job) return void reply.code(404).send({ error: "Job not found" });
  const applicantCount = await ApplicantModel.countDocuments({ jobId: id });
  reply.send({ ...job, applicantCount });
};

export const updateJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const patch = z.object({ title: z.string().optional(), description: z.string().optional(), requirements: z.record(z.string(), z.unknown()).optional(), status: z.enum(["draft", "active", "closed"]).optional() }).strip().parse(request.body);
  const updated = await JobModel.findOneAndUpdate({ _id: id, recruiterId: request.user?.userId }, patch, { new: true }).lean();
  if (!updated) return void reply.code(404).send({ error: "Job not found" });
  reply.send(updated);
};

export const deleteJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const active = await ScreeningModel.findOne({ jobId: id, status: "running" }).lean();
  if (active) return void reply.code(400).send({ error: "Cannot close job during active screening" });
  await JobModel.findOneAndUpdate({ _id: id, recruiterId: request.user?.userId }, { status: "closed" });
  reply.send({ success: true });
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
