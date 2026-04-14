import { Schema, model } from "mongoose";

const ApplicantSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
  source: { type: String, enum: ["umurava_platform", "csv_upload", "pdf_upload"], required: true },
  profile: { type: Schema.Types.Mixed, required: true },
  rawText: String,
  originalFileName: String,
  status: { type: String, enum: ["pending", "screened", "shortlisted", "rejected"], default: "pending" },
  screeningId: { type: Schema.Types.ObjectId, ref: "Screening" },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

ApplicantSchema.index({ jobId: 1, status: 1 });
export const ApplicantModel = model("Applicant", ApplicantSchema);
