"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreeningModel = void 0;
const mongoose_1 = require("mongoose");
const ScreeningSchema = new mongoose_1.Schema({
    jobId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Job", required: true },
    recruiterId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["queued", "running", "completed", "failed"], default: "queued" },
    shortlistSize: { type: Number, enum: [10, 20], required: true },
    results: { type: mongoose_1.Schema.Types.Mixed },
    errorMessage: String,
    queueJobId: String,
    durationMs: Number,
}, { timestamps: true });
ScreeningSchema.index({ jobId: 1, status: 1 });
exports.ScreeningModel = (0, mongoose_1.model)("Screening", ScreeningSchema);
