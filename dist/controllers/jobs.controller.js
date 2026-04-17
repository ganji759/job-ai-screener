"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.benchmarkJob = exports.jobStats = exports.deleteJob = exports.updateJob = exports.getJob = exports.createJob = exports.listJobs = void 0;
const zod_1 = require("zod");
const Applicant_model_1 = require("../models/Applicant.model");
const Job_model_1 = require("../models/Job.model");
const Screening_model_1 = require("../models/Screening.model");
const notification_service_1 = require("../services/notification.service");
const JobSchema = zod_1.z.object({ title: zod_1.z.string(), description: zod_1.z.string(), requirements: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()) }).strip();
const listJobs = async (request, reply) => {
    const { status, search = "", page = "1", limit = "20" } = request.query;
    const userId = request.user?.userId;
    const query = { recruiterId: userId };
    if (status)
        query.status = status;
    if (search)
        query.title = { $regex: search, $options: "i" };
    const p = Number(page);
    const l = Number(limit);
    const [jobs, total] = await Promise.all([
        Job_model_1.JobModel.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
        Job_model_1.JobModel.countDocuments(query),
    ]);
    reply.send({ jobs, total, page: p, totalPages: Math.ceil(total / l) });
};
exports.listJobs = listJobs;
const createJob = async (request, reply) => {
    const body = JobSchema.parse(request.body);
    const job = await Job_model_1.JobModel.create({ ...body, recruiterId: request.user?.userId });
    if (request.user?.userId) {
        await (0, notification_service_1.notifyUser)({
            userId: request.user.userId,
            title: "New job created",
            message: `Job "${job.title}" has been created successfully.`,
            type: "success",
            sendEmail: true,
        });
    }
    reply.code(201).send(job);
};
exports.createJob = createJob;
const getJob = async (request, reply) => {
    const { id } = request.params;
    const job = await Job_model_1.JobModel.findOne({ _id: id, recruiterId: request.user?.userId }).lean();
    if (!job)
        return void reply.code(404).send({ error: "Job not found" });
    const applicantCount = await Applicant_model_1.ApplicantModel.countDocuments({ jobId: id });
    reply.send({ ...job, applicantCount });
};
exports.getJob = getJob;
const updateJob = async (request, reply) => {
    const { id } = request.params;
    const patch = zod_1.z.object({ title: zod_1.z.string().optional(), description: zod_1.z.string().optional(), requirements: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(), status: zod_1.z.enum(["draft", "active", "closed"]).optional() }).strip().parse(request.body);
    const updated = await Job_model_1.JobModel.findOneAndUpdate({ _id: id, recruiterId: request.user?.userId }, patch, { new: true }).lean();
    if (!updated)
        return void reply.code(404).send({ error: "Job not found" });
    reply.send(updated);
};
exports.updateJob = updateJob;
const deleteJob = async (request, reply) => {
    const { id } = request.params;
    const active = await Screening_model_1.ScreeningModel.findOne({ jobId: id, status: "running" }).lean();
    if (active)
        return void reply.code(400).send({ error: "Cannot close job during active screening" });
    await Job_model_1.JobModel.findOneAndUpdate({ _id: id, recruiterId: request.user?.userId }, { status: "closed" });
    reply.send({ success: true });
};
exports.deleteJob = deleteJob;
const jobStats = async (request, reply) => {
    const { id } = request.params;
    const [applicantCount, screenings, applicants] = await Promise.all([
        Applicant_model_1.ApplicantModel.countDocuments({ jobId: id }),
        Screening_model_1.ScreeningModel.find({ jobId: id }).sort({ createdAt: -1 }).lean(),
        Applicant_model_1.ApplicantModel.find({ jobId: id }).lean(),
    ]);
    const statusBreakdown = applicants.reduce((acc, cur) => ({ ...acc, [cur.status]: (acc[cur.status] ?? 0) + 1 }), {});
    reply.send({ applicantCount, statusBreakdown, averageScore: screenings[0]?.results?.averageScore ?? 0, topSkillsInPool: screenings[0]?.results?.topSkillsFound ?? [], skillGapsVsRequirements: screenings[0]?.results?.skillGapsInPool ?? [], screeningHistory: screenings });
};
exports.jobStats = jobStats;
const benchmarkJob = async (_request, reply) => {
    reply.send({ poolStrengthScore: 78, hardestSkillsToFind: ["ml ops", "rust", "prompt engineering"], recommendedSalaryRange: "$45k-$65k", timeToFillEstimate: "3-5 weeks" });
};
exports.benchmarkJob = benchmarkJob;
