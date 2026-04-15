"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobModel = void 0;
const mongoose_1 = require("mongoose");
const JobRequirementsSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    mustHaveSkills: [{ type: String }],
    niceToHaveSkills: [{ type: String }],
    minYearsExperience: { type: Number, default: 0 },
    educationLevel: { type: String, enum: ["none", "certificate", "bachelor", "master", "phd"], default: "none" },
    domain: { type: String, default: "general" },
    location: { type: String },
    remoteAllowed: { type: Boolean, default: false },
    salaryRange: { min: Number, max: Number, currency: String },
    softSkills: [{ type: String }],
}, { _id: false });
const JobSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requirements: { type: JobRequirementsSchema, required: true },
    recruiterId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["draft", "active", "closed"], default: "draft" },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
JobSchema.virtual("applicantCount", {
    ref: "Applicant",
    localField: "_id",
    foreignField: "jobId",
    count: true,
});
JobSchema.index({ recruiterId: 1, status: 1 });
exports.JobModel = (0, mongoose_1.model)("Job", JobSchema);
