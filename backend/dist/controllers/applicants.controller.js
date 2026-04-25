"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.screenExternalApplicants = exports.screenPlatformApplicants = exports.enhanceApplicant = exports.bulkDeleteApplicants = exports.deleteApplicant = exports.uploadApplicantsForJob = exports.ingestApplicantsForJob = exports.listApplicantsForJob = exports.listApplicants = exports.externalIngestApplicants = exports.uploadApplicants = exports.ingestApplicants = void 0;
const zod_1 = require("zod");
const Applicant_model_1 = require("../models/Applicant.model");
const Job_model_1 = require("../models/Job.model");
const Screening_model_1 = require("../models/Screening.model");
const notification_service_1 = require("../services/notification.service");
const parser_service_1 = require("../services/parser.service");
const screening_service_1 = require("../services/screening.service");
const applicantList_mapper_1 = require("../utils/applicantList.mapper");
const jsonValidator_1 = require("../utils/jsonValidator");
/**
 * Walk the full multipart stream (field order independent). `request.file()` often misses `jobId`/`fileType`
 * when the browser sends the file part before the text fields.
 */
const parseMultipartResumeUpload = async (request) => {
    if (!request.isMultipart()) {
        throw new Error("Expected multipart/form-data upload");
    }
    let buffer;
    let filename = "upload.bin";
    let jobId;
    let fileType;
    for await (const part of request.parts()) {
        if (part.type === "file") {
            const b = await part.toBuffer();
            if (b.length > 0) {
                buffer = b;
                filename = part.filename || "upload.bin";
            }
        }
        else if (part.type === "field") {
            const val = part.value !== undefined && part.value !== null ? String(part.value).trim() : "";
            if (part.fieldname === "jobId")
                jobId = val || undefined;
            if (part.fieldname === "fileType")
                fileType = val || undefined;
        }
    }
    if (!buffer?.length) {
        throw new Error("No file provided");
    }
    return { buffer, filename, jobId, fileType };
};
const sendUploadError = (reply, status, message) => {
    if (!reply.sent) {
        reply.code(status).send({ error: message });
    }
};
const IngestSchema = zod_1.z.object({ jobId: zod_1.z.string(), profiles: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())) }).strip();
const ExternalIngestSchema = zod_1.z
    .object({
    jobId: zod_1.z.string(),
    spreadsheetRows: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.string())).optional(),
    resumeLinks: zod_1.z.array(zod_1.z.string().url()).optional(),
})
    .strip();
const ingestApplicants = async (request, reply) => {
    const body = IngestSchema.parse(request.body);
    const job = await Job_model_1.JobModel.findOne({ _id: body.jobId, recruiterId: request.user?.userId }).lean();
    if (!job)
        return void reply.code(404).send({ error: "Job not found" });
    const errors = [];
    const validProfiles = [];
    body.profiles.forEach((profile, index) => {
        const parsed = jsonValidator_1.ZodUmuravaProfile.safeParse(profile);
        if (parsed.success) {
            validProfiles.push(parsed.data);
        }
        else {
            errors.push({
                index,
                message: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
            });
        }
    });
    const docs = validProfiles.map((profile) => ({
        jobId: body.jobId,
        source: "umurava_platform",
        profile: (0, parser_service_1.normalizeProfile)(profile),
        status: "pending",
    }));
    const inserted = docs.length ? await Applicant_model_1.ApplicantModel.insertMany(docs, { ordered: false }) : [];
    if (request.user?.userId) {
        await (0, notification_service_1.notifyUser)({
            userId: request.user.userId,
            title: "Applicants ingested",
            message: `${inserted.length} applicants ingested for job ${body.jobId}.`,
            type: "success",
            sendEmail: true,
        });
    }
    reply.send({ inserted: inserted.length, failed: errors.length, errors });
};
exports.ingestApplicants = ingestApplicants;
const uploadApplicants = async (request, reply) => {
    try {
        const { buffer, filename, jobId: jid, fileType: ft } = await parseMultipartResumeUpload(request);
        const jobId = jid;
        const fileType = ft;
        if (!jobId || !fileType) {
            return void sendUploadError(reply, 400, "jobId and fileType required");
        }
        if (!["pdf", "csv", "excel"].includes(fileType)) {
            return void sendUploadError(reply, 400, "fileType must be pdf, csv, or excel");
        }
        const job = await Job_model_1.JobModel.findOne({ _id: jobId, recruiterId: request.user?.userId }).lean();
        if (!job)
            return void sendUploadError(reply, 404, "Job not found");
        const parsed = fileType === "pdf" ? [await (0, parser_service_1.parsePDF)(buffer)] : fileType === "excel" ? await (0, parser_service_1.parseExcel)(buffer) : await (0, parser_service_1.parseCSV)(buffer);
        const docs = parsed.map((p) => ({
            jobId,
            source: fileType === "pdf" ? "pdf_upload" : "csv_upload",
            profile: (0, parser_service_1.normalizeProfile)(p),
            rawText: p.rawText,
            originalFileName: filename,
            status: "pending",
        }));
        const inserted = await Applicant_model_1.ApplicantModel.insertMany(docs, { ordered: false });
        if (request.user?.userId) {
            try {
                await (0, notification_service_1.notifyUser)({
                    userId: request.user.userId,
                    title: "File upload processed",
                    message: `${inserted.length} applicants imported from ${filename}.`,
                    type: "success",
                    sendEmail: true,
                });
            }
            catch (notifyErr) {
                request.log.warn({ err: notifyErr }, "notifyUser after upload failed");
            }
        }
        reply.send({ inserted: inserted.length, failed: 0, errors: [], previewProfiles: docs.slice(0, 5).map((d) => d.profile) });
    }
    catch (err) {
        request.log.error({ err }, "uploadApplicants failed");
        const message = err instanceof Error ? err.message : "Upload processing failed";
        sendUploadError(reply, 400, message);
    }
};
exports.uploadApplicants = uploadApplicants;
const externalIngestApplicants = async (request, reply) => {
    const body = ExternalIngestSchema.parse(request.body);
    const job = await Job_model_1.JobModel.findOne({ _id: body.jobId, recruiterId: request.user?.userId }).lean();
    if (!job)
        return void reply.code(404).send({ error: "Job not found" });
    const fromSheet = (body.spreadsheetRows ?? []).map((row) => (0, parser_service_1.normalizeProfile)(row));
    const linkResults = await Promise.allSettled((body.resumeLinks ?? []).map((link) => (0, parser_service_1.parseResumeFromUrl)(link)));
    const fromLinks = linkResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => (0, parser_service_1.normalizeProfile)(result.value));
    const linkErrors = linkResults
        .map((result, index) => ({ result, index }))
        .filter((entry) => entry.result.status === "rejected")
        .map((entry) => ({ index: entry.index, message: String(entry.result.reason) }));
    const docs = [...fromSheet, ...fromLinks].map((profile) => ({
        jobId: body.jobId,
        source: "csv_upload",
        profile,
        status: "pending",
    }));
    const inserted = docs.length ? await Applicant_model_1.ApplicantModel.insertMany(docs, { ordered: false }) : [];
    if (request.user?.userId) {
        await (0, notification_service_1.notifyUser)({
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
exports.externalIngestApplicants = externalIngestApplicants;
const listApplicants = async (request, reply) => {
    const recruiterId = request.user?.userId;
    if (!recruiterId)
        return void reply.code(401).send({ error: "Unauthorized" });
    const qs = request.query;
    const jobIdRaw = qs.jobId?.trim();
    const status = qs.status;
    const source = qs.source;
    const l = Math.min(Math.max(Number(qs.limit ?? "20"), 1), 10000);
    const offset = qs.offset !== undefined ? Math.max(Number(qs.offset), 0) : undefined;
    const p = qs.page !== undefined ? Math.max(1, Number(qs.page)) : offset !== undefined ? Math.floor(offset / l) + 1 : 1;
    let filter;
    if (!jobIdRaw || jobIdRaw === "all") {
        const owned = await Job_model_1.JobModel.find({ recruiterId }).select("_id").lean();
        const ids = owned.map((j) => j._id);
        if (ids.length === 0) {
            return void reply.send({ applicants: [], total: 0, page: 1, totalPages: 0 });
        }
        filter = { jobId: { $in: ids } };
    }
    else {
        const job = await Job_model_1.JobModel.findOne({ _id: jobIdRaw, recruiterId }).lean();
        if (!job)
            return void reply.code(404).send({ error: "Job not found" });
        filter = { jobId: jobIdRaw };
    }
    if (status)
        filter.status = status;
    (0, applicantList_mapper_1.mergeApplicantSourceFilter)(filter, source);
    const [applicants, total] = await Promise.all([
        Applicant_model_1.ApplicantModel.find(filter).skip((p - 1) * l).limit(l).sort({ createdAt: -1 }).lean(),
        Applicant_model_1.ApplicantModel.countDocuments(filter),
    ]);
    const uniqueJobIds = [...new Set(applicants.map((a) => String(a.jobId)))];
    const scoreByJobId = new Map();
    await Promise.all(uniqueJobIds.map(async (jid) => {
        scoreByJobId.set(jid, await (0, applicantList_mapper_1.loadLatestScoresByCandidateId)(jid));
    }));
    const formatted = applicants.map((a) => {
        const jid = String(a.jobId);
        return (0, applicantList_mapper_1.formatApplicantListItem)(a, scoreByJobId.get(jid) ?? new Map());
    });
    reply.send({ applicants: formatted, total, page: p, totalPages: Math.ceil(total / l) });
};
exports.listApplicants = listApplicants;
const assertJobOwned = async (jobId, recruiterId) => Job_model_1.JobModel.findOne({ _id: jobId, recruiterId }).lean();
/** GET /api/v1/jobs/:jobId/applicants — same list payload as GET /applicants?jobId=…; supports offset (frontend) or page. */
const listApplicantsForJob = async (request, reply) => {
    const { jobId } = request.params;
    const job = await assertJobOwned(jobId, request.user?.userId);
    if (!job)
        return void reply.code(404).send({ error: "Job not found" });
    const q = request.query;
    const l = Math.min(Math.max(Number(q.limit ?? "20"), 1), 10000);
    const offset = Math.max(Number(q.offset ?? "0"), 0);
    const pageFromOffset = Math.floor(offset / l) + 1;
    const p = q.page !== undefined ? Number(q.page) : pageFromOffset;
    const filter = { jobId };
    if (q.status)
        filter.status = q.status;
    (0, applicantList_mapper_1.mergeApplicantSourceFilter)(filter, q.source);
    const [applicants, total] = await Promise.all([
        Applicant_model_1.ApplicantModel.find(filter).skip((p - 1) * l).limit(l).sort({ createdAt: -1 }).lean(),
        Applicant_model_1.ApplicantModel.countDocuments(filter),
    ]);
    const scores = await (0, applicantList_mapper_1.loadLatestScoresByCandidateId)(jobId);
    const formatted = applicants.map((a) => (0, applicantList_mapper_1.formatApplicantListItem)(a, scores));
    reply.send({ applicants: formatted, total, page: p, totalPages: Math.ceil(total / l) });
};
exports.listApplicantsForJob = listApplicantsForJob;
const IngestForJobSchema = zod_1.z.object({ profiles: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())) }).strip();
/** POST /api/v1/jobs/:jobId/applicants — body is `{ profiles }` only; job id comes from the URL. */
const ingestApplicantsForJob = async (request, reply) => {
    const { jobId } = request.params;
    const job = await assertJobOwned(jobId, request.user?.userId);
    if (!job)
        return void reply.code(404).send({ error: "Job not found" });
    const body = IngestForJobSchema.parse(request.body);
    const errors = [];
    const validProfiles = [];
    body.profiles.forEach((profile, index) => {
        const parsed = jsonValidator_1.ZodUmuravaProfile.safeParse(profile);
        if (parsed.success) {
            validProfiles.push(parsed.data);
        }
        else {
            errors.push({
                index,
                message: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
            });
        }
    });
    const docs = validProfiles.map((profile) => ({
        jobId,
        source: "umurava_platform",
        profile: (0, parser_service_1.normalizeProfile)(profile),
        status: "pending",
    }));
    const inserted = docs.length ? await Applicant_model_1.ApplicantModel.insertMany(docs, { ordered: false }) : [];
    if (request.user?.userId) {
        await (0, notification_service_1.notifyUser)({
            userId: request.user.userId,
            title: "Applicants ingested",
            message: `${inserted.length} applicants ingested for job ${jobId}.`,
            type: "success",
            sendEmail: true,
        });
    }
    reply.send({ inserted: inserted.length, failed: errors.length, errors });
};
exports.ingestApplicantsForJob = ingestApplicantsForJob;
/** POST /api/v1/jobs/:jobId/applicants/upload — multipart; jobId may be omitted when using nested URL. */
const uploadApplicantsForJob = async (request, reply) => {
    try {
        const { jobId: jobIdParam } = request.params;
        const { buffer, filename, jobId: jid, fileType: ft } = await parseMultipartResumeUpload(request);
        const jobId = jid ?? jobIdParam;
        const fileType = ft;
        if (!jobId || !fileType) {
            return void sendUploadError(reply, 400, "jobId and fileType required (form) or valid job id in URL");
        }
        if (!["pdf", "csv", "excel"].includes(fileType)) {
            return void sendUploadError(reply, 400, "fileType must be pdf, csv, or excel");
        }
        const job = await Job_model_1.JobModel.findOne({ _id: jobId, recruiterId: request.user?.userId }).lean();
        if (!job)
            return void sendUploadError(reply, 404, "Job not found");
        const parsed = fileType === "pdf" ? [await (0, parser_service_1.parsePDF)(buffer)] : fileType === "excel" ? await (0, parser_service_1.parseExcel)(buffer) : await (0, parser_service_1.parseCSV)(buffer);
        const docs = parsed.map((p) => ({
            jobId,
            source: fileType === "pdf" ? "pdf_upload" : "csv_upload",
            profile: (0, parser_service_1.normalizeProfile)(p),
            rawText: p.rawText,
            originalFileName: filename,
            status: "pending",
        }));
        const inserted = await Applicant_model_1.ApplicantModel.insertMany(docs, { ordered: false });
        if (request.user?.userId) {
            try {
                await (0, notification_service_1.notifyUser)({
                    userId: request.user.userId,
                    title: "File upload processed",
                    message: `${inserted.length} applicants imported from ${filename}.`,
                    type: "success",
                    sendEmail: true,
                });
            }
            catch (notifyErr) {
                request.log.warn({ err: notifyErr }, "notifyUser after upload failed");
            }
        }
        reply.send({ inserted: inserted.length, failed: 0, errors: [], previewProfiles: docs.slice(0, 5).map((d) => d.profile) });
    }
    catch (err) {
        request.log.error({ err }, "uploadApplicantsForJob failed");
        const message = err instanceof Error ? err.message : "Upload processing failed";
        sendUploadError(reply, 400, message);
    }
};
exports.uploadApplicantsForJob = uploadApplicantsForJob;
const deleteApplicant = async (request, reply) => {
    const { id } = request.params;
    const applicant = await Applicant_model_1.ApplicantModel.findById(id).lean();
    if (!applicant)
        return void reply.code(404).send({ error: "Applicant not found" });
    const active = await Screening_model_1.ScreeningModel.findOne({ jobId: applicant.jobId, status: "running" }).lean();
    if (active)
        return void reply.code(400).send({ error: "Cannot delete while screening is running" });
    await Applicant_model_1.ApplicantModel.findByIdAndDelete(id);
    reply.send({ deleted: 1 });
};
exports.deleteApplicant = deleteApplicant;
const bulkDeleteApplicants = async (request, reply) => {
    const body = zod_1.z.object({ jobId: zod_1.z.string(), applicantIds: zod_1.z.array(zod_1.z.string()).optional() }).strip().parse(request.body);
    const query = body.applicantIds?.length ? { jobId: body.jobId, _id: { $in: body.applicantIds } } : { jobId: body.jobId };
    const result = await Applicant_model_1.ApplicantModel.deleteMany(query);
    reply.send({ deleted: result.deletedCount });
};
exports.bulkDeleteApplicants = bulkDeleteApplicants;
const enhanceApplicant = async (request, reply) => {
    const { id } = request.params;
    const applicant = await Applicant_model_1.ApplicantModel.findById(id).lean();
    if (!applicant)
        return void reply.code(404).send({ error: "Applicant not found" });
    reply.send({ enhancedProfile: applicant.profile });
};
exports.enhanceApplicant = enhanceApplicant;
const ScreenPlatformBodySchema = zod_1.z.object({
    jobId: zod_1.z.string(),
    profiles: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())),
    shortlistSize: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(20)]).optional(),
});
/** Scenario 1 — structured Umurava Talent profiles + job → Gemini shortlist (explainable scores). */
const screenPlatformApplicants = async (request, reply) => {
    try {
        const body = ScreenPlatformBodySchema.parse(request.body);
        const uid = request.user?.userId;
        if (!uid)
            return void reply.code(401).send({ error: "Unauthorized" });
        const shortlistSize = (body.shortlistSize ?? 10);
        const data = await (0, screening_service_1.screenFromPlatform)({
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
    }
    catch (err) {
        request.log.error({ err }, "screenPlatformApplicants");
        reply.code(400).send({ error: err instanceof Error ? err.message : "Screening failed" });
    }
};
exports.screenPlatformApplicants = screenPlatformApplicants;
const ScreenExternalBodySchema = zod_1.z.object({
    jobId: zod_1.z.string(),
    applicantIds: zod_1.z.array(zod_1.z.string()).optional(),
    shortlistSize: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(20)]).optional(),
});
/** Scenario 2 — applicants already in DB (PDF/CSV/URL ingest) → same scoring pipeline. */
const screenExternalApplicants = async (request, reply) => {
    try {
        const body = ScreenExternalBodySchema.parse(request.body);
        const uid = request.user?.userId;
        if (!uid)
            return void reply.code(401).send({ error: "Unauthorized" });
        const shortlistSize = (body.shortlistSize ?? 10);
        const data = await (0, screening_service_1.screenFromExternal)({
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
    }
    catch (err) {
        request.log.error({ err }, "screenExternalApplicants");
        reply.code(400).send({ error: err instanceof Error ? err.message : "Screening failed" });
    }
};
exports.screenExternalApplicants = screenExternalApplicants;
