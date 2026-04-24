import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { ApplicantModel } from "../models/Applicant.model";
import { JobModel } from "../models/Job.model";
import { ScreeningModel } from "../models/Screening.model";
import { notifyUser } from "../services/notification.service";
import { normalizeProfile, parseCSV, parseExcel, parsePDF, parseResumeFromUrl } from "../services/parser.service";
import { screenFromExternal, screenFromPlatform } from "../services/screening.service";
import {
  formatApplicantListItem,
  loadLatestScoresByCandidateId,
  mergeApplicantSourceFilter,
} from "../utils/applicantList.mapper";
import { ZodUmuravaProfile } from "../utils/jsonValidator";

/**
 * Walk the full multipart stream (field order independent). `request.file()` often misses `jobId`/`fileType`
 * when the browser sends the file part before the text fields.
 */
const parseMultipartResumeUpload = async (request: FastifyRequest): Promise<{
  buffer: Buffer;
  filename: string;
  jobId?: string;
  fileType?: string;
}> => {
  if (!request.isMultipart()) {
    throw new Error("Expected multipart/form-data upload");
  }
  let buffer: Buffer | undefined;
  let filename = "upload.bin";
  let jobId: string | undefined;
  let fileType: string | undefined;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      const b = await part.toBuffer();
      if (b.length > 0) {
        buffer = b;
        filename = part.filename || "upload.bin";
      }
    } else if (part.type === "field") {
      const val = part.value !== undefined && part.value !== null ? String(part.value).trim() : "";
      if (part.fieldname === "jobId") jobId = val || undefined;
      if (part.fieldname === "fileType") fileType = val || undefined;
    }
  }

  if (!buffer?.length) {
    throw new Error("No file provided");
  }

  return { buffer, filename, jobId, fileType };
};

const sendUploadError = (reply: FastifyReply, status: number, message: string): void => {
  if (!reply.sent) {
    reply.code(status).send({ error: message });
  }
};

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
  try {
    const { buffer, filename, jobId: jid, fileType: ft } = await parseMultipartResumeUpload(request);
    const jobId = jid;
    const fileType = ft as "pdf" | "csv" | "excel" | undefined;
    if (!jobId || !fileType) {
      return void sendUploadError(reply, 400, "jobId and fileType required");
    }
    if (!["pdf", "csv", "excel"].includes(fileType)) {
      return void sendUploadError(reply, 400, "fileType must be pdf, csv, or excel");
    }
    const job = await JobModel.findOne({ _id: jobId, recruiterId: request.user?.userId }).lean();
    if (!job) return void sendUploadError(reply, 404, "Job not found");
    const parsed =
      fileType === "pdf" ? [await parsePDF(buffer)] : fileType === "excel" ? await parseExcel(buffer) : await parseCSV(buffer);
    const docs = parsed.map((p) => ({
      jobId,
      source: fileType === "pdf" ? "pdf_upload" : "csv_upload",
      profile: normalizeProfile(p),
      rawText: (p as { rawText?: string }).rawText,
      originalFileName: filename,
      status: "pending",
    }));
    const inserted = await ApplicantModel.insertMany(docs, { ordered: false });
    if (request.user?.userId) {
      try {
        await notifyUser({
          userId: request.user.userId,
          title: "File upload processed",
          message: `${inserted.length} applicants imported from ${filename}.`,
          type: "success",
          sendEmail: true,
        });
      } catch (notifyErr) {
        request.log.warn({ err: notifyErr }, "notifyUser after upload failed");
      }
    }
    reply.send({ inserted: inserted.length, failed: 0, errors: [], previewProfiles: docs.slice(0, 5).map((d) => d.profile) });
  } catch (err) {
    request.log.error({ err }, "uploadApplicants failed");
    const message = err instanceof Error ? err.message : "Upload processing failed";
    sendUploadError(reply, 400, message);
  }
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
  const recruiterId = request.user?.userId;
  if (!recruiterId) return void reply.code(401).send({ error: "Unauthorized" });

  const qs = request.query as Record<string, string>;
  const jobIdRaw = qs.jobId?.trim();

  const status = qs.status;
  const source = qs.source;
  const l = Math.min(Math.max(Number(qs.limit ?? "20"), 1), 10000);
  const offset = qs.offset !== undefined ? Math.max(Number(qs.offset), 0) : undefined;
  const p =
    qs.page !== undefined ? Math.max(1, Number(qs.page)) : offset !== undefined ? Math.floor(offset / l) + 1 : 1;

  let filter: Record<string, unknown>;
  if (!jobIdRaw || jobIdRaw === "all") {
    const owned = await JobModel.find({ recruiterId }).select("_id").lean();
    const ids = owned.map((j) => j._id);
    if (ids.length === 0) {
      return void reply.send({ applicants: [], total: 0, page: 1, totalPages: 0 });
    }
    filter = { jobId: { $in: ids } };
  } else {
    const job = await JobModel.findOne({ _id: jobIdRaw, recruiterId }).lean();
    if (!job) return void reply.code(404).send({ error: "Job not found" });
    filter = { jobId: jobIdRaw };
  }

  if (status) filter.status = status;
  mergeApplicantSourceFilter(filter, source);

  const [applicants, total] = await Promise.all([
    ApplicantModel.find(filter).skip((p - 1) * l).limit(l).sort({ createdAt: -1 }).lean(),
    ApplicantModel.countDocuments(filter),
  ]);

  const uniqueJobIds = [...new Set(applicants.map((a) => String(a.jobId)))];
  const scoreByJobId = new Map<string, Map<string, number>>();
  await Promise.all(
    uniqueJobIds.map(async (jid) => {
      scoreByJobId.set(jid, await loadLatestScoresByCandidateId(jid));
    }),
  );

  const formatted = applicants.map((a) => {
    const jid = String(a.jobId);
    return formatApplicantListItem(a as Record<string, unknown>, scoreByJobId.get(jid) ?? new Map());
  });
  reply.send({ applicants: formatted, total, page: p, totalPages: Math.ceil(total / l) });
};

const assertJobOwned = async (jobId: string, recruiterId: string | undefined) =>
  JobModel.findOne({ _id: jobId, recruiterId }).lean();

/** GET /api/v1/jobs/:jobId/applicants — same list payload as GET /applicants?jobId=…; supports offset (frontend) or page. */
export const listApplicantsForJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { jobId } = request.params as { jobId: string };
  const job = await assertJobOwned(jobId, request.user?.userId);
  if (!job) return void reply.code(404).send({ error: "Job not found" });

  const q = request.query as Record<string, string>;
  const l = Math.min(Math.max(Number(q.limit ?? "20"), 1), 10000);
  const offset = Math.max(Number(q.offset ?? "0"), 0);
  const pageFromOffset = Math.floor(offset / l) + 1;
  const p = q.page !== undefined ? Number(q.page) : pageFromOffset;

  const filter: Record<string, unknown> = { jobId };
  if (q.status) filter.status = q.status;
  mergeApplicantSourceFilter(filter, q.source);

  const [applicants, total] = await Promise.all([
    ApplicantModel.find(filter).skip((p - 1) * l).limit(l).sort({ createdAt: -1 }).lean(),
    ApplicantModel.countDocuments(filter),
  ]);
  const scores = await loadLatestScoresByCandidateId(jobId);
  const formatted = applicants.map((a) => formatApplicantListItem(a as Record<string, unknown>, scores));
  reply.send({ applicants: formatted, total, page: p, totalPages: Math.ceil(total / l) });
};

const IngestForJobSchema = z.object({ profiles: z.array(z.record(z.string(), z.unknown())) }).strip();

/** POST /api/v1/jobs/:jobId/applicants — body is `{ profiles }` only; job id comes from the URL. */
export const ingestApplicantsForJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { jobId } = request.params as { jobId: string };
  const job = await assertJobOwned(jobId, request.user?.userId);
  if (!job) return void reply.code(404).send({ error: "Job not found" });

  const body = IngestForJobSchema.parse(request.body);
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
    jobId,
    source: "umurava_platform" as const,
    profile: normalizeProfile(profile),
    status: "pending" as const,
  }));
  const inserted = docs.length ? await ApplicantModel.insertMany(docs, { ordered: false }) : [];
  if (request.user?.userId) {
    await notifyUser({
      userId: request.user.userId,
      title: "Applicants ingested",
      message: `${inserted.length} applicants ingested for job ${jobId}.`,
      type: "success",
      sendEmail: true,
    });
  }
  reply.send({ inserted: inserted.length, failed: errors.length, errors });
};

/** POST /api/v1/jobs/:jobId/applicants/upload — multipart; jobId may be omitted when using nested URL. */
export const uploadApplicantsForJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const { jobId: jobIdParam } = request.params as { jobId: string };
    const { buffer, filename, jobId: jid, fileType: ft } = await parseMultipartResumeUpload(request);
    const jobId = jid ?? jobIdParam;
    const fileType = ft as "pdf" | "csv" | "excel" | undefined;
    if (!jobId || !fileType) {
      return void sendUploadError(reply, 400, "jobId and fileType required (form) or valid job id in URL");
    }
    if (!["pdf", "csv", "excel"].includes(fileType)) {
      return void sendUploadError(reply, 400, "fileType must be pdf, csv, or excel");
    }
    const job = await JobModel.findOne({ _id: jobId, recruiterId: request.user?.userId }).lean();
    if (!job) return void sendUploadError(reply, 404, "Job not found");
    const parsed =
      fileType === "pdf" ? [await parsePDF(buffer)] : fileType === "excel" ? await parseExcel(buffer) : await parseCSV(buffer);
    const docs = parsed.map((p) => ({
      jobId,
      source: fileType === "pdf" ? "pdf_upload" : "csv_upload",
      profile: normalizeProfile(p),
      rawText: (p as { rawText?: string }).rawText,
      originalFileName: filename,
      status: "pending",
    }));
    const inserted = await ApplicantModel.insertMany(docs, { ordered: false });
    if (request.user?.userId) {
      try {
        await notifyUser({
          userId: request.user.userId,
          title: "File upload processed",
          message: `${inserted.length} applicants imported from ${filename}.`,
          type: "success",
          sendEmail: true,
        });
      } catch (notifyErr) {
        request.log.warn({ err: notifyErr }, "notifyUser after upload failed");
      }
    }
    reply.send({ inserted: inserted.length, failed: 0, errors: [], previewProfiles: docs.slice(0, 5).map((d) => d.profile) });
  } catch (err) {
    request.log.error({ err }, "uploadApplicantsForJob failed");
    const message = err instanceof Error ? err.message : "Upload processing failed";
    sendUploadError(reply, 400, message);
  }
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

/**
 * POST /applicants/:id/enhance — re-run the AI profile extraction on the applicant's stored
 * `rawText` (populated at upload time). Used to refresh old records whose `experience[]` or
 * `education[]` came back empty from an earlier/weaker prompt. No-ops gracefully when the
 * Python service is unreachable or the applicant has no rawText.
 */
export const enhanceApplicant = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const applicant = await ApplicantModel.findById(id).lean();
  if (!applicant) return void reply.code(404).send({ error: "Applicant not found" });

  const recruiterId = request.user?.userId;
  if (recruiterId) {
    const job = await JobModel.findOne({ _id: applicant.jobId, recruiterId }).lean();
    if (!job) return void reply.code(404).send({ error: "Applicant not found" });
  }

  const rawText = applicant.rawText;
  if (!rawText || rawText.trim().length < 50) {
    return void reply.code(400).send({
      error: "No rawText stored for this applicant — re-upload the source PDF to refresh the profile.",
    });
  }

  try {
    const { normaliseText } = await import("../services/aiClient");
    const { pythonProfileToUmurava } = await import("../services/pythonAdapter");
    const parsed = await normaliseText(rawText);
    const merged = {
      ...pythonProfileToUmurava(parsed),
      headline: parsed.headline,
      bio: parsed.bio ?? undefined,
      projects: parsed.projects?.map((p) => ({
        name: p.name,
        description: p.description,
        technologies: p.technologies,
        role: p.role,
        link: p.link,
        startDate: p.startDate,
        endDate: p.endDate,
      })),
      availability: parsed.availability,
      socialLinks: parsed.socialLinks ?? undefined,
    };
    const profile = normalizeProfile(merged);
    await ApplicantModel.updateOne({ _id: id }, { $set: { profile } });
    reply.send({ enhancedProfile: profile });
  } catch (err) {
    request.log.error({ err }, "enhanceApplicant failed");
    reply.code(502).send({
      error: err instanceof Error ? err.message : "Failed to re-extract profile",
    });
  }
};

const ScreenPlatformBodySchema = z.object({
  jobId: z.string(),
  profiles: z.array(z.record(z.string(), z.unknown())),
  shortlistSize: z.union([z.literal(10), z.literal(20)]).optional(),
});

/** Scenario 1 — structured Umurava Talent profiles + job → Gemini shortlist (explainable scores). */
export const screenPlatformApplicants = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const body = ScreenPlatformBodySchema.parse(request.body);
    const uid = request.user?.userId;
    if (!uid) return void reply.code(401).send({ error: "Unauthorized" });
    const shortlistSize = (body.shortlistSize ?? 10) as 10 | 20;
    const data = await screenFromPlatform({
      jobId: body.jobId,
      recruiterId: uid,
      profilesRaw: body.profiles,
      shortlistSize,
    });
    reply.send({
      scenario: "umurava_platform",
      jobId: body.jobId,
      shortlistSize,
      totalAnalyzed: data.allResults.length,
      shortlist: data.shortlist,
      allResults: data.allResults,
      insights: data.insights,
      jobRequirements: data.jobRequirements,
    });
  } catch (err) {
    request.log.error({ err }, "screenPlatformApplicants");
    reply.code(400).send({ error: err instanceof Error ? err.message : "Screening failed" });
  }
};

const ScreenExternalBodySchema = z.object({
  jobId: z.string(),
  applicantIds: z.array(z.string()).optional(),
  shortlistSize: z.union([z.literal(10), z.literal(20)]).optional(),
});

/** Scenario 2 — applicants already in DB (PDF/CSV/URL ingest) → same scoring pipeline. */
export const screenExternalApplicants = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const body = ScreenExternalBodySchema.parse(request.body);
    const uid = request.user?.userId;
    if (!uid) return void reply.code(401).send({ error: "Unauthorized" });
    const shortlistSize = (body.shortlistSize ?? 10) as 10 | 20;
    const data = await screenFromExternal({
      jobId: body.jobId,
      recruiterId: uid,
      applicantIds: body.applicantIds,
      shortlistSize,
    });
    reply.send({
      scenario: "external_job_boards",
      jobId: body.jobId,
      shortlistSize,
      totalAnalyzed: data.allResults.length,
      shortlist: data.shortlist,
      allResults: data.allResults,
      insights: data.insights,
      jobRequirements: data.jobRequirements,
    });
  } catch (err) {
    request.log.error({ err }, "screenExternalApplicants");
    reply.code(400).send({ error: err instanceof Error ? err.message : "Screening failed" });
  }
};
