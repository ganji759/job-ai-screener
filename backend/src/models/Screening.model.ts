import { Schema, model } from "mongoose";

const ScreeningSchema = new Schema({
  jobId:          { type: Schema.Types.ObjectId, ref: "Job", required: true },
  recruiterId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
  status: { type: String, enum: ["queued", "running", "completed", "failed"], default: "queued" },
  shortlistSize: { type: Number, enum: [10, 20], required: true },
  /** How this screening was produced (optional; legacy queued worker may omit). */
  pipeline: {
    type: String,
    enum: ["bull_queue", "umurava_platform_ai", "external_upload_sync", "agent_ingest_sync"],
    required: false,
  },
  /** Denormalized from results for quick listing (optional). */
  totalEvaluated: Number,
  averageScore: Number,
  results: { type: Schema.Types.Mixed },
  errorMessage: String,
  queueJobId: String,
  durationMs: Number,
  /** Per-applicant HR decisions: key = Applicant `._id` (string). */
  recruiterDecisions: { type: Schema.Types.Mixed, default: () => ({}) },
}, { timestamps: true });

ScreeningSchema.index({ organizationId: 1, status: 1 });
ScreeningSchema.index({ jobId: 1, status: 1 });
export const ScreeningModel = model("Screening", ScreeningSchema);
