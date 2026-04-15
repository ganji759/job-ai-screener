"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicantModel = void 0;
const mongoose_1 = require("mongoose");
const ApplicantSchema = new mongoose_1.Schema({
    jobId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Job", required: true },
    source: { type: String, enum: ["umurava_platform", "csv_upload", "pdf_upload"], required: true },
    profile: { type: mongoose_1.Schema.Types.Mixed, required: true },
    rawText: String,
    originalFileName: String,
    status: { type: String, enum: ["pending", "screened", "shortlisted", "rejected"], default: "pending" },
    screeningId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Screening" },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: false });
ApplicantSchema.index({ jobId: 1, status: 1 });
exports.ApplicantModel = (0, mongoose_1.model)("Applicant", ApplicantSchema);
