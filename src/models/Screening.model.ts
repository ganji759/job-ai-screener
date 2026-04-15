import { Schema, model } from "mongoose";

const ScreeningSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
  recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["queued", "running", "completed", "failed"], default: "queued" },
  shortlistSize: { type: Number, enum: [10, 20], required: true },
  results: { type: Schema.Types.Mixed },
  errorMessage: String,
  queueJobId: String,
  durationMs: Number,
}, { timestamps: true });

ScreeningSchema.index({ jobId: 1, status: 1 });
export const ScreeningModel = model("Screening", ScreeningSchema);
