import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { ApplicantModel } from "../models/Applicant.model";
import { JobModel } from "../models/Job.model";
import { ScreeningModel } from "../models/Screening.model";
import { notifyUser } from "../services/notification.service";
import { normalizeProfile, parseCSV, parseExcel, parsePDF, parseResumeFromUrl } from "../services/parser.service";
import { ZodUmuravaProfile } from "../utils/jsonValidator";

const IngestSchema = z.object({ jobId: z.string(), profiles: z.array(z.record(z.string(), z.unknown())) }).strip();
const ExternalIngestSchema = z
  .object({
    jobId: z.string(),
    spreadsheetRows: z.array(z.record(z.string(), z.string())).optional(),
    resumeLinks: z.array(z.string().url()).optional(),
  })
  .strip();

export const ingestApplicants = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = IngestSchema.parse(request.body);
  const job = await JobModel.findOne({ _id: body.jobId, recruiterId: request.user?.userId }).lean();
  if (!job) return void reply.code(404).send({ error: "Job not found" });
  const errors: Array<{ index: number; message: string }> = [];
  const validProfiles: unknown[] = [];

  body.profiles.forEach((profile, index) => {
    const parsed = ZodUmuravaProfile.safeParse(profile);
    if (parsed.success) {
      validProfiles.push(parsed.data);
    } else {
      errors.push({
        index,
        message: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      });
    }
  });

  const docs = validProfiles.map((profile) => ({
    jobId: body.jobId,
    source: "umurava_platform",
    profile: normalizeProfile(profile),
    status: "pending",
  }));
  const inserted = docs.length ? await ApplicantModel.insertMany(docs, { ordered: false }) : [];
  if (request.user?.userId) {
    await notifyUser({
      userId: request.user.userId,
      title: "Applicants ingested",
      message: `${inserted.length} applicants ingested for job ${body.jobId}.`,
      type: "success",
      sendEmail: true,
    });
  }
  reply.send({ inserted: inserted.length, failed: errors.length, errors });
};

export const uploadApplicants = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const mp = await request.file();
  if (!mp) return void reply.code(400).send({ error: "No file provided" });
  const fields = mp.fields as Record<string, { value: string }>;
  const jobId = fields.jobId?.value;
  const fileType = fields.fileType?.value as "pdf" | "csv" | "excel" | undefined;
  if (!jobId || !fileType) return void reply.code(400).send({ error: "jobId and fileType required" });
  const job = await JobModel.findOne({ _id: jobId, recruiterId: request.user?.userId }).lean();
  if (!job) return void reply.code(404).send({ error: "Job not found" });
  const buffer = await mp.toBuffer();
  const parsed =
    fileType === "pdf" ? [await parsePDF(buffer)] : fileType === "excel" ? await parseExcel(buffer) : await parseCSV(buffer);
  const docs = parsed.map((p) => ({
    jobId,
    source: fileType === "pdf" ? "pdf_upload" : "csv_upload",
    profile: normalizeProfile(p),
    rawText: (p as { rawText?: string }).rawText,
    originalFileName: mp.filename,
    status: "pending",
  }));
  const inserted = await ApplicantModel.insertMany(docs, { ordered: false });
  if (request.user?.userId) {
    await notifyUser({
      userId: request.user.userId,
      title: "File upload processed",
      message: `${inserted.length} applicants imported from ${mp.filename}.`,
      type: "success",
      sendEmail: true,
    });
  }
  reply.send({ inserted: inserted.length, failed: 0, errors: [], previewProfiles: docs.slice(0, 5).map((d) => d.profile) });
};

export const externalIngestApplicants = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = ExternalIngestSchema.parse(request.body);
  const job = await JobModel.findOne({ _id: body.jobId, recruiterId: request.user?.userId }).lean();
  if (!job) return void reply.code(404).send({ error: "Job not found" });

  const fromSheet = (body.spreadsheetRows ?? []).map((row) => normalizeProfile(row));
  const linkResults = await Promise.allSettled((body.resumeLinks ?? []).map((link) => parseResumeFromUrl(link)));
  const fromLinks = linkResults
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof parseResumeFromUrl>>> => result.status === "fulfilled")
    .map((result) => normalizeProfile(result.value));
  const linkErrors = linkResults
    .map((result, index) => ({ result, index }))
    .filter((entry) => entry.result.status === "rejected")
    .map((entry) => ({ index: entry.index, message: String((entry.result as PromiseRejectedResult).reason) }));

  const docs = [...fromSheet, ...fromLinks].map((profile) => ({
    jobId: body.jobId,
    source: "csv_upload",
    profile,
    status: "pending",
  }));

  const inserted = docs.length ? await ApplicantModel.insertMany(docs, { ordered: false }) : [];
  if (request.user?.userId) {
    await notifyUser({
      userId: request.user.userId,
      title: "External applicants imported",
      message: `${inserted.length} applicants imported from external boards.`,
      type: "success",
      sendEmail: true,
    });
  }
  reply.send({
    inserted: inserted.length,
    failed: linkErrors.length,
    errors: linkErrors,
    previewProfiles: docs.slice(0, 5).map((d) => d.profile),
  });
};

export const listApplicants = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { jobId, status, source, page = "1", limit = "20" } = request.query as Record<string, string>;
  const q: Record<string, unknown> = { jobId };
  if (status) q.status = status;
  if (source) q.source = source;
  const p = Number(page);
  const l = Number(limit);
  const [applicants, total] = await Promise.all([
    ApplicantModel.find(q).skip((p - 1) * l).limit(l).sort({ createdAt: -1 }).lean(),
    ApplicantModel.countDocuments(q),
  ]);
  reply.send({ applicants, total, page: p, totalPages: Math.ceil(total / l) });
};

export const deleteApplicant = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const applicant = await ApplicantModel.findById(id).lean();
  if (!applicant) return void reply.code(404).send({ error: "Applicant not found" });
  const active = await ScreeningModel.findOne({ jobId: applicant.jobId, status: "running" }).lean();
  if (active) return void reply.code(400).send({ error: "Cannot delete while screening is running" });
  await ApplicantModel.findByIdAndDelete(id);
  reply.send({ deleted: 1 });
};

export const bulkDeleteApplicants = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = z.object({ jobId: z.string(), applicantIds: z.array(z.string()).optional() }).strip().parse(request.body);
  const query = body.applicantIds?.length ? { jobId: body.jobId, _id: { $in: body.applicantIds } } : { jobId: body.jobId };
  const result = await ApplicantModel.deleteMany(query);
  reply.send({ deleted: result.deletedCount });
};

export const enhanceApplicant = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const applicant = await ApplicantModel.findById(id).lean();
  if (!applicant) return void reply.code(404).send({ error: "Applicant not found" });
  reply.send({ enhancedProfile: applicant.profile });
};
