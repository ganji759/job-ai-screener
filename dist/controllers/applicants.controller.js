"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhanceApplicant = exports.bulkDeleteApplicants = exports.deleteApplicant = exports.listApplicants = exports.externalIngestApplicants = exports.uploadApplicants = exports.ingestApplicants = void 0;
const zod_1 = require("zod");
const Applicant_model_1 = require("../models/Applicant.model");
const Job_model_1 = require("../models/Job.model");
const Screening_model_1 = require("../models/Screening.model");
const notification_service_1 = require("../services/notification.service");
const parser_service_1 = require("../services/parser.service");
const jsonValidator_1 = require("../utils/jsonValidator");
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
    const mp = await request.file();
    if (!mp)
        return void reply.code(400).send({ error: "No file provided" });
    const fields = mp.fields;
    const jobId = fields.jobId?.value;
    const fileType = fields.fileType?.value;
    if (!jobId || !fileType)
        return void reply.code(400).send({ error: "jobId and fileType required" });
    const job = await Job_model_1.JobModel.findOne({ _id: jobId, recruiterId: request.user?.userId }).lean();
    if (!job)
        return void reply.code(404).send({ error: "Job not found" });
    const buffer = await mp.toBuffer();
    const parsed = fileType === "pdf" ? [await (0, parser_service_1.parsePDF)(buffer)] : fileType === "excel" ? await (0, parser_service_1.parseExcel)(buffer) : await (0, parser_service_1.parseCSV)(buffer);
    const docs = parsed.map((p) => ({
        jobId,
        source: fileType === "pdf" ? "pdf_upload" : "csv_upload",
        profile: (0, parser_service_1.normalizeProfile)(p),
        rawText: p.rawText,
        originalFileName: mp.filename,
        status: "pending",
    }));
    const inserted = await Applicant_model_1.ApplicantModel.insertMany(docs, { ordered: false });
    if (request.user?.userId) {
        await (0, notification_service_1.notifyUser)({
            userId: request.user.userId,
            title: "File upload processed",
            message: `${inserted.length} applicants imported from ${mp.filename}.`,
            type: "success",
            sendEmail: true,
        });
    }
    reply.send({ inserted: inserted.length, failed: 0, errors: [], previewProfiles: docs.slice(0, 5).map((d) => d.profile) });
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
    const { jobId, status, source, page = "1", limit = "20" } = request.query;
    const q = { jobId };
    if (status)
        q.status = status;
    if (source)
        q.source = source;
    const p = Number(page);
    const l = Number(limit);
    const [applicants, total] = await Promise.all([
        Applicant_model_1.ApplicantModel.find(q).skip((p - 1) * l).limit(l).sort({ createdAt: -1 }).lean(),
        Applicant_model_1.ApplicantModel.countDocuments(q),
    ]);
    reply.send({ applicants, total, page: p, totalPages: Math.ceil(total / l) });
};
exports.listApplicants = listApplicants;
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
